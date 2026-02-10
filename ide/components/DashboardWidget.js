class DashboardWidget {
  esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  constructor(containerEl, onTaskClick) {
    this.containerEl = containerEl;
    this.onTaskClick = onTaskClick;
    this.lastModified = null;
    this.cachedSummary = null;
  }

  async load() {
    const response = await fetch('/api/dashboard');
    const data = await response.json();
    this.render(data);
  }

  async checkForUpdates() {
    try {
      const response = await fetch('/api/dashboard');
      const newData = await response.json();

      const newModified = JSON.stringify(newData);
      if (this.lastModified !== newModified) {
        this.lastModified = newModified;
        this.render(newData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking for dashboard updates:', error);
      return false;
    }
  }

  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getUrgencyClass(task, currentDate) {
    if (task.due && task.due < currentDate) {
      return 'urgent-critical';
    }
    return '';
  }

  getUrgencyBadge(task, currentDate) {
    if (task.due && task.due < currentDate) {
      const days = this.daysBetween(task.due, currentDate);
      return `OVERDUE ${days}d`;
    }
    if (task.due === currentDate) return 'DUE TODAY';
    return '';
  }

  render(data) {
    const allTasks = Object.values(data.projects).flatMap(p => {
      return p.tasks.map(t => ({
        ...t,
        project: Object.keys(data.projects).find(k => data.projects[k] === p)
      }));
    });

    const tasksWithDates = allTasks.filter(t => t.due && t.status !== 'done');

    const today = data.date;
    const todayDate = new Date(today);
    const weekFromNow = new Date(todayDate);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];

    const todayTasks = tasksWithDates.filter(t => t.due === today);
    const thisWeekTasks = tasksWithDates.filter(t => t.due > today && t.due <= weekStr);
    const laterTasks = tasksWithDates.filter(t => t.due > weekStr).sort((a, b) => a.due.localeCompare(b.due));
    const overdueTasks = tasksWithDates.filter(t => t.due < today);

    const completedThisWeek = allTasks.filter(t => {
      if (!t.completed) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.completed) >= weekAgo;
    });

    const renderTask = (t) => {
      const urgencyClass = this.getUrgencyClass(t, today);
      const badge = this.getUrgencyBadge(t, today);
      return `
        <div class="task-item ${urgencyClass}"
             data-project="${this.esc(t.project)}"
             data-task-title="${this.esc(t.title)}"
             title="Click to open in editor">
          <div class="task-content">
            <span class="task-title">${this.esc(t.title)}</span>
            ${badge ? `<span class="task-badge">${badge}</span>` : ''}
          </div>
          <button class="reschedule-btn" title="Reschedule task">📅</button>
        </div>
      `;
    };

    this.containerEl.innerHTML = `
      <div id="ai-daily-summary" class="dashboard-section"></div>

      <div class="dashboard-section">
        <h4 class="section-header">Overview</h4>
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-number">${completedThisWeek.length}</div>
            <div class="stat-label">Achieved This Week</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${todayTasks.length}</div>
            <div class="stat-label">Due Today</div>
          </div>
          <div class="stat-item ${overdueTasks.length > 0 ? 'stat-warning' : ''}">
            <div class="stat-number">${overdueTasks.length}</div>
            <div class="stat-label">Overdue</div>
          </div>
        </div>
      </div>

      ${overdueTasks.length > 0 ? `
        <div class="dashboard-section">
          <h4 class="section-header section-header-overdue">Overdue</h4>
          <div class="task-list">
            ${overdueTasks.map(renderTask).join('')}
          </div>
        </div>
      ` : ''}

      ${todayTasks.length > 0 ? `
        <div class="dashboard-section">
          <h4 class="section-header">Today</h4>
          <div class="task-list">
            ${todayTasks.map(renderTask).join('')}
          </div>
        </div>
      ` : ''}

      ${thisWeekTasks.length > 0 ? `
        <div class="dashboard-section">
          <h4 class="section-header">This Week</h4>
          <div class="task-list">
            ${thisWeekTasks.map(renderTask).join('')}
          </div>
        </div>
      ` : ''}

      ${laterTasks.length > 0 ? `
        <div class="dashboard-section">
          <h4 class="section-header">Later</h4>
          <div class="task-list">
            ${laterTasks.map(renderTask).join('')}
          </div>
        </div>
      ` : ''}

      ${overdueTasks.length === 0 && todayTasks.length === 0 && thisWeekTasks.length === 0 && laterTasks.length === 0 ? `
        <div class="empty-state">No upcoming tasks with due dates</div>
      ` : ''}
    `;

    // Add click handlers for tasks
    this.containerEl.querySelectorAll('.task-item').forEach(item => {
      const project = item.dataset.project;
      if (project) {
        const taskContent = item.querySelector('.task-content');
        taskContent.addEventListener('click', () => {
          const now = new Date();
          const monthFile = `projects/${project}/tasks/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.md`;
          if (this.onTaskClick) this.onTaskClick(monthFile);
        });

        const rescheduleBtn = item.querySelector('.reschedule-btn');
        if (rescheduleBtn) {
          rescheduleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showReschedulePicker(item.dataset.taskTitle, project, item);
          });
        }
      }
    });

    // Restore daily summary if cached
    if (this.cachedSummary) {
      this.renderSummaryHTML(this.cachedSummary);
    }
  }

  renderSummaryHTML(s) {
    const container = document.getElementById('ai-daily-summary');
    if (!container) return;
    if (sessionStorage.getItem('summary-dismissed')) return;

    container.innerHTML = `
      <div class="ai-briefing">
        <div class="ai-briefing-header">
          <h4 class="section-header" style="margin:0">Daily Briefing</h4>
          <div class="ai-briefing-actions">
            <button class="icon-btn" id="refresh-summary-btn" title="Refresh">
              <i class="codicon codicon-refresh"></i>
            </button>
            <button class="icon-btn" id="dismiss-summary-btn" title="Dismiss">
              <i class="codicon codicon-close"></i>
            </button>
          </div>
        </div>
        <div class="ai-briefing-narrative">${this.esc(s.narrative)}</div>
        ${s.quote ? `<div class="ai-briefing-quote">"${this.esc(s.quote)}"</div>` : ''}
      </div>
    `;

    container.style.display = 'block';

    document.getElementById('refresh-summary-btn').addEventListener('click', () => {
      this.loadDailySummary(true);
    });
    document.getElementById('dismiss-summary-btn').addEventListener('click', () => {
      container.style.display = 'none';
      sessionStorage.setItem('summary-dismissed', 'true');
    });
  }

  async loadDailySummary(refresh = false) {
    const container = document.getElementById('ai-daily-summary');
    if (!container) return;

    // Don't load if dismissed this session
    if (!refresh && sessionStorage.getItem('summary-dismissed')) return;

    try {
      const response = await fetch('/api/ai/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh })
      });
      const data = await response.json();

      if (!data.success) return;

      this.cachedSummary = data.summary;
      this.renderSummaryHTML(data.summary);
    } catch (error) {
      console.error('Error loading daily summary:', error);
    }
  }

  showReschedulePicker(taskTitle, project, taskElement) {
    const existingPicker = taskElement.querySelector('.date-picker-popup');
    if (existingPicker) {
      existingPicker.remove();
      return;
    }

    const picker = document.createElement('div');
    picker.className = 'date-picker-popup';
    picker.innerHTML = `
      <input type="date" class="date-input" value="${new Date().toISOString().split('T')[0]}">
      <button class="picker-save">Save</button>
      <button class="picker-cancel">Cancel</button>
    `;

    const saveBtn = picker.querySelector('.picker-save');
    const cancelBtn = picker.querySelector('.picker-cancel');
    const dateInput = picker.querySelector('.date-input');

    saveBtn.addEventListener('click', async () => {
      await this.rescheduleTask(taskTitle, project, dateInput.value);
      picker.remove();
    });

    cancelBtn.addEventListener('click', () => {
      picker.remove();
    });

    taskElement.appendChild(picker);
  }

  async rescheduleTask(taskTitle, project, newDueDate) {
    try {
      const response = await fetch('/api/tasks/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle, project, newDueDate })
      });

      if (response.ok) {
        await this.load();
      } else {
        const error = await response.json();
        console.error('Failed to reschedule:', error);
      }
    } catch (error) {
      console.error('Error rescheduling task:', error);
    }
  }
}
