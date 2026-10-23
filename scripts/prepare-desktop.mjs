import {cp,mkdir} from 'node:fs/promises';
await mkdir('desktop/app/ui',{recursive:true});
await cp('dist','desktop/app/ui',{recursive:true});
console.log('Copied the web tracker and offline assets into the desktop app.');
