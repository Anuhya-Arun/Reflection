# Reflection Privacy Policy

**Effective date: 18 September 2026**

Reflection (“Reflection”, “we”, “us”, or “our”) is an AI-powered Google Docs add-on that provides recruiter-style feedback on job, internship, scholarship, programme, and similar written applications.

This Privacy Policy explains how Reflection processes information when you use the add-on.

## 1. Eligibility

Reflection is currently available only to users who are **18 years of age or older**.

Reflection uses the Gemini API. Gemini’s current API terms do not permit API clients that are directed to, or likely to be accessed by, individuals under 18. Do not use Reflection if you are under 18.

## 2. Information Reflection processes

### Application and opportunity text

When you request a review, Reflection processes:

- The opportunity description you provide.
- The Google Docs text you choose to review, either as highlighted text or as the full document.
- Any rewrite text you enter before implementing it.

Reflection uses this text to generate the requested feedback, quality assessment, and suggested rewrite.

### Google account identifier

Reflection uses Google authorization to confirm that a request belongs to a user and to apply the monthly review allowance.

Reflection uses an opaque Google account identifier for this purpose. Reflection does not intentionally store your Google email address.

### Usage information

To enforce the free beta allowance and prevent abuse, Reflection stores:

- The current calendar month.
- The number of completed reviews in that month.
- Temporary request-reservation information used to prevent duplicate review requests.

### Saved opportunity description

Reflection stores the opportunity description you save for a Google Doc in Google Apps Script user properties. This allows Reflection to show the saved description when you reopen the add-on for that document.

### Temporary document location data

When you review highlighted text, Reflection stores a temporary Google Docs named range. This lets Reflection apply a rewrite to the originally reviewed passage after you click elsewhere in the document.

The temporary location is replaced by the next highlighted-text review and removed after a rewrite is applied.

## 3. How Reflection uses information

Reflection uses information only to:

- Generate the review, feedback, scores, and suggested rewrite you request.
- Remember an opportunity description for the relevant Google Doc.
- Apply a rewrite you choose to implement.
- Enforce free-plan usage limits and prevent abuse.
- Maintain and secure Reflection.

Reflection does not sell personal information or use your application text for advertising.

## 4. Services that process information

Reflection uses the following providers:

- **Google Docs and Google Apps Script** to provide the add-on and interact with the document you are editing.
- **Cloudflare Workers and Durable Objects** to process requests, verify authorization, apply rate limits, and maintain monthly usage counts.
- **Google Gemini API** to generate AI feedback and suggested rewrites.

When you request a review, your opportunity description and application text are sent to the Google Gemini API.

Reflection currently uses Gemini API unpaid quota. Under Google’s Gemini API terms, Google may use submitted content and generated responses to provide, improve, and develop its products and machine-learning technologies. Google states that human reviewers may read, annotate, and process API inputs and outputs for these purposes.

Do not submit highly sensitive, confidential, regulated, or personal information to Reflection while it uses Gemini API unpaid quota.

Google and Cloudflare may also process technical information necessary to operate their services, subject to their own policies and terms.

## 5. What Reflection does not do

Reflection does not:

- Sell your personal information.
- Display advertising.
- Intentionally store a history of application text or AI reviews on Reflection servers.
- Intentionally store your Google email address.
- Allow Reflection staff to routinely read your application text.

This does not limit processing by Google Gemini API under the unpaid-service terms described above.

## 6. Data retention

Reflection retains only the information needed for the add-on to operate:

- A saved opportunity description remains in Google Apps Script user properties until you replace or clear it.
- Monthly usage information is retained as an aggregate record and resets when a new calendar month begins and you next use Reflection.
- Temporary review-location data is replaced by a new highlighted-text review or removed after a rewrite is applied.
- Reflection does not intentionally retain application text or opportunity text after a review request is completed.

Third-party providers may retain information according to their own terms and policies.

## 7. Security

Reflection uses HTTPS to communicate between the Google Docs add-on, Cloudflare Worker, and Gemini API.

Gemini API credentials are stored as server-side secrets and are not included in the Google Docs add-on or exposed to users.

No system can guarantee absolute security. Please avoid submitting sensitive, confidential, financial, medical, legal, or regulated information.

## 8. Your choices

You can choose not to use Reflection for any document or passage.

You can edit any suggested rewrite before applying it. Reflection changes your Google Doc only after you select **Implement changes in Google Docs**.

For privacy questions, support, or data-related requests, contact:

**anuhya.arun2024@gmail.com**

## 9. Changes to this policy

Reflection may update this Privacy Policy as the product changes. The latest version will be available at this page with an updated effective date.

## 10. Contact

**Reflection**  
anuhya.arun2024@gmail.com