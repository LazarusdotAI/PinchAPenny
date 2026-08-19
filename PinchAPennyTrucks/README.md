# Pinch A Penny — Company Truck Checklist

Everything needed to get the fleet inspection app built correctly in Base44 and
wired to Google Sheets.

---

## The four files, in the order you'll use them

| # | File | What it's for |
|---|---|---|
| 1 | **`WHAT-CHANGED.md`** | **Read this first.** What I changed in your spec and why — including a live bug that has been corrupting your sheet. |
| 2 | **`BASE44-BUILD-SPEC.md`** | Paste this whole file into Base44 as the build prompt. |
| 3 | **`GOOGLE-SHEETS-SETUP.md`** | Ten-minute walkthrough to deploy the endpoint and get the `/exec` URL. |
| 4 | **`apps-script/Code.gs`** | The script itself. Paste into Extensions → Apps Script. |
| — | `design-reference.html` | Working, branded prototype. Open it in a browser — this is the visual and behavioural target for the Base44 build. |

---

## Read this before anything else

Your currently deployed Apps Script has a bug that makes the sheet lie.

It compares `checks[k] === 'fail'` (lowercase), but the `v2-final` app sends
`"FAIL"` (uppercase). The comparison never matches, so **`failCount` is always
0** and every row is stamped:

```
PASS - 0/26
```

A truck could fail all 26 checks and the sheet would record a pass. Only the
oldest of your three apps sent lowercase, so whether a given row is trustworthy
depends on which version the driver happened to open.

Fixed in `apps-script/Code.gs`. Full detail in `WHAT-CHANGED.md` §1.

**Spot-check your historical rows before trusting them.** Sort by `FailCount`;
if every value is 0, none of those rows are reliable.

---

## Suggested order of work

1. Read `WHAT-CHANGED.md` — 5 minutes, and it explains every decision.
2. Do `GOOGLE-SHEETS-SETUP.md` end to end. Run `testEndpoint` and confirm it
   logs **ALL CHECKS PASSED** before deploying. Keep the `/exec` URL and the
   shared secret.
3. Open `design-reference.html` on your phone so you know what you're aiming at.
4. Paste `BASE44-BUILD-SPEC.md` into Base44 and let it build.
5. Work through §27 of the spec — the quality checklist — against what it
   produced. Base44 will get some of it wrong; that list is how you find out
   which parts.
6. Paste the URL and secret into the app's Settings page and press
   **Test Connection**.

---

## The inspection itself

The original 26 checks, unchanged:

| Section | Checks |
|---|---|
| 1 · Exterior cleanliness & condition | 8 |
| 2 · Interior cleanliness & condition | 8 |
| 3 · Structural integrity & safety | 10 |
| **Total** | **26** |

Each has **PASS / FAIL / N/A**. A FAIL requires a written description before
the inspection can be submitted — that one rule is the difference between a
checklist that produces work orders and one that produces a red button nobody
explains.

`passCount + failCount + naCount = 26`.
`status = NEEDS ATTENTION` if `failCount > 0`, otherwise `PASS`.

---

## Architecture

```
DRIVER APP  (phone)
      |
      v
BASE44 DATABASE                      <-- primary record, written FIRST
      |
      v
BASE44 BACKEND SYNC FUNCTION         <-- server-side, holds the shared secret
      |
      v
GOOGLE APPS SCRIPT  ->  GOOGLE SHEET  <-- reporting mirror, NOT the record
```

An inspection stays safely in Base44 whether or not the sheet ever receives it.
A failed sync is a management problem, never a driver problem — the driver sees
the success screen either way.

**The browser must never call Google directly.** Two reasons: the shared secret
would be exposed, and from a browser `Content-Type: application/json` triggers
a CORS preflight that Apps Script cannot answer. Server-side, neither applies.

---

## Brand

Values taken from `pinchapenny.com/css/app.css` and their logo SVG:

| Token | Hex | Job |
|---|---|---|
| navy | `#20419a` | nav, headers, primary buttons |
| **badge navy** | `#102C85` | **the circle-P mark only** — genuinely darker than the above |
| pool blue | `#007cb5` | links, accents, active states |
| penny gold | `#ffda02` | progress, stars, the 4px rule under the nav |
| green | `#11872d` | PASS only |
| red | `#e7201d` | FAIL only |
| orange | `#f99d2a` | NEEDS ATTENTION only |

Type: **Montserrat** (headings) + **Figtree** (body), substituting for HCo
Gotham. **Weights 400 / 700 / 900 only** — their site loads Gotham in exactly
three weights, and a 600-weight subhead is the fastest way to look wrong.

Buttons are full pills (`border-radius: 9999px`), weight 700. Links keep their
underline.

---

## What only you can do

1. Paste the deployed `/exec` URL into Base44 Settings as
   `GOOGLE_SHEETS_WEBHOOK_URL`.
2. Paste the matching shared secret as `GOOGLE_SHEETS_AUTH_TOKEN`.
3. Add the real trucks.
4. Invite the real drivers and managers, assign roles.
5. Run **Remove sample data**.
6. Publish.

---

## One thing to decide

Your spec asked for **dark navy navigation**, and everything here is built that
way. But pinchapenny.com's own chrome is a **white** bar — navy is the resting
link colour, pool blue is the active state, and the only navy strip is a thin
`#1a347b` announcement bar above the header.

Navy nav is defensible for an internal tool that shouldn't look like the
storefront. If you'd rather match the website exactly, flip the nav to white
with navy text and pool-blue active states; nothing else in the spec changes.
