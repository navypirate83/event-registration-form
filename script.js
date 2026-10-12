// Behavior for the Event Registration page (linked from index.html):
// validation, the confirmation card, and the reset button.

// Grab the elements we need to work with from the page
const form = document.getElementById('registration-form');
const confirmationCard = document.getElementById('confirmation');
const confirmationDetails = document.getElementById('confirmation-details');

// A simple email pattern: some text, an @, some text, a dot, then some more text (no spaces)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Fills the confirmation card with the submitted data, shows it, and plays the slide-in animation
function showConfirmation(data) {
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

// Handle the Register button: stop the page from reloading, check every field,
// and either show the confirmation or point the user to the first problem
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

  // Everything passed: collect the values and show the confirmation card
  showConfirmation({
    fullName: form.elements.fullName.value.trim(),
    email: form.elements.email.value.trim(),
    eventDate: form.elements.eventDate.value,
    guests: form.elements.guests.value,
    dietary: form.elements.dietary.value.trim()
  });
});

// Handle the Reset button. The browser clears the field values by itself (because the
// button is type="reset"); we also remove the green/red colors, error messages,
// and hide the confirmation card.
form.addEventListener('reset', function () {
  Array.from(form.elements).forEach(function (element) {
    if (element.name) clearFieldState(element);
  });
  confirmationCard.classList.add('hidden');
  confirmationCard.classList.remove('slide-in');
  form.elements.fullName.focus();
});
