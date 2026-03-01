const loadingCard = document.getElementById('loadingCard');
const formCard = document.getElementById('formCard');
const successCard = document.getElementById('successCard');
const errorCard = document.getElementById('errorCard');
const alertBox = document.getElementById('alertBox');
const form = document.getElementById('createAccountForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');

const params = new URLSearchParams(window.location.search);
const sessionId = params.get('session_id');

function showCard(card) {
  [loadingCard, formCard, successCard, errorCard].forEach(c => c.classList.add('hidden'));
  card.classList.remove('hidden');
}

function showAlert(message, type) {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
}

function hideAlert() {
  alertBox.classList.add('hidden');
}

// Verify session on load
async function init() {
  if (!sessionId) {
    document.getElementById('errorMessage').textContent = 'No payment session found. Please start from the pricing page.';
    showCard(errorCard);
    return;
  }

  try {
    // We don't have a dedicated "verify session" endpoint, so we just show the form.
    // The create-account endpoint will verify the session when they submit.
    // But we need the email — we'll get it from create-account's error or success response.
    // For now, show the form with email empty (they can type it) or we try a lightweight check.

    // Show form immediately — the real validation happens on submit
    showCard(formCard);
    emailInput.removeAttribute('readonly');
    emailInput.placeholder = 'Enter the email you used to pay';
  } catch {
    showCard(errorCard);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const password = passwordInput.value;
  const confirm = confirmInput.value;

  if (password.length < 8) {
    showAlert('Password must be at least 8 characters.', 'error');
    return;
  }

  if (password !== confirm) {
    showAlert('Passwords do not match.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const res = await fetch('/api/auth/create-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, password })
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById('successMessage').textContent =
        `Account created for ${data.email}. Download the app and log in with your email and password.`;
      showCard(successCard);
    } else {
      showAlert(data.error || 'Something went wrong. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  } catch {
    showAlert('Network error. Please check your connection and try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});

init();
