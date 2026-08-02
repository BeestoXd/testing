const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to parse CLI arguments (e.g., node index.js --start 2026-01-01 --min 1 --max 10)
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      params[key] = value;
    }
  }
  return params;
}

const cliArgs = parseArgs();

// Format local Date object to Git ISO string (YYYY-MM-DDTHH:mm:ss)
function formatGitDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
}

// Format date to YYYY-MM-DD
function formatDateOnly(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Parse YYYY-MM-DD string to local Date object
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Default Configuration
const now = new Date();
const targetYear = cliArgs.year ? Number(cliArgs.year) : (cliArgs.start ? null : 2025);

const startDateObj = cliArgs.start 
  ? parseLocalDate(cliArgs.start)
  : new Date(targetYear, 0, 1); // January 1st

const endDateObj = cliArgs.end 
  ? parseLocalDate(cliArgs.end)
  : (targetYear ? new Date(targetYear, 11, 31) : now); // December 31st

const CONFIG = {
  startDate: startDateObj,
  endDate: endDateObj,
  minCommitsPerDay: parseInt(cliArgs.min, 10) || 1,
  maxCommitsPerDay: parseInt(cliArgs.max, 10) || 10,
  dataFile: path.join(__dirname, 'data.json')
};

// Get random integer within min and max inclusive
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Perform individual commit with custom timestamp
function makeCommit(date) {
  const gitDateStr = formatGitDate(date);
  
  // Update data.json so Git detects file changes
  const dataContent = {
    updated_at: gitDateStr,
    timestamp: date.getTime(),
    hash: Math.random().toString(36).substring(2, 15)
  };
  
  fs.writeFileSync(CONFIG.dataFile, JSON.stringify(dataContent, null, 2));

  // Set GIT_AUTHOR_DATE & GIT_COMMITTER_DATE environment variables
  const env = {
    ...process.env,
    GIT_AUTHOR_DATE: gitDateStr,
    GIT_COMMITTER_DATE: gitDateStr
  };

  const commitMsg = `chore(contribution): update ${gitDateStr.split('T')[0]}`;

  try {
    execSync('git add data.json', { env, stdio: 'ignore' });
    execSync(`git commit --date="${gitDateStr}" -m "${commitMsg}"`, { env, stdio: 'ignore' });
  } catch (error) {
    console.error(`[ERROR] Failed to make commit on date ${gitDateStr}:`, error.message);
  }
}

function run() {
  console.log('==================================================');
  console.log('GITHUB CONTRIBUTION GRAPH HACKER (JS TOOL)');
  console.log('==================================================');
  console.log(`Start Date : ${formatDateOnly(CONFIG.startDate)}`);
  console.log(`End Date   : ${formatDateOnly(CONFIG.endDate)}`);
  console.log(`Commits/Day: ${CONFIG.minCommitsPerDay} to ${CONFIG.maxCommitsPerDay} commits (Random)`);
  console.log('--------------------------------------------------');

  let currentDate = new Date(CONFIG.startDate.getFullYear(), CONFIG.startDate.getMonth(), CONFIG.startDate.getDate());
  const targetEndDate = new Date(CONFIG.endDate.getFullYear(), CONFIG.endDate.getMonth(), CONFIG.endDate.getDate());

  let totalCommitsMade = 0;
  let totalDaysProcessed = 0;

  while (currentDate <= targetEndDate) {
    totalDaysProcessed++;
    const commitsCountForToday = getRandomInt(CONFIG.minCommitsPerDay, CONFIG.maxCommitsPerDay);

    for (let i = 0; i < commitsCountForToday; i++) {
      // Random hours between 08:00 - 23:00, minutes (0-59), seconds (0-59)
      const commitDate = new Date(currentDate);
      commitDate.setHours(getRandomInt(8, 23), getRandomInt(0, 59), getRandomInt(0, 59));

      makeCommit(commitDate);
      totalCommitsMade++;
    }

    const dayFormatted = formatDateOnly(currentDate);
    console.log(`[OK] [${dayFormatted}] Completed ${commitsCountForToday} commits`);

    // Advance to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('--------------------------------------------------');
  console.log(`SUCCESS! Total ${totalCommitsMade} commits generated over ${totalDaysProcessed} days.`);
  console.log('--------------------------------------------------');
  console.log('NEXT STEPS:');
  console.log('1. Ensure you are logged into Git and remote repository is set.');
  console.log('2. Run push command:');
  console.log('   git push -u origin main');
  console.log('==================================================');
}

run();
