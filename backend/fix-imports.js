const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const apiDir = path.join(srcDir, 'api');

// Helper to get all files
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

const allApiFiles = getFiles(apiDir);

// Define where each file used to live
// They used to live in src/modules/<module>/<filename>
// New paths are src/api/<module>/<layer>/<filename>

const getOldLocation = (newPath) => {
  const rel = path.relative(srcDir, newPath); // api/auth/routes/auth.routes.js
  const parts = rel.split(path.sep); // ['api', 'auth', 'routes', 'auth.routes.js']
  if (parts[0] === 'api' && parts.length === 4) {
    const module = parts[1];
    let originalModuleDir = 'modules';
    if (module === 'user') originalModuleDir = 'modules/users';
    else originalModuleDir = `modules/${module}`;
    return path.join(srcDir, originalModuleDir, parts[3]);
  }
  return newPath;
};

// Also we need to map old absolute paths to new absolute paths
const oldToNew = new Map();
allApiFiles.forEach(newPath => {
  const oldLocation = getOldLocation(newPath);
  oldToNew.set(oldLocation.replace(/\\/g, '/'), newPath.replace(/\\/g, '/'));
});

// For each file, parse its imports and rewrite them
allApiFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const oldLocation = getOldLocation(filePath);
  
  // Replace import statements: import { x } from 'path';
  // Regex to match imports
  const importRegex = /(import\s+.*?\s+from\s+['"])(.*?)(['"])/g;
  
  content = content.replace(importRegex, (match, p1, p2, p3) => {
    // p2 is the import path
    if (p2.startsWith('.')) {
      // Resolve against old location
      const oldTargetAbs = path.resolve(path.dirname(oldLocation), p2);
      
      let newTargetAbs = oldTargetAbs;
      // If the target is one of the moved files, use its new location
      const oldTargetNorm = oldTargetAbs.replace(/\\/g, '/');
      if (oldToNew.has(oldTargetNorm)) {
        newTargetAbs = oldToNew.get(oldTargetNorm);
      } else {
        // If it wasn't moved (e.g. middleware, utils, db), it stays at oldTargetAbs
      }
      
      // Calculate new relative path
      let newRel = path.relative(path.dirname(filePath), newTargetAbs);
      newRel = newRel.replace(/\\/g, '/');
      if (!newRel.startsWith('.')) {
        newRel = './' + newRel;
      }
      
      return `${p1}${newRel}${p3}`;
    }
    return match;
  });

  fs.writeFileSync(filePath, content);
});

console.log('Imports fixed.');
