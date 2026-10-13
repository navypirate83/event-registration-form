// Behavior for the Event Registration page (linked from index.html):
// validation, the confirmation card, the reset button, and the saved registrations list
// (with edit, delete, search, export to JSON, clear all, and "2 hours ago" timestamps).

// Grab the elements we need to work with from the page
const form = document.getElementById('registration-form');
const submitButton = document.getElementById('submit-button');
const editBanner = document.getElementById('edit-banner');
const editName = document.getElementById('edit-name');
const cancelEditButton = document.getElementById('cancel-edit');
const confirmationCard = document.getElementById('confirmation');
const confirmationHeading = document.getElementById('confirmation-heading');
const confirmationDetails = document.getElementById('confirmation-details');
const registrationList = document.getElementById('registration-list');
const registrationCount = document.getElementById('registration-count');
const emptyMessage = document.getElementById('empty-message');
const noMatchesMessage = document.getElementById('no-matches');
const searchInput = document.getElementById('search');
const exportButton = document.getElementById('export-button');
const clearAllButton = document.getElementById('clear-all-button');
const confirmDialog = document.getElementById('confirm-dialog');
const confirmTitle = document.getElementById('confirm-dialog-title');
const confirmText = document.getElementById('confirm-dialog-text');
const confirmCancelButton = document.getElementById('confirm-cancel');
const confirmOkButton = document.getElementById('confirm-ok');

// The name ("key") our list is saved under in localStorage
const STORAGE_KEY = 'registrations';

// A simple email pattern: some text, an @, some text, a dot, then some more text (no spaces)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The id of the entry currently loaded into the form for editing,
// or null when the form is being used to add a new registration
let editingId = null;

// Returns today's date as "YYYY-MM-DD" text (the same format the date picker uses).
// We build it from the local year/month/day so it matches the user's own calendar,
// not a different time zone. padStart adds a leading zero, e.g. 7 becomes "07".
function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

// Tell the date picker the earliest allowed day, so past dates appear greyed out in its calendar.
// (Someone could still type a past date by hand, which is why the eventDate rule below checks too.)
form.elements.eventDate.min = todayISO();

// The validation rules, one per required field.
// Each rule takes the field's value and returns an error message, or an empty string if it's fine.
const validators = {
  fullName(value) {
    const name = value.trim();
    if (name === '') return 'Please enter your full name.';
    if (name.length < 2) return 'Name must be at least 2 characters.';
    return '';
  },

  email(value) {
    const email = value.trim();
    if (email === '') return 'Please enter your email address.';
    if (!EMAIL_PATTERN.test(email)) return 'Please enter a valid email, like name@example.com.';
    return '';
  },

  eventDate(value) {
    // The date input's value is empty until a full date has been picked
    if (value === '') return 'Please choose an event date.';
    // Both dates are "YYYY-MM-DD" text, so comparing them as text also compares them as dates
    if (value < todayISO()) return 'Event date must be today or later.';
    return '';
  },

  guests(value) {
    if (value.trim() === '') return 'Please enter the number of guests.';
    const number = Number(value);
    // Number.isInteger rules out things like 2.5
    if (!Number.isInteger(number)) return 'Guests must be a whole number.';
    if (number < 1 || number > 10) return 'Guests must be between 1 and 10.';
    return '';
  }
};

// Checks one field, then colors it green/red and shows or clears its error message.
// Returns true if the field is valid, false if not.
function validateField(input) {
  const message = validators[input.name](input.value);
  const errorElement = document.getElementById(input.id + '-error');

  errorElement.textContent = message;
  input.classList.toggle('invalid', message !== '');
  input.classList.toggle('valid', message === '');
  // Tell screen readers whether the field currently has a problem
  input.setAttribute('aria-invalid', message !== '' ? 'true' : 'false');

  return message === '';
}

// Removes the green/red color and error message from a field (used when resetting the form)
function clearFieldState(input) {
  input.classList.remove('valid', 'invalid');
  input.removeAttribute('aria-invalid');
  const errorElement = document.getElementById(input.id + '-error');
  if (errorElement) errorElement.textContent = '';
}

// Real-time validation: re-check each required field every time its value changes.
// "input" fires on every keystroke; "change" covers the date picker and the number arrows
// in browsers that don't fire "input" for them.
Object.keys(validators).forEach(function (name) {
  const input = form.elements[name];
  input.addEventListener('input', function () { validateField(input); });
  input.addEventListener('change', function () { validateField(input); });
});

// Turns a "YYYY-MM-DD" date into a friendly one like "Saturday, October 24, 2026".
// We build the date from its parts so it isn't shifted by a day due to time zones.
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// The browser's built-in tool for phrases like "2 hours ago" or "yesterday", in the user's language.
// numeric: 'auto' lets it say "yesterday" instead of "1 day ago".
const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

// Each time unit and how many seconds it holds, biggest first.
// (Months and years are averages, which is fine for a rough "3 months ago".)
const TIME_UNITS = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60]
];

// Turns a saved time (in milliseconds) into a phrase like "just now", "5 minutes ago", or "yesterday".
// It finds the biggest unit that fits: 90 minutes becomes "1 hour ago", not "90 minutes ago".
function timeAgo(timestamp) {
  // How many seconds ago it was (negative numbers mean "in the past" to the formatter)
  const secondsAgo = (Date.now() - timestamp) / 1000;
  if (secondsAgo < 45) return 'just now';

  for (const [unit, secondsInUnit] of TIME_UNITS) {
    if (secondsAgo >= secondsInUnit) {
      // Math.floor rounds down, so 1 hour 50 minutes says "1 hour ago"
      return relativeTimeFormatter.format(-Math.floor(secondsAgo / secondsInUnit), unit);
    }
  }
  // Between 45 and 60 seconds: not quite a minute, but more than "just now"
  return relativeTimeFormatter.format(-1, 'minute');
}

// Builds the full timestamp text for one entry, e.g. "Registered 2 hours ago · edited just now".
// Entries saved before timestamps were added have no createdAt, so they get no timestamp line.
function timestampText(entry) {
  if (!entry.createdAt) return '';
  let text = 'Registered ' + timeAgo(entry.createdAt);
  if (entry.updatedAt) text += ' · edited ' + timeAgo(entry.updatedAt);
  return text;
}

// Fills the confirmation card with the submitted data, shows it, and plays the slide-in animation.
// "heading" lets us show a different title for new entries and edits.
function showConfirmation(data, heading) {
  confirmationHeading.textContent = heading;

  // Each row is [label, value] for the card
  const rows = [
    ['Name', data.fullName],
    ['Email', data.email],
    ['Event date', formatDate(data.eventDate)],
    ['Guests', data.guests],
    ['Dietary needs', data.dietary || 'None']
  ];

  // Empty out anything from a previous registration
  confirmationDetails.innerHTML = '';

  // Build a label (<dt>) and value (<dd>) for each row.
  // We use textContent (not innerHTML) so anything the user typed is shown as plain text
  // and can't be treated as HTML code.
  rows.forEach(function ([label, value]) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    confirmationDetails.append(dt, dd);
  });

  // Restart the slide-in animation: remove the class, force the browser to notice
  // (reading offsetWidth does that), then add the class back. Without this, the
  // animation would only play the first time the card appears.
  confirmationCard.classList.remove('hidden', 'slide-in');
  void confirmationCard.offsetWidth;
  confirmationCard.classList.add('slide-in');

  // Scroll the card into view so the user sees it, especially on small screens
  confirmationCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Handle the Register / Save changes button: stop the page from reloading, check every field,
// and either save the entry or point the user to the first problem
form.addEventListener('submit', function (event) {
  event.preventDefault();

  // Validate every required field (we check them all so every error shows at once)
  let firstInvalid = null;
  Object.keys(validators).forEach(function (name) {
    const input = form.elements[name];
    const isValid = validateField(input);
    if (!isValid && firstInvalid === null) firstInvalid = input;
  });

  // If something is wrong, hide any old confirmation and move the cursor to the first bad field
  if (firstInvalid) {
    confirmationCard.classList.add('hidden');
    firstInvalid.focus();
    return;
  }

  // Everything passed: collect the typed values
  const values = {
    fullName: form.elements.fullName.value.trim(),
    email: form.elements.email.value.trim(),
    eventDate: form.elements.eventDate.value,
    guests: form.elements.guests.value,
    dietary: form.elements.dietary.value.trim()
  };

  const registrations = loadRegistrations();
  let savedEntry;
  let heading;

  // Find the entry being edited (if any). It could be missing if it was deleted in another tab.
  const editIndex = editingId === null ? -1 : registrations.findIndex(function (entry) {
    return entry.id === editingId;
  });

  if (editIndex !== -1) {
    // EDITING: replace the old values but keep the same id and original "registered" time,
    // and record when it was edited. "..." copies all the properties from each object into a new one.
    savedEntry = { ...registrations[editIndex], ...values, updatedAt: Date.now() };
    registrations[editIndex] = savedEntry;
    heading = 'Changes saved! ✅';
  } else {
    // NEW ENTRY: give it a unique id so Edit and Delete know exactly which entry to act on,
    // and record when it was registered. Date.now() is the current time in milliseconds;
    // the random part covers two saves in the same millisecond.
    savedEntry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      ...values,
      createdAt: Date.now()
    };
    registrations.push(savedEntry);
    heading = "You're registered! 🎉";
  }

  // Save the updated list and redraw it on the page
  saveRegistrations(registrations);

  // Empty the form (this also leaves edit mode; see the "reset" handler at the bottom),
  // then show the confirmation card for the saved entry
  form.reset();
  renderRegistrations();
  showConfirmation(savedEntry, heading);
});

// Reads the saved registrations from localStorage and turns the saved text back into
// an array with JSON.parse. Returns an empty array if nothing is saved yet, or if the
// saved text is broken or not a list (so one bad value can't break the whole page).
function loadRegistrations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

// Saves the array to localStorage. localStorage can only store text,
// so JSON.stringify turns the array into a text version first.
function saveRegistrations(registrations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
  } catch (error) {
    // Saving can fail in some private-browsing modes or if storage is full.
    // The page keeps working; the entry just won't be remembered after a reload.
    console.warn('Could not save registrations:', error);
  }
}

// Removes the entry with the given id from localStorage, then redraws the list.
// If that entry was loaded in the form for editing, the form is cleared too.
function deleteRegistration(id) {
  const remaining = loadRegistrations().filter(function (entry) {
    return entry.id !== id;
  });
  saveRegistrations(remaining);
  if (id === editingId) form.reset();
  renderRegistrations();
}

// Loads a saved entry back into the form so it can be changed
function startEditing(id) {
  const entry = loadRegistrations().find(function (item) { return item.id === id; });
  if (!entry) return;

  // Clear the form first (this also hides an old confirmation card), then fill in the entry's values
  form.reset();
  form.elements.fullName.value = entry.fullName;
  form.elements.email.value = entry.email;
  form.elements.eventDate.value = entry.eventDate;
  form.elements.guests.value = entry.guests;
  form.elements.dietary.value = entry.dietary || '';

  // Check each field right away, so it's colored green, or red if (for example) the event date has passed
  Object.keys(validators).forEach(function (name) {
    validateField(form.elements[name]);
  });

  // Switch the form into edit mode: remember which entry it is, show the banner, and relabel the button
  editingId = id;
  editName.textContent = entry.fullName;
  editBanner.classList.remove('hidden');
  submitButton.textContent = 'Save changes';

  // Redraw the list so this entry is highlighted, then bring the form into view
  renderRegistrations();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.elements.fullName.focus({ preventScroll: true });
}

// Switches the form back to adding new registrations (hides the banner, resets the button label)
function stopEditing() {
  editingId = null;
  editBanner.classList.add('hidden');
  submitButton.textContent = 'Register';
}

// The banner's Cancel button: clears the form, which also leaves edit mode
cancelEditButton.addEventListener('click', function () {
  form.reset();
});

// Returns true if an entry matches the search text. It checks the name, email, dietary note,
// and the date both as shown ("Tuesday, December 1, 2026") and as saved ("2026-12-01").
// toLowerCase() makes the search ignore capital letters.
function matchesSearch(entry, query) {
  if (query === '') return true;
  const searchableText = [
    entry.fullName,
    entry.email,
    entry.dietary || '',
    entry.eventDate,
    formatDate(entry.eventDate)
  ].join(' ').toLowerCase();
  return searchableText.includes(query);
}

// Makes one small button for an entry card (used for Edit and Delete)
function makeEntryButton(label, className, ariaLabel, onClick) {
  const button = document.createElement('button');
  button.type = 'button'; // stops it from acting like a form submit button
  button.className = className;
  button.textContent = label;
  button.setAttribute('aria-label', ariaLabel); // tells screen-reader users which entry it's for
  button.addEventListener('click', onClick);
  return button;
}

// Builds the list of saved registrations on the page (newest first), keeping only the ones that
// match the search box. Shows "No registrations yet" or "No matches" when there's nothing to list.
function renderRegistrations() {
  const registrations = loadRegistrations();
  const query = searchInput.value.trim().toLowerCase();

  // Keep only entries that match the search, then reverse so the newest is on top
  // (slice() makes a copy so reverse() doesn't change the saved order)
  const visible = registrations.filter(function (entry) {
    return matchesSearch(entry, query);
  }).slice().reverse();

  // Clear out the old list before drawing the new one
  registrationList.innerHTML = '';

  // Show the right message: one when nothing is saved at all, another when the search finds nothing
  emptyMessage.classList.toggle('hidden', registrations.length > 0);
  const noMatches = registrations.length > 0 && visible.length === 0;
  noMatchesMessage.classList.toggle('hidden', !noMatches);
  noMatchesMessage.textContent = 'No registrations match "' + searchInput.value.trim() + '"';

  // Count in the heading: "(5)" normally, or "(2 of 5)" while searching
  if (registrations.length === 0) {
    registrationCount.textContent = '';
  } else if (query !== '') {
    registrationCount.textContent = '(' + visible.length + ' of ' + registrations.length + ')';
  } else {
    registrationCount.textContent = '(' + registrations.length + ')';
  }

  // The toolbar buttons only make sense when there's something saved
  const nothingSaved = registrations.length === 0;
  exportButton.disabled = nothingSaved;
  clearAllButton.disabled = nothingSaved;
  searchInput.disabled = nothingSaved;

  visible.forEach(function (entry) {
    // One list item (card) per registration; highlighted if it's the one being edited
    const item = document.createElement('li');
    item.className = 'registration-item';
    if (entry.id === editingId) item.classList.add('editing');

    // The text part: name, email, date and guest count, then the timestamp.
    // textContent is used so anything the user typed is shown as plain text, never as HTML.
    const info = document.createElement('div');
    info.className = 'registration-info';

    const name = document.createElement('p');
    name.className = 'registration-name';
    name.textContent = entry.fullName;

    const email = document.createElement('p');
    email.className = 'registration-email';
    email.textContent = entry.email;

    // "guest" or "guests" depending on the number
    const guestWord = Number(entry.guests) === 1 ? 'guest' : 'guests';
    const meta = document.createElement('p');
    meta.className = 'registration-meta';
    meta.textContent = formatDate(entry.eventDate) + ' · ' + entry.guests + ' ' + guestWord;

    info.append(name, email, meta);

    // The "Registered 2 hours ago" line. Its id is stored on the element (data-entry-id)
    // so updateTimestamps() can refresh just this text later without redrawing everything.
    // Hovering it shows the exact date and time as a tooltip.
    if (entry.createdAt) {
      const time = document.createElement('p');
      time.className = 'registration-time';
      time.dataset.entryId = entry.id;
      time.textContent = timestampText(entry);
      time.title = new Date(entry.createdAt).toLocaleString();
      info.append(time);
    }

    // The Edit and Delete buttons, grouped together
    const actions = document.createElement('div');
    actions.className = 'registration-actions';
    actions.append(
      makeEntryButton('Edit', 'btn-small btn-outline-amber', 'Edit registration for ' + entry.fullName, function () {
        startEditing(entry.id);
      }),
      // Delete asks first; the entry is only removed if the user confirms in the pop-up
      makeEntryButton('Delete', 'btn-delete', 'Delete registration for ' + entry.fullName, function () {
        askToConfirm(
          'Delete this registration?',
          'This will permanently delete the registration for ' + entry.fullName +
            ' (' + entry.email + '). This can\'t be undone.',
          'Delete',
          function () { deleteRegistration(entry.id); }
        );
      })
    );

    item.append(info, actions);
    registrationList.append(item);
  });
}

// Refreshes just the "2 hours ago" text on every card, so it stays accurate while the page is open.
// It updates the text only (instead of redrawing the whole list) so a button you've tabbed to keeps its focus.
function updateTimestamps() {
  const registrations = loadRegistrations();
  document.querySelectorAll('.registration-time').forEach(function (element) {
    const entry = registrations.find(function (item) { return item.id === element.dataset.entryId; });
    if (entry) element.textContent = timestampText(entry);
  });
}

// Run updateTimestamps every 30 seconds (30,000 milliseconds)
setInterval(updateTimestamps, 30000);

// Search: redraw the list on every keystroke. The "search" event also covers
// clicking the little "x" that some browsers show inside search boxes.
searchInput.addEventListener('input', renderRegistrations);
searchInput.addEventListener('search', renderRegistrations);

// Export: download every saved entry as a .json file
exportButton.addEventListener('click', function () {
  const registrations = loadRegistrations();
  if (registrations.length === 0) return;

  // Turn the list into nicely indented JSON text (the "2" means indent by 2 spaces)
  const json = JSON.stringify(registrations, null, 2);

  // A Blob is a file-like chunk of data made in the browser.
  // createObjectURL gives it a temporary web address we can "download" from.
  const file = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(file);

  // Make a hidden link with the "download" attribute (which names the saved file),
  // click it, then remove it and free the temporary address
  const link = document.createElement('a');
  link.href = url;
  link.download = 'registrations-' + todayISO() + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
});

// ---------- Confirmation pop-up (shared by Delete and Clear all) ----------

// The function to run if the user clicks the red confirm button. It's set each time the pop-up
// opens, so the same pop-up can confirm different actions.
let pendingAction = null;

// The button that opened the pop-up, so focus can be put back somewhere sensible afterwards
let dialogOpener = null;

// Opens the confirmation pop-up with the given title, message, and red button label.
// "onConfirm" is the function that does the actual deleting; it only runs if the user confirms.
function askToConfirm(title, message, confirmLabel, onConfirm) {
  confirmTitle.textContent = title;
  confirmText.textContent = message;
  confirmOkButton.textContent = confirmLabel;
  pendingAction = onConfirm;
  dialogOpener = document.activeElement;
  confirmDialog.showModal();
}

// Red confirm button: close the pop-up, then run the action it was opened for
confirmOkButton.addEventListener('click', function () {
  const action = pendingAction;
  pendingAction = null;
  confirmDialog.close();
  if (action) action();
});

// Cancel button: just close the pop-up; nothing is deleted
confirmCancelButton.addEventListener('click', function () {
  confirmDialog.close();
});

// Clicking the dark area outside the pop-up box also closes it.
// (Clicks on the dark backdrop count as clicks on the dialog itself, not on anything inside it.)
confirmDialog.addEventListener('click', function (event) {
  if (event.target === confirmDialog) confirmDialog.close();
});

// Runs whenever the pop-up closes, however it was closed (confirm, Cancel, Esc, or clicking outside).
// The browser normally puts focus back on the button that opened the pop-up. But if that button is
// gone (a deleted entry's Delete button) or disabled (Clear all, once the list is empty), focus would
// be lost, so we move it to the search box, or the first form field if the search box is disabled.
// The short wait (setTimeout 0) lets the confirmed action finish redrawing the list first.
confirmDialog.addEventListener('close', function () {
  pendingAction = null;
  setTimeout(function () {
    if (dialogOpener && dialogOpener.isConnected && !dialogOpener.disabled) return;
    if (!searchInput.disabled) searchInput.focus();
    else form.elements.fullName.focus();
  }, 0);
});

// Clear all: ask first, mentioning how many entries will be deleted
clearAllButton.addEventListener('click', function () {
  const count = loadRegistrations().length;
  const message = count === 1
    ? 'This will permanently delete your 1 saved registration. This can\'t be undone.'
    : 'This will permanently delete all ' + count + ' saved registrations. This can\'t be undone.';
  askToConfirm('Delete all registrations?', message, 'Delete all', clearAllRegistrations);
});

// Removes everything from localStorage, clears the form and search box if needed,
// and redraws the (now empty) list. Only runs after the user confirms.
function clearAllRegistrations() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear registrations:', error);
  }
  if (editingId !== null) form.reset();
  searchInput.value = '';
  renderRegistrations();
}

// Handle the Reset button (and form.reset() calls from the code above). The browser clears the
// field values by itself (because the button is type="reset"); we also remove the green/red colors,
// error messages, hide the confirmation card, and leave edit mode.
form.addEventListener('reset', function () {
  Array.from(form.elements).forEach(function (element) {
    if (element.name) clearFieldState(element);
  });
  confirmationCard.classList.add('hidden');
  confirmationCard.classList.remove('slide-in');
  const wasEditing = editingId !== null;
  stopEditing();
  // Remove the highlight from the entry that was being edited
  if (wasEditing) renderRegistrations();
  form.elements.fullName.focus({ preventScroll: true });
});

// When the page first loads, draw any registrations saved from earlier visits
renderRegistrations();
