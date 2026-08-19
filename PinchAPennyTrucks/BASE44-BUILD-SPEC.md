# BUILD: PINCH A PENNY — COMPANY TRUCK CHECKLIST

> **Paste this whole document into Base44 as the build prompt.**
> It replaces the earlier draft. Differences from that draft are listed in
> `WHAT-CHANGED.md` — read that first if you want to know why.

Build a polished, production-ready, mobile-first fleet inspection application for
**Pinch A Penny** truck drivers.

Drivers use it on a phone to complete a daily truck inspection before going out on
route. Management uses it on a laptop to see truck condition, failed inspections,
driver activity, photos, odometer history and inspection history.

**Do not build this as a mockup.** Build all pages, entities, backend logic, forms,
authentication, validation, photo uploads, inspection history, the management
dashboard, and the Google Sheets synchronisation. No placeholder pages, no dead
links, no simulated functionality.

---

## 0. BRAND — PINCH A PENNY

These are the real values from `pinchapenny.com/css/app.css`. Use them exactly.
The app must look like it belongs to Pinch A Penny, not like a generic Base44 app.

### Colour tokens

| Token | Hex | Use it for |
|---|---|---|
| `--pap-navy` | `#20419a` | Primary. Navigation bar, page headers, primary buttons, table headers. |
| `--pap-navy-dark` | `#162e6d` | Pressed/hover state of navy, nav gradient end. |
| `--pap-mark-navy` | `#102C85` | **The circle-P badge only.** Verified from `pinchapenny.com/img/layouts/app/logo-icon.svg` — the real icon is a *darker* navy than `--pap-navy`. Do not substitute `#20419a` here; side by side it reads as the wrong logo. |
| `--pap-strip` | `#1a347b` | The thin full-bleed announcement strip pinned above the nav bar. |
| `--pap-blue` | `#007cb5` | Secondary. Links, accents, section kickers, active tab underline, info states. |
| `--pap-cyan` | `#5cc4db` | Light accent. Chart fills, subtle backgrounds, avatar backgrounds. |
| `--pap-gold` | `#ffda02` | The penny. Progress bars, the 4px rule under the nav, star rating, highlights. **Never** use gold for a status. |
| `--pap-green` | `#11872d` | **PASS only.** Nothing else. |
| `--pap-red` | `#e7201d` | **FAIL / danger only.** Nothing else. |
| `--pap-orange` | `#f99d2a` | **NEEDS ATTENTION / warning only.** |
| `--pap-gray-100` | `#f7f7f7` | App background. |
| `--pap-gray-200` | `#f2f2f2` | Card wells, striped rows. |
| `--pap-gray-300` | `#dedede` | Borders, dividers. |
| `--pap-gray-500` | `#767676` | Muted text, placeholders. |
| `--pap-gray-700` | `#464646` | Secondary text. |
| `--pap-gray-900` | `#212529` | Body text. |

### Typography

Pinch A Penny uses **HCo Gotham**, which is licensed and cannot be embedded.
Substitute from Google Fonts:

```
--font-display: "Montserrat", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-body:    "Figtree", "Helvetica Neue", Helvetica, Arial, sans-serif;
```

Montserrat for H1/H2 and all-caps banners. Figtree for body, list rows, labels
and buttons — its larger x-height survives a 15px row on a cheap Android
screen where Montserrat starts to close up.

> **Use exactly three weights: 400, 700, 900.**
> Their site loads Gotham in Book / Bold / Black only. A 500 or 600-weight
> subhead is the single fastest way to make this look not-quite-Pinch-A-Penny.
> Delete 500 and 600 from the theme entirely.

- Headings: `letter-spacing: -0.02em`
- Small uppercase labels: `letter-spacing: 0.12em`
- Body text `#212529` on white. Never below 15px.
- **Links keep their underline.** Their stylesheet does not strip it; don't.

### `.meta` eyebrow — use this everywhere

A small uppercase kicker sits above every card heading and screen title
(the site does this constantly, e.g. "Pool & Home Services" above a headline).

```
.meta { font: 700 14px/1.25 var(--font-body);
        text-transform: uppercase; letter-spacing: .12em;
        color: var(--pap-blue); }
```

### Buttons — one shape, everywhere

```
border-radius: 9999px;   /* full pill — NOT 8px, not 12px */
font-weight: 700;
```

Every button on their site is a full pill at bold weight. A rounded-rectangle
button will read as generic. Card radius is `1rem`.

**Yellow button rule:** gold `#ffda02` pills are only ever placed on navy or
pool-blue fills. On a white surface the primary button is navy `#20419a` —
yellow-on-white fails contrast *and* is off-brand.

### The logo lockup

Top-left of every screen, and at the top of every printed report:

- A **white circle**, 44px, containing a **navy capital "P"** at weight 900.
- To its right, two stacked lines:
  - `PINCH A PENNY` — 11px, weight 800, `letter-spacing: 0.16em`, uppercase, in **gold** `#ffda02`
  - `Fleet Inspection` — 17px, weight 800, white

Navigation bar background: `linear-gradient(135deg, #20419a 0%, #20419a 40%, #007cb5 100%)`
with a solid **4px `#ffda02` rule along its bottom edge**. That gold rule is the
single strongest brand signal in the app — put it on every screen.

### Aesthetic

Professional fleet-management software. Dark navy navigation, white/light
inspection workspace, strong typography, generous spacing, rounded but not
bubbly (12–20px radii), large touch targets, minimal clutter. Driver screens
prioritise usability over decoration. The dashboard may be information-dense.

---

## 1. USERS AND ACCESS

Implement authentication. Two roles.

### DRIVER

Can: log in · start an inspection · select their truck · enter odometer ·
enter location · complete all 26 checks · mark each PASS / FAIL / N/A ·
add notes · upload photos · submit · view **their own** previous inspections.

Cannot: edit a completed inspection · delete any inspection · view another
driver's inspections · reach any management screen or setting.

### ADMIN / MANAGER

Can: view all trucks, inspections and drivers · view failed inspections ·
search · filter by date, truck, driver and status · open any individual
inspection report · view photos and notes · view odometer history · view a
truck's full inspection history · add, edit and deactivate trucks · retry a
failed Google Sheets sync · view dashboard statistics.

Use Base44 row-level data permissions so a driver can only read rows where
`driverUserId` equals their own user id. Do not rely on hiding UI — enforce it
at the data layer.

---

## 2. DATABASE

### Trucks

| Field | Type | Notes |
|---|---|---|
| `truckId` | id | |
| `truckNumber` | string | **Primary human-readable identifier.** `TRUCK-01`, `TRUCK-02` |
| `nickname` | string | |
| `make` | string | |
| `model` | string | |
| `year` | number | |
| `licensePlate` | string | |
| `vin` | string | |
| `currentOdometer` | number | |
| `active` | boolean | default `true` |
| `notes` | text | |
| `isSampleData` | boolean | default `false` — see §24 |
| `createdAt` | datetime | |

### Inspections

| Field | Type | Notes |
|---|---|---|
| `inspectionId` | string | `INSP-YYYYMMDD-XXXXX`, unique. See §22 |
| `timestamp` | datetime | submitted-at |
| `driverUserId` | ref → user | |
| `driverName` | string | denormalised for history/export |
| `truckId` | ref → Trucks | |
| `truckNumber` | string | denormalised |
| `inspectionDate` | date | |
| `odometer` | number | |
| `location` | string | |
| `overallRating` | number | 1–5 |
| `notes` | text | |
| `passCount` | number | |
| `failCount` | number | |
| `naCount` | number | |
| `totalChecks` | number | always `26` |
| `status` | enum | `PASS` \| `NEEDS ATTENTION` |
| `checksJSON` | json | all 26 results |
| `photoUrls` | array\<string\> | |
| `photoCount` | number | |
| `googleSheetsSyncStatus` | enum | `PENDING` \| `SYNCED` \| `FAILED` |
| `googleSheetsSyncError` | text | |
| `googleSheetsSyncedAt` | datetime | |
| `googleSheetsSyncAttempts` | number | default `0` |
| `createdAt` | datetime | |

**Status rule.** If `failCount > 0` then `status = "NEEDS ATTENTION"`, otherwise
`status = "PASS"`. `naCount` never affects status.

### InspectionChecks

One queryable row per check, so management can ask "how many times has
Truck 03 failed *Brakes feel normal* this quarter".

| Field | Type | Notes |
|---|---|---|
| `inspectionId` | ref → Inspections | |
| `truckId` | ref → Trucks | |
| `driverUserId` | ref → user | |
| `checkKey` | string | stable id, e.g. `str_brakes` |
| `category` | string | section name |
| `checkName` | string | driver-facing label |
| `result` | enum | `PASS` \| `FAIL` \| `NA` |
| `note` | text | required when `result = FAIL` |
| `photoUrls` | array\<string\> | photos attached to this specific failure |
| `createdAt` | datetime | |

---

## 3. DRIVER INSPECTION WORKFLOW

Screen title: **TRUCK INSPECTION**, with the Pinch A Penny lockup above it.

**Driver** — auto-populated from the logged-in user, shown read-only.

**Truck** — dropdown of trucks where `active = true`, labelled
`truckNumber — nickname`. Required.

**Date** — defaults to today. Required.

**Odometer** — numeric, required, no negatives.
If the entered value is **lower** than that truck's `currentOdometer`, show
inline, in orange, non-blocking:

> **This reading is lower than the truck's last recorded mileage
> (`{currentOdometer}`). Please double-check the odometer.**

The driver may correct it or continue. Do not hard-block — odometers do get
replaced and a driver must never be stuck at the side of a truck.

**Location** — free text, required. Offer a "Use current location" button that
fills the field via the Geolocation API and reverse-geocodes if available.
**Never require GPS permission to submit.** If permission is denied, say so
once, quietly, and leave the field editable.

---

## 4. THE 26-POINT INSPECTION CHECKLIST

> **This is the authoritative list. Use these exact labels, ids and grouping.**
> Do not substitute a DOT/mechanical list — this fleet inspects for
> cleanliness, condition and safety, because these trucks park in customers'
> driveways every day.

Display as large mobile-friendly cards grouped by category, numbered 1–26
continuously.

### SECTION 1 — EXTERIOR CLEANLINESS & CONDITION (8)

| # | `checkKey` | Label |
|---|---|---|
| 1 | `ext_body_washed` | Body washed / no excessive dirt |
| 2 | `ext_windows_mirrors` | Windows / mirrors clean |
| 3 | `ext_lights_signals` | Lights & signals clean & working |
| 4 | `ext_tires` | Tires condition & pressure OK |
| 5 | `ext_dents` | No new dents / scratches |
| 6 | `ext_plates` | License plates clean & visible |
| 7 | `ext_wheel_wells` | Wheel wells / fenders clean |
| 8 | `ext_bed_toolbox` | Bed / toolbox clean & organized |

### SECTION 2 — INTERIOR CLEANLINESS & CONDITION (8)

| # | `checkKey` | Label |
|---|---|---|
| 9 | `int_seats` | Seats clean & no damage |
| 10 | `int_floor` | Floor mats / floor clean |
| 11 | `int_dashboard` | Dashboard & controls clean |
| 12 | `int_trash` | No trash / personal items left |
| 13 | `int_odor` | Odor-free |
| 14 | `int_seatbelts` | Seatbelts functional & clean |
| 15 | `int_steering_pedals` | Steering wheel & pedals clean |
| 16 | `int_glovebox` | Glove box / storage organized |

### SECTION 3 — STRUCTURAL INTEGRITY & SAFETY (10)

| # | `checkKey` | Label |
|---|---|---|
| 17 | `str_frame` | No frame cracks / rust |
| 18 | `str_doors` | Doors open / close / latch properly |
| 19 | `str_tailgate` | Tailgate / bed integrity OK |
| 20 | `str_bumpers` | Bumpers secure |
| 21 | `str_windshield` | Windshield no cracks obstructing view |
| 22 | `str_mirrors` | Mirrors secure & not cracked |
| 23 | `str_horn` | Horn operational |
| 24 | `str_brakes` | Brakes feel normal |
| 25 | `str_fluids` | Fluids — no visible leaks under truck |
| 26 | `str_hitch` | Hitch / tie-downs secure if equipped |

### Buttons

Every check has three buttons: **PASS**, **FAIL**, **N/A**.

- PASS selected → solid green `#11872d`, white text, white ✓
- FAIL selected → solid red `#e7201d`, white text, white ✓
- N/A selected → solid dark grey `#464646`, white text
- Unselected → white background, 2px `#dedede` border; PASS label in green
  text, FAIL label in red text, so the meaning is readable before tapping

Minimum height **56px**. PASS and FAIL each take ~38% of the row width, N/A
takes the remaining ~24% — N/A must be reachable but never the easy accident.

Tapping the already-selected button clears it back to unanswered.

> **Why N/A exists.** Check 26 is *"if equipped"*, and not every truck has a
> hitch. Forcing a PASS on equipment that isn't fitted teaches drivers that the
> buttons don't mean anything. `naCount` is tracked separately and never
> affects `status`.

### Live counters

Sticky at the top of the checklist, updating live:

```
PASS: 18    FAIL: 2    N/A: 1    REMAINING: 5
```

Plus a progress bar in gold `#ffda02` on a dark track.

Submission is blocked until all 26 checks have PASS, FAIL or N/A selected.

### `checksJSON` shape

Keyed by `checkKey`, values lowercase:

```json
{
  "ext_body_washed": "pass",
  "ext_windows_mirrors": "pass",
  "ext_lights_signals": "fail",
  "ext_tires": "pass",
  "ext_dents": "pass",
  "ext_plates": "pass",
  "ext_wheel_wells": "pass",
  "ext_bed_toolbox": "na"
}
```

…continuing for all 26 keys. **Values must be lowercase** — the Apps Script
normalises anyway, but keep the stored record clean.

---

## 5. FAILED ITEM BEHAVIOUR

The moment FAIL is tapped, expand a panel directly beneath that check:

- The whole card turns pale red `#fff6f5` with a 4px red left edge and stays
  that way.
- **Describe the problem** — a text area. **Required.** Minimum 3 characters.
  Placeholder: *"Describe it so the shop can act on it"*.
  Auto-focus it so the driver is already typing.
- **Add Photo** — camera capture or library. Strongly encouraged, not required.
  Photos taken here attach to that specific `InspectionChecks` row **and** to
  the parent inspection.

A "Faults found" summary card sits at the very top of the page listing every
failed item and its description, so the driver sees the whole picture before
submitting.

---

## 6. PHOTOS

Drivers can take a photo with the camera, choose existing images, and upload
several. Show thumbnails before submission with a remove button on each.
After submission photos are read-only for drivers.

- Cap at **6 photos per inspection**.
- Downscale client-side to max 1280px on the long edge, JPEG quality ~0.72,
  before upload. Full-resolution phone photos are the single most common cause
  of failed uploads on truck-yard signal.
- Reject files over 10MB before processing with a clear message naming the file.
- Store in Base44 file storage; keep the URLs in `photoUrls`.
- **Never put base64 image data in the Google Sheets payload** — only
  `photoCount`. Photos live in Base44.

---

## 7. OVERALL VEHICLE RATING

**Overall Truck Condition** — required, 1–5.

```
5  Excellent      4  Good      3  Fair      2  Poor      1  Unsafe
```

Render as five large tappable tiles with gold `#ffda02` stars. Selected tile
gets a navy `#20419a` background with a gold star. Show the word beneath the
number so the meaning is unambiguous.

---

## 8. GENERAL NOTES

**Additional Notes** — large text area, optional.
Placeholder: *"Describe anything management should know about this vehicle..."*

---

## 9. SUBMIT

Full-width navy button: **SUBMIT INSPECTION**, minimum 56px tall, sticky at the
bottom of the viewport.

Before submitting, verify: truck selected · odometer entered · date present ·
location entered · all 26 checks answered · every FAIL has a description ·
overall rating selected.

If anything is missing: **do not submit.** Show a gold-bordered summary panel
listing exactly what is outstanding, each line a link that scrolls to and
focuses the offending field. Do not use a generic "please complete all fields".

On press: disable the button immediately and show `Submitting Inspection…`
with a spinner.

---

## 10. SUBMISSION LOGIC

1. Compute `passCount`, `failCount`, `naCount`; `totalChecks = 26`.
2. `status = failCount > 0 ? "NEEDS ATTENTION" : "PASS"`.
3. **Write the Inspection and all 26 InspectionChecks rows to Base44 first.**
   Base44 is the primary record of truth.
4. Set `googleSheetsSyncStatus = "PENDING"`.
5. Only after the database write succeeds, call the backend function
   `syncInspectionToGoogleSheets(inspectionId)`.
6. If the truck's `currentOdometer` is lower than the submitted odometer,
   update it. Never lower it automatically.

**The browser must never call Google directly.** See §11.

---

## 11. GOOGLE SHEETS INTEGRATION

Create a Base44 **backend/server-side function**:

```
syncInspectionToGoogleSheets(inspectionId)
```

Configuration values — do not hardcode either:

| Key | What it is |
|---|---|
| `GOOGLE_SHEETS_WEBHOOK_URL` | The deployed Apps Script `/exec` URL. Supplied later. |
| `GOOGLE_SHEETS_AUTH_TOKEN` | Shared secret matching `SHARED_SECRET` in the script. |

POST with `Content-Type: application/json`. Because this runs server-side there
is no CORS and no preflight — `application/json` is correct here. (It would
*not* be correct from a browser; that is precisely why this is a backend
function.)

### Payload

```json
{
  "authToken": "<GOOGLE_SHEETS_AUTH_TOKEN>",
  "inspectionId": "INSP-20260819-A7F3K",
  "timestamp": "2026-08-19T15:32:00.000Z",
  "truckId": "TRUCK-01",
  "driverName": "Stephen",
  "date": "2026-08-19",
  "odometer": "82541",
  "location": "Houston",
  "rating": 5,
  "notes": "Truck operating normally",
  "photoCount": 2,
  "totalChecks": 26,
  "checks": {
    "ext_body_washed": "pass",
    "ext_windows_mirrors": "pass",
    "ext_lights_signals": "fail"
  }
}
```

Include **all 26** checks in the real payload.

> `inspectionId` is mandatory. The Apps Script uses it to refuse a duplicate
> row when a retry lands after a request that had already succeeded. Without
> it, "Retry Sync" corrupts the sheet.

### Response

The script returns JSON:

```json
{ "result": "success", "duplicate": false, "row": 47, "status": "NEEDS ATTENTION",
  "passCount": 23, "failCount": 2, "totalChecks": 26 }
```

Treat `result: "success"` — including `duplicate: true` — as SYNCED.
A retry that finds its own earlier write is the system working correctly.

Set a **20 second** timeout. Apps Script cold starts are slow.

### Never retry blind — use the read-back endpoint

A client-side timeout does **not** cancel the server-side execution. The row
may well have landed. Retrying on a timeout is how you get duplicate rows.

Before any retry, ask the script whether it already has the record:

```
GET  {GOOGLE_SHEETS_WEBHOOK_URL}?check={inspectionId}

  -> { "result":"success", "found": true,  "row": 47, "status":"PASS" }
  -> { "result":"success", "found": false, "row": null }
```

Logic in `syncInspectionToGoogleSheets`:

```
POST payload
  success            -> SYNCED
  clean error        -> FAILED, store message
  timeout / network  -> GET ?check=<inspectionId>
                          found:true   -> SYNCED   (it landed, do not resend)
                          found:false  -> retry POST, same inspectionId,
                                          backoff 2s / 5s / 12s / 30s ±30%,
                                          max 5 attempts, then FAILED
```

The duplicate guard makes a resend safe even if the read-back is itself
unreachable — but checking first keeps the sheet clean and the logs honest.

### Response failure modes to handle explicitly

| Symptom | Cause | What to store |
|---|---|---|
| Body starts with `<` / contains `accounts.google.com` | Deployment is not public | `"Web App is not public — redeploy with Who has access: Anyone"` |
| `{"result":"error","code":"UNAUTHORIZED"}` | Token mismatch | `"GOOGLE_SHEETS_AUTH_TOKEN does not match the script"` |
| `{"result":"error","code":"RESERVED_KEY"}` | A field or check key is named `c` or `sid` | Rename it — Google's frontend rejects those with a 405 |
| `{"result":"error","code":"BUSY"}` | Lock contention | Retryable, back off and try again |

Never show any of these to a driver. They are management diagnostics.

---

## 12. GOOGLE SHEETS FAILURE HANDLING

**An inspection must never be lost because Google Sheets was unavailable.**

- Success → `googleSheetsSyncStatus = "SYNCED"`, stamp `googleSheetsSyncedAt`,
  clear `googleSheetsSyncError`.
- Failure → `googleSheetsSyncStatus = "FAILED"`, store the error text in
  `googleSheetsSyncError`, increment `googleSheetsSyncAttempts`.

Either way the inspection **is submitted** and the driver sees the success
screen. Sync state is a management concern, not a driver concern — never show
a driver a Google error.

Management needs:

- A **Sync Failures** filter/badge on the inspections list.
- A **Retry Sync** button on any failed inspection.
- A **Retry All Failed** action on the dashboard.

Retry is safe because of the `inspectionId` duplicate guard.

---

## 13. SUCCESS SCREEN

A dedicated screen, not a toast.

**If `status = PASS`:**

> Large green `#11872d` check mark
> **INSPECTION COMPLETE**
> Truck 01
> 26 / 26 Checks Completed
> Status: **PASS**
>
> Submitted · {date/time} · Odometer {n} · Driver {name}
>
> `[ Done ]`

**If `status = NEEDS ATTENTION`:**

> Orange `#f99d2a` warning mark
> **INSPECTION SUBMITTED**
> Status: **NEEDS ATTENTION**
> **3 ITEMS FAILED**
>
> …list every failed item with its description…
>
> Management has been notified — this inspection has been recorded.
>
> `[ Done ]`

**Never tell the driver the truck is safe to operate.** Not in either branch.
That judgement is not the app's to make.

---

## 14. MANAGER DASHBOARD

KPI cards across the top:

| Card | Value | Colour |
|---|---|---|
| **Trucks** | count of `active = true` | navy `#20419a` |
| **Today's Inspections** | inspections where `inspectionDate = today` | navy |
| **Passed** | today's with `status = PASS` | green `#11872d` |
| **Needs Attention** | today's with `status = NEEDS ATTENTION` | **red `#e7201d`, most prominent card** |

Below: **VEHICLES NEEDING ATTENTION** — inspections containing failures, newest
first, above everything else. Each card shows truck number, driver, date/time,
failed item count, odometer, rating, and a **View Inspection** button.

Also surface a **Trucks not inspected today** list — the truck nobody
inspected is a bigger risk than the one that failed a check, and it is invisible
in a list that only shows submitted inspections.

---

## 15. INSPECTION HISTORY

Table on desktop, cards on mobile. Newest first.

Columns: Date · Truck · Driver · Odometer · Rating · Pass · Fail · Status · Sync

Filters: truck · driver · date range · status (`PASS` / `NEEDS ATTENTION`) ·
sync status. Plus a free-text search across truck number, driver name and notes.

Every filter must actually query — no client-side-only filtering of a
truncated first page.

---

## 16. INDIVIDUAL INSPECTION REPORT

Header: truck info · driver · date/time · location · odometer · overall rating ·
status badge · inspection id.

Then all 26 checks. **Failed checks render first, in a red-bordered "Faults"
block**, each with its driver note and its photos. Then the remaining checks
grouped by category — green check icon for PASS, grey dash for N/A.

Then: general notes · all inspection photos · Google Sheets sync status with
the error text and a **Retry Sync** button if failed.

Add a **Print / Save as PDF** view with the Pinch A Penny lockup, the fault
summary at the top, all 26 results, and driver + manager signature lines.

---

## 17. TRUCK DETAIL PAGE

Truck number · nickname · year/make/model · plate · VIN · current odometer ·
active status.

Then computed: latest inspection date · latest status · latest odometer ·
total inspections · inspections containing failures · a simple odometer-over-time
line chart.

Then that truck's inspection history, newest first.

---

## 18. TRUCK MANAGEMENT

A Trucks page for admins: **Add Truck**, **Edit Truck**, **Deactivate Truck**.

Form: Truck Number (required, unique) · Nickname · Year · Make · Model ·
License Plate · VIN · Starting Odometer · Notes.

Deactivating removes the truck from the driver dropdown. **It never deletes
inspection history.** There is no hard delete for trucks.

---

## 19–20. DESIGN & MOBILE

Follow §0 for colour and type. Beyond that:

- Mobile-first. Every important control ≥ 44px; PASS/FAIL/N/A ≥ 56px.
- No tiny checkboxes anywhere.
- Operable one-handed — primary actions in the bottom third of the screen.
- Sticky bottom navigation.
  Drivers: **Home · Inspect · History · Account**
  Managers: **Dashboard · Inspections · Trucks · Drivers**
- Green *only* for pass/success. Red *only* for fail/danger. Orange *only* for
  needs-attention. Gold is decoration and progress, never status.
- These screens get used outdoors in Florida sun — keep body text at
  `#212529` on white and never put grey text below `#767676` on a coloured fill.

---

## 21. PROTECT AGAINST DATA LOSS

While an inspection is in progress, persist the draft locally (localStorage or
IndexedDB) on every change, debounced.

If the driver navigates away and returns, restore the unfinished inspection and
tell them it was restored. Warn on `beforeunload` if any check has been answered.

**Do not create an Inspection record until Submit is pressed.** A draft is not
an inspection.

Provide **Discard Draft** with a confirmation dialog.

Photos are held in memory only while drafting. If a draft is restored and photos
could not be, say so plainly: *"3 photos could not be restored — please re-add
them."* Never silently drop them.

---

## 22. DUPLICATE PROTECTION

Generate `inspectionId` as `INSP-YYYYMMDD-XXXXX` where `XXXXX` is from a UUID.
Generate it **once, when the draft starts** — not at submit time — so a retry
reuses the same id.

Disable Submit on first press and keep it disabled through the whole request.
Enforce uniqueness on `inspectionId` at the database level, not just in the UI.

---

## 23. ODOMETER LOGIC

On successful submission, if `odometer > truck.currentOdometer`, update
`truck.currentOdometer`. Never lower it automatically — a typo must not
rewrite fleet history.

If the entered odometer is lower than stored, warn as described in §3 and let
the driver decide.

---

## 24. INITIAL DATA

Create `TRUCK-01`, `TRUCK-02`, `TRUCK-03` for development, each with
`isSampleData = true`.

Add an admin-only **Remove sample data** action that deletes every record with
`isSampleData = true`, with a confirmation. Sample data must be removable in
one click before launch.

---

## 25. CONFIGURATION

Provide an admin **Settings** page with fields for:

- `GOOGLE_SHEETS_WEBHOOK_URL` — paste the `/exec` URL here
- `GOOGLE_SHEETS_AUTH_TOKEN` — the shared secret
- A **Test Connection** button that GETs the URL and reports whether it returned
  JSON (good) or an HTML sign-in page (deployment permissions are wrong).

**Do not hardcode any endpoint. Do not invent a placeholder production URL.**

---

## 26. ARCHITECTURE RULE

```
DRIVER APP (phone)
      |
      v
BASE44 DATABASE                      <-- primary record, written first
      |
      v
BASE44 BACKEND SYNC FUNCTION         <-- server-side, holds the secret
      |
      v
GOOGLE APPS SCRIPT  ->  GOOGLE SHEET  <-- reporting mirror, not the record
```

The Google Sheet is a **mirror for reporting**, never the system of record. An
inspection stays safely stored in Base44 whether or not the sheet ever
receives it.

---

## 27. FINAL QUALITY CHECK

Verify all of the following before reporting the app complete:

- [ ] Driver can log in; admin can log in
- [ ] A driver cannot load another driver's inspection by guessing a URL
- [ ] Truck dropdown lists only active trucks
- [ ] Odometer required; negatives rejected; low-reading warning appears
- [ ] Location required; GPS button works and is not required
- [ ] Exactly 26 checks exist, with the labels and keys in §4
- [ ] Every check supports PASS, FAIL and N/A
- [ ] All 26 must be answered before submit
- [ ] FAIL requires a description; submit is blocked without one
- [ ] FAIL supports photos, attached to the specific check
- [ ] Rating required
- [ ] Inspection and 26 InspectionChecks rows save to Base44
- [ ] `inspectionId` unique and enforced by the database
- [ ] `passCount` + `failCount` + `naCount` = 26
- [ ] `status` is NEEDS ATTENTION when `failCount > 0`
- [ ] Truck `currentOdometer` updates upward only
- [ ] Double-clicking Submit creates exactly one record
- [ ] Photos persist and are visible in the manager report
- [ ] Draft survives navigating away and back
- [ ] Driver history shows only their own inspections
- [ ] Dashboard KPIs match the underlying data
- [ ] Every filter and the search box actually query
- [ ] Truck detail page shows that truck's history and odometer trend
- [ ] Backend sync function exists and the browser never calls Google directly
- [ ] A sync failure leaves the inspection intact and marked FAILED
- [ ] Retry Sync works and does not create a duplicate sheet row
- [ ] Mobile layout works at 360px wide
- [ ] No fake buttons, placeholder pages, dead links or simulated functionality

---

## WHAT I STILL NEED TO CONFIGURE MANUALLY

1. Paste the deployed Apps Script `/exec` URL into Settings as
   `GOOGLE_SHEETS_WEBHOOK_URL`.
2. Paste the matching shared secret as `GOOGLE_SHEETS_AUTH_TOKEN`.
3. Add the real Pinch A Penny trucks.
4. Invite the real drivers and managers, and assign roles.
5. Run **Remove sample data**.
6. Publish the app.
