class AutoSaver {
  constructor(editor, filePath, lastModified) {
    this.editor = editor;
    this.filePath = filePath;
    this.lastModified = lastModified;
    this.saveTimeout = null;
    this.saveInProgress = false;
    this.changeListener = null;
  }

  start() {
    this.changeListener = this.editor.onDidChangeModelContent(() => {
      this.scheduleAutoSave();
      this.markDirty();
    });
  }

  stop() {
    clearTimeout(this.saveTimeout);
    if (this.changeListener) {
      this.changeListener.dispose();
    }
  }

  scheduleAutoSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.performAutoSave();
    }, 10000); // 10 second debounce
  }

  async performAutoSave() {
    if (this.saveInProgress) return;

    this.saveInProgress = true;

    try {
      const content = this.editor.getValue();
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: this.filePath,
          content: content,
          lastModified: this.lastModified
        })
      });

      const result = await response.json();

      if (result.conflict) {
        this.handleConflict(result.currentContent);
      } else if (result.success) {
        this.lastModified = result.modified;
        this.showSaveIndicator('Auto-saved');
        this.markClean();
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      this.showSaveIndicator('Save failed', 'error');
    } finally {
      this.saveInProgress = false;
    }
  }

  handleConflict(externalContent) {
    const choice = confirm('File was modified externally. Click OK to reload, Cancel to keep your changes.');
    if (choice) {
      this.editor.setValue(externalContent);
      this.markClean();
    }
  }

  markDirty() {
    const indicator = document.getElementById('save-indicator');
    indicator.textContent = '● Unsaved';
    indicator.className = 'save-indicator dirty';
  }

  markClean() {
    const indicator = document.getElementById('save-indicator');
    indicator.textContent = '✓ Saved';
    indicator.className = 'save-indicator';
  }

  showSaveIndicator(text, type = 'success') {
    const indicator = document.getElementById('save-indicator');
    indicator.textContent = text;
    indicator.className = `save-indicator ${type === 'error' ? 'dirty' : 'saving'}`;

    setTimeout(() => {
      this.markClean();
    }, 2000);
  }
}
