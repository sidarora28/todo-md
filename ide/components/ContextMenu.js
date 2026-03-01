class ContextMenu {
  constructor(fileTree) {
    this.fileTree = fileTree;
    this.menuEl = document.getElementById('context-menu');
    document.addEventListener('click', () => this.hide());
  }

  show(x, y, item) {
    this.menuEl.innerHTML = '';
    this.menuEl.style.left = `${x}px`;
    this.menuEl.style.top = `${y}px`;

    const items = item.type === 'file'
      ? [
          { icon: '✏️', label: 'Rename', action: () => this.renameFile(item) },
          { icon: '🗑️', label: 'Delete', action: () => this.deleteFile(item), danger: true }
        ]
      : [
          { icon: '📄', label: 'New File', action: () => this.newFile(item) },
          { icon: '📁', label: 'New Folder', action: () => this.newFolder(item) },
          { icon: '✏️', label: 'Rename', action: () => this.renameFile(item) },
          { icon: '🗑️', label: 'Delete', action: () => this.deleteFile(item), danger: true }
        ];

    items.forEach(menuItem => {
      const el = document.createElement('div');
      el.className = 'context-menu-item';
      if (menuItem.danger) el.classList.add('danger');
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
      iconSpan.textContent = menuItem.icon;
      el.appendChild(iconSpan);
      el.appendChild(document.createTextNode(' ' + menuItem.label));
      el.onclick = (e) => {
        e.stopPropagation();
        menuItem.action();
        this.hide();
      };
      this.menuEl.appendChild(el);
    });

    this.menuEl.style.display = 'block';
  }

  hide() {
    this.menuEl.style.display = 'none';
  }

  showInputModal(title, placeholder, defaultValue = '') {
    return new Promise((resolve) => {
      const modal = document.getElementById('input-modal');
      const overlay = modal.querySelector('.modal-overlay');
      const header = modal.querySelector('.modal-header');
      const input = modal.querySelector('.form-input');
      const submitBtn = modal.querySelector('.btn-primary');
      const cancelBtn = modal.querySelector('.btn-secondary');
      const closeBtn = header.querySelector('.close-btn');
      const titleEl = header.querySelector('h3');

      titleEl.textContent = title;
      input.placeholder = placeholder;
      input.value = defaultValue;
      modal.style.display = 'flex';
      input.focus();
      input.select();

      const cleanup = (value) => {
        modal.style.display = 'none';
        input.value = '';
        overlay.removeEventListener('click', onCancel);
        submitBtn.removeEventListener('click', onSubmit);
        cancelBtn.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
        input.removeEventListener('keydown', onKeydown);
        resolve(value);
      };

      const onSubmit = () => {
        const value = input.value.trim();
        cleanup(value || null);
      };

      const onCancel = () => {
        cleanup(null);
      };

      const onKeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      };

      overlay.addEventListener('click', onCancel);
      submitBtn.addEventListener('click', onSubmit);
      cancelBtn.addEventListener('click', onCancel);
      closeBtn.addEventListener('click', onCancel);
      input.addEventListener('keydown', onKeydown);
    });
  }

  showConfirmModal(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const overlay = modal.querySelector('.modal-overlay');
      const header = modal.querySelector('.modal-header');
      const messageEl = modal.querySelector('.modal-body p');
      const confirmBtn = modal.querySelector('.btn-danger');
      const cancelBtn = modal.querySelector('.btn-secondary');
      const closeBtn = header.querySelector('.close-btn');
      const titleEl = header.querySelector('h3');

      titleEl.textContent = title;
      messageEl.textContent = message;
      modal.style.display = 'flex';
      cancelBtn.focus();

      const cleanup = (value) => {
        modal.style.display = 'none';
        overlay.removeEventListener('click', onCancel);
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKeydown);
        resolve(value);
      };

      const onConfirm = () => {
        cleanup(true);
      };

      const onCancel = () => {
        cleanup(false);
      };

      const onKeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      };

      overlay.addEventListener('click', onCancel);
      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      closeBtn.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKeydown);
    });
  }

  async newFile(parentItem) {
    const fileName = await this.showInputModal('New File', 'Enter file name');
    if (!fileName) return;

    await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `${parentItem.path}/${fileName}`,
        type: 'file',
        content: ''
      })
    });

    this.fileTree.load();
  }

  async newFolder(parentItem) {
    const folderName = await this.showInputModal('New Folder', 'Enter folder name');
    if (!folderName) return;

    await fetch('/api/files/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `${parentItem.path}/${folderName}` })
    });

    this.fileTree.load();
  }

  async renameFile(item) {
    const newName = await this.showInputModal('Rename', 'Enter new name', item.name);
    if (!newName || newName === item.name) return;

    const parentPath = item.path.split('/').slice(0, -1).join('/');
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath: item.path, newPath })
    });

    this.fileTree.load();
  }

  async deleteFile(item) {
    const confirmed = await this.showConfirmModal('Delete', `Are you sure you want to delete ${item.path}?`);
    if (!confirmed) return;

    await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: item.path })
    });

    this.fileTree.load();
  }
}
