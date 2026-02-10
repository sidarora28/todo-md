class Resizer {
  constructor(resizerEl, leftPanel, rightPanel) {
    this.resizerEl = resizerEl;
    this.leftPanel = leftPanel;
    this.rightPanel = rightPanel;
    this.isResizing = false;

    this.resizerEl.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
  }

  onMouseDown(e) {
    this.isResizing = true;
    this.resizerEl.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  onMouseMove(e) {
    if (!this.isResizing) return;

    const containerRect = this.leftPanel.parentElement.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;

    // Apply min/max constraints from CSS
    const minWidth = parseInt(getComputedStyle(this.leftPanel).minWidth) || 200;
    const maxWidth = parseInt(getComputedStyle(this.leftPanel).maxWidth) || 500;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      this.leftPanel.style.width = `${newWidth}px`;
    }
  }

  onMouseUp() {
    this.isResizing = false;
    this.resizerEl.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
}
