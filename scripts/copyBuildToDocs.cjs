const fs = require('fs');
const path = require('path');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

const distPath = path.resolve(__dirname, '../dist');
const docsPath = path.resolve(__dirname, '../docs');

if (fs.existsSync(distPath)) {
  copyFolderRecursiveSync(distPath, docsPath);
  console.log('Successfully synced dist/ to docs/ for GitHub Pages deployment!');
} else {
  console.error('dist/ does not exist. Run vite build first.');
}
