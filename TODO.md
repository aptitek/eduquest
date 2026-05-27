# TODO

This file tracks the remaining project backlog. Completed items are kept only when they describe important shipped capabilities.

## Infrastructure

[ ] Add a CI workflow that runs `task lint`, frontend build, backend type-check, and tests.
[ ] Add a deployment workflow for the backend Cloudflare Worker.
[ ] Add a deployment workflow for the frontend hosting target.

## Frontend And Design System

[ ] Add loading skeletons for every API-backed organism that still renders empty states directly.
[ ] Persist the selected locale per user and infer the initial locale from browser settings before falling back to French.
[ ] Render missing translation keys in a visible debug style during development.
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
[ ] 