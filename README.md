# Mindrise

A multi-page, static site: plain HTML, CSS and JavaScript. No build step, no dependencies.

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`).

## Pages
- `index.html` Home
- `approach.html` The ideas behind the tools (long read with notes and figures)
- `products.html` Recall, Plot and Cadence, each with a working demonstration
- `courses.html` Catalogue with filters and expanding syllabi
- `pricing.html` Plans, billing switch, questions
- `contact.html` Form that opens the visitor's email app

## Files
- `css/site.css` the whole design system
- `js/core.js` helpers and saved settings (reading mode, motion, sound)
- `js/ambient.js` the shared atmosphere: a different living background per page, reading lamp, ink trail, scroll-drawn figures, glossary notes, hover figure, page transitions
- `js/products.js`, `courses.js`, `pricing.js`, `contact.js` page behaviour

Script order matters: `core.js`, then `ambient.js`, then the page script.

## Notes
- Each page picks its background with `<body data-scene="...">`: `flow`, `contour`, `dots`, `ruled`, `halftone`.
- Visitors can switch off motion or switch on sound from the footer; sound is off by default.
- Pricing, plan limits, FAQ answers, course details and the contact address (`hello@mindrise.com`) are placeholders. Change the address in `contact.html` (`data-to`).
- Fonts (Newsreader, Inter) load from Google Fonts; the site falls back to system serif/sans without them.
