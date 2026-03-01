const formCard = document.getElementById('formCard');
const successCard = document.getElementById('successCard');
const alertBox = document.getElementById('alertBox');
const form = document.getElementById('signupForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');

function showAlert(message, type) {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
}

function hideAlert() {
  alertBox.classList.add('hidden');
}

function showCard(card) {
  [formCard, successCard].forEach(c => c.classList.add('hidden'));
  card.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  if (!email || !password) {
    showAlert('Please fill in all fields.', 'error');
    return;
  }

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
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById('successMessage').textContent =
        `Account created for ${data.email}. Download the app and sign in with your email and password.`;
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
