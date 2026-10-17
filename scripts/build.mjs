import {mkdir,copyFile,cp,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const file of ['src/app.js','src/model.js','src/store.js','sw.js'])execFileSync(process.execPath,['--check',file]);
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
for(const icon of manifest.icons)await readFile(icon.src);
await mkdir('dist',{recursive:true});
for(const file of ['index.html','styles.css','manifest.webmanifest','sw.js'])await copyFile(file,`dist/${file}`);
for(const dir of ['src','icons'])await cp(dir,`dist/${dir}`,{recursive:true});
console.log('Build passed: syntax checked, manifest icons verified, static app copied to dist/.');
