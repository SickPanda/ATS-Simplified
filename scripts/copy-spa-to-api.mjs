import { cpSync, mkdirSync, existsSync, rmSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const wwwroot = join(root, 'AtsApi', 'wwwroot');

if (!existsSync(dist)) {
  console.error('dist/ not found. Run vite build first.');
  process.exit(1);
}

// Preserve uploaded resumes under wwwroot/resumes
const resumesSrc = join(wwwroot, 'resumes');
const resumesBackup = join(root, '.resumes-backup-tmp');
if (existsSync(resumesSrc)) {
  mkdirSync(resumesBackup, { recursive: true });
  cpSync(resumesSrc, resumesBackup, { recursive: true });
}

// Clear SPA assets but keep structure
for (const name of readdirSync(wwwroot)) {
  if (name === 'resumes') continue;
  const p = join(wwwroot, name);
  rmSync(p, { recursive: true, force: true });
}

cpSync(dist, wwwroot, { recursive: true });

if (existsSync(resumesBackup)) {
  mkdirSync(join(wwwroot, 'resumes'), { recursive: true });
  cpSync(resumesBackup, join(wwwroot, 'resumes'), { recursive: true });
  rmSync(resumesBackup, { recursive: true, force: true });
}

console.log('✓ SPA copied to AtsApi/wwwroot (resumes preserved)');
console.log('  Deploy: publish AtsApi and host on Azure App Service Free (F1) or container.');
