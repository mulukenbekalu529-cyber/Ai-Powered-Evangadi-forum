const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'api');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = getFiles(apiDir);

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix generic paths
  content = content.replace(/\.\.\/\.\.\/middleware/g, '../../../middleware');
  content = content.replace(/\.\.\/\.\.\/utils/g, '../../../utils');
  content = content.replace(/\.\.\/\.\.\/\.\.\/db/g, '../../../../db');
  
  const inRoutes = file.includes('\\routes\\') || file.includes('/routes/');
  const inController = file.includes('\\controller\\') || file.includes('/controller/');
  
  if (inRoutes) {
    content = content.replace(/(from\s+['"])\.\/([^'"/]+\.controller\.js['"])/g, '$1../controller/$2');
    content = content.replace(/(from\s+['"])\.\/([^'"/]+\.validation\.js['"])/g, '$1../validation/$2');
    // For questions, they might import from other routes or services if not careful, but usually they don't.
  }
  
  if (inController) {
    content = content.replace(/(from\s+['"])\.\/([^'"/]+\.service\.js['"])/g, '$1../service/$2');
    content = content.replace(/(from\s+['"])\.\/([^'"/]+\.validation\.js['"])/g, '$1../validation/$2');
  }

  // Also fix questions service using another service:
  // src/api/questions/service/question.service.js importing './embedding.service.js' is still valid since they are in same folder.

  fs.writeFileSync(file, content);
});

console.log('Fixed imports in api folder.');
