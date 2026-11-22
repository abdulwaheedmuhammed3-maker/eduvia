const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=name=>fs.readFileSync(name,'utf8');

test('profile onboarding has explicit dark surfaces, fields and day states',()=>{
  const css=read('entry-flow.css');
  assert.match(css,/html\\[data-theme="dark"\\] \\.entry-flow-card\\.entry-flow-profile-screen \\.entry-profile-section/);
  assert.match(css,/html\\[data-theme="dark"\\] \\.entry-flow-card\\.entry-flow-profile-screen \\.entry-profile-field>input/);
  assert.match(css,/html\\[data-theme="dark"\\] \\.entry-flow-card\\.entry-flow-profile-screen \\.entry-profile-day-list input:checked\\+span/);
});

test('next-lecture empty icon has a specificity-matched dark override',()=>{
  const css=read('experience.css');
  assert.match(css,/html\\[data-theme="dark"\\] \\.exp-next-lecture-empty \\.exp-next-lecture-icon/);
});

test('semantic feature icons have dark variants without changing footer icons',()=>{
  const css=read('icon-system.css');
  for(const tone of ['pink','blue','lime','orange','purple']){
    assert.match(css,new RegExp('html\\\\\\[data-theme="dark"\\\\\\] \\\\.exp-icon-'+tone));
  }
  assert.doesNotMatch(css,/html\\[data-theme="dark"\\] \\.mobile-nav-item/);
});

test('dark utility elements use the current purple theme tokens',()=>{
  const css=read('visual-refresh.css');
  assert.match(css,/html\\[data-theme="dark"\\] \\.toast/);
  assert.match(css,/html\\[data-theme="dark"\\] \\.avatar/);
});
