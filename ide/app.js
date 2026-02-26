// Initialize IDE
(async function() {
  // Status banner (trial countdown / upgrade prompt) — loads async, non-blocking
  const statusBanner = new StatusBanner(document.getElementById('status-banner'));
  statusBanner.load();

  // Create components
  const fileTree = new FileTree(
    document.getElementById('file-tree'),
    (path) => {
      editor.loadFile(path);
      fileTree.highlightFile(path);
    },
    (e, item) => contextMenu.show(e.clientX, e.clientY, item)
  );

  const editor = new EditorComponent(document.getElementById('monaco-container'));
  const dashboardWidget = new DashboardWidget(
    document.getElementById('dashboard-widget'),
    (filePath) => {
      editor.loadFile(filePath);
      fileTree.highlightFile(filePath);
    }
  );
  const contextMenu = new ContextMenu(fileTree);
  const themeToggle = new ThemeToggle();
  const searchModal = new SearchModal((filePath) => {
    editor.loadFile(filePath);
    fileTree.highlightFile(filePath);
  });

  // Initialize resizable panels
  const leftPanel = document.querySelector('.file-tree-panel');
  const rightPanel = document.querySelector('.dashboard-panel');
  const resizerLeft = new Resizer(
    document.getElementById('resizer-left'),
    leftPanel,
    document.querySelector('.editor-panel')
  );
  const resizerRight = new Resizer(
    document.getElementById('resizer-right'),
    rightPanel,
    document.querySelector('.editor-panel')
  );

  // Initialize Monaco Editor
  await editor.init();

  // Load initial data
  await fileTree.load();
  await dashboardWidget.load();
  dashboardWidget.loadDailySummary();

  // Wire search button
  document.getElementById('search-btn').addEventListener('click', () => searchModal.show());

  // Cmd/Ctrl+Shift+F to open search
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
      e.preventDefault();
      searchModal.show();
    }
  });

  // Setup theme toggle
  const themeToggleBtn = document.getElementById('theme-toggle');
  const updateThemeIcon = () => {
    const icon = themeToggleBtn.querySelector('i');
    icon.className = `codicon ${themeToggle.getIcon()}`;
  };

  themeToggleBtn.addEventListener('click', () => {
    themeToggle.toggle();
    updateThemeIcon();
  });
  updateThemeIcon();

  // Setup new project modal
  const newProjectBtn = document.getElementById('new-project-btn');
  const newProjectModal = document.getElementById('new-project-modal');
  const closeProjectModal = document.getElementById('close-project-modal');
  const cancelProjectBtn = document.getElementById('cancel-project-btn');
  const createProjectBtn = document.getElementById('create-project-btn');
  const projectTargetSelect = document.getElementById('project-target');
  const projectDateInput = document.getElementById('project-date');

  // Show/hide date input based on target type
  projectTargetSelect.addEventListener('change', () => {
    projectDateInput.style.display = projectTargetSelect.value === 'date' ? 'block' : 'none';
  });

  // Show modal
  newProjectBtn.addEventListener('click', () => {
    newProjectModal.style.display = 'flex';
    document.getElementById('project-key').focus();
  });

  // Hide modal
  const hideModal = () => {
    newProjectModal.style.display = 'none';
    // Clear form
    document.getElementById('project-key').value = '';
    document.getElementById('project-name').value = '';
    document.getElementById('project-goal').value = '';
    projectTargetSelect.value = 'ongoing';
    projectDateInput.style.display = 'none';
    projectDateInput.value = '';
  };

  closeProjectModal.addEventListener('click', hideModal);
  cancelProjectBtn.addEventListener('click', hideModal);

  // Close on overlay click
  newProjectModal.querySelector('.modal-overlay').addEventListener('click', hideModal);

  // Create project
  createProjectBtn.addEventListener('click', async () => {
    const projectKey = document.getElementById('project-key').value.trim();
    const projectName = document.getElementById('project-name').value.trim();
    const projectGoal = document.getElementById('project-goal').value.trim();
    const targetType = projectTargetSelect.value;
    const targetDate = targetType === 'date' ? projectDateInput.value : 'ongoing';

    if (!projectKey) {
      alert('Project key is required');
      return;
    }

    if (!projectName) {
      alert('Project name is required');
      return;
    }

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectKey,
          projectName,
          goal: projectGoal,
          targetDate
        })
      });

      if (response.ok) {
        hideModal();
        await fileTree.load();
        // Open the PROJECT.md file
        editor.loadFile(`projects/${projectKey}/PROJECT.md`);
        fileTree.highlightFile(`projects/${projectKey}/PROJECT.md`);
      } else {
        const error = await response.json();
        alert('Failed to create project: ' + error.error);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project');
    }
  });

  // Auto-refresh dashboard every 10 seconds (checks for updates without full reload)
  setInterval(() => dashboardWidget.checkForUpdates(), 10000);

  // Ensure today's file exists and open it
  const today = new Date().toISOString().split('T')[0];
  const todayFile = `daily/${today}.md`;

  try {
    // Ensure today's file exists (generates if needed)
    const ensureResponse = await fetch(`/api/daily/ensure?date=${today}`);
    const ensureData = await ensureResponse.json();

    if (ensureData.success) {
      // Load today's file
      await editor.loadFile(todayFile);
      fileTree.highlightFile(todayFile);

      if (ensureData.generated) {
        console.log('Generated new daily file for', today);
      }
    }

    // Ensure inbox.md and tasks.md exist
    await fetch('/api/files/ensure-capture-files', { method: 'POST' });
  } catch (error) {
    console.error('Error loading today file:', error);
  }
})();
