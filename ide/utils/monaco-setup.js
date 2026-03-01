async function setupMonaco() {
  // Load Monaco from local server (bundled for offline support)
  require.config({
    paths: { 'vs': '/vs' }
  });

  return new Promise(resolve => {
    require(['vs/editor/editor.main'], () => {

      // ── Register custom "todomd" language ──────────────────────────
      monaco.languages.register({ id: 'todomd' });

      monaco.languages.setLanguageConfiguration('todomd', {
        brackets: [['[', ']'], ['(', ')']],
        autoClosingPairs: [
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '`', close: '`' },
          { open: '*', close: '*' },
          { open: '_', close: '_' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
        surroundingPairs: [
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '`', close: '`' },
          { open: '*', close: '*' },
          { open: '_', close: '_' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
      });

      // ── Monarch tokenizer for ToDo.md files ────────────────────────
      // Gives distinct tokens to: headings, checkboxes, task text,
      // project tags, separators, code blocks, and inline formatting.
      monaco.languages.setMonarchTokensProvider('todomd', {
        defaultToken: '',

        tokenizer: {
          root: [
            // Code block delimiter → enter codeblock state
            [/^```\s*\w*\s*$/, 'code.delimiter', '@codeblock'],

            // Headings: # through ######
            [/^(#{1,6}\s+)(.*)$/, ['heading.marker', 'heading.text']],

            // Horizontal rules / task-block separators
            [/^\s*[-*_]{3,}\s*$/, 'separator'],

            // ── Task lines with checkboxes ───────────────────────────
            // Unchecked + project tag at end:  - [ ] text (project) or - [] text (project)
            [/^(\s*[-*+]\s+)(\[[ ]?\])(\s+)(.*?)(\s+\([^)]+\))\s*$/,
              ['list.marker', 'checkbox', 'white', 'task.text', 'project.tag']],

            // Checked + project tag:  - [x] text (project)
            [/^(\s*[-*+]\s+)(\[[xX]\])(\s+)(.*?)(\s+\([^)]+\))\s*$/,
              ['list.marker', 'checkbox.checked', 'white', 'task.text.checked', 'project.tag']],

            // Unchecked, no project tag:  - [ ] text or - [] text
            [/^(\s*[-*+]\s+)(\[[ ]?\])(\s+)(.*)$/,
              ['list.marker', 'checkbox', 'white', 'task.text']],

            // Checked, no project tag:  - [x] text
            [/^(\s*[-*+]\s+)(\[[xX]\])(\s+)(.*)$/,
              ['list.marker', 'checkbox.checked', 'white', 'task.text.checked']],

            // Regular list items (no checkbox)
            [/^(\s*[-*+]\s+)(.*)$/, ['list.marker', 'task.text']],
            [/^(\s*\d+\.\s+)(.*)$/, ['list.marker', 'task.text']],

            // Blockquotes
            [/^(>+\s*)(.*)$/, ['comment', 'comment']],

            // Inline code
            [/`[^`]+`/, 'variable'],

            // Bold
            [/\*\*[^*]+\*\*/, 'strong'],
            [/__[^_]+__/, 'strong'],

            // Italic
            [/\*[^*]+\*/, 'emphasis'],
            [/_[^_]+_/, 'emphasis'],

            // Fallback
            [/./, ''],
          ],

          codeblock: [
            [/^```\s*$/, 'code.delimiter', '@pop'],
            [/.*/, 'code.content'],
          ],
        },
      });

      // ── Dark theme ─────────────────────────────────────────────────
      monaco.editor.defineTheme('todomd-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          // Headings — blue
          { token: 'heading.marker', foreground: '569cd6', fontStyle: 'bold' },
          { token: 'heading.text',   foreground: '569cd6', fontStyle: 'bold' },

          // List markers (-, *, +) — muted
          { token: 'list.marker', foreground: '858585' },

          // Checkboxes — muted gray
          { token: 'checkbox',         foreground: '858585' },
          { token: 'checkbox.checked', foreground: '858585' },

          // Task text — orangish yellow
          { token: 'task.text',         foreground: 'e5c07b' },
          { token: 'task.text.checked', foreground: '858585', fontStyle: 'strikethrough' },

          // Project tags — teal / green
          { token: 'project.tag', foreground: '2dd4a8' },

          // Separators (--- between task blocks)
          { token: 'separator', foreground: '3e3e42' },

          // Code
          { token: 'code.delimiter', foreground: '858585' },
          { token: 'code.content',   foreground: 'cccccc' },
          { token: 'variable',       foreground: '4ec9b0' },

          // Text formatting
          { token: 'strong',   foreground: 'cccccc', fontStyle: 'bold' },
          { token: 'emphasis', foreground: 'cccccc', fontStyle: 'italic' },

          // Blockquotes
          { token: 'comment', foreground: '858585' },

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

      // ── Light theme ────────────────────────────────────────────────
      monaco.editor.defineTheme('todomd-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'heading.marker', foreground: '0078d4', fontStyle: 'bold' },
          { token: 'heading.text',   foreground: '0078d4', fontStyle: 'bold' },
          { token: 'list.marker',    foreground: '6f6f6f' },
          { token: 'checkbox',         foreground: '6f6f6f' },
          { token: 'checkbox.checked', foreground: '6f6f6f' },
          { token: 'task.text',         foreground: '946800' },
          { token: 'task.text.checked', foreground: '6f6f6f', fontStyle: 'strikethrough' },
          { token: 'project.tag', foreground: '1fb993' },
          { token: 'separator',   foreground: 'e5e5e5' },
          { token: 'code.delimiter', foreground: '6f6f6f' },
          { token: 'code.content',   foreground: '3b3b3b' },
          { token: 'variable',       foreground: '16a085' },
          { token: 'strong',   foreground: '3b3b3b', fontStyle: 'bold' },
          { token: 'emphasis', foreground: '3b3b3b', fontStyle: 'italic' },
          { token: 'comment',  foreground: '6f6f6f' },
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
