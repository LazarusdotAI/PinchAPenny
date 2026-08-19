# Google Sheets setup — Pinch A Penny Fleet Inspection

About ten minutes, once. Do this **before** you finish the Base44 build, so you
have the `/exec` URL ready to paste into Settings.

---

## 1. Create the sheet

New Google Sheet, named e.g. **Pinch A Penny — Truck Inspections**.

**Leave it completely empty.** Do not add a header row — the script writes its
own, formatted in Pinch A Penny navy, and freezes it. If you pre-add headers
that don't match exactly, columns will drift.

---

## 2. Paste the script

**Extensions → Apps Script.** Delete everything in `Code.gs` and paste the
contents of `apps-script/Code.gs` from this folder. Save (💾).

---

## 3. Set the shared secret

Generate a random string — this works in any terminal:

```powershell
[Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Max 256 }))
```

Near the top of the script, set:

```js
var SHARED_SECRET = "paste-the-string-here";
```

Save. You'll paste the same value into Base44 in step 7.

> Leaving it `""` disables the check and makes your endpoint publicly
> writable by anyone who learns the URL. Only do that for a throwaway test.

---

## 4. Run the self-test

In the editor, select **`testEndpoint`** from the function dropdown and press
**Run**. Authorise when prompted (your own account, "Advanced → Go to project"
if you see the unverified-app warning — it's your script).

Open **View → Logs**. You want:

```
*** ALL CHECKS PASSED *** — case handling, tally, status,
duplicate guard and read-back all working. Delete row 2.
```

If it prints `*** FAILED ***` it tells you exactly which assertion broke. Do
not deploy until this passes.

Then delete the test row from the sheet.

---

## 5. Deploy

**Deploy → New deployment → ⚙ → Web app**

| Setting | Value |
|---|---|
| Description | `v3.1 initial` |
| Execute as | **Me** |
| Who has access | **Anyone** |

> **"Anyone" — not "Anyone with a Google account".**
> This is the single most common failure. With the wrong option, Google
> returns a *200 OK* HTML sign-in page instead of JSON. The request looks
> like it succeeded and nothing ever reaches your sheet.

Click **Deploy**, authorise, and copy the URL ending in **`/exec`**.

---

## 6. Verify it's public

Paste the `/exec` URL into a browser — ideally in a private window, or on your
phone with mobile data, so you're not signed in.

You should see JSON:

```json
{"result":"success","ping":true,"service":"Pinch A Penny Fleet Inspection",
 "version":"3.1.0","secured":true,"sheet":"Inspections", ...}
```

If you see a Google sign-in page, go back to step 5 and fix **Who has access**.

---

## 7. Paste into Base44

Settings page:

| Field | Value |
|---|---|
| `GOOGLE_SHEETS_WEBHOOK_URL` | the `/exec` URL |
| `GOOGLE_SHEETS_AUTH_TOKEN` | the secret from step 3 |

Press **Test Connection**. It should report the version string.

---

## 8. Columns the script writes

Created automatically. Listed so you can build pivots and filter views without
guessing.

| Col | Header | Notes |
|---|---|---|
| A | `CapturedAt` | Phone clock, when the driver submitted |
| B | `InspectionID` | **Idempotency key. Never sort, reorder or edit this column** |
| C | `TruckID` | `TRUCK-01` |
| D | `DriverName` | |
| E | `Date` | Inspection date |
| F | `Odometer` | |
| G | `Location` | |
| H | `Rating` | 1–5 |
| I | `PassCount` | |
| J | `FailCount` | |
| K | `TotalChecks` | 26 |
| L | `Status` | `PASS` / `NEEDS ATTENTION`, colour-coded |
| M | `FailedItems` | Plain English, pipe-separated — **the column managers read** |
| N | `Notes` | |
| O | `PhotoCount` | Photos live in Base44, never in the sheet |
| P | `ChecksJSON` | Full detail for audit |
| Q | `ReceivedAt` | **Server clock. Sort and report on this**, not column A |

Rows with failures are tinted red automatically.

> **Why sort on `ReceivedAt`.** Column A is whatever the phone's clock said. A
> phone with the wrong date — or a driver who changed it — writes a wrong
> `CapturedAt`. `ReceivedAt` is stamped by Google and cannot be spoofed.

---

## Re-deploying after you edit the script

This trips up everyone:

> **Deploy → Manage deployments → ✏ pencil → Version: New version → Deploy**

Editing and saving the file does **not** change what the live URL runs.

**Do not use "New deployment"** — that mints a *different* `/exec` URL and
orphans the one saved in Base44. Sync will start failing with no obvious cause.

After redeploying, hit the `/exec` URL in a browser and confirm the `version`
field changed. That's the only reliable way to know what's actually live.

---

## Troubleshooting

| What you see | Cause | Fix |
|---|---|---|
| HTML sign-in page instead of JSON | Wrong access setting | Redeploy with **Who has access: Anyone** |
| `{"code":"UNAUTHORIZED"}` | Token mismatch | `SHARED_SECRET` and `GOOGLE_SHEETS_AUTH_TOKEN` must match exactly, no stray whitespace |
| `{"code":"RESERVED_KEY"}` | A field or check key is named `c` or `sid` | Rename it. Google's frontend 405s on those |
| `{"code":"BUSY"}` | Two submissions collided | Retryable — Base44 backs off automatically |
| Rows appear twice | An old script without the duplicate guard is still deployed | Redeploy as **New version**, confirm `version` in the ping |
| Nothing arrives, no error | Almost always the sign-in page treated as success | Check `googleSheetsSyncError` in Base44 |
| `Anyone` option is missing entirely | Google Workspace admin policy blocks anonymous web apps | Host the script on a personal Google account, or ask the Workspace admin to allow it |

---

## A note on scale

The duplicate lookup scans the most recent 2,000 rows and is backed by a
6-hour cache, so it stays fast as the sheet grows. At roughly 3 trucks
inspected daily that window covers well over a year of retries — far longer
than any retry could plausibly arrive.

If the fleet grows a lot, raise `LOOKUP_WINDOW` or move reporting to a
database. The sheet is a **reporting mirror**, not the system of record —
Base44 holds the real data.
