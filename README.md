# LawCompass web app

A dependency-free, multi-page JavaScript conversion of the WinForms **Doc. contract** application. The original desktop source and its local backend integrations were not edited.

## Run locally

Open `index.html` in a modern browser, or serve this folder with any static web server.

## Included features

- Public landing and local demo sign-in pages
- Separate Dashboard, document gallery, document builder, legal-help, dictionary, history, compliance, plain-language helper, and pricing pages
- Guided Employment, NDA, Service, Will, and Lease templates
- Browser-downloadable `.doc` document drafts
- Local document history (browser storage)
- Supabase-backed profile viewing and editing for signed-in users
- Gemini follow-up questions about the current contract explanation
- Legal dictionary, law-firm matter finder, compliance checklist, and plain-language helper
- Responsive desktop and mobile layout

## Integration note

The static pages use the paired Express API for authentication, Supabase profile reads and updates, and contract explanation follow-up questions. Configure `GEMINI_API_KEY` on the backend (including Render) to enable Gemini follow-ups; the key is never sent to the browser. The plan chooser is a browser-local demo preview, and document history remains in this browser. Payment activation and a real Enterprise contact request are not wired up. The contract's initial plain-English reading remains a browser-side heuristic; only follow-up questions use Gemini.
