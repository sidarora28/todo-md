#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(colors.cyan + prompt + colors.reset, resolve);
  });
}

async function setup() {
  console.clear();
  log('╔══════════════════════════════════════╗', 'bright');
  log('║       Welcome to ToDo.md Setup      ║', 'bright');
  log('║  Markdown-first task management      ║', 'bright');
  log('╚══════════════════════════════════════╝', 'bright');
  console.log();

  log('This setup wizard will:', 'cyan');
  log('  • Check your system requirements', 'yellow');
  log('  • Install dependencies (express, cors, dotenv)', 'yellow');
  log('  • Help you create your first projects', 'yellow');
  log('  • Capture your first tasks', 'yellow');
  log('  • Get you up and running in 5 minutes', 'yellow');
  console.log();

  const ready = await question('Ready to begin? Press Enter to continue...');
  console.log();

  // Step 1: Check Node.js version
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📋 Step 1 of 6: System Check', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log();
  log('Checking Node.js...', 'yellow');
  log('(Node.js is the engine that runs ToDo.md on your computer)', 'yellow');
  console.log();

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 18) {
    log('❌ Node.js 18+ required. You have ' + nodeVersion, 'red');
    log('   Download from: https://nodejs.org', 'yellow');
    process.exit(1);
  }

  log('✓ Node.js ' + nodeVersion + ' detected - Perfect!', 'green');
  console.log();

  // Step 2: Check port availability
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📋 Step 2 of 6: Port Check', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log();
  log('Checking if port 3000 is available...', 'yellow');
  log('(ToDo.md runs a local server on port 3000. Think of it like', 'yellow');
  log(' a reserved parking spot - we need to make sure it\'s empty)', 'yellow');
  console.log();

  try {
    execSync('lsof -ti :3000', { stdio: 'ignore' });
    log('⚠️  Port 3000 is currently being used by another program', 'yellow');
    const killPort = await question('   Should I free it up? (y/n): ');
    if (killPort.toLowerCase() === 'y') {
      execSync('lsof -ti :3000 | xargs kill');
      log('✓ Port 3000 is now available', 'green');
    }
  } catch (e) {
    log('✓ Port 3000 is available - Good to go!', 'green');
  }
  console.log();

  // Step 3: Install dependencies (if needed)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📋 Step 3 of 6: Install Dependencies', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log();

  if (!fs.existsSync('node_modules')) {
    log('Installing required packages...', 'yellow');
    log('(These are libraries ToDo.md needs to run: express for the', 'yellow');
    log(' web server, cors for security, and dotenv for config files)', 'yellow');
    console.log();
    log('This will take 1-2 minutes. Perfect time for a coffee break! ☕', 'yellow');
    console.log();

    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log();
      log('✓ All dependencies installed successfully!', 'green');
    } catch (e) {
      log('❌ Failed to install dependencies', 'red');
      process.exit(1);
    }
  } else {
    log('Dependencies are already installed', 'yellow');
    log('✓ Skipping this step', 'green');
  }
  console.log();

  // Step 4: Setup .env file
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📋 Step 4 of 6: AI Features (Optional)', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log();

  if (fs.existsSync('.env')) {
    log('Configuration file already exists', 'yellow');
    log('✓ Skipping this step', 'green');
  } else {
    log('Adding an LLM API key unlocks AI-powered features:', 'yellow');
    console.log();
    log('With a key, you get:', 'cyan');
    log('  • Smart daily briefings — personalized coaching each morning', 'white');
    log('  • Natural language search — "what are my overdue tasks?"', 'white');
    log('  • Auto project inference — tasks route to the right project', 'white');
    console.log();
    log('Without a key, everything still works:', 'cyan');
    log('  • Keyword-based search with relevance scoring', 'white');
    log('  • Motivational daily summary with static quotes', 'white');
    log('  • Manual project assignment (task | date | project-name)', 'white');
    console.log();
    log('Supported providers: OpenAI, Anthropic, OpenRouter', 'yellow');
    console.log();

    const setupAPI = await question('Enable AI features? (y/n): ');

    if (setupAPI.toLowerCase() === 'y') {
      console.log();
      log('Which LLM provider would you like to use?', 'cyan');
      console.log();
      log('  1. OpenAI     — GPT-4o (https://platform.openai.com/api-keys)', 'white');
      log('  2. Anthropic  — Claude Sonnet (https://console.anthropic.com/)', 'white');
      log('  3. OpenRouter — Any model (https://openrouter.ai/keys)', 'white');
      console.log();

      const providerChoice = await question('Choose provider (1/2/3): ');

      const providers = {
        '1': { name: 'openai', label: 'OpenAI', prefix: 'sk-', model: 'gpt-4o', url: 'https://platform.openai.com/api-keys' },
        '2': { name: 'anthropic', label: 'Anthropic', prefix: 'sk-ant-', model: 'claude-sonnet-4-5-20250929', url: 'https://console.anthropic.com/' },
        '3': { name: 'openrouter', label: 'OpenRouter', prefix: 'sk-or-v1-', model: 'anthropic/claude-sonnet-4-5', url: 'https://openrouter.ai/keys' }
      };

      const provider = providers[providerChoice.trim()] || providers['3'];

      console.log();
      log(`Great! Get your ${provider.label} API key from:`, 'cyan');
      log(`  ${provider.url}`, 'white');
      console.log();

      const apiKey = await question('Paste your API key (or press Enter to skip for now): ');

      if (apiKey.trim()) {
        const envContent = [
          `# LLM Configuration (for AI search, daily briefings, project inference)`,
          `LLM_PROVIDER=${provider.name}`,
          `LLM_API_KEY=${apiKey.trim()}`,
          `# LLM_MODEL=${provider.model}`,
          ''
        ].join('\n');
        fs.writeFileSync('.env', envContent);
        log(`✓ ${provider.label} API key saved! AI features are now enabled.`, 'green');
      } else {
        fs.writeFileSync('.env', '# LLM_PROVIDER=openai|anthropic|openrouter\n# LLM_API_KEY=your-key-here\n# LLM_MODEL=optional-model-override\n');
        log('✓ Created config file. You can add the key later in .env', 'green');
      }
    } else {
      fs.writeFileSync('.env', '# LLM_PROVIDER=openai|anthropic|openrouter\n# LLM_API_KEY=your-key-here\n# LLM_MODEL=optional-model-override\n');
      log('✓ No problem! Manual project assignment works great too.', 'green');
    }
  }
  console.log();

  // Step 5: Create projects
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📋 Step 5 of 6: Create Your Projects', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log();

  const projectsDir = path.join(__dirname, 'projects');
  const hasProjects = fs.existsSync(projectsDir) && fs.readdirSync(projectsDir).length > 0;

  if (hasProjects) {
    log('Projects already exist in your system', 'yellow');
    log('✓ Skipping project creation', 'green');
  } else {
    log('Projects are how you organize your work in ToDo.md.', 'yellow');
    log('Think of them as folders for different areas of your life.', 'yellow');
    console.log();
    log('Examples:', 'cyan');
    log('  • "newsletter" - for your email newsletter', 'white');
    log('  • "app-redesign" - for a product redesign project', 'white');
    log('  • "health" - for fitness and wellness goals', 'white');
    log('  • "learning" - for courses and skill development', 'white');
    console.log();

    const createProjects = await question('Let\'s create your first projects! Ready? (y/n): ');

    if (createProjects.toLowerCase() === 'y') {
      console.log();
      log('I\'ll ask for 2-3 projects. You can always add more later!', 'cyan');
      console.log();

      const projects = [];
      const today = new Date().toISOString().split('T')[0];

      // Create 2-3 projects
      for (let i = 1; i <= 3; i++) {
        log(`Project ${i} of 3:`, 'bright');

        const projectName = await question('  Project name (or press Enter to skip): ');
        if (!projectName.trim()) {
          if (i === 1) {
            log('  Let\'s create at least one project to get started!', 'yellow');
            i--;
            continue;
          }
          break;
        }

        // Generate project key from name
        const projectKey = projectName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const projectGoal = await question('  What\'s the goal? (1-2 sentences): ');

        projects.push({ key: projectKey, name: projectName, goal: projectGoal || 'Define your success criteria' });

        log(`  ✓ "${projectName}" created`, 'green');
        console.log();
      }

      // Create project directories and files
      for (const project of projects) {
        const projectDir = path.join(projectsDir, project.key);
        const tasksDir = path.join(projectDir, 'tasks');

        if (!fs.existsSync(tasksDir)) {
          fs.mkdirSync(tasksDir, { recursive: true });
        }

        // Create PROJECT.md
        const projectMd = `<!-- This file tracks overall progress for this project. Update milestones and progress as you complete tasks. Monthly task files are in the tasks/ subfolder. -->

---
type: project
status: active
target-date: ongoing
---

# ${project.name}

## Goal
${project.goal}

## Milestones
- [ ] First milestone
- [ ] Second milestone

## Progress
Tasks: 0/0 complete (0%)

## Key Context
Add important context about this project here.

## Notes
Running notes and updates.
`;

        fs.writeFileSync(path.join(projectDir, 'PROJECT.md'), projectMd);

        // Create empty monthly task file
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        const tasksMd = `# ${project.name} - ${monthName}

## Active Tasks

---

## Completed Tasks

---
`;

        fs.writeFileSync(path.join(tasksDir, `${year}-${month}.md`), tasksMd);
      }

      log(`✓ Created ${projects.length} project${projects.length > 1 ? 's' : ''}!`, 'green');
      console.log();

      // Step 6: Capture initial tasks
      log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
      log('📋 Step 6 of 6: Add Your First Tasks', 'blue');
      log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
      console.log();

      log('Let\'s add a few tasks to get you started!', 'yellow');
      console.log();

      const addTasks = await question('Add some tasks now? (y/n): ');

      if (addTasks.toLowerCase() === 'y') {
        console.log();
        log('I\'ll ask for 2-3 tasks. Format: just tell me what needs doing!', 'cyan');
        console.log();

        const tasks = [];

        for (let i = 1; i <= 3; i++) {
          log(`Task ${i} of 3:`, 'bright');

          const taskName = await question('  What needs to be done? (or press Enter to finish): ');
          if (!taskName.trim()) break;

          const dueDate = await question('  When is it due? (YYYY-MM-DD or press Enter for no due date): ');

          let projectKey = '';
          if (projects.length > 1) {
            console.log('  Which project?');
            projects.forEach((p, idx) => {
              log(`    ${idx + 1}. ${p.name}`, 'white');
            });
            const projectChoice = await question('  Enter number (or press Enter for auto-detect): ');
            const idx = parseInt(projectChoice) - 1;
            if (idx >= 0 && idx < projects.length) {
              projectKey = projects[idx].key;
            }
          } else {
            projectKey = projects[0].key;
          }

          tasks.push({
            name: taskName,
            due: dueDate.trim() || null,
            project: projectKey
          });

          log(`  ✓ Task added`, 'green');
          console.log();
        }

        // Write tasks to the appropriate monthly files
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const today = now.toISOString().split('T')[0];

        for (const task of tasks) {
          const projectDir = path.join(projectsDir, task.project);
          const monthlyFile = path.join(projectDir, 'tasks', `${year}-${month}.md`);

          if (fs.existsSync(monthlyFile)) {
            let content = fs.readFileSync(monthlyFile, 'utf8');

            const taskBlock = `---
### ${task.name}
due: ${task.due || ''}
priority: medium
status: todo
tags: []
created: ${today}

${task.name}

**Notes:**

`;

            // Insert after "## Active Tasks"
            content = content.replace('## Active Tasks\n\n', `## Active Tasks\n\n${taskBlock}`);
            fs.writeFileSync(monthlyFile, content);
          }
        }

        log(`✓ Added ${tasks.length} task${tasks.length > 1 ? 's' : ''} to your projects!`, 'green');
      } else {
        log('✓ No problem! You can add tasks anytime in the IDE.', 'green');
      }

    } else {
      log('✓ Skipped project creation - you can create them later in the IDE', 'green');
    }
  }
  console.log();

  // All done!
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('╔══════════════════════════════════════╗', 'bright');
  log('║     🎉 Setup Complete!               ║', 'bright');
  log('╚══════════════════════════════════════╝', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log();

  log('Your ToDo.md system is ready!', 'green');
  console.log();

  log('What you have:', 'cyan');
  log('  ✓ Local server ready to run', 'green');
  log('  ✓ Web-based IDE with Monaco editor', 'green');
  log('  ✓ Your projects and tasks created', 'green');
  log('  ✓ Quick capture files (inbox.md, tasks.md)', 'green');
  if (fs.existsSync('.env') && fs.readFileSync('.env', 'utf8').includes('sk-or-v1-')) {
    log('  ✓ AI features enabled (search, daily briefings, project inference)', 'green');
  } else {
    log('  → Add an API key to .env later to unlock AI features', 'yellow');
  }
  console.log();

  log('Next steps:', 'bright');
  console.log();
  log('1. Start the server:', 'cyan');
  log('   npm start', 'white');
  console.log();
  log('2. Open your browser to:', 'cyan');
  log('   http://localhost:3000/ide.html', 'white');
  console.log();
  log('3. Explore:', 'cyan');
  log('   • File tree on the left - navigate your projects', 'yellow');
  log('   • Editor in the center - edit tasks with syntax highlighting', 'yellow');
  log('   • Dashboard on the right - see what\'s due today', 'yellow');
  console.log();
  log('4. Quick capture:', 'cyan');
  log('   • inbox.md - Freeform scratchpad for random thoughts', 'yellow');
  log('   • tasks.md - Structured tasks that sync automatically', 'yellow');
  console.log();

  const startNow = await question('Start the server now? (y/n): ');

  if (startNow.toLowerCase() === 'y') {
    console.log();
    log('Starting server...', 'blue');
    log('Press Ctrl+C to stop', 'yellow');
    console.log();

    // Try to open browser
    try {
      const platform = process.platform;
      const url = 'http://localhost:3000/ide.html';

      if (platform === 'darwin') {
        setTimeout(() => execSync(`open ${url}`), 2000);
      } else if (platform === 'win32') {
        setTimeout(() => execSync(`start ${url}`), 2000);
      } else {
        setTimeout(() => execSync(`xdg-open ${url}`), 2000);
      }

      log('Opening browser in 2 seconds...', 'green');
    } catch (e) {
      // Browser open failed, that's ok
    }

    // Start server
    require('./server.js');
  } else {
    console.log();
    log('Run "npm start" when you\'re ready!', 'green');
    process.exit(0);
  }

  rl.close();
}

// Handle errors gracefully
process.on('uncaughtException', (err) => {
  log('❌ Setup failed: ' + err.message, 'red');
  process.exit(1);
});

setup().catch(err => {
  log('❌ Setup failed: ' + err.message, 'red');
  process.exit(1);
});
