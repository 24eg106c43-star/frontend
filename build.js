const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.cpSync(srcDir, distDir, { recursive: true });

// Inject BACKEND_URL from environment variable if present during Render build
const backendUrl = (process.env.BACKEND_URL || process.env.API_URL || process.env.RENDER_BACKEND_URL || '').trim().replace(/\/+$/, '');
const configContent = `// Auto-generated runtime config
window.API_BASE_URL = "${backendUrl}";
`;
fs.writeFileSync(path.join(distDir, 'config.js'), configContent, 'utf8');

console.log('Build successful! Copied public/ to dist/ with API_BASE_URL: ' + (backendUrl || '(not set at build time)'));
