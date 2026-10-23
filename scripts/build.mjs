import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/cloud-ui.js'],outfile:'dist/cloud.js',bundle:true,minify:true,format:'iife',target:['es2022'],legalComments:'eof'});
await writeFile('dist/.nojekyll','');
console.log('Built optional cloud saves. Guest mode remains independent.');

const catalogue=await readFile('dist/catalog.json','utf8');
require('../dist/catalog-update.js').validate(JSON.parse(catalogue));
await writeFile('dist/catalog.js','window.HIDEOUT_DATA = '+catalogue+';\n');
await writeFile('dist/catalog-manifest.json',JSON.stringify({schemaVersion:1,revision:createHash('sha256').update(catalogue).digest('hex'),publishedAt:new Date().toISOString()},null,2));
