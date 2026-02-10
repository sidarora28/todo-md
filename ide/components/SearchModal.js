class SearchModal {
  constructor(onOpenFile) {
    this.onOpenFile = onOpenFile;
    this.modalEl = document.getElementById('search-modal');
    this.inputEl = document.getElementById('search-input');
    this.searchBtn = document.getElementById('search-trigger-btn');
    this.closeBtn = document.getElementById('search-close-btn');
    this.resultsEl = document.getElementById('search-results');
    this.loadingEl = document.getElementById('search-loading');

    this.searchBtn.addEventListener('click', () => this.search(this.inputEl.value));
    this.closeBtn.addEventListener('click', () => this.hide());
    this.modalEl.querySelector('.modal-overlay').addEventListener('click', () => this.hide());

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.search(this.inputEl.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      }
    });
  }

  show() {
    this.modalEl.style.display = 'flex';
    this.inputEl.value = '';
    this.resultsEl.innerHTML = '';
    this.loadingEl.style.display = 'none';
    this.inputEl.focus();
  }

  hide() {
    this.modalEl.style.display = 'none';
    this.inputEl.value = '';
    this.resultsEl.innerHTML = '';
  }

  async search(query) {
    query = query.trim();
    if (!query) return;

    this.loadingEl.style.display = 'block';
    this.resultsEl.innerHTML = '';

    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      this.loadingEl.style.display = 'none';
      this.renderResults(data);
    } catch (error) {
      this.loadingEl.style.display = 'none';
      this.resultsEl.innerHTML = '<div class="search-empty">Search failed. Please try again.</div>';
      console.error('Search error:', error);
    }
  }

  renderResults(data) {
    let html = '';

    if (data.answer) {
      html += `<div class="search-answer">${this.escapeHtml(data.answer)}</div>`;
    }

    if (data.results && data.results.length > 0) {
      data.results.forEach(result => {
        const snippet = result.matches && result.matches.length > 0
          ? result.matches.slice(0, 3).map(m =>
              `<span class="search-line-num">L${m.line}</span> ${this.escapeHtml(m.text)}`
            ).join('<br>')
          : '';

        html += `
          <div class="search-result-item">
            <div class="search-result-file">
              <span class="search-result-path">${this.escapeHtml(result.file)}</span>
              <button class="search-result-open" data-file="${this.escapeHtml(result.file)}">Open</button>
            </div>
            ${result.why ? `<div class="search-result-why">${this.escapeHtml(result.why)}</div>` : ''}
            ${snippet ? `<div class="search-result-snippet">${snippet}</div>` : ''}
          </div>
        `;
      });
    }

    if (!data.answer && (!data.results || data.results.length === 0)) {
      html = '<div class="search-empty">No results found</div>';
    }

    this.resultsEl.innerHTML = html;

    this.resultsEl.querySelectorAll('.search-result-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const file = btn.dataset.file;
        if (this.onOpenFile) this.onOpenFile(file);
        this.hide();
      });
    });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
