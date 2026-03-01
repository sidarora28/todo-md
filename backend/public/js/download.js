// Detect OS and highlight the recommended download
(function () {
  const ua = navigator.userAgent.toLowerCase();
  let os = 'unknown';

  if (ua.includes('mac')) os = 'mac';
  else if (ua.includes('win')) os = 'win';

  const macCard = document.getElementById('card-mac');
  const winCard = document.getElementById('card-win');
  const macBtn = document.getElementById('btn-mac');
  const winBtn = document.getElementById('btn-win');

  if (os === 'mac') {
    macCard.classList.add('recommended');
    // Add recommended badge
    const badge = document.createElement('span');
    badge.className = 'download-badge';
    badge.textContent = 'Recommended for you';
    macCard.insertBefore(badge, macCard.firstChild);
    // Make mac button primary, win outline
    macBtn.className = 'btn btn-primary btn-full';
    winBtn.className = 'btn btn-outline btn-full';
  } else if (os === 'win') {
    winCard.classList.add('recommended');
    const badge = document.createElement('span');
    badge.className = 'download-badge';
    badge.textContent = 'Recommended for you';
    winCard.insertBefore(badge, winCard.firstChild);
    // Make win button primary, mac outline
    winBtn.className = 'btn btn-primary btn-full';
    macBtn.className = 'btn btn-outline btn-full';
  }
})();

// Nav scroll shadow (same as main page)
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  });
}

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });
}
