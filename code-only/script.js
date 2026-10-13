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

const STORAGE_KEY = 'registrations';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let editingId = null;

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

form.elements.eventDate.min = todayISO();

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
    if (value === '') return 'Please choose an event date.';
    if (value < todayISO()) return 'Event date must be today or later.';
    return '';
  },

  guests(value) {
    if (value.trim() === '') return 'Please enter the number of guests.';
    const number = Number(value);
    if (!Number.isInteger(number)) return 'Guests must be a whole number.';
    if (number < 1 || number > 10) return 'Guests must be between 1 and 10.';
    return '';
  }
};

function validateField(input) {
  const message = validators[input.name](input.value);
  const errorElement = document.getElementById(input.id + '-error');

  errorElement.textContent = message;
  input.classList.toggle('invalid', message !== '');
  input.classList.toggle('valid', message === '');
  input.setAttribute('aria-invalid', message !== '' ? 'true' : 'false');

  return message === '';
}

function clearFieldState(input) {
  input.classList.remove('valid', 'invalid');
  input.removeAttribute('aria-invalid');
  const errorElement = document.getElementById(input.id + '-error');
  if (errorElement) errorElement.textContent = '';
}

Object.keys(validators).forEach(function (name) {
  const input = form.elements[name];
  input.addEventListener('input', function () { validateField(input); });
  input.addEventListener('change', function () { validateField(input); });
});

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const TIME_UNITS = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60]
];

function timeAgo(timestamp) {
  const secondsAgo = (Date.now() - timestamp) / 1000;
  if (secondsAgo < 45) return 'just now';

  for (const [unit, secondsInUnit] of TIME_UNITS) {
    if (secondsAgo >= secondsInUnit) {
      return relativeTimeFormatter.format(-Math.floor(secondsAgo / secondsInUnit), unit);
    }
  }
  return relativeTimeFormatter.format(-1, 'minute');
}

function timestampText(entry) {
  if (!entry.createdAt) return '';
  let text = 'Registered ' + timeAgo(entry.createdAt);
  if (entry.updatedAt) text += ' · edited ' + timeAgo(entry.updatedAt);
  return text;
}

function showConfirmation(data, heading) {
  confirmationHeading.textContent = heading;

  const rows = [
    ['Name', data.fullName],
    ['Email', data.email],
    ['Event date', formatDate(data.eventDate)],
    ['Guests', data.guests],
    ['Dietary needs', data.dietary || 'None']
  ];

  confirmationDetails.innerHTML = '';

  rows.forEach(function ([label, value]) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    confirmationDetails.append(dt, dd);
  });

  confirmationCard.classList.remove('hidden', 'slide-in');
  void confirmationCard.offsetWidth;
  confirmationCard.classList.add('slide-in');

  confirmationCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  let firstInvalid = null;
  Object.keys(validators).forEach(function (name) {
    const input = form.elements[name];
    const isValid = validateField(input);
    if (!isValid && firstInvalid === null) firstInvalid = input;
  });

  if (firstInvalid) {
    confirmationCard.classList.add('hidden');
    firstInvalid.focus();
    return;
  }

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

  const editIndex = editingId === null ? -1 : registrations.findIndex(function (entry) {
    return entry.id === editingId;
  });

  if (editIndex !== -1) {
    savedEntry = { ...registrations[editIndex], ...values, updatedAt: Date.now() };
    registrations[editIndex] = savedEntry;
    heading = 'Changes saved! ✅';
  } else {
    savedEntry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      ...values,
      createdAt: Date.now()
    };
    registrations.push(savedEntry);
    heading = "You're registered! 🎉";
  }

  saveRegistrations(registrations);

  form.reset();
  renderRegistrations();
  showConfirmation(savedEntry, heading);
});

function loadRegistrations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveRegistrations(registrations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
  } catch (error) {
    console.warn('Could not save registrations:', error);
  }
}

function deleteRegistration(id) {
  const remaining = loadRegistrations().filter(function (entry) {
    return entry.id !== id;
  });
  saveRegistrations(remaining);
  if (id === editingId) form.reset();
  renderRegistrations();
}

function startEditing(id) {
  const entry = loadRegistrations().find(function (item) { return item.id === id; });
  if (!entry) return;

  form.reset();
  form.elements.fullName.value = entry.fullName;
  form.elements.email.value = entry.email;
  form.elements.eventDate.value = entry.eventDate;
  form.elements.guests.value = entry.guests;
  form.elements.dietary.value = entry.dietary || '';

  Object.keys(validators).forEach(function (name) {
    validateField(form.elements[name]);
  });

  editingId = id;
  editName.textContent = entry.fullName;
  editBanner.classList.remove('hidden');
  submitButton.textContent = 'Save changes';

  renderRegistrations();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.elements.fullName.focus({ preventScroll: true });
}

function stopEditing() {
  editingId = null;
  editBanner.classList.add('hidden');
  submitButton.textContent = 'Register';
}

cancelEditButton.addEventListener('click', function () {
  form.reset();
});

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

function makeEntryButton(label, className, ariaLabel, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.setAttribute('aria-label', ariaLabel);
  button.addEventListener('click', onClick);
  return button;
}

function renderRegistrations() {
  const registrations = loadRegistrations();
  const query = searchInput.value.trim().toLowerCase();

  const visible = registrations.filter(function (entry) {
    return matchesSearch(entry, query);
  }).slice().reverse();

  registrationList.innerHTML = '';

  emptyMessage.classList.toggle('hidden', registrations.length > 0);
  const noMatches = registrations.length > 0 && visible.length === 0;
  noMatchesMessage.classList.toggle('hidden', !noMatches);
  noMatchesMessage.textContent = 'No registrations match "' + searchInput.value.trim() + '"';

  if (registrations.length === 0) {
    registrationCount.textContent = '';
  } else if (query !== '') {
    registrationCount.textContent = '(' + visible.length + ' of ' + registrations.length + ')';
  } else {
    registrationCount.textContent = '(' + registrations.length + ')';
  }

  const nothingSaved = registrations.length === 0;
  exportButton.disabled = nothingSaved;
  clearAllButton.disabled = nothingSaved;
  searchInput.disabled = nothingSaved;

  visible.forEach(function (entry) {
    const item = document.createElement('li');
    item.className = 'registration-item';
    if (entry.id === editingId) item.classList.add('editing');

    const info = document.createElement('div');
    info.className = 'registration-info';

    const name = document.createElement('p');
    name.className = 'registration-name';
    name.textContent = entry.fullName;

    const email = document.createElement('p');
    email.className = 'registration-email';
    email.textContent = entry.email;

    const guestWord = Number(entry.guests) === 1 ? 'guest' : 'guests';
    const meta = document.createElement('p');
    meta.className = 'registration-meta';
    meta.textContent = formatDate(entry.eventDate) + ' · ' + entry.guests + ' ' + guestWord;

    info.append(name, email, meta);

    if (entry.createdAt) {
      const time = document.createElement('p');
      time.className = 'registration-time';
      time.dataset.entryId = entry.id;
      time.textContent = timestampText(entry);
      time.title = new Date(entry.createdAt).toLocaleString();
      info.append(time);
    }

    const actions = document.createElement('div');
    actions.className = 'registration-actions';
    actions.append(
      makeEntryButton('Edit', 'btn-small btn-outline-amber', 'Edit registration for ' + entry.fullName, function () {
        startEditing(entry.id);
      }),
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

function updateTimestamps() {
  const registrations = loadRegistrations();
  document.querySelectorAll('.registration-time').forEach(function (element) {
    const entry = registrations.find(function (item) { return item.id === element.dataset.entryId; });
    if (entry) element.textContent = timestampText(entry);
  });
}

setInterval(updateTimestamps, 30000);

searchInput.addEventListener('input', renderRegistrations);
searchInput.addEventListener('search', renderRegistrations);

exportButton.addEventListener('click', function () {
  const registrations = loadRegistrations();
  if (registrations.length === 0) return;

  const json = JSON.stringify(registrations, null, 2);

  const file = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(file);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'registrations-' + todayISO() + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
});

let pendingAction = null;

let dialogOpener = null;

function askToConfirm(title, message, confirmLabel, onConfirm) {
  confirmTitle.textContent = title;
  confirmText.textContent = message;
  confirmOkButton.textContent = confirmLabel;
  pendingAction = onConfirm;
  dialogOpener = document.activeElement;
  confirmDialog.showModal();
}

confirmOkButton.addEventListener('click', function () {
  const action = pendingAction;
  pendingAction = null;
  confirmDialog.close();
  if (action) action();
});

confirmCancelButton.addEventListener('click', function () {
  confirmDialog.close();
});

confirmDialog.addEventListener('click', function (event) {
  if (event.target === confirmDialog) confirmDialog.close();
});

confirmDialog.addEventListener('close', function () {
  pendingAction = null;
  setTimeout(function () {
    if (dialogOpener && dialogOpener.isConnected && !dialogOpener.disabled) return;
    if (!searchInput.disabled) searchInput.focus();
    else form.elements.fullName.focus();
  }, 0);
});

clearAllButton.addEventListener('click', function () {
  const count = loadRegistrations().length;
  const message = count === 1
    ? 'This will permanently delete your 1 saved registration. This can\'t be undone.'
    : 'This will permanently delete all ' + count + ' saved registrations. This can\'t be undone.';
  askToConfirm('Delete all registrations?', message, 'Delete all', clearAllRegistrations);
});

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

form.addEventListener('reset', function () {
  Array.from(form.elements).forEach(function (element) {
    if (element.name) clearFieldState(element);
  });
  confirmationCard.classList.add('hidden');
  confirmationCard.classList.remove('slide-in');
  const wasEditing = editingId !== null;
  stopEditing();
  if (wasEditing) renderRegistrations();
  form.elements.fullName.focus({ preventScroll: true });
});

renderRegistrations();
