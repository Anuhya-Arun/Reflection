# Reflection

Reflection is an AI-powered Google Docs Editor Add-on that helps applicants strengthen job, internship, scholarship, and programme applications through practical recruiter-style feedback.

Users can review an entire document or highlighted text, see a structured quality assessment, edit an AI rewrite, and apply it directly to the originally reviewed passage in Google Docs.

## What Reflection does

- Saves an opportunity description for each Google Doc
- Reviews either the full document or highlighted text
- Identifies strengths, concerns, and missing evidence
- Explains likely recruiter impression
- Suggests practical improvements
- Scores relevance, clarity, evidence, and impact
- Generates an editable suggested rewrite
- Applies an AI or user-edited rewrite to the reviewed location
- Remembers the reviewed highlighted passage even after the user clicks elsewhere in the document
- Includes a free beta allowance of 25 reviews per user per month

## Product flow

1. Open **Reflection** from the Google Docs Extensions menu.
2. Add and save the opportunity description.
3. Open the **Review** tab.
4. Choose one option:
   - **Review full document**
   - **Review highlighted text**
5. Read the recruiter feedback and quality scores.
6. For a highlighted-text review, edit the suggested rewrite if desired.
7. Click **Implement changes in Google Docs**.

Reflection stores the reviewed text range until the next successful highlighted review or until the rewrite is applied. The user does not need to keep the original text selected.

## Architecture

```text
Google Docs Editor Add-on
│
├── Apps Script
│   ├── Code.gs
│   ├── Sidebar.html
│   └── appscript.json
│
└── Cloudflare Worker
    │
    ├── Google OAuth token verification
    ├── Per-user monthly usage tracking
    ├── Request rate limiting
    │
    └── Gemini API
        └── Structured recruiter feedback and rewrite
```

The Google Docs Add-on is the user-facing product.

The Cloudflare Worker handles AI requests, authentication, rate limiting, and usage limits. This keeps the Gemini API key out of Apps Script and out of the browser.

## Repository layout

```text
app-script/
  Code.gs                    Apps Script server-side functions
  Sidebar.html               Google Docs sidebar interface
  appscript.json             Add-on manifest and OAuth scopes

backend/
  src/
    durable-objects/
      UserUsage.ts           Per-user monthly review tracking
    routes/
      review.ts              Review endpoint
      usage.ts               Usage endpoint
    services/
      auth.ts                Google token verification
      gemini.ts              Gemini API integration
      review.ts              Prompt and response validation
    index.ts                 Worker entry point
  test/                      Worker tests
  wrangler.jsonc             Cloudflare Worker configuration
```

## Requirements

* Google account
* Google Cloud project for OAuth configuration
* Google Apps Script project
* Cloudflare account
* Gemini API key
* Node.js 20 or newer

## Backend setup

Install dependencies:

```bash
cd backend
npm install
```

Log in to Cloudflare:

```bash
npx wrangler login
```

Add the Gemini API key as a Cloudflare Worker secret:

```bash
npx wrangler secret put GEMINI_API_KEY
```

Start local Worker development:

```bash
npm run dev
```

Run tests:

```bash
npm run test
```

Regenerate Worker binding types after changing `wrangler.jsonc`:

```bash
npm run types
```

Deploy the Worker:

```bash
npm run deploy
```

## Apps Script setup

1. Create an Apps Script project for Reflection.
2. Add these files from `app-script/`:

   * `Code.gs`
   * `Sidebar.html`
   * `appscript.json`
3. Configure the Google Cloud OAuth consent screen.
4. Add yourself and beta testers as test users while the OAuth app is in testing.
5. Create or update the Google Docs Editor Add-on test deployment.
6. Install the test deployment in Google Docs.
7. Reload the Google Doc and open Reflection from the Extensions menu.

## Free beta limits

Reflection currently provides:

* **25 reviews per user per month**
* **5 review requests per minute per user**

The monthly allowance is defined in:

```text
backend/src/durable-objects/UserUsage.ts
```

The request rate limit is defined in:

```text
backend/wrangler.jsonc
```

## Security

* Gemini API keys are stored only as Cloudflare Worker secrets.
* Apps Script sends the user's Google OAuth token to the Worker.
* The Worker verifies the token before allowing review or usage requests.
* Monthly review usage is stored per authenticated user in a Cloudflare Durable Object.
* Review requests are rate-limited.
* Do not commit `.dev.vars`, `.env` files, API keys, or generated local Cloudflare files.

## Beta testing checklist

Before inviting more users, verify:

* A new user can authorize Reflection successfully.
* Saving an opportunity works.
* Full-document review works.
* Highlighted-text review works.
* The selected text can be deselected before applying a rewrite.
* A user-edited custom rewrite can be applied.
* The review allowance displays `25 of 25`.
* A second user receives their own separate allowance.
* Worker logs do not expose application text, OAuth tokens, or secrets.
* Gemini quota and Cloudflare logs are monitored during testing.

## Current status

Reflection is in private beta. It is intended for invited testers while product quality, reliability, AI cost, and user feedback are evaluated.

## Planned improvements

* Better rewrite quality controls
* Review history
* More detailed application scoring
* Improved handling for complex document structures
* Usage analytics
* Public Google Workspace Marketplace listing
* Paid plans after beta validation
