const fs = require('fs');
const path = require('path');

function checkRequire(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkRequire(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const requires = content.match(/require\(['"`].*?['"`]\)/g);
      if (requires) {
        requires.forEach(req => {
          const match = req.match(/require\(['"`](.*?)['"`]\)/);
          if (match && match[1].startsWith('.')) {
            const reqPath = path.resolve(dir, match[1]);
            // check case sensitive
            const dirName = path.dirname(reqPath);
            const baseName = path.basename(reqPath);
            if (fs.existsSync(dirName)) {
               const actualFiles = fs.readdirSync(dirName);
               const foundExact = actualFiles.some(f => f === baseName || f === baseName + '.js' || (f === baseName && fs.statSync(path.join(dirName, f)).isDirectory()));
               if (!foundExact) {
                   console.log('BROKEN CASE SENSITIVE IMPORT IN:', fullPath, '=>', match[1]);
               }
            } else {
               console.log('BROKEN IMPORT IN:', fullPath, '=>', match[1], '(directory missing)');
            }
          }
        });
      }
    }
  }
}

checkRequire('./src');
console.log('DONE');
