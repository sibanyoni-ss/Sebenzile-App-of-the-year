# LawBuddy web app

A dependency-free, multi-page JavaScript conversion of the WinForms **Doc. contract** application. The original desktop source and its local backend integrations were not edited.

## Run locally

Open `index.html` in a modern browser, or serve this folder with any static web server.

## Included features

- Public landing and local demo sign-in pages
- Separate Dashboard, document gallery, document builder, legal-help, dictionary, history, compliance, plain-language helper, and pricing pages
- Guided Employment, NDA, Service, Will, and Lease templates
- Browser-downloadable `.doc` document drafts
- Local document history (browser storage)
- Legal dictionary, law-firm matter finder, compliance checklist, and plain-language helper
- Responsive desktop and mobile layout

## Integration note

The original desktop application calls local authentication and document-template APIs. This front-end deliberately makes no API, database, payment, analytics, font, or other remote-system calls. It stores the demo profile and document history only in the browser's `localStorage`. Connect explicitly designed backend endpoints only when production authentication, server-side document generation, payments, email, or shared records are required.
