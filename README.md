# Event Registration Form

An event registration form built with plain HTML, CSS, and JavaScript. It uses no frameworks.

## Features

- **Fields:** full name (at least 2 characters), email (must be valid), event date (today or later), number of guests (1–10), and an optional box for dietary restrictions.
- **Custom validation:** the form uses `novalidate` and JavaScript instead of the browser's own error pop-ups. Each invalid field gets its own error message.
- **Real-time feedback:** each field turns green or red as you type.
- **Confirmation card:** after a valid submit, a card showing what you entered slides into view below the form.
- **Reset button:** clears every field and hides the confirmation card.
- **Saved registrations:** entries are stored in the browser's `localStorage` and listed below the form.
- **Edit and delete:** Edit loads an entry back into the form; Delete removes it after you confirm in a pop-up.
- **Search:** filters the list as you type, by name, email, date, or dietary note.
- **Export JSON:** downloads every saved entry as a `.json` file.
- **Clear all:** deletes everything after you confirm in a pop-up.
- **Timestamps:** each entry shows when it was added, like "Registered 2 hours ago", and when it was last edited.
- **Responsive:** the layout adjusts for phone screens.

## Files

- `index.html`: the page structure
- `style.css`: the dark theme and layout
- `script.js`: validation, the confirmation card, and the reset button
- `code-only/`: copies of the same files with all comments removed

## Run it

Open `index.html` in any browser.
