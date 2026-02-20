/**
 * StatusBanner — shows trial countdown, expired notice, or usage meter
 * in a thin bar above the IDE. Only active when running inside Electron.
 */
class StatusBanner {
  constructor(el) {
    this.el = el;
    this.status = null;
    this.dismissed = false;
  }

  async load() {
    // Only works in Electron (preload exposes window.todomd)
    if (!window.todomd || !window.todomd.getAuthStatus) return;

    try {
      this.status = await window.todomd.getAuthStatus();
    } catch {
      // Offline or not authenticated — don't show banner
      return;
    }

    if (!this.status || !this.status.loggedIn) return;

    this.render();
  }

  render() {
    const s = this.status;
    if (!s || this.dismissed) return;

    const plan = s.plan;

    // Paid users: no banner needed
    if (plan === 'active' || plan === 'lifetime') {
      this.el.style.display = 'none';
      return;
    }

    let html = '';

    const limitsHint = '3 projects · keyword search · basic briefings';

    if (plan === 'expired') {
      // Trial expired
      html = `
        <span class="status-banner-text status-banner-warning">
          Free plan: ${limitsHint}. Upgrade for unlimited projects, AI search & daily briefings.
        </span>
        <button class="status-banner-btn status-banner-upgrade" id="banner-upgrade-btn">Upgrade</button>
        <button class="status-banner-dismiss" id="banner-dismiss-btn" title="Dismiss">&times;</button>
      `;
      this.el.classList.add('status-banner-expired');
    } else if (plan === 'trial') {
      const days = s.trialDaysLeft;
      const usage = s.usage || {};

      if (days <= 3) {
        // Urgent: 3 days or less
        html = `
          <span class="status-banner-text status-banner-warning">
            ${days === 0 ? 'Trial expires today!' : `Trial ends in ${days} day${days === 1 ? '' : 's'}.`}
            After trial: ${limitsHint}.
          </span>
          <span class="status-banner-usage">${usage.today || 0}/${usage.limit || 0} AI requests today</span>
          <button class="status-banner-btn status-banner-upgrade" id="banner-upgrade-btn">Upgrade</button>
          <button class="status-banner-dismiss" id="banner-dismiss-btn" title="Dismiss">&times;</button>
        `;
        this.el.classList.add('status-banner-urgent');
      } else {
        // Normal trial: show days remaining + usage
        html = `
          <span class="status-banner-text">
            Free trial: ${days} day${days === 1 ? '' : 's'} remaining
          </span>
          <span class="status-banner-usage">${usage.today || 0}/${usage.limit || 0} AI requests today</span>
          <button class="status-banner-btn" id="banner-upgrade-btn">Upgrade</button>
          <button class="status-banner-dismiss" id="banner-dismiss-btn" title="Dismiss">&times;</button>
        `;
      }
    } else {
      // Unknown plan state — hide
      this.el.style.display = 'none';
      return;
    }

    this.el.innerHTML = html;
    this.el.style.display = 'flex';

    // Wire up buttons
    const upgradeBtn = document.getElementById('banner-upgrade-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => this.handleUpgrade());
    }

    const dismissBtn = document.getElementById('banner-dismiss-btn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismiss());
    }
  }

  handleUpgrade() {
    if (!window.todomd || !window.todomd.openCheckout) return;
    // Default to monthly; user can choose in Stripe Checkout
    window.todomd.openCheckout('monthly');
  }

  dismiss() {
    this.dismissed = true;
    this.el.style.display = 'none';
  }
}
