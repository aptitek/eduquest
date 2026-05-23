# Infrastructure

## Testing

[ ] Implement unit tests, taskfile task, and github action if unit test are relevant for that project

## Deployment

[ ] Write github action to deploy the backend on cloudflare workers
[ ] Create github action to deploy the frontend on cloudflare pages

---

# Frontend

## Components

[ ] RULE : All components should have a skeletton counterpart for when the data is loading from the API. 

[ ] Make a status indicator component. Make it a coloured circle with optional pulse animation. It should be a new atom.
[ ] Add an instance of the status indicator component in the top right of the header when connection to local API is broken.
[ ] Make or search for an editable text component editable via a click with a pen icon next to the field when editable. A simple click on either the pen icon or the field should toggle allow the user to edit the field.
[ ] The text component should accept a optional prefix or suffix to be displayed next to the text (like for the fixed email domain)
[ ] Make or find a badge dropdown component. It should be a simple dropdown with a list of badge and a selected badge, it will extends a normal dropdown or badge component (whichever is most relevant). It should have a pen when in edit mode. It should be reusable and generic. It should support a group version where the field should be a list of badges. And a single version where the field is a single badge.
[ ] Make or find a simple editable avatar component that extends a normal avatar component. It should have a pen when in edit mode. It should have a reset button when editable. It should also have a status indicator that drop-down with the statuses (either badge or new atom if necessary)
[ ] Make or find a confirm button that will extends normal button but will have a coloured aura when hovered. When pressed it will have a coloured border that will surround the button slowly. When the border is full the button will be "pressed". If the user releases the mouse button and the border is not full the button will not be "pressed". When released the border will shrink slowly, pressing again will resume the growth.
---
[ ] Make or find a editable card component. It should accept a list of fields to edit and display them in a card format. It should be reusable and generic. 
[ ] The card component should have two modes: read mode and edit mode. It will feature complex layout of other atoms like editable text, badge dropdown, editable avatar, etc.
---
[ ] Make or find a component for a table where the user can sort, filter and search. It should be paginated and accept custom component as list item.

## Languages

[ ] Add back the flags in the account dropdown
[ ] Store language in the database for the users
[ ] Infer lang from browser navigator settings

---

[ ] Remove the emojis from the language files.
[ ] Do not use emojis when using a tailwind icon is possible. It's ugly.
[ ] Make missing strings bright red in the frontend for debugging purposes.


# Account Dropdown

[ ] Add a user status feature in the header (online, offline, busy) (busy is if the user is doing a guild activity). They can manually set their status.
[ ] Profile card SHOULD NOT have any gamified elements. It should be a normal profile card. It only interacts with the institutional part of the database.
[ ] The profile card will replace the account header when a user clicks on their profile in the header.
[ ] Split the name in first name, last name, and display name (default to first name + last name if not provided). Update the database schema accordingly.
[ ] The avatar is editable. We have a reset button to reset it to the github avatar. otherwise store it in the database, or where it makes sense for performance or other reasons.
[ ] The avatar should not be bigger than 512px and 2MB. Format is png, jpg, jpeg, webp animated gif and svg.
[ ] Nom d'utilisateur GitHub should not be editable.
[ ] School is not editable as well as role (isAdmin). School badge will only feature the school logo. Admin and Students will be the only roles that the badge will display.
[ ] email is editable (rename github_email to email)
[ ] Add a birth date field in the profile card.
[ ] Add a pronouns field in the profile card.
[ ] Add a short bio field in the profile card.


# Admin

Those pages are only accessible to admins !

[ ] Make a new page : Users. It will list all users.

[ ] Use the profile card organism component in the users page. We'll have a inline version of it for the table.
[ ] The table filter should align with the profile card fields. The school dropdown and role dropdown filters will be a badge dropdown component.
[ ] The school dropdown will feature a + badge on top to add a new school (with a badge skeleton or a empty badge as a background).
[ ] When we click on the line of a user, the profile card will expand and be editable.
[ ] We'll add a + button In the avatar field as a first line on the top of the table with a skeleton of the inline profile card component as a background.
[ ] When a user clicks the that row, the skeleton will be replaced by the complete profile card component. It will be empty.
[ ] The confirm button will be enabled only when a change is made in the form. If the card is empty the button is also disabled.
[ ] The confirm button will have a add (green +) add icon, (orange pen) edit icon, (red trashcan) delete icon.

---
[ ] Make a new page : Schools. It will list all schools.
[ ] Make a school card component. It will display the school logo like an avatar but rectangular and inline, and name and be similarly editable as the user profile card. Same goes for all database fields in the table rows. 

---

