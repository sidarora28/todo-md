async function setupMonaco() {
  // Load Monaco from CDN
  require.config({
    paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
  });

  return new Promise(resolve => {
    require(['vs/editor/editor.main'], () => {
      // Define custom dark theme matching the ToDo.md brand
      monaco.editor.defineTheme('todomd-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          // Markdown headings — blue to match landing page preview
          { token: 'markup.heading', foreground: '569cd6', fontStyle: 'bold' },
          { token: 'markup.heading.markdown', foreground: '569cd6', fontStyle: 'bold' },
          { token: 'entity.name.section.markdown', foreground: '569cd6', fontStyle: 'bold' },
          // Bold
          { token: 'markup.bold', foreground: 'cccccc', fontStyle: 'bold' },
          { token: 'markup.bold.markdown', foreground: 'cccccc', fontStyle: 'bold' },
          // Italic
          { token: 'markup.italic', foreground: 'cccccc', fontStyle: 'italic' },
          { token: 'markup.italic.markdown', foreground: 'cccccc', fontStyle: 'italic' },
          // Links
          { token: 'markup.underline.link', foreground: '2dd4a8' },
          { token: 'markup.underline.link.markdown', foreground: '2dd4a8' },
          // Lists — teal accent
          { token: 'markup.list', foreground: '2dd4a8' },
          { token: 'markup.list.markdown', foreground: '2dd4a8' },
          { token: 'punctuation.definition.list.begin.markdown', foreground: '2dd4a8' },
          // Code / inline code
          { token: 'markup.inline.raw', foreground: 'ce9178' },
          { token: 'markup.fenced_code.block.markdown', foreground: 'ce9178' },
          // Blockquotes
          { token: 'markup.quote', foreground: '858585' },
          { token: 'markup.quote.markdown', foreground: '858585' },
          // General text
          { token: '', foreground: 'cccccc' },
          // Comments (YAML frontmatter, etc.)
          { token: 'comment', foreground: '6b7280' },
          // Strings (YAML values, etc.)
          { token: 'string', foreground: '4ec9b0' },
          // Keywords
          { token: 'keyword', foreground: '2dd4a8' },
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

      // Define custom light theme matching the ToDo.md brand
      monaco.editor.defineTheme('todomd-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'markup.heading', foreground: '0078d4', fontStyle: 'bold' },
          { token: 'markup.heading.markdown', foreground: '0078d4', fontStyle: 'bold' },
          { token: 'entity.name.section.markdown', foreground: '0078d4', fontStyle: 'bold' },
          { token: 'markup.bold', foreground: '3b3b3b', fontStyle: 'bold' },
          { token: 'markup.italic', foreground: '3b3b3b', fontStyle: 'italic' },
          { token: 'markup.underline.link', foreground: '1fb993' },
          { token: 'markup.underline.link.markdown', foreground: '1fb993' },
          { token: 'markup.list', foreground: '1fb993' },
          { token: 'punctuation.definition.list.begin.markdown', foreground: '1fb993' },
          { token: 'markup.inline.raw', foreground: 'ca6f1e' },
          { token: 'markup.quote', foreground: '6f6f6f' },
          { token: '', foreground: '3b3b3b' },
          { token: 'comment', foreground: '6b7280' },
          { token: 'string', foreground: '16a085' },
          { token: 'keyword', foreground: '1fb993' },
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
