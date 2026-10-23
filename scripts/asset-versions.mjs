import {createHash} from 'node:crypto';

// Change each browser cache key when that file changes, including patches
// released without a new desktop version. Existing desktop paths still work.
export async function versionAssets(html, readAsset) {
  const pattern = /\b(src|href)="((?:\.\/)?[\w-][\w./-]*\.(?:js|css))(?:\?[^"#]*)?"/g;
  const files = [...new Set([...html.matchAll(pattern)].map(match => match[2]))];
  const versions = new Map(await Promise.all(files.map(async file => {
    if (file.split('/').includes('..')) throw new Error('Asset path leaves the site directory.');
    const bytes = await readAsset(file);
    return [file, createHash('sha256').update(bytes).digest('hex').slice(0, 16)];
  })));
  return html.replace(pattern, (_match, attribute, file) => `${attribute}="${file}?v=${versions.get(file)}"`);
}
