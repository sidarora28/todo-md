async function setupMonaco() {
  // Load Monaco from CDN
  require.config({
    paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
  });

  return new Promise(resolve => {
    require(['vs/editor/editor.main'], () => {
      // Define custom dark theme matching the ToDo.md landing page
      // Uses Monaco's Monarch token names (NOT TextMate scopes)
      monaco.editor.defineTheme('todomd-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          // keyword = headings (#, ##) and list markers (-, *) — blue like landing page
          { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
          // Links and parenthetical text (project names) — muted gray
          { token: 'string.link', foreground: '858585' },
          // Inline code — teal
          { token: 'variable', foreground: '4ec9b0' },
          // Code block content
          { token: 'variable.source', foreground: 'cccccc' },
          // Bold
          { token: 'strong', foreground: 'cccccc', fontStyle: 'bold' },
          // Italic
          { token: 'emphasis', foreground: 'cccccc', fontStyle: 'italic' },
          // Blockquotes
          { token: 'comment', foreground: '858585' },
          // Horizontal rules
          { token: 'meta.separator', foreground: '3e3e42' },
          // Code block delimiters & strings
          { token: 'string', foreground: '4ec9b0' },
          // HTML elements
          { token: 'tag', foreground: '569cd6' },
          { token: 'attribute.name.html', foreground: '2dd4a8' },
          { token: 'string.html', foreground: '4ec9b0' },
          // Escape sequences
          { token: 'escape', foreground: '2dd4a8' },
          { token: 'string.escape', foreground: '2dd4a8' },
          // Default text
          { token: '', foreground: 'cccccc' },
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#cccccc',
          'editor.lineHighlightBackground': '#2a2d2e',
          'editor.selectionBackground': '#264f78',
          'editorCursor.foreground': '#2dd4a8',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#cccccc',
          'editor.selectionHighlightBackground': '#2d3d37',
          'editorIndentGuide.background': '#3e3e42',
          'editorIndentGuide.activeBackground': '#858585',
        }
      });

      // Define custom light theme
      monaco.editor.defineTheme('todomd-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '0078d4', fontStyle: 'bold' },
          { token: 'string.link', foreground: '6f6f6f' },
          { token: 'variable', foreground: '16a085' },
          { token: 'variable.source', foreground: '3b3b3b' },
          { token: 'strong', foreground: '3b3b3b', fontStyle: 'bold' },
          { token: 'emphasis', foreground: '3b3b3b', fontStyle: 'italic' },
          { token: 'comment', foreground: '6f6f6f' },
          { token: 'meta.separator', foreground: 'e5e5e5' },
          { token: 'string', foreground: '16a085' },
          { token: 'tag', foreground: '0078d4' },
          { token: 'attribute.name.html', foreground: '1fb993' },
          { token: 'string.html', foreground: '16a085' },
          { token: 'escape', foreground: '1fb993' },
          { token: 'string.escape', foreground: '1fb993' },
          { token: '', foreground: '3b3b3b' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#3b3b3b',
          'editor.lineHighlightBackground': '#f3f3f3',
          'editor.selectionBackground': '#add6ff',
          'editorCursor.foreground': '#1fb993',
          'editorLineNumber.foreground': '#6f6f6f',
          'editorLineNumber.activeForeground': '#3b3b3b',
          'editor.selectionHighlightBackground': '#e0f7ef',
          'editorIndentGuide.background': '#e5e5e5',
          'editorIndentGuide.activeBackground': '#c2c2c2',
        }
      });

      resolve();
    });
  });
}
