import fs from 'fs';
import path from 'path';

function addJsExtensionToImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const updatedContent = content.replace(/(import .* from ['"])(.*)(['"])/g, (match, start, modulePath, end) => {
    if (!modulePath.endsWith('.js') && /(\.)+\//g.test(modulePath)) {
      modulePath += '.js';
    }
    return `${start}${modulePath}${end}`;
  });
  fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

function processDistDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile() && filePath.endsWith('.js')) {
      addJsExtensionToImports(filePath);
    }
    if (stat.isDirectory()) {
      processDistDirectory(filePath);
    }
  });
}

processDistDirectory(path.join(process.cwd(), 'dist'));