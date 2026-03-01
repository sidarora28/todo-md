class FileTree {
  constructor(containerEl, onFileSelect, onRightClick) {
    this.containerEl = containerEl;
    this.onFileSelect = onFileSelect;
    this.onRightClick = onRightClick;
    this.expandedPaths = new Set(['projects', 'daily', 'inbox', 'ideas']);
  }

  async load() {
    try {
      const response = await fetch('/api/files/tree');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.containerEl.innerHTML = '';
      if (data.tree && data.tree.children && data.tree.children.length > 0) {
        this.render(data.tree.children, this.containerEl);
      } else {
        this.containerEl.innerHTML = '<div style="padding: 12px; color: #858585; font-size: 13px;">No files yet. Create a project to get started.</div>';
      }
    } catch (err) {
      console.error('Failed to load file tree:', err);
      this.containerEl.innerHTML = '<div style="padding: 12px; color: #f48771; font-size: 13px;">Failed to load files</div>';
    }
  }

  render(items, parentEl, depth = 0) {
    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'file-tree-item';
      itemEl.style.paddingLeft = `${depth * 16 + 12}px`;
      itemEl.dataset.path = item.path;
      itemEl.dataset.type = item.type;

      if (item.type === 'directory') {
        const arrow = document.createElement('i');
        arrow.className = this.expandedPaths.has(item.path)
          ? 'codicon codicon-chevron-down tree-arrow'
          : 'codicon codicon-chevron-right tree-arrow';
        arrow.onclick = (e) => {
          e.stopPropagation();
          this.toggleExpand(item.path);
        };
        itemEl.appendChild(arrow);

        const icon = document.createElement('i');
        icon.className = 'codicon codicon-folder tree-icon';
        itemEl.appendChild(icon);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'tree-arrow';
        itemEl.appendChild(spacer);

        const icon = document.createElement('i');
        const iconClass = item.name.endsWith('.md')
          ? 'codicon codicon-markdown tree-icon'
          : 'codicon codicon-file tree-icon';
        icon.className = iconClass;
        itemEl.appendChild(icon);
      }

      const name = document.createElement('span');
      name.className = 'tree-name';
      name.textContent = item.name;
      itemEl.appendChild(name);

      if (item.type === 'file') {
        itemEl.onclick = () => this.onFileSelect(item.path);
      }

      itemEl.oncontextmenu = (e) => {
        e.preventDefault();
        this.onRightClick(e, item);
      };

      parentEl.appendChild(itemEl);

      if (item.type === 'directory' && item.children && this.expandedPaths.has(item.path)) {
        this.render(item.children, parentEl, depth + 1);
      }
    });
  }

  toggleExpand(path) {
    if (this.expandedPaths.has(path)) {
      this.expandedPaths.delete(path);
    } else {
      this.expandedPaths.add(path);
    }
    this.load();
  }

  highlightFile(path) {
    document.querySelectorAll('.file-tree-item').forEach(el => {
      el.classList.remove('active');
    });
    const target = document.querySelector(`[data-path="${path}"]`);
    if (target) target.classList.add('active');
  }
}
