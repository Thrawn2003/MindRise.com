# Mindrise

A multi-page, static site: plain HTML, CSS and JavaScript. No build step, no dependencies.

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`).

## Pages
- `index.html` Home
- `approach.html` The ideas behind the tools (long read with notes and figures)
- `products.html` Recall, Plot and Cadence, each with a working demonstration
- `sites.html` Six free websites from the AAUGS team (UNO, QuizCraft, Colordle, Library Catalog, ModelView, AAUGS Builder), linked directly, with a Games/Tools filter
- `pricing.html` Free websites for students and educators, and custom super-projects priced up to $1,500, plus questions
- `contact.html` Form that opens the visitor's email app

## Files
- `css/site.css` the whole design system
- `js/core.js` helpers and saved settings (reading mode, motion, sound)
- `js/ambient.js` the shared atmosphere: soft window light with drifting dust that is stirred by moving air (cursor) and settles while a focus session runs, a reading lamp, scroll-drawn figures, words that darken as you read, glossary notes, hover figure, page transitions
- `js/rest.js` (Approach, chapter V) four quiet stress relievers: breathing, bubbles, a mirrored mandala and a calm pairs game, none with scores or timers
- `js/reading.js` (Approach) select any passage to mark it; marks are kept on the device
- `js/geometry.js` (Home) Euclid's first proposition, draggable
- `js/backgrounds.js` the extra background scenes (still water, contours, colour wash) and the Background picker in the footer
- `js/products.js`, `sites.js`, `pricing.js`, `contact.js`, `rest.js` page behaviour

Script order matters: `core.js`, then `ambient.js`, then the page script.

## Audience and offer
The copy is written for students and educators. The sites on `sites.html` are free for both. Larger custom builds ("super-projects") are scoped with the customer and priced up to $1,500. The plan cards on `pricing.html` have anchors (`#free`, `#custom`) that other pages link to.

## Notes
- Backgrounds: visitors choose one in the footer (Reading → Background), or press `B` to cycle (Shift+B goes back). Each has its own colours, so changing it is always clearly visible. Alive (7): Window light (default), Still water, Deep water, Contours, Night map, Colour wash, Aurora. Still, nothing moves (10): Plain paper, Linen, Graph paper, Sage, Rosewater, Fog, Butter, Dusk, Walnut, Graphite. The choice is remembered. Add or edit options in the `SURFACES` list in `js/core.js`.
- Visitors can also switch motion off from the footer, which freezes the alive backgrounds.
- Visitors can switch off motion or switch on sound from the footer; sound is off by default.
- The pricing wording, FAQ answers, what a super-project includes, the Recall/Plot/Cadence educator features, and the contact address (`hello@mindrise.com`) are placeholders to be confirmed before launch. The site descriptions and links on `sites.html` and in the Rest section come from the AAUGS portfolio page. Change the address in `contact.html` (`data-to`).
- Fonts (Newsreader, Inter) load from Google Fonts; the site falls back to system serif/sans without them.
