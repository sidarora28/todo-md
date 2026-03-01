class ThemeToggle {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    this.apply();
  }

  apply() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  toggle() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.currentTheme);
    this.apply();

    // Update Monaco theme
    if (window.monacoEditor) {
      monaco.editor.setTheme(this.currentTheme === 'dark' ? 'todomd-dark' : 'todomd-light');
    }
  }

  getIcon() {
    return 'codicon-color-mode';
  }
}
