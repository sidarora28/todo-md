class EditorComponent {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.editor = null;
    this.currentFile = null;
    this.autoSaver = null;
  }

  async init() {
    await setupMonaco(); // From monaco-setup.js

    const currentTheme = localStorage.getItem('theme') || 'dark';

    this.editor = monaco.editor.create(this.containerEl, {
      value: '',
      language: 'markdown',
      theme: currentTheme === 'dark' ? 'todomd-dark' : 'todomd-light',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      wordWrap: 'on',
      automaticLayout: true
    });

    // Store globally for theme toggle
    window.monacoEditor = this.editor;

    // Manual save with Cmd+S
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.manualSave();
    });

    this.setupYAMLAutocomplete();
  }

  async loadFile(filePath) {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
    const data = await response.json();

    this.currentFile = filePath;
    this.editor.setValue(data.content);

    document.getElementById('current-file').textContent = filePath;

    // Start auto-saver
    if (this.autoSaver) this.autoSaver.stop();
    this.autoSaver = new AutoSaver(this.editor, filePath, data.stats.modified);
    this.autoSaver.start();
  }

  async manualSave() {
    if (this.autoSaver) {
      await this.autoSaver.performAutoSave();
      this.autoSaver.showSaveIndicator('Saved ✓');
    }
  }

  setupYAMLAutocomplete() {
    monaco.languages.registerCompletionItemProvider('markdown', {
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const suggestions = [];

        // Status values
        if (lineContent.startsWith('status:')) {
          suggestions.push(
            { label: 'todo', kind: monaco.languages.CompletionItemKind.Value, insertText: 'todo' },
            { label: 'in-progress', kind: monaco.languages.CompletionItemKind.Value, insertText: 'in-progress' },
            { label: 'blocked', kind: monaco.languages.CompletionItemKind.Value, insertText: 'blocked' },
            { label: 'done', kind: monaco.languages.CompletionItemKind.Value, insertText: 'done' }
          );
        }

        // Priority values
        if (lineContent.startsWith('priority:')) {
          suggestions.push(
            { label: 'high', kind: monaco.languages.CompletionItemKind.Value, insertText: 'high' },
            { label: 'medium', kind: monaco.languages.CompletionItemKind.Value, insertText: 'medium' },
            { label: 'low', kind: monaco.languages.CompletionItemKind.Value, insertText: 'low' }
          );
        }

        // Field names
        if (lineContent.trim() === '') {
          suggestions.push(
            { label: 'status:', kind: monaco.languages.CompletionItemKind.Field, insertText: 'status: ' },
            { label: 'priority:', kind: monaco.languages.CompletionItemKind.Field, insertText: 'priority: ' },
            { label: 'due:', kind: monaco.languages.CompletionItemKind.Field, insertText: 'due: ' },
            { label: 'tags:', kind: monaco.languages.CompletionItemKind.Field, insertText: 'tags: []' },
            { label: 'created:', kind: monaco.languages.CompletionItemKind.Field, insertText: 'created: ' },
            { label: 'completed:', kind: monaco.languages.CompletionItemKind.Field, insertText: 'completed: ' }
          );
        }

        return { suggestions };
      }
    });
  }
}
