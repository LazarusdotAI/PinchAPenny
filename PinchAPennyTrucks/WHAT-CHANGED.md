# What I changed in your spec, and why

Read this before pasting `BASE44-BUILD-SPEC.md` into Base44. Nothing here is
cosmetic — each item is either a bug you were shipping, a gap that would have
bitten you in the field, or a decision you asked me to make.

---

## 1. A live bug in your current setup

Your deployed Apps Script counts failures like this:

```js
for (var k in checks) {
  if (checks[k]==='fail') failCount++;
  if (checks[k]==='pass') passCount++;
}
var status = failCount > 0 ? "NEEDS ATTENTION - " + failCount + " FAIL"
                           : "PASS - " + passCount + "/26";
```

But the `truck-checklist-v2-final` app sends results as **`"PASS"`, `"FAIL"`,
`"N/A"` — uppercase**:

```js
["PASS","FAIL","N/A"].map(...)          // v2-final
result: m[L.id]                          // stored uppercase, sent uppercase
```

So `checks[k]==='fail'` never matched. **`failCount` and `passCount` were
always 0**, and every row in your sheet — including inspections with real
failures — was stamped:

```
PASS - 0/26
```

A truck could fail every one of the 26 checks and the sheet would say PASS.

Only the *first* app (`truck-checklist`) sent lowercase, so whether your data
is correct depends on which version the driver happened to open.

**Fixed** in `apps-script/Code.gs` by lowercasing before comparing. Worth
spot-checking any historical rows before you trust them.

> Also worth knowing: `"PASS - " + passCount + "/26"` hard-codes 26. The new
> script uses the real total.

---

## 2. The checklist — your original 26, not the DOT list

Your newer draft specified a mechanical DOT pre-trip list (tires, lighting,
fluids, belts, exhaust). You told me to use **the original list**, so the spec
now carries the 26 checks from your existing apps:

| Section | Count |
|---|---|
| Exterior Cleanliness & Condition | 8 |
| Interior Cleanliness & Condition | 8 |
| Structural Integrity & Safety | 10 |
| **Total** | **26** |

Stable `checkKey` ids are defined for all 26 so `checksJSON` stays consistent
across app versions. Your three existing apps used three *different* key
schemes — labels in one, `ext_body_washed` in another, `ext-1` in the third —
which is why the same physical check appears under different names in your
sheet history.

---

## 3. Added N/A as a third state

Your draft said PASS/FAIL only. Check 26 is:

> Hitch / tie-downs secure **if equipped**

Not every truck has a hitch. Forcing a PASS on equipment that isn't fitted is
how drivers learn the buttons don't mean anything. All three of your original
apps had a third N/A button, so this is a restoration, not an invention.

`naCount` is tracked separately and **never** affects `status`.
`passCount + failCount + naCount = 26`.

---

## 4. `inspectionId` had to go into the Sheets payload

Your §11 payload did not include it. Your §12 asks for a **Retry Sync** button.

Those two things together produce duplicate rows: retry a request that had
actually landed and you get the inspection twice, with no way for the script
to tell.

`inspectionId` is now in the payload and is the idempotency key. The script
checks it before appending and returns `duplicate: true` as a **success**.

Related: the id must be generated **when the draft opens**, not at submit
time — otherwise a retry after a page reload mints a new id and defeats the
guard.

---

## 5. Your endpoint was world-writable

A Web App deployed with *Who has access: Anyone* is genuinely public. Anyone
with the URL could POST arbitrary rows into your fleet records.

Added an optional shared secret (`authToken` in the body, `SHARED_SECRET` in
the script, `GOOGLE_SHEETS_AUTH_TOKEN` in Base44). This is only safe to do
because the call is now server-side — a browser would leak the secret. It is
one more reason the sync belongs in a backend function.

---

## 6. Never retry blind

A client timeout does not cancel server-side execution. The row may have
landed. Retrying on timeout is the most common way these integrations
duplicate data.

Added a read-back endpoint:

```
GET <exec>?check=<inspectionId>  ->  { found: true|false, row: 47 }
```

Base44 now checks before retrying. §11 has the full decision tree.

---

## 7. Content-Type: this is why sync must be server-side

Your §26 architecture rule was already right, but here is the concrete reason.

From a **browser**, `Content-Type: application/json` triggers a CORS preflight
`OPTIONS` request — and Apps Script cannot answer `OPTIONS` at all. Browser
calls must use `text/plain;charset=utf-8` and set no custom headers, or they
simply fail.

From a **server**, there is no CORS and no preflight, so `application/json`
is correct. Your spec says `application/json`, which is right *because* the
call is server-side. If anyone ever "simplifies" this by calling Google from
the browser, it will break — and the `authToken` would leak.

Your older apps worked around this with `mode:'no-cors'`, which returns an
opaque response that is indistinguishable from a crash, a 500, or a login
wall. They then treated that as success. That is why submissions could appear
to work while nothing reached the sheet.

---

## 8. Fields added to the data model

| Entity | Field | Why |
|---|---|---|
| Inspections | `naCount` | needed once N/A exists |
| Inspections | `googleSheetsSyncedAt` | "when did this last sync" is the first question after a failure |
| Inspections | `googleSheetsSyncAttempts` | so a permanently-broken record stops retrying forever |
| InspectionChecks | `checkKey` | stable id, so renaming a label doesn't orphan history |
| InspectionChecks | `photoUrls` | your §5 asks for photos on failed items; there was nowhere to put them |
| Trucks | `isSampleData` | your §24 asks for removable demo data; needs a flag to target |

---

## 9. Sheet columns expanded

Your list was: Timestamp, TruckID, DriverName, Date, Odometer, Location,
Rating, Notes, PhotoCount, ChecksJSON, Status.

Added: `InspectionID` (idempotency), `PassCount`, `FailCount`, `TotalChecks`
(so the sheet is readable without parsing JSON), `FailedItems` (plain English —
this is the column a manager actually reads), and `ReceivedAt` (server clock;
sort on this, not on the phone's clock, which can be wrong or spoofed).

---

## 10. Smaller corrections

- **Odometer warning is non-blocking.** Your §23 wording could be read as a
  hard block. Odometers do get replaced. A driver must never be stuck beside a
  truck because the app won't accept a legitimate reading.
- **Photos capped at 6 and downscaled client-side** to 1280px / JPEG 0.72.
  Full-resolution phone photos over truck-yard signal are the single most
  common upload failure.
- **"Trucks not inspected today"** added to the dashboard. The truck nobody
  inspected is a bigger risk than the one that failed a check — and it is
  invisible in a list that only shows submitted inspections.
- **Print / Save as PDF view** added to the inspection report. No PDF library:
  the earlier apps loaded jsPDF from a CDN, which fails offline and is blocked
  outright under a strict CSP. A print stylesheet has neither problem.
- **`c` and `sid` are reserved keys.** Google's frontend answers HTTP 405 if
  it sees either as a field name. The script now rejects them with a clear
  message instead of letting Google return HTML.

---

## 11. One brand decision you should sanity-check

Your §19 asks for **dark charcoal/navy navigation**, and I built to that.

But pinchapenny.com's own chrome is a **white** app bar — navy is the resting
link colour and pool blue is the active state. The only navy strip on their
site is a thin `#1a347b` announcement bar above the header.

I kept your navy nav because you asked for it and because an internal fleet
tool reading differently from the retail storefront is defensible. If you'd
rather it match the website exactly, flip the nav to white with navy text and
pool-blue active states — everything else in the spec still holds.

Two brand details that are *not* optional, both verified from their assets:

- The circle-P badge is **`#102C85`**, not `#20419a`. Side by side, the wrong
  navy reads as the wrong logo.
- Gotham ships in **three weights only — 400 / 700 / 900**. A 600-weight
  subhead is the fastest way to look not-quite-right. My first draft of the
  spec had 600-weight labels; that's now corrected.
