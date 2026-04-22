import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire('/tmp/sikelas-app/node_modules/jszip/package.json');
const JSZip = require('/tmp/sikelas-app/node_modules/jszip/lib/index.js');

const zip = new JSZip();

function addDir(dirPath, zipPath) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const full = path.join(dirPath, item);
    const zp = zipPath + '/' + item;
    if (fs.statSync(full).isDirectory()) {
      addDir(full, zp);
    } else {
      zip.file(zp, fs.readFileSync(full));
    }
  }
}

addDir('src/php-project/sikelas', 'sikelas');
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync('public/sikelas-php.zip', buf);
console.log('ZIP created:', buf.length, 'bytes');
