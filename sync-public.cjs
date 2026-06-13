const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const SRC = __dirname;
const DST = path.join(os.tmpdir(), 'choser-sync');

console.log('=== Sync Choser to public repo ===');
console.log(new Date().toString());

if (!fs.existsSync(DST)) {
  execSync(`git clone https://github.com/protnew/choser.git "${DST}"`, { stdio: 'inherit' });
}
execSync('git pull origin main', { cwd: DST, stdio: 'ignore' });

const excludes = [
  '.git', 'node_modules', 'dist', '.env', 'hermes-dot-env', 'hermes-config.yaml',
  'backup', 'backups', 'choser-export', '.wrangler', 'analysis', 'tmp'
];
const excludeDirs = ['edp/data', 'edp/backup', 'scripts/archive'];

const excludeExtensions = ['.db', '.db-wal', '.db-shm', '.sql', '.sqlite', '.xlsx', '.xls'];
const excludeFiles = ['batch3_results.json', 'sync-public.sh', 'backup-cron.sh', 'start-local.bat', 'deploy-hot.sh', 'sync-public.cjs'];
const excludePrefixes = ['seed_', 'matrix-data'];

function shouldExclude(fileOrDir, isDir, relPath) {
  if (excludes.includes(fileOrDir)) return true;
  if (excludeDirs.includes(relPath.replace(/\\/g, '/'))) return true;
  if (!isDir) {
    if (excludeExtensions.some(ext => fileOrDir.endsWith(ext))) return true;
    if (excludeFiles.includes(fileOrDir)) return true;
    if (excludePrefixes.some(pre => fileOrDir.startsWith(pre))) return true;
    if (fileOrDir.endsWith('.env') && fileOrDir !== '.env.example') return true;
  }
  return false;
}

function copyRecursiveSync(src, dest, relPath = '') {
  if (!fs.existsSync(src)) return;
  const name = path.basename(src);
  const currentRelPath = relPath ? path.join(relPath, name) : name;
  const stats = fs.statSync(src);
  const isDir = stats.isDirectory();
  
  if (shouldExclude(name, isDir, currentRelPath)) return;

  if (isDir) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child), currentRelPath);
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Clean DST (except .git)
fs.readdirSync(DST).forEach(file => {
  if (file === '.git') return;
  fs.rmSync(path.join(DST, file), { recursive: true, force: true });
});

// Copy files
console.log('Copying files...');
fs.readdirSync(SRC).forEach(child => {
  copyRecursiveSync(path.join(SRC, child), path.join(DST, child));
});

// Layer 2: Scanner
console.log('Scanning for secrets...');
let leaks = [];
function scan(dir) {
  fs.readdirSync(dir).forEach(file => {
    if (file === '.git' || file === 'node_modules') return;
    const fp = path.join(dir, file);
    if (fs.statSync(fp).isDirectory()) {
      scan(fp);
    } else {
      if (/\.(js|jsx|yml|yaml|json|sh|cjs|mjs)$/.test(file)) {
        let content = fs.readFileSync(fp, 'utf8');
        let modified = false;
        
        if (!file.includes('package-lock.json')) {
            if (/sk-[a-zA-Z0-9]{20,}/.test(content)) leaks.push(`API_KEY ${fp}`);
            if (/AIza[a-zA-Z0-9]{20,}/.test(content)) leaks.push(`Google ${fp}`);
            if (/ghp_[a-zA-Z0-9]{20,}/.test(content) && !content.includes('sync-public')) leaks.push(`GitHub ${fp}`);
        }
        
        if (file === 'docker-compose.yml' || file === 'docker-compose.yaml') {
          content = content.replace(/(ZAI_API_KEY)=.*/g, '$1=\\${ZAI_API_KEY}');
          content = content.replace(/(GROQ_API_KEY)=.*/g, '$1=\\${GROQ_API_KEY}');
          modified = true;
        }
        if (file.includes('auth') && file.endsWith('.js')) {
          content = content.replace(/dev-secret-change-in-prod/g, 'process.env.JWT_SECRET');
          modified = true;
        }
        if (modified) fs.writeFileSync(fp, content);
      }
    }
  });
}
scan(DST);

if (leaks.length > 0) {
  console.error('BLOCKED SECRETS FOUND:');
  leaks.forEach(l => console.error(l));
  process.exit(1);
}

// Layer 3: Push
console.log('Committing and pushing...');
try {
  execSync('git config user.email "alex@choser.ai"', { cwd: DST });
  execSync('git config user.name "Alex Shekhovtsov"', { cwd: DST });
  execSync('git add -A', { cwd: DST });
  
  const changes = execSync('git diff --cached --stat', { cwd: DST }).toString().trim();
  if (!changes) {
    console.log('No changes');
    process.exit(0);
  }
  
  const dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '');
  execSync(`git commit -m "sync: ${dateStr}"`, { cwd: DST, stdio: 'inherit' });
  
  const remoteUrl = execSync('git remote get-url origin', { cwd: SRC }).toString().trim();
  const tokenMatch = remoteUrl.match(/https:\/\/(.*?)@github/);
  if (tokenMatch) {
    const token = tokenMatch[1].split(':')[1] || tokenMatch[1];
    execSync(`git remote set-url origin "https://protnew:${token}@github.com/protnew/choser.git"`, { cwd: DST });
  }
  execSync('git push origin main', { cwd: DST, stdio: 'inherit' });
  console.log('Synced OK');
} catch (e) {
  console.error('Push failed:', e.message);
  process.exit(1);
}
