# Mindrise

A multi-page, static site: plain HTML, CSS and JavaScript. No build step, no dependencies.

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`).

## Pages
- `index.html` Home
- `about.html` MindRise's story, team and values
- `approach.html` The research behind the tools (long read with notes and figures), ending in **Rest**: four stress relievers and links to MindRise's free games and tools
- `labs.html` Four small science and maths experiments, each of which can become the page's live background
- `sites.html` MindRise's free websites: UNO, QuizCraft, Colordle, Library Catalog, ModelView and MindRise Builder, linked directly, with a Games/Tools filter
- `services.html` Services (software development, website creation, ongoing support), free software for K-12, and custom super-projects priced up to $1,500
- `terms.html` Privacy & Terms: plain-words summary plus nine numbered articles, including binding "shall not" commitments on advertising and data mining
- `contact.html` Form that opens the visitor's email app (address set in `data-to`)

## Files
- `css/site.css` the whole design system
- `js/core.js` helpers and saved settings (reading mode, motion, sound)
- `js/ambient.js` the shared atmosphere: soft window light with drifting dust that is stirred by moving air (cursor) and settles while a focus session runs, a reading lamp, scroll-drawn figures, words that darken as you read, glossary notes, hover figure, page transitions
- `js/rest.js` (Approach, chapter V) four quiet stress relievers: breathing, bubbles, a mirrored mandala and a calm pairs game, none with scores or timers
- `js/reading.js` (Approach) select any passage to mark it; marks are kept on the device
- `js/geometry.js` (Home) Euclid's first proposition, draggable
- `js/gate.js` the agreement gate shown to first-time visitors (see Notes)
- `js/scenes.js` four experiment backgrounds: murmuration, Game of Life, harmonograph, ripple tank
- `js/backgrounds.js` two more scenes (still water, contours), the floating Background button and the picker
- `js/labs.js`, `sites.js`, `faq.js`, `contact.js`, `rest.js` page behaviour

Script order matters: `core.js`, then `ambient.js`, then the page script.

## Company information
Story timeline, team names and roles, values, the three services, the free K-12 promise ("no hidden costs, no ads, no data mining"), the 24-hour reply promise and the contact address. The site links to the live project sites at their current addresses. Switch the email address in `contact.html` (`data-to`) and the footer once a mindrise.com address exists.

## Notes
- **Agreement gate:** the first time someone opens any page they see the promises and must agree to the Privacy & Terms (`terms.html`, which stays readable without agreeing but, until then, shows only the terms with no way into the rest of the site). The record (version and date) lives only in their browser. To ask everyone again after changing the terms, bump `TERMS_VERSION` in the page generator and rebuild. This is a browser-side consent notice, not access control: anyone can read the HTML source or disable JavaScript.
- The terms are a drafted template. Have a lawyer review them (governing law, company name and address, and a check that every linked free tool really has no ads or data mining) before relying on them.
- Backgrounds: visitors choose one with the floating **Background** button (bottom right), or press `B` to cycle (Shift+B goes back). Each has its own colours. Alive (9): Window light, Still water, Deep water (the default), Contours, Night map, Murmuration, Game of Life, Harmonograph, Ripple tank. Still, nothing moves (6): Plain paper, Graph paper, Sage, Fog, Butter, Dusk. The choice is remembered. Add or edit options in the `SURFACES` list in `js/core.js`; scenes register themselves on `Mindrise.scenes`.
- Visitors can also switch motion off from the footer, which freezes the alive backgrounds.
- Visitors can switch off motion or switch on sound from the footer; sound is off by default.
- The "super-project" price ceiling ($1,500), its description and the FAQ answers are written from the brief and should be confirmed before launch. Site descriptions and links on `sites.html` and in the Rest section come from the existing portfolio page. `mindrise.com` was not live when this was written, so it is not linked. Change the address in `contact.html` (`data-to`).
- Fonts (Newsreader, Inter) load from Google Fonts; the site falls back to system serif/sans without them.
