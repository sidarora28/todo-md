async function setupMonaco() {
  // Load Monaco from CDN
  require.config({
    paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
  });

  return new Promise(resolve => {
    require(['vs/editor/editor.main'], resolve);
  });
}
