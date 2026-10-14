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
- `js/ambient.js` the shared atmosphere: soft window light with drifting dust that is stirred by moving air (cursor) and settles while a focus session runs, a reading lamp, scroll-drawn figures, words that darken as you read, glossary notes, hover figure, page transitions
- `js/reading.js` (Approach) select any passage to mark it; marks are kept on the device
- `js/geometry.js` (Home) Euclid's first proposition, draggable
- `js/backgrounds.js` the extra background scenes (still water, contours, colour wash) and the Background picker in the footer
- `js/products.js`, `courses.js`, `pricing.js`, `contact.js` page behaviour

Script order matters: `core.js`, then `ambient.js`, then the page script.

## Notes
- Backgrounds: visitors choose one in the footer (Reading → Background), or press `B` to cycle. Alive: Window light (default), Still water, Contours, Colour wash. Still, nothing moves: Plain paper, Linen, Graph paper, and the solid colours Sage, Rosewater, Fog, Butter, Dusk, Walnut, Graphite. The choice is remembered. Add or edit options in the `SURFACES` list in `js/core.js`.
- Visitors can also switch motion off from the footer, which freezes the alive backgrounds.
- Visitors can switch off motion or switch on sound from the footer; sound is off by default.
- Pricing, plan limits, FAQ answers, course details and the contact address (`hello@mindrise.com`) are placeholders. Change the address in `contact.html` (`data-to`).
- Fonts (Newsreader, Inter) load from Google Fonts; the site falls back to system serif/sans without them.
