import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const RELEASE_TYPES = ['major', 'minor', 'patch'];
const type = process.argv[2];

if (!RELEASE_TYPES.includes(type)) {
    console.error(`Usage: node scripts/release.js <${RELEASE_TYPES.join('|')}>`);
    process.exit(1);
}

// 1. Read package.json
const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;
const [major, minor, patch_v] = currentVersion.split('.').map(Number);

let newVersion;
if (type === 'major') newVersion = `${major + 1}.0.0`;
if (type === 'minor') newVersion = `${major}.${minor + 1}.0`;
if (type === 'patch') newVersion = `${major}.${minor}.${patch_v + 1}`;

console.log(`\n🚀 Release ${type}: ${currentVersion} → ${newVersion}\n`);

try {
    // 2. Update package.json
    pkg.version = newVersion;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
    console.log('✅ package.json обновлён');

    // 3. Git: commit + tag
    console.log('📦 Коммит и тег...');
    execSync('git add -A', { stdio: 'inherit' });
    execSync(`git commit -m "release: v${newVersion}"`, { stdio: 'inherit' });
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
    console.log(`✅ Тег v${newVersion} создан`);

    // 4. Push (деплой через GitHub → Cloudflare)
    console.log('⬆️ Push в origin main...');
    execSync('git push origin main --tags', { stdio: 'inherit' });

    console.log(`\n🎉 Готово! v${newVersion} отправлена.`);
    console.log('   Cloudflare задеплоит автоматически через GitHub интеграцию.');

} catch (e) {
    console.error('\n❌ Ошибка релиза:', e.message);
    process.exit(1);
}
