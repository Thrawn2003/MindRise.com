# Mindrise

A multi-page, static site: plain HTML, CSS and JavaScript. No build step, no dependencies.

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`).

## Pages
- `index.html` Home
- `about.html` MindRise as the parent company of AAUGS Corp.: story, team and values
- `approach.html` The research behind the tools (long read with notes and figures), ending in **Rest**: four stress relievers and links to the AAUGS sites
- `labs.html` Six small science and maths experiments, each of which can become the page's live background
- `sites.html` The MindRise family of websites: AAUGS Corp. plus UNO, QuizCraft, Colordle, Library Catalog, ModelView and AAUGS Builder, linked directly, with a Games/Tools/MindRise family filter
- `services.html` Services (software development, website creation, ongoing support), free software for K-12, and custom super-projects priced up to $1,500
- `contact.html` Form that opens the visitor's email app (to `contact@aaugs.com`)

## Files
- `css/site.css` the whole design system
- `js/core.js` helpers and saved settings (reading mode, motion, sound)
- `js/ambient.js` the shared atmosphere: soft window light with drifting dust that is stirred by moving air (cursor) and settles while a focus session runs, a reading lamp, scroll-drawn figures, words that darken as you read, glossary notes, hover figure, page transitions
- `js/rest.js` (Approach, chapter V) four quiet stress relievers: breathing, bubbles, a mirrored mandala and a calm pairs game, none with scores or timers
- `js/reading.js` (Approach) select any passage to mark it; marks are kept on the device
- `js/geometry.js` (Home) Euclid's first proposition, draggable
- `js/scenes.js` six experiment backgrounds: pendulum wave, murmuration, Game of Life, harmonograph, ripple tank, formula chalkboard
- `js/backgrounds.js` three more scenes (still water, contours, colour wash), the floating Background button and the picker
- `js/labs.js`, `sites.js`, `faq.js`, `contact.js`, `rest.js` page behaviour

Script order matters: `core.js`, then `ambient.js`, then the page script.

## Company information
Taken from the AAUGS website (aaugs.com): the legal name (Auroris Advanced Utility and General Software Corporation), the story timeline, team names and roles, values, the three services, the free K-12 promise ("no hidden costs, no ads, no data mining"), the 24-hour reply promise and `contact@aaugs.com`. The About page names MindRise as the parent company of AAUGS. Switch the email address in `contact.html` (`data-to`) and the footer once a mindrise.com address exists.

## Notes
- Backgrounds: visitors choose one with the floating **Background** button (bottom right), or press `B` to cycle (Shift+B goes back). Each has its own colours. Alive (13): Window light (default), Still water, Deep water, Contours, Night map, Colour wash, Aurora, Pendulum wave, Murmuration, Game of Life, Harmonograph, Ripple tank, Chalkboard. Still, nothing moves (10): Plain paper, Linen, Graph paper, Sage, Rosewater, Fog, Butter, Dusk, Walnut, Graphite. The choice is remembered. Add or edit options in the `SURFACES` list in `js/core.js`; scenes register themselves on `Mindrise.scenes`.
- Visitors can also switch motion off from the footer, which freezes the alive backgrounds.
- Visitors can switch off motion or switch on sound from the footer; sound is off by default.
- The "super-project" price ceiling ($1,500), its description and the FAQ answers are written from the brief and should be confirmed before launch. Site descriptions and links on `sites.html` and in the Rest section come from the AAUGS portfolio page. `mindrise.com` was not live when this was written, so it is not linked. Change the address in `contact.html` (`data-to`).
- Fonts (Newsreader, Inter) load from Google Fonts; the site falls back to system serif/sans without them.
