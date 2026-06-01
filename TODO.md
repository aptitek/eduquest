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

[x] The activity card should have a minimum width that will force the map out of the way and responsively stack vertically when needed.
[x] Modify the color selector component to ommit color names and be much more compact
[x] edges on the map will have animations and colors depending on the step with automatic ones like fog and manual ones set by the admin to encourage students to move to the target node
[x] When the cursor hovers on the occupancy rings it can trigger a rapid expansion shrink loop that flickers violently
[x] Moving the cursor over the icon selector can cause flickering of the entire activity card layout
[x] Review the login page, especially the text. Add a pink alpha ribbon on the login card
[x] In the activity card, the gold ribbon uses gray text instead of base3 white text using token design
[x] Add the fog on the map moving slowly in flat clouds over and around the foggy codes and all around the map except in a big area around unlocked activities
[x] The podium and guild decks are no longer animated like the reward deck ENSURE they all use the SAME generic styla and component
[x] The extra flipped down card at the end of the podium disapeared
[x] When clicking on a guild card on the podium, go to the cohort tab and scroll to the respective guild
[x] On hover on the text of the progress gauge milestones, the labels don't expand unless I hover on the circles on the progress arc
[x] Boost button needs to be higher and bigger
[x] Ribbons sometimes have that weird double border/shaddow on the bottom. It seems to happen only when there's an icon
[x] Make the rounded border of the character illustration match the one of the border of the card in most places but especially in the nano card in the header
[x] When the nano card is expanded, the ribbon is hidden behind the content of the card
[x] in the profile dropdown, the top left ribbon is too big and the text needs to be smaller and more complete especially in French, use inclusive neutral form of the words.
[x] Put the current cohort badge of the students profile dropdown in the top right
[x] Try to unify the profile dropdown and management page profile card into one generic component.
[x] Remove the flip behaviour of the cohort and school cards and keep it in the student card to show the editable playing card of their character.
[x] In the admin dashboard, make the notification area editable so the admins can add cohort wide notification using editable texts
[x] The cross button of the notifications needs to be hold buttons and animate the exit of the card like swiping it away. Implement a swiping away gesture on the notification on mobile
[x] Change the default accent color to magenta all around the app (replace purple)
[x] The guild card stats are not editable either by students or admin since they are computed.
[x] Implement restricted editable radar graph that will have a minimum and maximum for each stats. The minimum is the base stat of the character class that is shown in full color (not transparent), in the middle add the number of remaining points the player can allocate and show in red the maximum area of the radar. Allow moving the cursors only within the possible values and prevent adding to a stat when there's no points remaining.
[ ] For radar graphs, show the stat labels outside the inner graph like STR, DEX, etc, expand on hover or when grabbed and make sure the cursor is not over the labels when displaying when grabbed
[x] The ribbons on the playing cards needs to ALWAYS reach the outer border of the card and be above z-index wise of all other elements.
[x] In the guild add an icon selection (like in the activity card, make the component generic and atomic) and replace the illustration by that icon in the avatar stack in the map. Also display that icon on the ribbon on top of the guild card
[ ] players card will display class icons and name on full size and only icons on smaller sizes in the ribbon
[x] Make the class card editable by the admins. Be careful to recheck the math for all the characters of that cohort and moving the point allocation of the students if necessary. recalculate the stat and remove extra allocation by refunding the points
[x] If a student is not yet in a guild it is in a misc section in the cohort/class tab in a grid template
[x] Remove the excessive padding/margin on the top of all pages and add padding on the bottom to be able to scroll past the content to have space for the dashboard not covering content when scrolled all the way down
[x] Implement the "new" ribbon system to show the ribbon with new on it only for cards not yet hovered over in the progression tab. Keep tab of that in the database or in local if possible, Do not put new ribbon on the available on the next vote cards. Also Make sure the title "available on next vote" is not being hidden by cards.
[x] Make the icon bigger in reward cards especially in full mode
[x] Fiche personnage, Personnage is redondant in the character page keep only one
[ ] In the map for admin user show all guilds icons in the avatar stacks over the nodes, display characters icon only on hover
[ ] Add a field in boss activities to let students fill various fields with answers to the boss activity of either text (mostly URL) or files to store in the project file storage R2 cloudflare
[x] Add more fog and redo the avoid area system instead of big visible circles. If needed try to find an existing react component to draw that with a neet effect. Try to keep it light weight 

AUDIT
[x] Remove ALL hard coded mock data and translate everything using i18n except dynamic fields in the database like descriptions and names of guild/characters.
[ ] Remove all unused translations from the translation files
[x] Move mock data in the database and wire all the relevant API. Also add much more generated data like 3 cohorts of 10 to 30 students, with one that is yet to start making characters or even fill the profile card and one well along the game with guilds and such.
[ ] Refactor the API to follow DRY and KISS principles along with following the industry best practices
[ ] Render missing translation keys in a visible debug style during development.
[x] Check ALL raw colors and enforce token design. Also refactor the tokens completely to factorize them into as little tokens and as generic tokens as possible. Re-check then for any and all non solarized colors in the theme.
[ ] Do a comprehensive security audit of the entire app, especially sanitation of the inputs and prevent ANY privilege escalation from the students.
[ ]

----

[ ] Bonus dext première guilde
[ ] Remove invite button when guild is full
