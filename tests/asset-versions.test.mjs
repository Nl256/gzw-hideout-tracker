import test from 'node:test';
import assert from 'node:assert/strict';
import {versionAssets} from '../scripts/asset-versions.mjs';

test('new Feedback code cannot reuse the previous navigation cache entry', async () => {
  const html='<script src="app.js" defer></script><script src="core.js" defer></script><link rel="stylesheet" href="styles.css">';
  const before={'app.js':'const views=["desk","sources"];','core.js':'unchanged core','styles.css':'.view{display:block}'};
  const after={...before,'app.js':'const views=["desk","sources","feedback"];','styles.css':'.feedback-grid{display:grid}'};
  const oldHtml=await versionAssets(html,file=>before[file]);
  const nextHtml=await versionAssets(oldHtml,file=>after[file]);
  const urls=text=>[...text.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
  const [oldApp,oldCore,oldCss]=urls(oldHtml),[newApp,newCore,newCss]=urls(nextHtml);
  assert.notEqual(newApp,oldApp);
  assert.notEqual(newCss,oldCss);
  assert.equal(newCore,oldCore);
  assert.equal(await versionAssets(nextHtml,file=>after[file]),nextHtml);
  assert.ok(urls(nextHtml).every(url=>/\?v=[a-f0-9]{16}$/.test(url)));
});

test('versioning preserves script order, relative paths, and non-code links', async () => {
  const html='<script src="./first.js?v=old" defer></script><script src="second.js" defer></script><a href="https://example.com/help.js">Help</a><img src="icon.svg"><a href="catalog.json">Data</a>';
  const result=await versionAssets(html,file=>Buffer.from(file));
  assert.ok(result.indexOf('./first.js?v=')<result.indexOf('second.js?v='));
  assert.match(result,/<script src="\.\/first\.js\?v=[a-f0-9]{16}" defer><\/script>/);
  assert.ok(result.includes('<a href="https://example.com/help.js">Help</a><img src="icon.svg"><a href="catalog.json">Data</a>'));
});

test('a missing required script stops deployment instead of publishing a broken page', async () => {
  await assert.rejects(versionAssets('<script src="missing.js"></script>',async()=>{throw new Error('Missing asset');}),/Missing asset/);
});
