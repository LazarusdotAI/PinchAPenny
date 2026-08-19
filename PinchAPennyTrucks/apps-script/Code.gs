/*******************************************************************************
 * PINCH A PENNY — FLEET INSPECTION  ·  Google Apps Script endpoint  ·  v3.1
 *
 * Receives inspections from the Base44 backend function
 * `syncInspectionToGoogleSheets` and appends one row per inspection.
 *
 * -----------------------------------------------------------------------------
 * WHAT CHANGED FROM YOUR PREVIOUS SCRIPT — and why each one mattered
 * -----------------------------------------------------------------------------
 * 1. CASE BUG — this was silently corrupting every row.
 *      Old:  if (checks[k]==='fail') failCount++;
 *      ...but the v2-final app sent 'PASS' / 'FAIL' / 'N/A' in UPPERCASE, so
 *      failCount and passCount were ALWAYS 0. Every row was stamped
 *      "PASS - 0/26" — including inspections with real failures.
 *      Fixed: results are lowercased before comparison.
 *
 * 2. HARD-CODED 26 in the status string. Now uses the real total.
 *
 * 3. NO DUPLICATE PROTECTION. A retry after a timeout wrote a second row.
 *      Now keyed on inspectionId. This is what makes "Retry Sync" safe.
 *
 * 4. NO CONCURRENCY GUARD. Check-then-append is a read-modify-write, so two
 *      trucks submitting at 7am could both pass the check and both append.
 *      Now wrapped in LockService, with SpreadsheetApp.flush() before the
 *      lock releases so the next request's lookup actually sees the row.
 *
 * 5. WORLD-WRITABLE ENDPOINT. A Web App deployed "Anyone" is public. Now an
 *      optional shared secret is required. See SHARED_SECRET.
 *
 * 6. NO WAY TO RESOLVE AN AMBIGUOUS FAILURE. If the POST timed out you could
 *      not tell whether the row landed. Added a read-back endpoint:
 *      GET <exec>?check=<inspectionId> -> {found:true|false}
 *      Base44 should call this before retrying, never retry blind.
 *
 * -----------------------------------------------------------------------------
 * DEPLOY
 *   Deploy > New deployment > Web app
 *   Execute as:      Me
 *   Who has access:  Anyone          <-- NOT "Anyone with a Google account"
 *   Copy the /exec URL into Base44 as GOOGLE_SHEETS_WEBHOOK_URL
 *
 * RE-DEPLOY (this trips everyone up)
 *   Editing this file does NOT update the live endpoint.
 *   Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
 *   Do NOT use "New deployment" — that mints a different /exec URL and
 *   orphans the one saved in Base44.
 ******************************************************************************/


/* ============================ CONFIGURATION ============================== */

/** Bump on every deploy. doGet echoes it so you can confirm what is live. */
var VERSION = "3.1.0";

/**
 * Shared secret. The Base44 backend must send it as `authToken` in the body.
 * Leave "" to disable (not recommended — the endpoint is public otherwise).
 * Paste the SAME value into Base44 as GOOGLE_SHEETS_AUTH_TOKEN, then redeploy.
 */
var SHARED_SECRET = "";

/** Tab that receives inspections. Created automatically if missing. */
var SHEET_NAME = "Inspections";

/** How far back the duplicate lookup scans. Cache handles the hot path. */
var LOOKUP_WINDOW = 2000;

/**
 * Column order. `InspectionID` MUST stay in column 2 — ID_COLUMN depends on it.
 */
var HEADERS = [
  "CapturedAt",     // A  client clock, when the driver submitted
  "InspectionID",   // B  idempotency key  <-- ID_COLUMN
  "TruckID",        // C  human-readable truck number, e.g. TRUCK-01
  "DriverName",     // D
  "Date",           // E  inspection date (may differ from CapturedAt)
  "Odometer",       // F
  "Location",       // G
  "Rating",         // H  1-5
  "PassCount",      // I
  "FailCount",      // J
  "TotalChecks",    // K
  "Status",         // L  PASS | NEEDS ATTENTION   <-- STATUS_COLUMN
  "FailedItems",    // M  plain-English summary; managers read this column
  "Notes",          // N
  "PhotoCount",     // O
  "ChecksJSON",     // P  full detail for audit
  "ReceivedAt"      // Q  server clock — sort and report on THIS, not CapturedAt
];

var ID_COLUMN = 2;
var STATUS_COLUMN = 12;

/**
 * Google's frontend reserves these query/body keys and answers HTTP 405 if it
 * sees them. Never name a field or a check key 'c' or 'sid'.
 */
var RESERVED_KEYS = ["c", "sid"];


/* ============================== ENTRYPOINTS ============================== */

function doPost(e) {
  var lock = LockService.getScriptLock();
  var haveLock = false;

  try {
    // Wait rather than fail — two drivers submitting at once is normal.
    haveLock = lock.tryLock(30000);
    if (!haveLock) {
      return json({ result: "error", code: "BUSY", retryable: true,
                    message: "Sheet busy, safe to retry" });
    }

    var d = parseBody_(e);
    if (!d) {
      return json({ result: "error", code: "BAD_BODY", retryable: false,
                    message: "No parsable JSON body" });
    }

    var reserved = findReservedKeys_(d);
    if (reserved) {
      return json({ result: "error", code: "RESERVED_KEY", retryable: false,
                    message: "Payload uses reserved key '" + reserved +
                             "'. Rename it — Google rejects it with a 405." });
    }

    if (SHARED_SECRET && String(d.authToken || "") !== SHARED_SECRET) {
      return json({ result: "error", code: "UNAUTHORIZED", retryable: false,
                    message: "Bad or missing authToken" });
    }

    var sheet = getSheet_();
    var inspectionId = String(d.inspectionId || d.submissionId || "").trim();

    // ---- Idempotency ------------------------------------------------------
    // A retry — manual "Retry Sync", or an automatic one after a timeout that
    // had actually landed — must not create a second row.
    if (inspectionId) {
      var existing = findRow_(sheet, inspectionId);
      if (existing > 0) {
        return json({
          result: "success",
          duplicate: true,
          row: existing,
          inspectionId: inspectionId,
          status: String(sheet.getRange(existing, STATUS_COLUMN).getValue() || ""),
          version: VERSION,
          message: "Already recorded — no duplicate written"
        });
      }
    }

    // ---- Tally ------------------------------------------------------------
    var checks = normaliseChecks_(d.checks);
    var tally = tallyChecks_(checks);

    var total = toInt_(d.totalChecks) || tally.total;
    var status = tally.fail > 0 ? "NEEDS ATTENTION" : "PASS";

    var failedItems = [];
    for (var name in checks) {
      if (checks[name] === "fail") failedItems.push(name);
    }

    // ---- Append -----------------------------------------------------------
    sheet.appendRow([
      d.timestamp || d.capturedAt || new Date().toISOString(),
      inspectionId,
      d.truckId || d.truckNumber || "",
      d.driverName || "",
      d.date || "",
      (d.odometer === 0 ? 0 : (d.odometer || "")),
      d.location || "",
      d.rating || "",
      tally.pass,
      tally.fail,
      total,
      status,
      failedItems.join(" | "),
      d.notes || "",
      toInt_(d.photoCount),
      JSON.stringify(checks),
      new Date().toISOString()
    ]);

    var writtenRow = sheet.getLastRow();

    // Make the write durable BEFORE releasing the lock, so the next request's
    // duplicate lookup can actually see it. Without this, two fast retries can
    // both miss and both append.
    SpreadsheetApp.flush();

    if (inspectionId) cachePut_(inspectionId, writtenRow);
    highlightIfFailed_(sheet, writtenRow, tally.fail > 0);

    return json({
      result: "success",
      duplicate: false,
      row: writtenRow,
      inspectionId: inspectionId,
      status: status,
      passCount: tally.pass,
      failCount: tally.fail,
      naCount: tally.na,
      totalChecks: total,
      version: VERSION
    });

  } catch (err) {
    // Base44 stores this string in googleSheetsSyncError.
    return json({ result: "error", code: "EXCEPTION", retryable: true,
                  message: String(err && err.message ? err.message : err) });
  } finally {
    if (haveLock) { try { lock.releaseLock(); } catch (ignored) {} }
  }
}


/**
 * Two jobs.
 *
 *   GET <exec>                      -> health check.
 *       Open this in a browser. JSON = good. A Google sign-in page means
 *       "Who has access" is wrong and every sync will fail.
 *
 *   GET <exec>?check=INSP-xxx       -> read-back.
 *       Base44 calls this after a timeout or network error to find out
 *       whether the row actually landed, instead of retrying blind.
 */
function doGet(e) {
  try {
    var id = e && e.parameter ? String(e.parameter.check || "").trim() : "";

    if (!id) {
      return json({
        result: "success",
        ping: true,
        service: "Pinch A Penny Fleet Inspection",
        version: VERSION,
        secured: SHARED_SECRET ? true : false,
        sheet: SHEET_NAME,
        time: new Date().toISOString()
      });
    }

    var sheet = getSheet_();
    var row = findRow_(sheet, id);

    return json({
      result: "success",
      inspectionId: id,
      found: row > 0,
      row: row > 0 ? row : null,
      status: row > 0 ? String(sheet.getRange(row, STATUS_COLUMN).getValue() || "") : null,
      version: VERSION
    });

  } catch (err) {
    return json({ result: "error", code: "EXCEPTION",
                  message: String(err && err.message ? err.message : err) });
  }
}


/* =============================== HELPERS ================================= */

function parseBody_(e) {
  try {
    if (e && e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
  } catch (ignored) {
    // Fall through to form-encoded.
  }
  if (e && e.parameter && Object.keys(e.parameter).length) {
    var p = e.parameter;
    if (typeof p.checks === "string") {
      try { p.checks = JSON.parse(p.checks); } catch (ignored2) {}
    }
    return p;
  }
  return null;
}


function findReservedKeys_(d) {
  for (var i = 0; i < RESERVED_KEYS.length; i++) {
    if (Object.prototype.hasOwnProperty.call(d, RESERVED_KEYS[i])) return RESERVED_KEYS[i];
  }
  if (d.checks && typeof d.checks === "object") {
    for (var k = 0; k < RESERVED_KEYS.length; k++) {
      if (Object.prototype.hasOwnProperty.call(d.checks, RESERVED_KEYS[k])) return RESERVED_KEYS[k];
    }
  }
  return null;
}


function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight("bold")
         .setBackground("#20419a")   // Pinch A Penny navy
         .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(13, 320);   // FailedItems
    sheet.setColumnWidth(14, 320);   // Notes
    sheet.setColumnWidth(16, 240);   // ChecksJSON
    SpreadsheetApp.flush();
  }

  return sheet;
}


/* ---- duplicate lookup: cache first, then a bounded scan ------------------ */

function cacheKey_(id) { return "insp_" + id; }

function cachePut_(id, row) {
  try {
    CacheService.getScriptCache().put(cacheKey_(id), String(row), 21600); // 6h
  } catch (ignored) {}
}

function findRow_(sheet, id) {
  // Hot path — a retry usually arrives seconds after the original.
  try {
    var hit = CacheService.getScriptCache().get(cacheKey_(id));
    if (hit) return parseInt(hit, 10) || 0;
  } catch (ignored) {}

  var last = sheet.getLastRow();
  if (last < 2) return 0;

  // Bounded: only the most recent rows. A retry is never months old, and this
  // keeps the lookup flat as the sheet grows.
  var start = Math.max(2, last - LOOKUP_WINDOW + 1);
  var count = last - start + 1;
  if (count < 1) return 0;

  var values = sheet.getRange(start, ID_COLUMN, count, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {   // newest first
    if (String(values[i][0]).trim() === id) {
      var row = start + i;
      cachePut_(id, row);
      return row;
    }
  }
  return 0;
}


/* ---- check normalisation ------------------------------------------------ */

/**
 * Accepts an object keyed by check name, OR an array of
 * { checkKey / checkName / label, result }. Values are lowercased so
 * 'PASS', 'Pass' and 'pass' all count the same. This is the headline bug fix.
 */
function normaliseChecks_(raw) {
  var out = {};
  if (!raw) return out;

  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch (ignored) { return out; }
  }

  if (Object.prototype.toString.call(raw) === "[object Array]") {
    for (var i = 0; i < raw.length; i++) {
      var item = raw[i] || {};
      var key = item.checkKey || item.checkName || item.label || item.name ||
                item.id || ("check_" + (i + 1));
      out[String(key)] = normaliseResult_(item.result || item.value || item.status);
    }
    return out;
  }

  for (var k in raw) {
    if (Object.prototype.hasOwnProperty.call(raw, k)) {
      out[k] = normaliseResult_(raw[k]);
    }
  }
  return out;
}


function normaliseResult_(v) {
  var s = String(v == null ? "" : v).trim().toLowerCase();
  if (s === "pass" || s === "p" || s === "true" || s === "ok") return "pass";
  if (s === "fail" || s === "f" || s === "false") return "fail";
  if (s === "na" || s === "n/a" || s === "not applicable") return "na";
  return s || "not-checked";
}


function tallyChecks_(checks) {
  var pass = 0, fail = 0, na = 0, total = 0;
  for (var k in checks) {
    if (!Object.prototype.hasOwnProperty.call(checks, k)) continue;
    total++;
    if (checks[k] === "pass") pass++;
    else if (checks[k] === "fail") fail++;
    else if (checks[k] === "na") na++;
  }
  return { pass: pass, fail: fail, na: na, total: total };
}


/** Tints failed rows so a manager scanning the sheet sees them instantly. */
function highlightIfFailed_(sheet, row, failed) {
  try {
    sheet.getRange(row, 1, 1, HEADERS.length).setBackground(failed ? "#fde5e4" : null);
    sheet.getRange(row, STATUS_COLUMN)
         .setFontColor(failed ? "#b81714" : "#0d6a23")
         .setFontWeight("bold");
  } catch (ignored) {
    // Formatting is cosmetic — never let it fail a write.
  }
}


function toInt_(v) {
  var n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}


function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ============================== SELF-TEST ================================ *
 * In the Apps Script editor: select `testEndpoint`, press Run, then open
 * View > Logs. It writes ONE row and proves three things:
 *   - UPPERCASE 'FAIL' is counted (the bug that broke your old sheet)
 *   - status flips to NEEDS ATTENTION
 *   - a second identical POST does NOT create a second row
 * Delete the test row afterwards.
 * ======================================================================== */

function testEndpoint() {
  var payload = {
    authToken: SHARED_SECRET,
    inspectionId: "INSP-TEST-" + Date.now(),
    timestamp: new Date().toISOString(),
    truckId: "TRUCK-01",
    driverName: "Test Driver",
    date: new Date().toISOString().slice(0, 10),
    odometer: "84250",
    location: "Store yard",
    rating: 4,
    notes: "Self-test row — safe to delete.",
    photoCount: 0,
    totalChecks: 26,
    checks: {
      "ext_body_washed":     "PASS",   // deliberately UPPERCASE
      "ext_windows_mirrors": "pass",
      "ext_lights_signals":  "FAIL",   // deliberately UPPERCASE
      "ext_tires":           "pass",
      "str_hitch":           "N/A"
    }
  };

  var e = { postData: { contents: JSON.stringify(payload) } };

  var first  = JSON.parse(doPost(e).getContent());
  var second = JSON.parse(doPost(e).getContent());
  var lookup = JSON.parse(doGet({ parameter: { check: payload.inspectionId } }).getContent());

  Logger.log("1st write : %s", JSON.stringify(first));
  Logger.log("2nd write : %s", JSON.stringify(second));
  Logger.log("read-back : %s", JSON.stringify(lookup));

  var problems = [];
  if (first.failCount !== 1)          problems.push("uppercase FAIL not counted (failCount=" + first.failCount + ")");
  if (first.passCount !== 2)          problems.push("passCount wrong (" + first.passCount + ", expected 2)");
  if (first.naCount !== 1)            problems.push("naCount wrong (" + first.naCount + ", expected 1)");
  if (first.status !== "NEEDS ATTENTION") problems.push("status should be NEEDS ATTENTION, got " + first.status);
  if (second.duplicate !== true)      problems.push("duplicate guard did not fire");
  if (second.row !== first.row)       problems.push("duplicate returned a different row");
  if (lookup.found !== true)          problems.push("read-back could not find the row");

  if (problems.length) {
    Logger.log("*** FAILED ***\n - %s", problems.join("\n - "));
  } else {
    Logger.log("*** ALL CHECKS PASSED *** — case handling, tally, status, " +
               "duplicate guard and read-back all working. Delete row %s.", first.row);
  }
}
