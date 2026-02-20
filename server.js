const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Desktop app mode: DATA_DIR and APP_ROOT are set by electron/main.js via process.env.
// Standalone mode: both default to __dirname (original behavior).
const APP_ROOT = process.env.APP_ROOT || __dirname;
const DATA_DIR = process.env.DATA_DIR || __dirname;

// Load .env only in standalone mode (desktop app uses electron/config.js instead)
if (!process.env.APP_ROOT) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }));
app.use(express.json());
app.use(express.static(APP_ROOT, {
  dotfiles: 'deny',
  index: false,
  extensions: ['html', 'css', 'js', 'png', 'jpg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf']
}));

// Redirect root to IDE
app.get('/', (req, res) => {
  res.redirect('/ide.html');
});

// Helper function to read dashboard data
function getDashboardData() {
  const dataPath = path.join(DATA_DIR, 'dashboard-data.json');
  if (fs.existsSync(dataPath)) {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
  return { date: new Date().toISOString().split('T')[0], projects: {}, ideas: [], inbox: [] };
}

// Helper function to write dashboard data
function saveDashboardData(data) {
  const dataPath = path.join(DATA_DIR, 'dashboard-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Helper: extract JSON from LLM responses (handles markdown code blocks)
function extractJSON(text) {
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

// Auto-detect LLM provider from API key prefix or explicit env vars
// Returns { provider, apiKey, model, endpoint }
// ─── AI Proxy ───────────────────────────────────────────────────
// Routes LLM calls through the managed backend proxy.
// Falls back to direct API calls if a legacy LLM_API_KEY is set.

const PROXY_URL = process.env.PROXY_URL || 'https://todo-md-desktop.vercel.app';

function getLLMConfig() {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  let provider = process.env.LLM_PROVIDER;
  if (!provider) {
    if (apiKey.startsWith('sk-ant-')) provider = 'anthropic';
    else if (apiKey.startsWith('sk-or-v1-')) provider = 'openrouter';
    else if (apiKey.startsWith('sk-')) provider = 'openai';
    else provider = 'openrouter';
  }

  const model = process.env.LLM_MODEL || process.env.OPENROUTER_MODEL;
  const configs = {
    openai:     { provider: 'openai',     apiKey, model: model || 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
    anthropic:  { provider: 'anthropic',  apiKey, model: model || 'claude-sonnet-4-5-20250929', endpoint: 'https://api.anthropic.com/v1/messages' },
    openrouter: { provider: 'openrouter', apiKey, model: model || 'anthropic/claude-sonnet-4-5', endpoint: 'https://openrouter.ai/api/v1/chat/completions' }
  };
  return configs[provider] || configs.openrouter;
}

// Shared LLM helper — returns { success, content, error }
async function callLLM(prompt, options = {}) {
  // Prefer managed proxy if user is authenticated
  const authToken = process.env.AUTH_TOKEN;
  if (authToken) {
    return callLLMProxy(prompt, options, authToken);
  }
  // Fallback: direct API call with legacy keys
  return callLLMDirect(prompt, options);
}

// Call through managed backend proxy
async function callLLMProxy(prompt, options, authToken) {
  try {
    const res = await fetch(`${PROXY_URL}/api/ai/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ prompt, options: { maxTokens: options.maxTokens || 1024 } })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Proxy error:', res.status, data.error);
      return { success: false, content: null, error: data.error || `proxy_error_${res.status}` };
    }
    return { success: true, content: data.content, error: null };
  } catch (error) {
    console.error('Proxy call failed:', error.message);
    return { success: false, content: null, error: 'network_error' };
  }
}

// Direct LLM call (legacy — for users with their own API keys)
async function callLLMDirect(prompt, options = {}) {
  const config = getLLMConfig();
  if (!config) {
    return { success: false, content: null, error: 'no_api_key' };
  }

  const { model = config.model, maxTokens = 1024 } = options;

  try {
    let response;
    if (config.provider === 'anthropic') {
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
      });
    } else {
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`${config.provider} API error:`, response.status, errorBody);
      return { success: false, content: null, error: `api_error_${response.status}` };
    }

    const data = await response.json();
    let content;
    if (config.provider === 'anthropic') {
      content = data.content?.[0]?.text;
    } else {
      content = data.choices?.[0]?.message?.content;
    }
    return { success: true, content, error: null };
  } catch (error) {
    console.error('LLM call failed:', error.message);
    return { success: false, content: null, error: 'network_error' };
  }
}

// Shared helper to gather all tasks from project files
function getAllActiveTasks() {
  const projectsDir = path.join(DATA_DIR, 'projects');
  const allTasks = [];
  const completedThisWeek = [];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const dashboardProjects = {};

  if (fs.existsSync(projectsDir)) {
    const projects = fs.readdirSync(projectsDir).filter(p => {
      return fs.statSync(path.join(projectsDir, p)).isDirectory();
    });

    projects.forEach(projectKey => {
      const tasksDir = path.join(projectsDir, projectKey, 'tasks');
      if (!fs.existsSync(tasksDir)) return;

      const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
      const projectTasks = [];

      taskFiles.forEach(file => {
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        const taskBlocks = content.split('---').filter(block => block.trim() && block.includes('###'));

        taskBlocks.forEach(block => {
          const titleMatch = block.match(/###\s+(.+)/);
          const dueMatch = block.match(/due:\s*(\d{4}-\d{2}-\d{2})/);
          const priorityMatch = block.match(/priority:\s*(\S+)/);
          const statusMatch = block.match(/status:\s*(\S+)/);
          const tagsMatch = block.match(/tags:\s*\[([^\]]*)\]/);
          const completedMatch = block.match(/completed:\s*(\d{4}-\d{2}-\d{2})/);

          if (!titleMatch) return;

          const task = {
            title: titleMatch[1].trim(),
            due: dueMatch ? dueMatch[1] : '',
            priority: priorityMatch ? priorityMatch[1] : 'medium',
            status: statusMatch ? statusMatch[1] : 'todo',
            tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [],
            project: projectKey
          };
          if (completedMatch) task.completed = completedMatch[1];

          if (task.status === 'done' && task.completed && new Date(task.completed) >= weekAgo) {
            completedThisWeek.push(task);
          }

          projectTasks.push(task);
          if (task.status !== 'done') {
            allTasks.push(task);
          }
        });
      });

      if (projectTasks.length > 0) {
        const projectMdPath = path.join(projectsDir, projectKey, 'PROJECT.md');
        let name = projectKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (fs.existsSync(projectMdPath)) {
          const projectContent = fs.readFileSync(projectMdPath, 'utf8');
          const nameMatch = projectContent.match(/^#\s+(.+)/m);
          if (nameMatch) name = nameMatch[1].trim();
        }
        dashboardProjects[projectKey] = { name, tasks: projectTasks };
      }
    });
  }

  return { projects: dashboardProjects, allTasks, completedThisWeek };
}

// LLM-powered project inference using OpenRouter
async function inferProjects(tasks, availableProjects) {
  const prompt = `Given these tasks and available projects, match each task to the most appropriate project. If no good match, use "others".

Available projects: ${availableProjects.join(', ')}

Tasks:
${tasks.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}

Respond in JSON format only, no other text:
[
  {"taskIndex": 1, "project": "sample-project"},
  {"taskIndex": 2, "project": "others"}
]`;

  const result = await callLLM(prompt);

  if (!result.success) {
    if (result.error === 'no_api_key') {
      console.warn('OPENROUTER_API_KEY not set, defaulting all tasks to "others" project');
    }
    return tasks.map((_, i) => ({ taskIndex: i + 1, project: 'others' }));
  }

  try {
    const jsonMatch = result.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse LLM response');
  } catch (error) {
    console.error('LLM inference parse failed:', error);
    return tasks.map((_, i) => ({ taskIndex: i + 1, project: 'others' }));
  }
}

// Helper function to find task in monthly file
function findTaskInFile(filePath, taskTitle) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let inTask = false;
  let taskStart = -1;
  let taskEnd = -1;
  let taskLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      if (inTask) {
        taskEnd = i - 1;
        break;
      }
      const title = line.replace('### ', '').trim();
      if (title.toLowerCase() === taskTitle.toLowerCase()) {
        inTask = true;
        taskStart = i;
        taskLines.push(line);
      }
    } else if (inTask) {
      if (line === '---' && taskLines.length > 1) {
        taskEnd = i;
        break;
      }
      taskLines.push(line);
    }
  }

  if (taskStart === -1) return null;
  if (taskEnd === -1) taskEnd = lines.length - 1;

  return { taskStart, taskEnd, taskLines, allLines: lines };
}

// Helper function to get current month file path
function getMonthlyFilePath(projectName) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return path.join(DATA_DIR, 'projects', projectName, 'tasks', `${year}-${month}.md`);
}

// Helper function to generate daily file from all monthly task files
function generateDailyFile(date) {
  const projectsDir = path.join(DATA_DIR, 'projects');
  const dailyFilePath = path.join(DATA_DIR, 'daily', `${date}.md`);

  // Ensure daily directory exists
  const dailyDir = path.join(DATA_DIR, 'daily');
  if (!fs.existsSync(dailyDir)) {
    fs.mkdirSync(dailyDir, { recursive: true });
  }

  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let dueTodayTasks = [];
  let overdueTasks = [];

  // Read all projects
  if (fs.existsSync(projectsDir)) {
    const projects = fs.readdirSync(projectsDir).filter(p => {
      const projectPath = path.join(projectsDir, p);
      return fs.statSync(projectPath).isDirectory();
    });

    projects.forEach(projectKey => {
      const tasksDir = path.join(projectsDir, projectKey, 'tasks');
      if (!fs.existsSync(tasksDir)) return;

      const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));

      taskFiles.forEach(file => {
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Extract tasks from Active Tasks section only
        const activeSectionMatch = content.match(/## Active Tasks([\s\S]*?)(?=## Completed Tasks|$)/);
        if (!activeSectionMatch) return;

        const activeSection = activeSectionMatch[1];
        const taskBlocks = activeSection.split('---').filter(block => block.trim() && block.includes('###'));

        taskBlocks.forEach(block => {
          const titleMatch = block.match(/###\s+(.+)/);
          const dueMatch = block.match(/due:\s*(\d{4}-\d{2}-\d{2})/);
          const statusMatch = block.match(/status:\s*(\S+)/);

          if (!titleMatch) return;

          const title = titleMatch[1].trim();
          const due = dueMatch ? dueMatch[1] : '';
          const status = statusMatch ? statusMatch[1] : '';

          // Skip done tasks
          if (status === 'done') return;

          // Check if due today or overdue
          if (due === date) {
            dueTodayTasks.push({ title, project: projectKey });
          } else if (due && due < date) {
            overdueTasks.push({ title, project: projectKey });
          }
        });
      });
    });
  }

  // Generate daily file content
  let dailyContent = `<!-- This file shows your tasks due today and overdue tasks. Check off completed tasks with [x] and they'll sync to your project files automatically. -->\n\n# ${dayName}, ${formattedDate}\n\n`;

  if (overdueTasks.length > 0) {
    dailyContent += `## Overdue\n`;
    overdueTasks.forEach(task => {
      dailyContent += `- [ ] ${task.title} (${task.project})\n`;
    });
    dailyContent += `\n`;
  }

  if (dueTodayTasks.length > 0) {
    dailyContent += `## Today\n`;
    dueTodayTasks.forEach(task => {
      dailyContent += `- [ ] ${task.title} (${task.project})\n`;
    });
    dailyContent += `\n`;
  }

  if (dueTodayTasks.length === 0 && overdueTasks.length === 0) {
    dailyContent += `## Today\nNo tasks due today.\n\n`;
  }

  dailyContent += `## Notes\n`;

  fs.writeFileSync(dailyFilePath, dailyContent, 'utf8');
  return dailyFilePath;
}

// Helper function to find a task across ALL monthly files for a project
function findTaskInProject(projectKey, taskTitle) {
  const tasksDir = path.join(DATA_DIR, 'projects', projectKey, 'tasks');
  if (!fs.existsSync(tasksDir)) return null;

  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  for (const file of taskFiles) {
    const filePath = path.join(tasksDir, file);
    const result = findTaskInFile(filePath, taskTitle);
    if (result) return { ...result, filePath };
  }
  return null;
}

// Helper function to update a task's due date in a monthly file
function updateTaskDueDate(title, projectKey, newDate) {
  const result = findTaskInProject(projectKey, title);
  if (!result) return;

  const { allLines, taskStart, taskEnd, filePath } = result;

  for (let i = taskStart; i <= taskEnd; i++) {
    if (allLines[i].startsWith('due:')) {
      const currentDue = allLines[i].replace('due:', '').trim();
      if (currentDue < newDate) {
        allLines[i] = `due: ${newDate}`;
        fs.writeFileSync(filePath, allLines.join('\n'));
      }
      break;
    }
  }
}

// Helper function to add a task block to a project's monthly file
function addTaskToMonthlyFile(title, projectKey, date) {
  const monthlyFilePath = getMonthlyFilePath(projectKey);
  if (!fs.existsSync(monthlyFilePath)) {
    // Create monthly file if project exists
    const projectDir = path.join(DATA_DIR, 'projects', projectKey, 'tasks');
    if (!fs.existsSync(projectDir)) {
      const projectRoot = path.join(DATA_DIR, 'projects', projectKey);
      if (!fs.existsSync(projectRoot)) return false;
      fs.mkdirSync(projectDir, { recursive: true });
    }
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    const header = `# ${projectKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - ${monthName} ${year}\n\n## Active Tasks\n\n---\n\n## Completed Tasks\n\n---\n`;
    fs.writeFileSync(monthlyFilePath, header, 'utf8');
  }

  // Check if task already exists in ANY monthly file for this project
  const existing = findTaskInProject(projectKey, title);
  if (existing) return false; // Already exists, skip

  // Add task to Active Tasks section
  const content = fs.readFileSync(monthlyFilePath, 'utf8');
  const allLines = content.split('\n');

  const activeSectionIndex = allLines.findIndex(line => line.trim() === '## Active Tasks');
  if (activeSectionIndex === -1) return false;

  // Find the first --- after Active Tasks header
  let insertIndex = activeSectionIndex + 1;
  while (insertIndex < allLines.length && allLines[insertIndex].trim() !== '---') {
    insertIndex++;
  }
  if (insertIndex < allLines.length) {
    insertIndex++; // Insert after the first ---
  }

  const taskBlock = [
    `### ${title}`,
    `due: ${date}`,
    `priority: medium`,
    `status: todo`,
    `tags: []`,
    `created: ${date}`,
    '',
    '',
    '**Notes:**',
    '',
    '---'
  ];

  allLines.splice(insertIndex, 0, ...taskBlock);
  fs.writeFileSync(monthlyFilePath, allLines.join('\n'));
  return true;
}

// Helper function to sync NEW unchecked tasks from daily file to monthly project files
async function syncNewTasksFromDaily(dailyContent, date) {
  const lines = dailyContent.split('\n');
  const tasksWithProject = [];
  const tasksWithoutProject = [];
  let currentSection = '';

  // Match: - [ ] or - [] with optional (project-key), tracking which section they're in
  lines.forEach(line => {
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim().toLowerCase();
      return;
    }
    const match = line.match(/^-\s+\[[ ]?\]\s+(.+?)(?:\s+\(([^)]+)\))?\s*$/);
    if (match) {
      const title = match[1].trim();
      const projectKey = match[2] ? match[2].trim() : null;
      const inTodaySection = currentSection === 'today';
      if (projectKey) {
        tasksWithProject.push({ title, projectKey, inTodaySection });
      } else {
        tasksWithoutProject.push({ title, inTodaySection });
      }
    }
  });

  // Sync tasks that already have a project
  tasksWithProject.forEach(({ title, projectKey, inTodaySection }) => {
    const added = addTaskToMonthlyFile(title, projectKey, date);
    // If task already existed and user moved it to Today, update the due date
    if (!added && inTodaySection) {
      updateTaskDueDate(title, projectKey, date);
    }
  });

  // For tasks without a project, use LLM inference
  if (tasksWithoutProject.length > 0) {
    const projectsDir = path.join(DATA_DIR, 'projects');
    const availableProjects = fs.existsSync(projectsDir)
      ? fs.readdirSync(projectsDir).filter(p => {
          const projectPath = path.join(projectsDir, p);
          return fs.statSync(projectPath).isDirectory();
        })
      : [];

    if (availableProjects.length > 0) {
      const inferences = await inferProjects(tasksWithoutProject, availableProjects);
      inferences.forEach(({ taskIndex, project }) => {
        const task = tasksWithoutProject[taskIndex - 1];
        if (task) {
          addTaskToMonthlyFile(task.title, project, date);
        }
      });
    }
  }
}

// Helper function to sync checked tasks from today.md to monthly files
function syncTodayToMonthly(dailyContent, date) {
  const lines = dailyContent.split('\n');
  const checkedTasks = [];

  // Find all checked tasks with format: - [x] Task title (project-key) or - [x] Task title
  lines.forEach(line => {
    const match = line.match(/^-\s+\[[xX]\]\s+(.+?)(?:\s+\(([^)]+)\))?\s*$/);
    if (match) {
      const title = match[1].trim();
      const projectKey = match[2] ? match[2].trim() : null;
      if (projectKey) {
        checkedTasks.push({ title, projectKey });
      }
      // Without project key, we can't know which monthly file to update
      // These tasks were already synced with a project when first created
    }
  });

  // Mark each task as done in its monthly file (search ALL months, not just current)
  checkedTasks.forEach(({ title, projectKey }) => {
    const taskInfo = findTaskInProject(projectKey, title);
    if (!taskInfo) return;

    const { allLines, taskStart, taskEnd, filePath: monthlyFilePath } = taskInfo;

    // Extract task block
    const taskBlock = allLines.slice(taskStart, taskEnd + 1);

    // Update status and add completed date
    const updatedTaskBlock = taskBlock.map(line => {
      if (line.startsWith('status:')) return 'status: done';
      if (line.startsWith('completed:')) return `completed: ${date}`;
      return line;
    });

    // Add completed field if it doesn't exist
    if (!updatedTaskBlock.some(line => line.startsWith('completed:'))) {
      const createdIndex = updatedTaskBlock.findIndex(line => line.startsWith('created:'));
      if (createdIndex !== -1) {
        updatedTaskBlock.splice(createdIndex + 1, 0, `completed: ${date}`);
      }
    }

    // Find Completed Tasks section
    let completedSectionIndex = allLines.findIndex(line => line.trim() === '## Completed Tasks');

    if (completedSectionIndex === -1) {
      const activeSectionIndex = allLines.findIndex(line => line.trim() === '## Active Tasks');
      if (activeSectionIndex !== -1) {
        let insertIndex = activeSectionIndex + 1;
        while (insertIndex < allLines.length && !allLines[insertIndex].startsWith('##')) {
          insertIndex++;
        }
        allLines.splice(insertIndex, 0, '', '## Completed Tasks', '');
        completedSectionIndex = insertIndex + 1;
      }
    }

    // Remove task from current location
    allLines.splice(taskStart, taskEnd - taskStart + 1);

    // Recalculate completed section index
    completedSectionIndex = allLines.findIndex(line => line.trim() === '## Completed Tasks');

    // Insert in Completed Tasks section
    if (completedSectionIndex !== -1) {
      let insertIndex = completedSectionIndex + 1;
      while (insertIndex < allLines.length && allLines[insertIndex].trim() !== '---') {
        insertIndex++;
      }
      if (insertIndex < allLines.length) {
        insertIndex++;
      }
      allLines.splice(insertIndex, 0, ...updatedTaskBlock);
    }

    // Write back to file
    fs.writeFileSync(monthlyFilePath, allLines.join('\n'));
  });

  // Update dashboard data
  const dashboardData = getDashboardData();
  saveDashboardData(dashboardData);
}

// API endpoint to get dashboard data
app.get('/api/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { projects } = getAllActiveTasks();
    res.json({ date: today, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 100 soul-shaking quotes — all properly attributed to verified sources
const FALLBACK_QUOTES = [
  // === STOIC PHILOSOPHY ===
  "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius",
  "You could leave life right now. Let that determine what you do and say and think. — Marcus Aurelius",
  "It is not that we have a short time to live, but that we waste a great deal of it. — Seneca",
  "We suffer more often in imagination than in reality. — Seneca",
  "No person is free who is not master of themselves. — Epictetus",
  "First say to yourself what you would be; and then do what you have to do. — Epictetus",
  "The best revenge is not to be like your enemy. — Marcus Aurelius",
  "Waste no more time arguing about what a good man should be. Be one. — Marcus Aurelius",
  "He who fears death will never do anything worthy of a living man. — Seneca",
  "Difficulty is what wakes up the genius. — Nassim Taleb",
  "If it is not right, do not do it. If it is not true, do not say it. — Marcus Aurelius",
  "How long are you going to wait before you demand the best for yourself? — Epictetus",
  "The soul becomes dyed with the color of its thoughts. — Marcus Aurelius",
  "Begin at once to live, and count each separate day as a separate life. — Seneca",
  "Make the mind tougher by exposing it to adversity. — Robert Greene",

  // === RAW INTENSITY ===
  "Don't stop when you're tired. Stop when you're done. — David Goggins",
  "You are in danger of living a life so comfortable and soft that you will die without ever realizing your potential. — David Goggins",
  "The most important conversation is the one you have with yourself. — David Goggins",
  "Discipline equals freedom. — Jocko Willink",
  "Good. (It went wrong? Good. There's a lesson. Move forward.) — Jocko Willink",
  "I can't relate to lazy people. We don't speak the same language. — Kobe Bryant",
  "Everything negative — pressure, challenges — is all an opportunity for me to rise. — Kobe Bryant",
  "Rest at the end, not in the middle. — Kobe Bryant",
  "Hard choices, easy life. Easy choices, hard life. — Jerzy Gregorek",
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Your time is limited. Don't waste it living someone else's life. — Steve Jobs",
  "Stay hungry, stay foolish. — Steve Jobs",
  "The ones who are crazy enough to think they can change the world are the ones who do. — Steve Jobs",
  "I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times. — Bruce Lee",
  "Be water, my friend. Empty your mind. Be formless, shapeless — like water. — Bruce Lee",
  "A ship in harbor is safe, but that is not what ships are built for. — John A. Shedd",
  "If you run into a wall, don't turn around and give up. Figure out how to climb it, go through it, or work around it. — Michael Jordan",
  "I've failed over and over and over again in my life. And that is why I succeed. — Michael Jordan",
  "Nobody cares. Work harder. — Cameron Hanes",
  "We must all suffer from one of two pains: the pain of discipline or the pain of regret. — Jim Rohn",

  // === DEEP WISDOM ===
  "The wound is the place where the Light enters you. — Rumi",
  "What you seek is seeking you. — Rumi",
  "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself. — Rumi",
  "Let yourself be silently drawn by the strange pull of what you really love. It will not lead you astray. — Rumi",
  "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there. — Rumi",
  "Don't be satisfied with stories, how things have gone with others. Unfold your own myth. — Rumi",
  "Between stimulus and response there is a space. In that space is our freedom and our power to choose. — Viktor Frankl",
  "When we are no longer able to change a situation, we are challenged to change ourselves. — Viktor Frankl",
  "Those who have a 'why' to live can bear with almost any 'how.' — Viktor Frankl",
  "Don't aim at success. The more you aim at it and make it a target, the more you are going to miss it. — Viktor Frankl",
  "We delight in the beauty of the butterfly, but rarely admit the changes it has gone through to achieve that beauty. — Maya Angelou",
  "If you're always trying to be normal, you will never know how amazing you can be. — Maya Angelou",
  "There is no greater agony than bearing an untold story inside you. — Maya Angelou",
  "I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel. — Maya Angelou",
  "You may encounter many defeats, but you must not be defeated. — Maya Angelou",
  "You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face. — Eleanor Roosevelt",
  "It is during our darkest moments that we must focus to see the light. — Aristotle",
  "Knowing is not enough; we must apply. Wishing is not enough; we must do. — Johann Wolfgang von Goethe",
  "The only person you are destined to become is the person you decide to be. — Ralph Waldo Emerson",
  "Do not go where the path may lead. Go instead where there is no path and leave a trail. — Ralph Waldo Emerson",

  // === VULNERABILITY & COURAGE ===
  "Vulnerability is not weakness. It's our greatest measure of courage. — Brené Brown",
  "You can choose courage or you can choose comfort. You cannot have both. — Brené Brown",
  "Owning our story and loving ourselves through that process is the bravest thing we'll ever do. — Brené Brown",
  "Courage starts with showing up and letting ourselves be seen. — Brené Brown",
  "The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood. — Theodore Roosevelt",
  "It is not the critic who counts, not the man who points out how the strong man stumbles. — Theodore Roosevelt",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
  "Twenty years from now you will be more disappointed by the things you didn't do than by the ones you did do. — H. Jackson Brown Jr.",
  "Life shrinks or expands in proportion to one's courage. — Anaïs Nin",
  "And the day came when the risk to remain tight in a bud was more painful than the risk it took to blossom. — Anaïs Nin",

  // === MODERN CLARITY ===
  "A calm mind, a fit body, and a house full of love. These things cannot be bought — they must be earned. — Naval Ravikant",
  "Desire is a contract you make with yourself to be unhappy until you get what you want. — Naval Ravikant",
  "The secret to doing good research is always to be a little underemployed. You waste years by not being able to waste hours. — Amos Tversky",
  "You do not rise to the level of your goals. You fall to the level of your systems. — James Clear",
  "Every action you take is a vote for the type of person you wish to become. — James Clear",
  "The task is not so much to see what no one has yet seen, but to think what nobody has yet thought about that which everybody sees. — Erwin Schrödinger",
  "Perfection is not attainable, but if we chase perfection we can catch excellence. — Vince Lombardi",
  "The purpose of life is to discover your gift. The meaning of life is to give your gift away. — David Viscott",
  "Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world. — Albert Einstein",
  "Strive not to be a success, but rather to be of value. — Albert Einstein",
  "The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb",
  "Fall seven times, stand up eight. — Japanese Proverb",
  "Smooth seas do not make skillful sailors. — African Proverb",
  "The axe forgets, but the tree remembers. — African Proverb",
  "When the student is ready, the teacher will appear. When the student is truly ready, the teacher will disappear. — Lao Tzu",
  "The journey of a thousand miles begins with a single step. — Lao Tzu",
  "He who conquers himself is the mightiest warrior. — Confucius",

  // === ON WORK & CRAFT ===
  "The professional has learned that success, like happiness, comes as a by-product of work. — Steven Pressfield",
  "The most important thing about art is to work. Nothing else matters except sitting down every day and trying. — Steven Pressfield",
  "Amateurs sit and wait for inspiration, the rest of us just get up and go to work. — Stephen King",
  "Talent is cheaper than table salt. What separates the talented from the successful is a lot of hard work. — Stephen King",
  "The world makes way for the man who knows where he is going. — Ralph Waldo Emerson",
  "It does not matter how slowly you go as long as you do not stop. — Confucius",
  "What we fear doing most is usually what we most need to do. — Tim Ferriss",
  "Focus is a matter of deciding what things you're not going to do. — John Carmack",
  "Have no fear of perfection — you'll never reach it. — Salvador Dalí",
  "The scariest moment is always just before you start. — Stephen King",

  // === ON RESILIENCE ===
  "The oak fought the wind and was broken, the willow bent when it must and survived. — Robert Jordan",
  "Rock bottom became the solid foundation on which I rebuilt my life. — J.K. Rowling",
  "The world breaks everyone, and afterward, many are strong at the broken places. — Ernest Hemingway",
  "There is nothing noble in being superior to your fellow man; true nobility is being superior to your former self. — Ernest Hemingway",
  "What does not kill me makes me stronger. — Friedrich Nietzsche",
  "He who has a why to live for can bear almost any how. — Friedrich Nietzsche",
  "Turn your wounds into wisdom. — Oprah Winfrey",
  "If you can't fly then run, if you can't run then walk, if you can't walk then crawl, but whatever you do you have to keep moving forward. — Martin Luther King Jr.",
  "Only in the darkness can you see the stars. — Martin Luther King Jr.",
  "Our greatest glory is not in never falling, but in rising every time we fall. — Confucius",
  "Out of suffering have emerged the strongest souls; the most massive characters are seared with scars. — Kahlil Gibran",
  "You have power over your mind — not outside events. Realize this, and you will find strength. — Marcus Aurelius"
];

// In-memory cache for daily summary (resets on server restart)
let dailySummaryCache = { date: null, summary: null };

// POST /api/ai/daily-summary - AI-powered morning briefing
app.post('/api/ai/daily-summary', async (req, res) => {
  try {
    const { refresh = false } = req.body || {};
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

    // Return cached summary if available and not refreshing
    if (!refresh && dailySummaryCache.date === today && dailySummaryCache.summary) {
      return res.json({ success: true, summary: dailySummaryCache.summary, cached: true });
    }

    const { allTasks, completedThisWeek } = getAllActiveTasks();

    // Compute exact stats server-side (LLM never computes these)
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];

    const overdueTasks = allTasks.filter(t => t.due && t.due < today);
    const todayTasks = allTasks.filter(t => t.due === today);
    const weekTasks = allTasks.filter(t => t.due > today && t.due <= weekStr);

    const stats = {
      overdue: overdueTasks.length,
      dueToday: todayTasks.length,
      dueThisWeek: weekTasks.length,
      inProgress: allTasks.filter(t => t.status === 'in-progress').length,
      totalActive: allTasks.length,
      completedThisWeek: completedThisWeek.length
    };

    // Gather project context from PROJECT.md files
    const projectContext = [];
    const projectsDir = path.join(DATA_DIR, 'projects');
    if (fs.existsSync(projectsDir)) {
      fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .forEach(d => {
          const mdPath = path.join(projectsDir, d.name, 'PROJECT.md');
          if (fs.existsSync(mdPath)) {
            const content = fs.readFileSync(mdPath, 'utf8');
            const nameMatch = content.match(/^#\s+(.+)/m);
            const goalMatch = content.match(/## Goal\n([\s\S]*?)(?=\n##|$)/);
            const targetMatch = content.match(/target-date:\s*(.+)/);
            const milestoneBlock = (content.match(/## Milestones\n([\s\S]*?)(?=\n##|$)/)?.[1] || '');
            const milestones = milestoneBlock.split('\n').filter(l => l.trim().startsWith('- ['));

            projectContext.push({
              key: d.name,
              name: nameMatch?.[1]?.trim() || d.name,
              goal: goalMatch?.[1]?.trim() || '',
              targetDate: targetMatch?.[1]?.trim() || 'ongoing',
              totalMilestones: milestones.length,
              completedMilestones: milestones.filter(m => m.includes('[x]')).length
            });
          }
        });
    }

    // Build factual context for LLM (it can ONLY use these facts)
    const factBlock = [
      `TODAY: ${dayOfWeek}, ${today}`,
      `STATS: ${stats.overdue} overdue, ${stats.dueToday} due today, ${stats.dueThisWeek} due this week, ${stats.totalActive} total active, ${stats.completedThisWeek} completed this week`,
      overdueTasks.length > 0
        ? `OVERDUE TASKS:\n${overdueTasks.map(t => `  - "${t.title}" (${t.project}, priority: ${t.priority}, due: ${t.due})`).join('\n')}`
        : 'No overdue tasks.',
      todayTasks.length > 0
        ? `DUE TODAY:\n${todayTasks.map(t => `  - "${t.title}" (${t.project}, priority: ${t.priority})`).join('\n')}`
        : 'Nothing due today.',
      completedThisWeek.length > 0
        ? `COMPLETED THIS WEEK: ${completedThisWeek.map(t => `"${t.title}"`).join(', ')}`
        : 'No completions this week yet.',
      projectContext.length > 0
        ? `ACTIVE PROJECTS:\n${projectContext.map(p => `  - ${p.name}: ${p.goal || 'No goal set'}${p.targetDate !== 'ongoing' ? ` (target: ${p.targetDate})` : ''} — ${p.completedMilestones}/${p.totalMilestones} milestones done`).join('\n')}`
        : ''
    ].filter(Boolean).join('\n\n');

    const toneVariants = ['encouraging and warm', 'direct and action-oriented', 'reflective and thoughtful', 'energetic and motivating', 'calm and strategic'];
    const tone = toneVariants[dayOfYear % toneVariants.length];

    const prompt = `You are a thoughtful productivity coach writing a personalized morning briefing. Your tone today should be ${tone}.

YOUR GOAL: Help this person feel grounded, motivated, and clear about their direction. This is NOT a task list — they can already see their tasks. Your job is to give them perspective.

IMPORTANT RULES:
- Do NOT list or repeat individual task names. They already have their task list.
- Instead, talk about the bigger picture: how their projects are progressing, what area of their life deserves focus today, what momentum they've built.
- Reference project names and overall progress, not specific tasks.
- If things are overdue, be honest but kind — help them prioritize, don't guilt them.
- If they've been productive, acknowledge the momentum.
- Keep the narrative to 2-4 sentences. Be conversational, not corporate.
- Include exactly one motivational or productivity quote that fits today's context.

CONTEXT:
${factBlock}

Seed for variety: ${dayOfYear} (use this to vary your approach — sometimes lead with momentum, sometimes with strategic direction, sometimes with encouragement about the bigger picture)

Return ONLY valid JSON (no other text):
{
  "narrative": "Your personalized 2-4 sentence briefing here.",
  "quote": "A relevant motivational or productivity quote — Author",
  "highlights": ["2-3 high-level observations about their week, progress, or direction"]
}`;

    let narrative = '';
    let quote = '';
    let highlights = [];

    const result = await callLLM(prompt, { maxTokens: 512 });

    if (result.success) {
      try {
        const jsonStr = extractJSON(result.content);
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr);
          narrative = parsed.narrative || '';
          quote = parsed.quote || '';
          highlights = parsed.highlights || [];
        }
      } catch (e) {
        console.error('Failed to parse daily summary LLM response:', e);
      }
    } else if (process.env.OPENROUTER_API_KEY) {
      console.error('Daily summary LLM failed:', result.error);
    }

    // Fallback: motivational summary if LLM fails or no API key
    if (!narrative) {
      const dayOfYear = Math.floor((new Date(today) - new Date(today.split('-')[0], 0, 0)) / 86400000);
      quote = FALLBACK_QUOTES[dayOfYear % FALLBACK_QUOTES.length];

      const parts = [];
      if (stats.completedThisWeek > 0) {
        parts.push(stats.completedThisWeek >= 5
          ? `${stats.completedThisWeek} tasks knocked out this week. You're on fire — keep that momentum going.`
          : `${stats.completedThisWeek} task${stats.completedThisWeek > 1 ? 's' : ''} done this week. Every rep counts. Stack another one today.`);
      }
      if (stats.overdue > 0) {
        parts.push(stats.overdue === 1
          ? `One task slipped past its deadline. No guilt — just handle it first and move forward.`
          : `${stats.overdue} tasks overdue. Don't let them pile up in your head — pick the easiest one and knock it out right now.`);
      }
      if (stats.dueToday > 0) {
        parts.push(stats.dueToday === 1
          ? `One thing due today. Give it your full focus and own it.`
          : `${stats.dueToday} tasks due today. You've handled harder days. Lock in and go one at a time.`);
      }
      // Check for projects with upcoming deadlines
      const urgentProjects = projectContext.filter(p => {
        if (p.targetDate === 'ongoing') return false;
        const daysLeft = Math.ceil((new Date(p.targetDate) - new Date(today)) / 86400000);
        return daysLeft >= 0 && daysLeft <= 7;
      });
      urgentProjects.forEach(p => {
        const daysLeft = Math.ceil((new Date(p.targetDate) - new Date(today)) / 86400000);
        parts.push(`${p.name} deadline is ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`} — stay locked in.`);
      });

      if (parts.length === 0) {
        parts.push(`Nothing urgent today — that's earned, not accidental. Use this space to think ahead or level up on something that matters to you.`);
      }
      narrative = parts.join(' ');
    }

    const summary = { date: today, narrative, quote, stats, highlights };
    dailySummaryCache = { date: today, summary };

    res.json({ success: true, summary, cached: false });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: collect all markdown files for search
function collectAllMarkdownFiles() {
  const files = [];
  const searchDirs = ['projects', 'daily', 'inbox'];

  const collectDir = (dirPath, relativeTo) => {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.join(relativeTo, entry.name);
      if (entry.isDirectory()) {
        collectDir(fullPath, relPath);
      } else if (entry.name.endsWith('.md')) {
        files.push({ file: relPath, content: fs.readFileSync(fullPath, 'utf8') });
      }
    });
  };

  searchDirs.forEach(dir => collectDir(path.join(DATA_DIR, dir), dir));
  ['tasks.md', 'inbox.md'].forEach(f => {
    const fp = path.join(DATA_DIR, f);
    if (fs.existsSync(fp)) files.push({ file: f, content: fs.readFileSync(fp, 'utf8') });
  });
  return files;
}

// GET /api/ai/test - Diagnostic endpoint to test LLM connectivity
app.get('/api/ai/test', async (req, res) => {
  const envPath = path.join(DATA_DIR, '.env');
  const envExists = fs.existsSync(envPath);
  const config = getLLMConfig();

  if (!config) {
    return res.json({
      status: 'no_api_key',
      envFileExists: envExists,
      message: 'No LLM API key configured. Set LLM_API_KEY or OPENROUTER_API_KEY in .env'
    });
  }

  try {
    const testResult = await callLLM('Say hello in exactly 5 words.', { maxTokens: 30 });

    if (!testResult.success) {
      return res.json({ status: testResult.error, provider: config.provider, model: config.model });
    }

    return res.json({ status: 'ok', provider: config.provider, model: config.model, response: testResult.content, message: 'LLM is working!' });
  } catch (error) {
    return res.json({ status: 'network_error', provider: config.provider, model: config.model, error: error.message });
  }
});

// POST /api/ai/search - Natural language search across all files
app.post('/api/ai/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const allFiles = collectAllMarkdownFiles();
    const hasLLM = !!getLLMConfig();
    let answer = '';
    let results = [];

    // === PATH A: < 50 files + LLM → send everything for perfect accuracy ===
    if (allFiles.length < 50 && hasLLM) {
      const fileContext = allFiles.map(f => `=== ${f.file} ===\n${f.content}`).join('\n\n');

      const prompt = `You are a search assistant for a personal task management system.
The user asked: "${query}"

Here are ALL the user's files:

${fileContext}

Answer the user's question. Be specific — mention exact task names, dates, and file paths from the files above.

Return JSON:
{
  "answer": "Your 1-3 sentence answer here",
  "files": [{ "file": "exact/path.md", "why": "brief reason this file is relevant" }]
}

Only include files that are actually relevant. Return at most 5 files. The "file" field must exactly match one of the file paths above.`;

      const result = await callLLM(prompt, { maxTokens: 512 });
      if (result.success) {
        try {
          const jsonStr = extractJSON(result.content);
          if (!jsonStr) throw new Error('No JSON found in LLM response');
          const parsed = JSON.parse(jsonStr);
          answer = parsed.answer || '';
          results = (parsed.files || []).map(f => {
            const fileData = allFiles.find(af => af.file === f.file);
            const matches = [];
            if (fileData) {
              const lines = fileData.content.split('\n');
              const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
              lines.forEach((line, idx) => {
                if (qWords.some(w => line.toLowerCase().includes(w)) && line.trim()) {
                  matches.push({ line: idx + 1, text: line.trim() });
                }
              });
            }
            return { file: f.file, why: f.why || '', matches: matches.slice(0, 3), matchCount: matches.length };
          });
        } catch (e) {
          console.error('Failed to parse LLM search response:', e);
          // Fall through to keyword search
        }
      } else {
        console.error('Search LLM failed (PATH A):', result.error);
      }
    }

    // === PATH B: >= 50 files + LLM → grep with relevance scoring, then LLM on top hits ===
    // === PATH C: No LLM → keyword grep with relevance scoring ===
    if (!answer) {
      const keywords = query.toLowerCase()
        .replace(/[?.,!'"]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'was', 'had', 'that', 'about', 'when', 'did', 'how', 'what', 'which', 'where', 'does', 'have', 'been', 'this', 'with', 'from', 'they', 'were', 'some', 'something', 'remember', 'dont', "don't", 'there', 'wrote', 'write', 'said', 'made', 'like', 'just', 'also', 'into', 'than', 'then', 'them', 'these', 'those', 'would', 'could', 'should', 'will', 'can', 'for', 'and', 'but', 'not', 'you', 'all', 'any', 'her', 'his', 'its', 'our', 'who', 'get', 'got', 'has', 'him', 'why', 'let'].includes(w));

      const grepResults = [];

      allFiles.forEach(({ file, content }) => {
        const lowerContent = content.toLowerCase();
        const matchedKeywords = keywords.filter(kw => lowerContent.includes(kw));
        if (matchedKeywords.length === 0) return;

        const relevance = matchedKeywords.length / keywords.length;
        const lines = content.split('\n');
        const matchingLines = [];

        lines.forEach((line, idx) => {
          const lowerLine = line.toLowerCase();
          if (matchedKeywords.some(kw => lowerLine.includes(kw))) {
            matchingLines.push({ lineNumber: idx + 1, text: line.trim() });
          }
        });

        if (matchingLines.length > 0) {
          const snippets = matchingLines.slice(0, 5).map(m => {
            const start = Math.max(0, m.lineNumber - 3);
            const end = Math.min(lines.length, m.lineNumber + 2);
            return lines.slice(start, end).join('\n');
          });

          grepResults.push({
            file,
            matches: matchingLines.slice(0, 5),
            snippet: snippets.join('\n...\n'),
            matchCount: matchingLines.length,
            relevance
          });
        }
      });

      // Sort by relevance first, then match count
      grepResults.sort((a, b) => b.relevance - a.relevance || b.matchCount - a.matchCount);
      const topResults = grepResults.slice(0, 10);

      // If LLM available, generate a semantic answer from top hits
      if (hasLLM && topResults.length > 0) {
        const contextForLLM = topResults.slice(0, 5).map(r =>
          `File: ${r.file}\n${r.snippet}`
        ).join('\n\n---\n\n');

        const prompt = `You are a search assistant for a task management system. The user asked: "${query}"

Here are the relevant file contents found by searching:

${contextForLLM}

Based ONLY on the file contents above, write a brief 1-3 sentence answer to the user's question. Be specific — mention dates, file names, and task titles from the results. If the results don't clearly answer the question, say what you found and let the user explore further.

Return ONLY the answer text, no JSON, no formatting.`;

        const result = await callLLM(prompt, { maxTokens: 256 });
        if (result.success) {
          answer = result.content.trim();
        } else {
          console.error('Search LLM failed (PATH B):', result.error);
        }
      }

      // Format results for frontend
      results = topResults.map(r => ({
        file: r.file,
        matches: r.matches.map(m => ({ line: m.lineNumber, text: m.text })),
        matchCount: r.matchCount
      }));
    }

    // ALWAYS guarantee a text answer
    if (!answer && results.length > 0) {
      const fileList = results.slice(0, 5).map(r => r.file).join(', ');
      answer = `Found matches in ${results.length} file${results.length !== 1 ? 's' : ''}: ${fileList}. Open a file to see the details.`;
    } else if (!answer) {
      answer = 'No matching files found for your search.';
    }

    res.json({ success: true, answer, results, query });
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to ensure today's daily file exists
app.get('/api/daily/ensure', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dailyFilePath = path.join(DATA_DIR, 'daily', `${targetDate}.md`);

    let generated = false;

    if (!fs.existsSync(dailyFilePath)) {
      generateDailyFile(targetDate);
      generated = true;
    }

    res.json({
      success: true,
      generated,
      filePath: `daily/${targetDate}.md`,
      date: targetDate
    });
  } catch (error) {
    console.error('Error ensuring daily file:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to ensure inbox.md and tasks.md exist
app.post('/api/files/ensure-capture-files', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let created = [];

    // Ensure inbox.md exists
    const inboxPath = path.join(DATA_DIR, 'inbox.md');
    if (!fs.existsSync(inboxPath)) {
      const inboxContent = `<!-- Instructions: Use this as a scratchpad for random thoughts, ideas, and notes. Entries are automatically organized by date when you save. No need to format - just type freely. -->\n\n## ${today}\n`;
      fs.writeFileSync(inboxPath, inboxContent, 'utf8');
      created.push('inbox.md');
    }

    // Ensure tasks.md exists
    const tasksPath = path.join(DATA_DIR, 'tasks.md');
    if (!fs.existsSync(tasksPath)) {
      const tasksContent = `<!-- Instructions: Quickly capture tasks here using format: task name | due date | project (optional). Tasks sync to project files on save. Leave project blank to auto-detect. -->\n\n## Examples (Reference - Do Not Delete)\n- [ ] Review project roadmap | 2026-02-10 | sample-project\n- [ ] Plan sprint goals | 2026-02-15 | sample-project\n\n## Your Tasks\n`;
      fs.writeFileSync(tasksPath, tasksContent, 'utf8');
      created.push('tasks.md');
    }

    res.json({
      success: true,
      created
    });
  } catch (error) {
    console.error('Error ensuring capture files:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to mark task as done
app.post('/api/tasks/done', (req, res) => {
  try {
    const { taskTitle, projectName } = req.body;

    if (!taskTitle || !projectName) {
      return res.status(400).json({ error: 'Task title and project name required' });
    }

    const filePath = getMonthlyFilePath(projectName);
    const taskInfo = findTaskInFile(filePath, taskTitle);

    if (!taskInfo) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { allLines, taskStart, taskEnd } = taskInfo;
    const today = new Date().toISOString().split('T')[0];

    // Extract task block
    const taskBlock = allLines.slice(taskStart, taskEnd + 1);

    // Update status and add completed date
    const updatedTaskBlock = taskBlock.map(line => {
      if (line.startsWith('status:')) return 'status: done';
      if (line.startsWith('completed:')) return `completed: ${today}`;
      return line;
    });

    // Add completed field if it doesn't exist
    if (!updatedTaskBlock.some(line => line.startsWith('completed:'))) {
      const createdIndex = updatedTaskBlock.findIndex(line => line.startsWith('created:'));
      if (createdIndex !== -1) {
        updatedTaskBlock.splice(createdIndex + 1, 0, `completed: ${today}`);
      }
    }

    // Find the "## Completed Tasks" section
    let completedSectionIndex = allLines.findIndex(line => line.trim() === '## Completed Tasks');

    if (completedSectionIndex === -1) {
      // Create completed section if it doesn't exist
      const activeSectionIndex = allLines.findIndex(line => line.trim() === '## Active Tasks');
      if (activeSectionIndex !== -1) {
        // Find the end of active tasks section
        let insertIndex = activeSectionIndex + 1;
        while (insertIndex < allLines.length && !allLines[insertIndex].startsWith('##')) {
          insertIndex++;
        }
        allLines.splice(insertIndex, 0, '', '## Completed Tasks', '');
        completedSectionIndex = insertIndex + 1;
      }
    }

    // Remove task from current location
    allLines.splice(taskStart, taskEnd - taskStart + 1);

    // Recalculate completed section index after removal
    completedSectionIndex = allLines.findIndex(line => line.trim() === '## Completed Tasks');

    // Insert task after "## Completed Tasks" header
    if (completedSectionIndex !== -1) {
      // Find first "---" after the header
      let insertIndex = completedSectionIndex + 1;
      while (insertIndex < allLines.length && allLines[insertIndex].trim() !== '---') {
        insertIndex++;
      }
      if (insertIndex < allLines.length) {
        insertIndex++; // Insert after the first "---"
      }

      allLines.splice(insertIndex, 0, ...updatedTaskBlock);
    }

    // Write back to file
    fs.writeFileSync(filePath, allLines.join('\n'));

    // Update dashboard data
    const dashboardData = getDashboardData();
    if (dashboardData.projects[projectName]) {
      const taskIndex = dashboardData.projects[projectName].tasks.findIndex(t => t.title === taskTitle);
      if (taskIndex !== -1) {
        dashboardData.projects[projectName].tasks[taskIndex].status = 'done';
      }
      saveDashboardData(dashboardData);
    }

    res.json({ success: true, message: 'Task marked as done' });
  } catch (error) {
    console.error('Error marking task as done:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to reschedule task
app.post('/api/tasks/reschedule', (req, res) => {
  try {
    const { taskTitle, project, newDueDate } = req.body;

    if (!taskTitle || !project || !newDueDate) {
      return res.status(400).json({ error: 'Task title, project, and new due date required' });
    }

    const filePath = getMonthlyFilePath(project);
    const taskInfo = findTaskInFile(filePath, taskTitle);

    if (!taskInfo) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { allLines, taskStart, taskEnd } = taskInfo;

    // Update the due date in the task block
    for (let i = taskStart; i <= taskEnd; i++) {
      if (allLines[i].startsWith('due:')) {
        allLines[i] = `due: ${newDueDate}`;
        break;
      }
    }

    // Write back to file
    fs.writeFileSync(filePath, allLines.join('\n'));

    // Update dashboard data
    const dashboardData = getDashboardData();
    if (dashboardData.projects[project]) {
      const taskIndex = dashboardData.projects[project].tasks.findIndex(t => t.title === taskTitle);
      if (taskIndex !== -1) {
        dashboardData.projects[project].tasks[taskIndex].due = newDueDate;
      }
      saveDashboardData(dashboardData);
    }

    res.json({ success: true, message: 'Task rescheduled' });
  } catch (error) {
    console.error('Error rescheduling task:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to create new task
app.post('/api/tasks/create', (req, res) => {
  try {
    const { title, projectName, priority = 'medium', tags = [] } = req.body;

    if (!title || !projectName) {
      return res.status(400).json({ error: 'Title and project name required' });
    }

    const filePath = getMonthlyFilePath(projectName);
    const today = new Date().toISOString().split('T')[0];

    // Ensure the file and directory exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let content = '';
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    } else {
      // Create new monthly file
      const [year, month] = today.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
      content = `# ${projectName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - ${monthName} ${year}\n\n## Active Tasks\n\n---\n\n## Completed Tasks\n\n---\n`;
    }

    const taskBlock = `
---
### ${title}
due:
priority: ${priority}
status: todo
tags: [${tags.join(', ')}]
created: ${today}

${title}

**Notes:**

---
`;

    // Insert task in Active Tasks section
    const lines = content.split('\n');
    const activeSectionIndex = lines.findIndex(line => line.trim() === '## Active Tasks');

    if (activeSectionIndex !== -1) {
      // Find the first "---" after Active Tasks header
      let insertIndex = activeSectionIndex + 1;
      while (insertIndex < lines.length && lines[insertIndex].trim() !== '---') {
        insertIndex++;
      }
      if (insertIndex < lines.length) {
        insertIndex++; // Insert after first "---"
        lines.splice(insertIndex, 0, ...taskBlock.split('\n'));
      }
    }

    fs.writeFileSync(filePath, lines.join('\n'));

    // Update dashboard data
    const dashboardData = getDashboardData();
    if (!dashboardData.projects[projectName]) {
      dashboardData.projects[projectName] = { tasks: [] };
    }
    dashboardData.projects[projectName].tasks.push({
      title,
      due: '',
      priority,
      status: 'todo',
      tags
    });
    saveDashboardData(dashboardData);

    res.json({ success: true, message: 'Task created' });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to create new project
app.post('/api/projects/create', (req, res) => {
  try {
    const { projectKey, projectName, goal = '', targetDate = 'ongoing' } = req.body;

    if (!projectKey || !projectName) {
      return res.status(400).json({ error: 'Project key and name are required' });
    }

    // Validate project key format (lowercase, hyphens only)
    if (!/^[a-z0-9-]+$/.test(projectKey)) {
      return res.status(400).json({ error: 'Project key must be lowercase with hyphens only' });
    }

    const projectDir = path.join(DATA_DIR, 'projects', projectKey);

    // Check if project already exists
    if (fs.existsSync(projectDir)) {
      return res.status(400).json({ error: 'Project already exists' });
    }

    // Create project directory structure
    const tasksDir = path.join(projectDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });

    // Create PROJECT.md
    const today = new Date().toISOString().split('T')[0];
    const projectContent = `<!-- This file tracks overall progress for this project. Update milestones and progress as you complete tasks. Monthly task files are in the tasks/ subfolder. -->

---
type: project
status: active
target-date: ${targetDate}
---

# ${projectName}

## Goal
${goal || 'Define what success looks like for this project'}

## Milestones
- [ ] First milestone

## Progress
Tasks: 0/0 complete (0%)

## Key Context
Important details about this project

## Notes
Running notes and updates
`;

    fs.writeFileSync(path.join(projectDir, 'PROJECT.md'), projectContent);

    // Create current month's task file
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthName = now.toLocaleString('en-US', { month: 'long' });

    const monthlyContent = `# ${projectName} - ${monthName} ${year}

## Active Tasks

---

## Completed Tasks

---
`;

    fs.writeFileSync(path.join(tasksDir, `${year}-${month}.md`), monthlyContent);

    res.json({
      success: true,
      message: 'Project created',
      projectKey,
      projectPath: `projects/${projectKey}`
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to process inbox item
app.post('/api/inbox/process', (req, res) => {
  try {
    const { inboxTitle, action, projectName } = req.body;

    if (!inboxTitle || !action) {
      return res.status(400).json({ error: 'Inbox title and action required' });
    }

    // Find and read inbox file
    const inboxDir = path.join(DATA_DIR, 'inbox');
    const inboxFiles = fs.readdirSync(inboxDir).filter(f => f.endsWith('.md'));

    let inboxFilePath = null;
    for (const file of inboxFiles) {
      const filePath = path.join(inboxDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(`# ${inboxTitle}`)) {
        inboxFilePath = filePath;
        break;
      }
    }

    if (!inboxFilePath) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    if (action === 'delete') {
      fs.unlinkSync(inboxFilePath);
    } else if (action === 'convert-to-task' && projectName) {
      // Create task from inbox item
      const inboxContent = fs.readFileSync(inboxFilePath, 'utf8');
      const titleMatch = inboxContent.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : inboxTitle;

      // Create the task
      const filePath = getMonthlyFilePath(projectName);
      const today = new Date().toISOString().split('T')[0];

      let content = '';
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
      }

      const taskBlock = `
---
### ${title}
due:
priority: medium
status: todo
tags: []
created: ${today}

${title}

**Notes:**

---
`;

      const lines = content.split('\n');
      const activeSectionIndex = lines.findIndex(line => line.trim() === '## Active Tasks');

      if (activeSectionIndex !== -1) {
        let insertIndex = activeSectionIndex + 1;
        while (insertIndex < lines.length && lines[insertIndex].trim() !== '---') {
          insertIndex++;
        }
        if (insertIndex < lines.length) {
          insertIndex++;
          lines.splice(insertIndex, 0, ...taskBlock.split('\n'));
        }
      }

      fs.writeFileSync(filePath, lines.join('\n'));
      fs.unlinkSync(inboxFilePath);
    }

    // Update dashboard data
    const dashboardData = getDashboardData();
    dashboardData.inbox = dashboardData.inbox.filter(item => item.title !== inboxTitle);
    saveDashboardData(dashboardData);

    res.json({ success: true, message: 'Inbox item processed' });
  } catch (error) {
    console.error('Error processing inbox:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== FILE MANAGEMENT APIs for IDE =====

// Security helper function
function isPathSafe(requestedPath) {
  const resolved = path.resolve(DATA_DIR, requestedPath);
  const blacklist = ['node_modules', '.git', '.env', 'server.js', 'setup.js', 'package.json', 'package-lock.json'];
  const segments = requestedPath.split(path.sep);

  return (resolved === DATA_DIR || resolved.startsWith(DATA_DIR + path.sep)) &&
         !requestedPath.includes('..') &&
         !blacklist.some(blocked => segments.includes(blocked));
}

// Helper function to build recursive file tree
function buildFileTree(dirPath, basePath = '') {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  // Whitelist: only show these folders and files at root level
  const ALLOWED_ROOT = ['projects', 'daily', 'inbox', 'ideas', 'inbox.md', 'tasks.md', 'HOWTOUSE.md'];

  const children = entries
    .filter(e => {
      // Hide dot files, node_modules, ide folder
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'ide') return false;

      // At root level, only show whitelisted items
      if (!basePath) {
        return ALLOWED_ROOT.includes(e.name);
      }

      return true;
    })
    .map(entry => {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        return {
          type: 'directory',
          name: entry.name,
          path: relativePath,
          children: buildFileTree(fullPath, relativePath)
        };
      } else {
        return {
          type: 'file',
          name: entry.name,
          path: relativePath
        };
      }
    })
    .sort((a, b) => {
      // At root level: show quick-capture files first, then directories
      if (!basePath) {
        const ROOT_TOP_FILES = ['tasks.md', 'inbox.md'];
        const aIsTop = ROOT_TOP_FILES.includes(a.name);
        const bIsTop = ROOT_TOP_FILES.includes(b.name);
        if (aIsTop && !bIsTop) return -1;
        if (!aIsTop && bIsTop) return 1;
        if (aIsTop && bIsTop) return ROOT_TOP_FILES.indexOf(a.name) - ROOT_TOP_FILES.indexOf(b.name);
      }
      // Directories first, then files
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return children;
}

// File Tree API
app.get('/api/files/tree', (req, res) => {
  try {
    const tree = {
      type: 'directory',
      name: 'root',
      path: '',
      children: buildFileTree(DATA_DIR)
    };
    res.json({ tree });
  } catch (error) {
    console.error('Error building file tree:', error);
    res.status(500).json({ error: error.message });
  }
});

// File Read API
app.get('/api/files/read', (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }

    if (!isPathSafe(filePath)) {
      return res.status(403).json({ error: 'Invalid or unsafe file path' });
    }

    const fullPath = path.join(DATA_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const stats = fs.statSync(fullPath);

    res.json({
      content,
      path: filePath,
      stats: {
        size: stats.size,
        modified: stats.mtime.toISOString()
      }
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Archive completed tasks from tasks.md when threshold is reached
function archiveCompletedTasks(content) {
  const lines = content.split('\n');

  // Find all completed/strikethrough tasks
  const completedLines = [];
  const otherLines = [];

  lines.forEach(line => {
    if (line.includes('[x]') && line.includes('~~')) {
      completedLines.push(line);
    } else {
      otherLines.push(line);
    }
  });

  // If more than 50 completed tasks, archive the oldest ones
  if (completedLines.length > 50) {
    const toArchive = completedLines.slice(0, -20); // Keep last 20
    const toKeep = completedLines.slice(-20);

    // Create archive file
    const now = new Date();
    const archiveFile = `tasks-archive-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.md`;
    const archivePath = path.join(DATA_DIR, archiveFile);

    // Append to archive file
    const archiveHeader = `# Archived Tasks - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n\n`;
    let archiveContent = '';

    if (fs.existsSync(archivePath)) {
      archiveContent = fs.readFileSync(archivePath, 'utf8');
    } else {
      archiveContent = archiveHeader;
    }

    archiveContent += toArchive.join('\n') + '\n';
    fs.writeFileSync(archivePath, archiveContent, 'utf8');

    // Rebuild tasks.md without archived entries
    // Find "## Your Tasks" section and add kept completed tasks there
    const newContent = otherLines.map(line => {
      // Add kept tasks after "## Your Tasks" header
      if (line.trim() === '## Your Tasks') {
        return line + '\n' + toKeep.join('\n');
      }
      return line;
    }).join('\n');

    return newContent;
  }

  return content;
}

// Archive old inbox entries (older than 30 days)
function archiveOldInboxEntries(content) {
  const lines = content.split('\n');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dateSections = [];
  let currentSection = { date: null, lines: [], startIndex: 0 };
  let headerLines = [];
  let inHeader = true;

  lines.forEach((line, index) => {
    // Detect date headers
    const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})$/);

    if (inHeader && !dateMatch) {
      headerLines.push(line);
    } else {
      inHeader = false;
    }

    if (dateMatch) {
      if (currentSection.date) {
        dateSections.push(currentSection);
      }
      currentSection = {
        date: new Date(dateMatch[1]),
        dateString: dateMatch[1],
        lines: [line],
        startIndex: index
      };
    } else if (!inHeader) {
      if (currentSection.date) {
        currentSection.lines.push(line);
      }
    }
  });

  // Add last section
  if (currentSection.date) {
    dateSections.push(currentSection);
  }

  // Separate old and recent sections
  const oldSections = dateSections.filter(s => s.date < thirtyDaysAgo);
  const recentSections = dateSections.filter(s => s.date >= thirtyDaysAgo);

  if (oldSections.length > 0) {
    // Create archive file
    const now = new Date();
    const archiveFile = `inbox-archive-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.md`;
    const archivePath = path.join(DATA_DIR, archiveFile);

    const archiveHeader = `# Archived Inbox - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n\n`;
    let archiveContent = '';

    if (fs.existsSync(archivePath)) {
      archiveContent = fs.readFileSync(archivePath, 'utf8');
    } else {
      archiveContent = archiveHeader;
    }

    oldSections.forEach(section => {
      archiveContent += section.lines.join('\n') + '\n\n';
    });

    fs.writeFileSync(archivePath, archiveContent, 'utf8');

    // Rebuild inbox.md with only recent entries
    const newContent = headerLines.join('\n') + '\n\n' +
                       recentSections.map(s => s.lines.join('\n')).join('\n\n');

    return newContent;
  }

  return content;
}

// Process tasks.md: parse tasks, infer projects, sync to monthly files
async function processTasks(content) {
  const lines = content.split('\n');
  const taskPattern = /^- \[ \] (.+?)(?:\s*\|\s*(\d{4}-\d{2}-\d{2}))?(?:\s*\|\s*(.+))?$/;
  const tasks = [];
  const taskLineIndices = [];

  // Parse all unchecked tasks
  lines.forEach((line, index) => {
    const match = line.match(taskPattern);
    if (match) {
      const [, title, dueDate, project] = match;
      tasks.push({
        title: title.trim(),
        dueDate,
        project: project ? project.trim() : null,
        lineIndex: index,
        originalLine: line
      });
      taskLineIndices.push(index);
    }
  });

  if (tasks.length === 0) {
    return content; // No tasks to process
  }

  // Get available projects
  const projectsDir = path.join(DATA_DIR, 'projects');
  const availableProjects = fs.existsSync(projectsDir)
    ? fs.readdirSync(projectsDir).filter(p => {
        const projectPath = path.join(projectsDir, p);
        return fs.statSync(projectPath).isDirectory();
      })
    : [];

  // Add "others" as fallback project
  if (!availableProjects.includes('others')) {
    availableProjects.push('others');
  }

  // Identify tasks without projects
  const tasksNeedingInference = tasks.filter(t => !t.project);

  // Infer projects for tasks without them
  let inferences = [];
  if (tasksNeedingInference.length > 0) {
    inferences = await inferProjects(tasksNeedingInference, availableProjects);
  }

  // Map inferences back to tasks
  let inferenceIndex = 0;
  tasks.forEach(task => {
    if (!task.project) {
      const inference = inferences[inferenceIndex];
      task.project = inference ? inference.project : 'others';
      inferenceIndex++;
    }
  });

  // Create task blocks in monthly files
  const updatedLines = [...lines];
  const createdTasks = [];

  for (const task of tasks) {
    try {
      // Get project name for display
      const projectName = task.project;

      // Determine monthly file path (use due date month, or current month if no due date)
      const dueDate = task.dueDate ? new Date(task.dueDate) : new Date();
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, '0');
      const monthlyFilePath = path.join(DATA_DIR, 'projects', projectName, 'tasks', `${year}-${month}.md`);

      // Ensure project and tasks directory exist
      const tasksDir = path.dirname(monthlyFilePath);
      if (!fs.existsSync(tasksDir)) {
        fs.mkdirSync(tasksDir, { recursive: true });
      }

      // Create or read monthly file
      let monthlyContent = '';
      if (fs.existsSync(monthlyFilePath)) {
        monthlyContent = fs.readFileSync(monthlyFilePath, 'utf8');
      } else {
        // Create new monthly file with header
        const monthName = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        monthlyContent = `# ${projectName} - ${monthName}\n\n## Active Tasks\n\n---\n\n## Completed Tasks\n\n---\n`;
      }

      // Find the Active Tasks section
      const activeTasksMatch = monthlyContent.match(/(## Active Tasks\n\n)/);
      if (activeTasksMatch) {
        const today = new Date().toISOString().split('T')[0];
        const taskBlock = `---
### ${task.title}
due: ${task.dueDate || ''}
priority: medium
status: todo
tags: []
created: ${today}

${task.title}

**Notes:**

---

`;

        // Insert task after Active Tasks header
        const insertPos = activeTasksMatch.index + activeTasksMatch[0].length;
        monthlyContent = monthlyContent.slice(0, insertPos) + taskBlock + monthlyContent.slice(insertPos);

        // Write updated monthly file
        fs.writeFileSync(monthlyFilePath, monthlyContent, 'utf8');

        // Update tasks.md line with strikethrough
        const originalLine = task.originalLine;
        const strikethroughLine = `- [x] ~~${task.title} | ${task.dueDate} | ${task.project}~~ (added to ${projectName})`;
        updatedLines[task.lineIndex] = strikethroughLine;

        createdTasks.push({ task: task.title, project: projectName });
      }
    } catch (error) {
      console.error(`Error creating task "${task.title}":`, error);
      // Keep original line if creation failed
    }
  }

  // Return updated content
  return updatedLines.join('\n');
}

// File Write API
app.post('/api/files/write', async (req, res) => {
  try {
    const { path: filePath, content, lastModified } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content required' });
    }

    if (!isPathSafe(filePath)) {
      return res.status(403).json({ error: 'Invalid or unsafe file path' });
    }

    const fullPath = path.join(DATA_DIR, filePath);

    // Conflict detection
    if (fs.existsSync(fullPath) && lastModified) {
      const stats = fs.statSync(fullPath);
      const fileModified = stats.mtime.toISOString();

      if (fileModified > lastModified) {
        return res.status(409).json({
          error: 'File modified externally',
          conflict: true,
          currentContent: fs.readFileSync(fullPath, 'utf8')
        });
      }
    }

    let finalContent = content;

    // Auto-sync logic
    try {
      // If saving tasks.md, process and sync to monthly files
      if (filePath === 'tasks.md') {
        finalContent = await processTasks(content);
        // Archive old completed tasks if needed
        finalContent = archiveCompletedTasks(finalContent);
        // Write the updated content with strikethrough
        fs.writeFileSync(fullPath, finalContent, 'utf8');
      } else if (filePath === 'inbox.md') {
        // Add today's date header if not present
        const today = new Date().toISOString().split('T')[0];
        const dateHeader = `## ${today}`;

        if (!content.includes(dateHeader)) {
          // Find where to insert (after instruction comment)
          const lines = content.split('\n');
          let insertIndex = 0;

          // Skip instruction comment at the top
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '' && i > 0) {
              insertIndex = i + 1;
              break;
            }
          }

          // Insert date header
          lines.splice(insertIndex, 0, dateHeader, '');
          finalContent = lines.join('\n');
        }

        // Archive old entries if needed
        finalContent = archiveOldInboxEntries(finalContent);

        fs.writeFileSync(fullPath, finalContent, 'utf8');
      } else {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    } catch (syncError) {
      console.error('Error during file processing:', syncError);
      // Write original content if processing fails
      fs.writeFileSync(fullPath, content, 'utf8');
    }

    const newStats = fs.statSync(fullPath);

    // Additional auto-sync logic
    try {
      // If saving a daily file, sync tasks to monthly files
      if (filePath.startsWith('daily/') && filePath.endsWith('.md')) {
        const dateMatch = filePath.match(/daily\/(\d{4}-\d{2}-\d{2})\.md$/);
        if (dateMatch) {
          const date = dateMatch[1];
          await syncNewTasksFromDaily(content, date);
          syncTodayToMonthly(content, date);
        }
      }

      // If saving a monthly task file, regenerate today's daily file
      if (filePath.match(/^projects\/[^/]+\/tasks\/\d{4}-\d{2}\.md$/)) {
        const today = new Date().toISOString().split('T')[0];
        const todayFilePath = path.join(DATA_DIR, 'daily', `${today}.md`);

        // Only regenerate if today's file exists (don't create it unexpectedly)
        if (fs.existsSync(todayFilePath)) {
          generateDailyFile(today);
        }
      }
    } catch (syncError) {
      console.error('Error during auto-sync:', syncError);
      // Don't fail the save if sync fails
    }

    res.json({
      success: true,
      modified: newStats.mtime.toISOString(),
      conflict: false
    });
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({ error: error.message });
  }
});

// File Create API
app.post('/api/files/create', (req, res) => {
  try {
    const { path: filePath, type = 'file', content = '' } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }

    if (!isPathSafe(filePath)) {
      return res.status(403).json({ error: 'Invalid or unsafe file path' });
    }

    const fullPath = path.join(DATA_DIR, filePath);

    if (fs.existsSync(fullPath)) {
      return res.status(400).json({ error: 'File or directory already exists' });
    }

    // Ensure parent directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (type === 'file') {
      fs.writeFileSync(fullPath, content, 'utf8');
    } else {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    res.json({ success: true, path: filePath });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: error.message });
  }
});

// File Delete API
app.post('/api/files/delete', (req, res) => {
  try {
    const { path: filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }

    if (!isPathSafe(filePath)) {
      return res.status(403).json({ error: 'Invalid or unsafe file path' });
    }

    // Protected files
    const PROTECTED_FILES = ['README.md', 'server.js', 'package.json'];
    if (PROTECTED_FILES.includes(path.basename(filePath))) {
      return res.status(403).json({ error: 'Cannot delete protected system file' });
    }

    const fullPath = path.join(DATA_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fs.rmdirSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// File Rename API
app.post('/api/files/rename', (req, res) => {
  try {
    const { oldPath, newPath } = req.body;

    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Old path and new path required' });
    }

    if (!isPathSafe(oldPath) || !isPathSafe(newPath)) {
      return res.status(403).json({ error: 'Invalid or unsafe file path' });
    }

    const fullOldPath = path.join(DATA_DIR, oldPath);
    const fullNewPath = path.join(DATA_DIR, newPath);

    if (!fs.existsSync(fullOldPath)) {
      return res.status(404).json({ error: 'Source file not found' });
    }

    if (fs.existsSync(fullNewPath)) {
      return res.status(400).json({ error: 'Destination already exists' });
    }

    fs.renameSync(fullOldPath, fullNewPath);

    res.json({ success: true, newPath });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Directory API
app.post('/api/files/mkdir', (req, res) => {
  try {
    const { path: dirPath } = req.body;

    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path required' });
    }

    if (!isPathSafe(dirPath)) {
      return res.status(403).json({ error: 'Invalid or unsafe directory path' });
    }

    const fullPath = path.join(DATA_DIR, dirPath);

    if (fs.existsSync(fullPath)) {
      return res.status(400).json({ error: 'Directory already exists' });
    }

    fs.mkdirSync(fullPath, { recursive: true });

    res.json({ success: true, path: dirPath });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync today.md API
app.post('/api/tasks/sync-today', (req, res) => {
  try {
    const { content, date } = req.body;

    if (!content || !date) {
      return res.status(400).json({ error: 'Content and date required' });
    }

    let tasksCompleted = 0;
    let tasksCreated = 0;

    // Parse task lines: - [x] Task title (project) or - [ ] Task title (project)
    // Allows spaces around x: [x], [ x], [x ], [ ]
    const taskLines = content.split('\n').filter(line => line.match(/^-\s*\[\s*x?\s*\]\s+.+\(.+\)$/i));

    taskLines.forEach(line => {
      const match = line.match(/^-\s*\[\s*(x?)\s*\]\s+(.+?)\s+\((.+?)\)$/i);
      if (!match) return;

      const [, checked, taskTitle, projectName] = match;
      const isChecked = checked.toLowerCase() === 'x';

      // Determine monthly file path
      const [year, month] = date.split('-');
      const monthlyFile = path.join(DATA_DIR, 'projects', projectName, 'tasks', `${year}-${month}.md`);

      if (!fs.existsSync(monthlyFile)) {
        console.log(`Monthly file not found for project ${projectName}`);
        return;
      }

      let monthlyContent = fs.readFileSync(monthlyFile, 'utf8');

      if (isChecked) {
        // Mark task as done
        const taskHeaderPattern = new RegExp(`^### ${taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm');

        if (monthlyContent.match(taskHeaderPattern)) {
          // Find the task block (from --- to ---)
          const taskBlockPattern = new RegExp(
            `---\\n### ${taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n([\\s\\S]*?)\\n---`,
            'm'
          );
          const taskMatch = monthlyContent.match(taskBlockPattern);

          if (taskMatch) {
            const taskBlock = taskMatch[0];

            // Update status and add completed date
            let updatedBlock = taskBlock.replace(/status:\s*\w+/, 'status: done');
            if (!updatedBlock.includes('completed:')) {
              updatedBlock = updatedBlock.replace(/created:\s*[\d-]+/, match => `${match}\ncompleted: ${date}`);
            }

            // Remove from Active Tasks section
            monthlyContent = monthlyContent.replace(taskBlock, '');

            // Add to Completed Tasks section
            const completedSectionIndex = monthlyContent.indexOf('## Completed Tasks');
            if (completedSectionIndex !== -1) {
              const insertPosition = monthlyContent.indexOf('\n', completedSectionIndex) + 1;
              monthlyContent = monthlyContent.slice(0, insertPosition) + '\n' + updatedBlock + '\n' + monthlyContent.slice(insertPosition);
            }

            fs.writeFileSync(monthlyFile, monthlyContent);
            tasksCompleted++;
          }
        }
      } else {
        // Check if task already exists
        const taskHeaderPattern = new RegExp(`^### ${taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm');

        if (!monthlyContent.match(taskHeaderPattern)) {
          // Create new task
          const newTaskBlock = `
---
### ${taskTitle}
due:
priority: medium
status: todo
tags: []
created: ${date}

**Notes:**

---
`;

          // Insert into Active Tasks section
          const activeSectionIndex = monthlyContent.indexOf('## Active Tasks');
          if (activeSectionIndex !== -1) {
            const insertPosition = monthlyContent.indexOf('\n', activeSectionIndex) + 1;
            monthlyContent = monthlyContent.slice(0, insertPosition) + newTaskBlock + monthlyContent.slice(insertPosition);
            fs.writeFileSync(monthlyFile, monthlyContent);
            tasksCreated++;
          }
        }
      }
    });

    // Regenerate dashboard data
    const dashboardData = getDashboardData();
    saveDashboardData(dashboardData);

    res.json({ success: true, tasksCompleted, tasksCreated });
  } catch (error) {
    console.error('Error syncing today.md:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server.
// PORT=0 lets the OS pick a free port (used by Electron).
// In standalone mode, PORT defaults to 3000.
const server = app.listen(PORT, () => {
  const actualPort = server.address().port;
  console.log(`Task system server running at http://localhost:${actualPort}`);
});

// Export for Electron's main process to get the server instance and port
module.exports = server;
