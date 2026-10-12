const form = document.getElementById('registration-form');
const confirmationCard = document.getElementById('confirmation');
const confirmationDetails = document.getElementById('confirmation-details');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function showConfirmation(data) {
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

  showConfirmation({
    fullName: form.elements.fullName.value.trim(),
    email: form.elements.email.value.trim(),
    eventDate: form.elements.eventDate.value,
    guests: form.elements.guests.value,
    dietary: form.elements.dietary.value.trim()
  });
});

form.addEventListener('reset', function () {
  Array.from(form.elements).forEach(function (element) {
    if (element.name) clearFieldState(element);
  });
  confirmationCard.classList.add('hidden');
  confirmationCard.classList.remove('slide-in');
  form.elements.fullName.focus();
});
