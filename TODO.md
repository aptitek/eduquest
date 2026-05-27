# TODO

This file tracks the remaining project backlog. Completed items are kept only when they describe important shipped capabilities.

## Infrastructure

[ ] Add a CI workflow that runs `task lint`, frontend build, backend type-check, and tests.
[ ] Add a deployment workflow for the backend Cloudflare Worker.
[ ] Add a deployment workflow for the frontend hosting target.

## Frontend And Design System

[ ] Add loading skeletons for every API-backed organism that still renders empty states directly.
[ ] Persist the selected locale per user and infer the initial locale from browser settings before falling back to French.
[ ] Continue replacing decorative emoji text with Lucide icons or localized plain text in app UI.
[ ] Move remaining feature/store/API access out of presentational components where practical.

## Account And Profile

[ ] Add manual user status controls in the header for online and busy states.

## Admin And Management

[ ] Add create/update/delete routes for schools, campuses, cohorts, guilds, activities, reward cards, and notifications.
[ ] Support adding empty rows/cards for new users and schools with disabled confirmation until a valid change exists.

---

[ ] The activity card should have a minimum width that will force the map out of the way and responsively stack vertically when needed.
[ ] Modify the color selector component to ommit color names and be much more compact
[ ] edges on the map will have animations and colors depending on the step with automatic ones like fog and manual ones set by the admin to encourage students to move to the target node
[ ] When the cursor hovers on the occupancy rings it can trigger a rapid expansion shrink loop that flickers violently
[ ] Moving the cursor over the icon selector can cause flickering of the entire activity card layout
[ ] Review the login page, especially the text. Add a pink alpha ribbon on the login card
[ ] In the activity card, the gold ribbon uses gray text instead of base3 white text using token design
[ ] Add the fog on the map moving slowly in flat clouds over and around the foggy codes and all around the map except in a big area around unlocked activities
[ ] 

AUDIT
[ ] Remove ALL hard coded mock data and translate everything using i18n except dynamic fields in the database like descriptions and names of guild/characters
[ ] Move mock data in the database and wire all the relevant API. Also add much more generated data like 3 cohorts of 10 to 30 students, with one that is yet to start making characters or even fill the profile card and one well along the game with guilds and such.
[ ] Refactor the API to follow DRY and KISS principles along with following the industry best practices
[ ] Render missing translation keys in a visible debug style during development.
[ ] Check ALL raw colors and enforce token design. Also refactor the tokens completely to factorize them into as little tokens and as generic tokens as possible. Re-check then for any and all non solarized colors in the theme.
[ ] Do a comprehensive security audit of the entire app, especially sanitation of the inputs and prevent ANY privilege escalation from the students.
[ ]
