// ===== Nav scroll shadow =====
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 10);
});

// ===== Mobile nav toggle =====
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile nav on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

// ===== How It Works tabs =====
const tabs = document.querySelectorAll('.how-tab');
const panels = document.querySelectorAll('.how-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    document.querySelector(`.how-panel[data-panel="${target}"]`).classList.add('active');
  });
});

// ===== Scroll fade-in animations =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ===== Pricing buttons =====
document.querySelectorAll('[data-plan]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const plan = btn.dataset.plan;
    btn.disabled = true;
    btn.textContent = 'Loading...';

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType: plan })
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
        btn.disabled = false;
        btn.textContent = btn.getAttribute('data-original-text') || 'Try Again';
      }
    } catch {
      alert('Network error. Please check your connection and try again.');
      btn.disabled = false;
      btn.textContent = 'Try Again';
    }
  });
});

// Store original button text for reset
document.querySelectorAll('[data-plan]').forEach(btn => {
  btn.setAttribute('data-original-text', btn.textContent);
});
