const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('postponed classes are recorded without being counted as attended', () => {
  const app = read('app.js');
  const studio = read('study-studio.js');

  assert.ok(studio.includes('<option value="postponed">Class postponed</option>'));
  assert.ok(studio.includes("postponed:'Class postponed'"));
  assert.ok(studio.includes("record.type!=='class'||(record.reflection?.attendance||'attended')==='attended'"));
  assert.ok(studio.includes("attendance==='postponed'?'Class marked as postponed."));
  assert.ok(app.includes("postponed:'Postponed'"));
  assert.ok(app.includes("postponed:'Class postponed'"));
});

test('extra classes are saved as date-specific events without changing weekly classes', () => {
  const app = read('app.js');

  assert.ok(app.includes('data-action="add-extra-class"'));
  assert.ok(app.includes("case'add-extra-class':addEvent(null,'class','',{oneTime:true});break;"));
  assert.ok(app.includes('const extraClass=Boolean(options.oneTime)&&!event;'));
  assert.ok(app.includes("type==='class'&&!options.oneTime"));
  assert.ok(app.includes("extraClass:options.oneTime?true:!!event?.extraClass"));
  assert.ok(app.includes("date=repeat==='weekly'?'':fd.get('date')"));
  assert.ok(app.includes("This class will appear only on the selected date."));
});
