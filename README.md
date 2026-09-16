# Reflection

Reflection is an AI-powered Google Docs Editor Add-on that helps applicants improve job, internship, scholarship, and programme applications through recruiter-style feedback.

## Product flow

1. Open Reflection from Google Docs.
2. Save the opportunity description for the current document.
3. Review either the full document or highlighted text.
4. Receive strengths, concerns, recruiter impression, suggested improvements, quality scores, and an AI rewrite.
5. For highlighted plain text, optionally implement the rewrite directly in Google Docs.

## Architecture

```text
apps-script/
  Code.gs
  Sidebar.html
  appsscript.json

backend/
  Cloudflare Worker
    POST /review
      ↓
    Gemini 3.5 Flash-Lite
      ↓
    Structured recruiter feedback and rewrite
```

The Google Docs Editor Add-on is the product interface. The Cloudflare Worker keeps the Gemini API key on the server and enforces review allowances and rate limits.

## Repository layout

```text
app-script/
  Code.gs          Apps Script server functions
  Sidebar.html     Google Docs sidebar UI
  appscript.json   Add-on manifest and OAuth scopes

backend/
  src/             Cloudflare Worker source
  test/            Worker tests
  wrangler.jsonc   Worker bindings and deployment configuration
```

## Backend development

```bash
cd backend
npm install
npm run dev
```

Generate Worker types after changing `wrangler.jsonc`:

```bash
npm run types
```

Deploy the Worker:

```bash
npm run deploy
```

## Apps Script deployment

Copy the files from `app-script/` into the Reflection Apps Script project, then update its Editor Add-on test deployment and reload the Google Doc.

## Security

The Worker authenticates requests with the Google OAuth token from Apps Script, stores per-user monthly review usage in a Durable Object, and rate-limits review requests. The Gemini API key must remain a Cloudflare Worker secret and must never be copied into Apps Script.
