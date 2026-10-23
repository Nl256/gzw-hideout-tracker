import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/cloud-ui.js'],outfile:'dist/cloud.js',bundle:true,minify:true,format:'iife',target:['es2022'],legalComments:'eof'});
await writeFile('dist/.nojekyll','');
console.log('Built optional cloud saves. Guest mode remains independent.');
