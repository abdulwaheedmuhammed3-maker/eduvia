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
  const app=read('app.js');
  assert.ok(css.includes('.habit-reminder-copy{font-size:10px;color:var(--muted)'));
  assert.ok(css.includes('.resource-note-copy{font-size:10px;line-height:1.55;color:var(--muted)'));
  assert.ok(app.includes('class="habit-reminder-copy"'));
  assert.ok(app.includes('class="resource-note-copy"'));
  assert.ok(!app.includes('color:#7e887f'));
  assert.ok(!app.includes('color:#626d63'));
  assert.ok(css.includes('html[data-theme="dark"] .toast'));
  assert.ok(css.includes('html[data-theme="dark"] .avatar'));
  assert.ok(css.includes('html[data-theme="dark"] .progress-track'));
});

test('theme asset URLs and service-worker cache are versioned together',()=>{
  const html=read('index.html');
  const worker=read('service-worker.js');
  assert.ok(html.includes('rev=theme-audit-2'));
  assert.ok(worker.includes('eduvia-v97-full-application-audit'));
  for(const asset of ['entry-flow.css','visual-refresh.css','experience.css','icon-system.css']){
    const htmlVersion=html.split('href="'+asset)[1]?.split('"')[0];
    const workerVersion=worker.split("'./"+asset)[1]?.split("'")[0];
    assert.ok(htmlVersion,asset+' is linked in index.html');
    assert.ok(workerVersion,asset+' is cached by the service worker');
    assert.equal(htmlVersion,workerVersion,asset+' URL version matches between HTML and service worker');
  }
  const htmlApp=html.split('src="app.js')[1]?.split('"')[0];
  const workerApp=worker.split("'./app.js")[1]?.split("'")[0];
  assert.equal(htmlApp,workerApp,'app.js URL version matches between HTML and service worker');
  const htmlFeatureHub=html.split('src="feature-hub.js')[1]?.split('"')[0];
  const workerFeatureHub=worker.split("'./feature-hub.js")[1]?.split("'")[0];
  assert.equal(htmlFeatureHub,workerFeatureHub,'feature-hub.js URL version matches between HTML and service worker');
});
