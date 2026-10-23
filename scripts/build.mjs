import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const {version}=JSON.parse(await readFile('package.json','utf8'));
const html=await readFile('dist/index.html','utf8');
if(!/^\d+\.\d+\.\d+$/.test(version)||!html.includes('<meta name="application-version"'))throw Error('Missing application version.');
await writeFile('dist/index.html',html.replace(/<meta name="application-version" content="[^"]*">/,`<meta name="application-version" content="${version}">`));
await build({entryPoints:['src/cloud-ui.js'],outfile:'dist/cloud.js',bundle:true,minify:true,format:'iife',target:['es2022'],legalComments:'eof'});
await writeFile('dist/.nojekyll','');
console.log('Built optional cloud saves. Guest mode remains independent.');

const catalogue=await readFile('dist/catalog.json','utf8');
require('../dist/catalog-update.js').validate(JSON.parse(catalogue));
await writeFile('dist/catalog.js','window.HIDEOUT_DATA = '+catalogue+';\n');
await writeFile('dist/catalog-manifest.json',JSON.stringify({schemaVersion:1,revision:createHash('sha256').update(catalogue).digest('hex'),publishedAt:new Date().toISOString()},null,2));
