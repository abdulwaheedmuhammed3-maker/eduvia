const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=name=>fs.readFileSync(name,'utf8');

test('profile onboarding has explicit dark surfaces, fields and day states',()=>{
  const css=read('entry-flow.css');
  assert.ok(css.includes('html[data-theme="dark"] .entry-flow-card.entry-flow-profile-screen .entry-profile-section'));
  assert.ok(css.includes('html[data-theme="dark"] .entry-flow-card.entry-flow-profile-screen .entry-profile-field>input'));
  assert.ok(css.includes('html[data-theme="dark"] .entry-flow-card.entry-flow-profile-screen .entry-profile-day-list input:checked+span'));
});

test('next-lecture empty icon has a specificity-matched dark override',()=>{
  const css=read('experience.css');
  assert.ok(css.includes('html[data-theme="dark"] .exp-next-lecture-empty .exp-next-lecture-icon'));
});

test('semantic feature icons have dark variants without changing footer icon selectors',()=>{
  const css=read('icon-system.css');
  for(const tone of ['pink','blue','lime','orange','purple']){
    assert.ok(css.includes('html[data-theme="dark"] .exp-icon-'+tone));
  }
  assert.ok(!css.includes('html[data-theme="dark"] .mobile-nav-item'));
});

test('dark utility elements use the current purple theme tokens',()=>{
  const css=read('visual-refresh.css');
  assert.ok(css.includes('html[data-theme="dark"] .toast'));
  assert.ok(css.includes('html[data-theme="dark"] .avatar'));
  assert.ok(css.includes('html[data-theme="dark"] .progress-track'));
});

test('theme asset URLs and service-worker cache are versioned together',()=>{
  const html=read('index.html');
  const worker=read('service-worker.js');
  assert.ok(html.includes('rev=theme-audit-1'));
  assert.ok(worker.includes('eduvia-v79-theme-audit'));
  for(const asset of ['entry-flow.css','visual-refresh.css','experience.css','icon-system.css']){
    const htmlAsset=html.match(new RegExp(asset+'[^"]*'))?.[0];
    const workerAsset=worker.match(new RegExp('./'+asset+'[^\\\\']*'))?.[0];
    assert.ok(htmlAsset,asset+' is linked in index.html');
    assert.ok(workerAsset,asset+' is cached by the service worker');
    assert.ok(htmlAsset.slice(asset.length)===workerAsset.slice(2+asset.length),asset+' URL version matches between HTML and service worker');
  }
});
