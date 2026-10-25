import {readFile,access,appendFile} from 'node:fs/promises';
const root=JSON.parse(await readFile('package.json','utf8'));
const desktop=JSON.parse(await readFile('desktop/package.json','utf8'));
if(!/^\d+\.\d+\.\d+$/.test(root.version)||root.version!==desktop.version)throw Error('Use matching stable web and desktop versions.');
await access(`releases/v${root.version}.md`);
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='Nl256/gzw-hideout-tracker')throw Error('Unexpected release repository.');
const response=await fetch(`https://api.github.com/repos/${repo}/releases/tags/v${root.version}`,{headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
let publish;
if(response.status===404)publish=true;
else if(response.ok){const release=await response.json();if(release.draft)throw Error('A draft already exists for this version. Finish or remove it before retrying.');publish=false;}
else throw Error(`Cannot inspect release: HTTP ${response.status}`);
await appendFile(process.env.GITHUB_OUTPUT,`version=${root.version}\npublish=${publish}\n`);
console.log(publish?`Preparing Windows ${root.version}.`:`Windows ${root.version} is already published. A new app release requires a version increase; catalogue-only changes still update automatically.`);
