const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../lecture-intelligence.js');
const core = global.window.eduLectureIntelligenceCore;

test('extractive lecture summary keeps page and slide source locations',()=>{
  const transcript='[SOURCE: CSC 201 slides.pdf]\n[PAGE 1]\nDatabase systems organise data so that users can retrieve and update information reliably. Normalisation reduces data duplication and prevents update anomalies in relational database tables.\n[SLIDE 4]\nA functional dependency describes how one attribute determines another attribute in a relational database.';
  const result=core.summarizeLecture(transcript,6);
  assert.ok(result.keyPoints.length>=2);
  assert.ok(result.keyPoints.some(point=>point.location.includes('Page 1')));
  assert.ok(result.keyPoints.some(point=>point.location.includes('Slide 4')));
  assert.ok(result.keyPoints.every(point=>transcript.includes(point.text)));
});

test('VTT cleanup removes cue numbers and time ranges but retains spoken words',()=>{
  const cleaned=core.cleanTranscript('WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nA database schema describes how stored information is organised.\n\n2\n00:00:04.000 --> 00:00:08.000\nNormalisation reduces duplication in relational database tables.');
  assert.doesNotMatch(cleaned,/WEBVTT|00:00:01|-->/);
  assert.match(cleaned,/database schema/);
  assert.match(cleaned,/Normalisation reduces duplication/);
});

test('OCR image bullet lines can become source-labelled lecture points',()=>{
  const text='[SOURCE: photographed-slide.png]\n• Arrays store values in an ordered sequence\n• Linked lists connect nodes through references';
  const result=core.summarizeLecture(text,6);
  assert.equal(result.keyPoints.length,2);
  assert.ok(result.keyPoints.every(point=>point.location.includes('photographed-slide.png')));
  assert.ok(result.keyPoints.some(point=>point.text.includes('Arrays store values')));
});

test('short or unreadable material does not produce invented points',()=>{
  const result=core.summarizeLecture('[SOURCE: poor-photo.png]\nunclear text 123');
  assert.deepEqual(result.keyPoints,[]);
});

test('only secure Google source links are accepted as references',()=>{
  assert.equal(core.validateGoogleSource('https://drive.google.com/file/d/abc/view'),'https://drive.google.com/file/d/abc/view');
  assert.equal(core.validateGoogleSource(''),'');
  assert.throws(()=>core.validateGoogleSource('http://drive.google.com/file/d/abc'));
  assert.throws(()=>core.validateGoogleSource('https://example.com/recording'));
});

test('restored lecture source links are revalidated before becoming clickable',()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync(require.resolve('../lecture-intelligence.js'),'utf8');
  const start=source.indexOf('function sourceLinkMarkup(value)');
  const end=source.indexOf('function renderCourseSection',start);
  const renderer=source.slice(start,end);
  assert.ok(renderer.includes('validateGoogleSource(value)'));
  assert.ok(renderer.includes('catch{return')}));
  assert.ok(renderer.includes('escapeHtml(validated)'));
  assert.ok(renderer.includes('rel="noopener noreferrer"'));
  assert.throws(()=>core.validateGoogleSource('javascript:alert(1)'));
  assert.throws(()=>core.validateGoogleSource('https://example.com/'));
});

test('major points are selected from exact source sentences rather than rewritten claims',()=>{
  const sentences=[
    'Relational database normalisation reduces repeated information across connected database tables.',
    'A primary key uniquely identifies each row in a relational database table.',
    'A foreign key links a row in one database table to a matching row in another table.'
  ];
  const result=core.summarizeLecture(sentences.join(' '),5);
  assert.ok(result.keyPoints.length>0);
  for(const point of result.keyPoints)assert.ok(sentences.some(sentence=>sentence.includes(point.text)||point.text.includes(sentence)));
});
