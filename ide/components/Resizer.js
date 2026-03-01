class Resizer {
  constructor(resizerEl, panel, adjacentPanel, side = 'left') {
    this.resizerEl = resizerEl;
    this.panel = panel;
    this.adjacentPanel = adjacentPanel;
    this.side = side;
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

    const containerRect = this.panel.parentElement.getBoundingClientRect();
    const newWidth = this.side === 'left'
      ? e.clientX - containerRect.left
      : containerRect.right - e.clientX;

    // Apply min/max constraints from CSS
    const minWidth = parseInt(getComputedStyle(this.panel).minWidth) || 200;
    const maxWidth = parseInt(getComputedStyle(this.panel).maxWidth) || 500;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      this.panel.style.width = `${newWidth}px`;
    }
  }

  onMouseUp() {
    this.isResizing = false;
    this.resizerEl.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
}
