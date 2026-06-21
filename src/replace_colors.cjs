const fs = require('fs');
const path = require('path');

const dir = 'C:/Obsidian/New/Projects/Чейчер/src/openclaw/src/components';

function replaceInDir(directory) {
    const files = fs.readdirSync(directory);
    for (const f of files) {
        const fullPath = path.join(directory, f);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            const before = content;
            
            // Text colors -> muted
            content = content.replace(/color:\s*['"]#(94a3b8|64748b|888)['"]/g, "color: 'var(--text-muted)'");
            content = content.replace(/color:\s*tS/g, "color: 'var(--text-muted)'");
            
            // Text colors -> neutral
            content = content.replace(/color:\s*['"]#(3b82f6|ef4444|22c55e|10b981|f59e0b)['"]/g, "color: 'var(--text-color)'");
            
            // Complex ternaries
            content = content.replace(/color:\s*(?:theme\s*===\s*['"]dark['"]\s*\?\s*['"]#94a3b8['"]\s*:\s*['"]#64748b['"])/g, "color: 'var(--text-muted)'");
            content = content.replace(/color:\s*(?:isDark\s*\?\s*['"]#94a3b8['"]\s*:\s*['"]#64748b['"])/g, "color: 'var(--text-muted)'");

            if (content !== before) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceInDir(dir);
console.log("Done");
