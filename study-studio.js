/* Eduvia course imports, learning planning, and learning studio. */
const STUDIO_DB = 'daymark-materials-v1';
const STUDIO_STORE = 'materials';
const STUDIO_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const STUDIO_COUNTRIES = ["Afghanistan","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antarctica","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bonaire, Sint Eustatius and Saba","Bosnia and Herzegovina","Botswana","Bouvet Island","Brazil","British Indian Ocean Territory","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Cayman Islands","Central African Republic","Chad","Chile","China","Christmas Island","Cocos Islands","Colombia","Comoros","Congo","Cook Islands","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Curaçao","Cyprus","Czechia","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Guiana","French Polynesia","French Southern Territories","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guadeloupe","Guam","Guatemala","Guernsey","Guinea","Guinea-Bissau","Guyana","Haiti","Heard Island and McDonald Islands","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kiribati","North Korea","South Korea","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macao","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Martinique","Mauritania","Mauritius","Mayotte","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Niue","Norfolk Island","North Macedonia","Northern Mariana Islands","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Pitcairn Islands","Poland","Portugal","Puerto Rico","Qatar","Réunion","Romania","Russia","Rwanda","Saint Barthélemy","Saint Helena","Saint Kitts and Nevis","Saint Lucia","Saint Martin","Saint Pierre and Miquelon","Saint Vincent and the Grenadines","Samoa","San Marino","São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Sint Maarten","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Georgia and the South Sandwich Islands","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Svalbard and Jan Mayen","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tokelau","Tonga","Trinidad and Tobago","Tunisia","Türkiye","Turkmenistan","Turks and Caicos Islands","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","United States Minor Outlying Islands","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","British Virgin Islands","U.S. Virgin Islands","Wallis and Futuna","Western Sahara","Yemen","Zambia","Zimbabwe","Åland Islands"];
function studioCountrySelect(selected=''){
  const options=STUDIO_COUNTRIES.slice().sort((a,b)=>a.localeCompare(b)).map(country=>'<option value="'+safe(country)+'" '+(String(selected||'')===country?'selected':'')+'>'+safe(country)+'</option>').join('');
  return '<select id="f-country" name="country" required><option value="">Select your country</option>'+options+'</select>';
}
let studioLesson = null;
let studioPractice = [];
let studioNotice = '';
let pendingStudioImport = null;

// The planner is school- and subject-neutral; learners enter their own details.
const needsGreetingTrackingMigration=!!data.profile.setupComplete&&(!data.profile.setupAt||(data.events||[]).some(event=>!event.createdAt)||(data.completed||[]).some(item=>!item.type));
Object.assign(data.profile, {
  institution: data.profile.institution || '',
  email: data.profile.email || '',
  department: data.profile.department || data.profile.programme || '',
  degreeProgramme: data.profile.degreeProgramme || data.profile.programme || '',
  matricNumber: data.profile.matricNumber || '',
  faculty: data.profile.faculty || '',
  specialization: data.profile.specialization || '',
  studyMode: data.profile.studyMode || '',
  studentStatus: data.profile.studentStatus || 'Active',
  academicSession: data.profile.academicSession || data.profile.term || '',
  semester: data.profile.semester || '',
  centre: data.profile.centre || '',
  programme: data.profile.programme || '',
  level: data.profile.level || '',
  country: data.profile.country || '',
  stage: data.profile.stage || '',
  term: data.profile.term || '',
  setupAt: data.profile.setupAt || (data.profile.setupComplete ? todayISO() : ''),
  studyDays: data.profile.studyDays || [1,2,3,4,5,6],
  studyStart: data.profile.studyStart || '17:00',
  studyEnd: data.profile.studyEnd || '21:00',
  planSessionMinutes: data.profile.planSessionMinutes || 45
});
for(const event of data.events||[])event.createdAt=event.createdAt||todayISO();
for(const item of data.completed||[])if(!item.type){const event=(data.events||[]).find(x=>x.id===item.eventId);item.type=event?.type||(String(item.eventId||'').startsWith('focus-')?'study':'');}
if(needsGreetingTrackingMigration){try{localStorage.setItem(STORE_KEY,JSON.stringify(data))}catch{}}
data.imports = data.imports || {courses:[], timetable:[]};
data.materials = data.materials || [];
if(!data.profile.phoneAlertsMigrationV1){for(const event of data.events||[])if((event.importedTimetable||event.generated)&&event.remind===false)event.remind=true;data.profile.phoneAlertsMigrationV1=true;try{localStorage.setItem(STORE_KEY,JSON.stringify(data))}catch{}}
data.academicHistory = data.academicHistory || [];
data.pendingCarryovers = Array.isArray(data.pendingCarryovers) ? data.pendingCarryovers : [];
data.personalDocuments = data.personalDocuments || [];

function syncNav(){
 const groups={
  home:['today'],
  discover:['discover','tutorials'],
  play:['play','practice','flashcards','mastery','planner','mock-exam','mock-results'],
  ask:['ask'],
  'my-study':['my-study','courses','course-detail','timetable','habit','study','progress','records','education','vault','profile']
 };
 document.querySelectorAll('[data-nav-key]').forEach(el=>{
  const key=el.dataset.navKey;
  el.classList.toggle('active',(groups[key]||[]).includes(currentPage));
 });
 document.querySelectorAll('[data-utility-nav]').forEach(el=>{
  const key=el.dataset.utilityNav;
  el.classList.toggle('active',key===currentPage||(key==='more'&&currentPage==='more'));
 });
 const labels={today:'Home',discover:'Discover',play:'Play & learn',ask:'Ask Eduvia','my-study':'My Learning',courses:'Learning areas','course-detail':'Learning area',timetable:'My schedule',habit:'Learning habit',tutorials:'Learning resources',study:'Learning studio',practice:'Practice & tests',setup:'Set up your learning',progress:'Learning progress',records:'Learning records',education:'Academic history',exams:'Examination centre',vault:'Personal library',settings:'Settings',profile:'Learning profile',more:'More tools',planner:'Planner',flashcards:'Flashcards',mastery:'Learning mastery'};
 document.getElementById('crumbCurrent').textContent=labels[currentPage]||'Home';
}
function render(){
  if(!data.profile.setupComplete&&currentPage!=='setup')currentPage='setup';
  syncNav();updateSidebarGoal();updateProfileAvatar();
  const pages={today:renderToday,courses:renderCourses,'course-detail':renderCourseDetail,timetable:renderTimetable,habit:renderHabit,tutorials:renderTutorials,study:renderStudyStudio,practice:renderPractice,setup:renderSetup,progress:renderProgress,records:renderStudyRecords,education:renderEducation,vault:renderVault,settings:renderSettings,profile:renderProfile,more:renderMore};
  Object.assign(pages,window.eduPageRenderers||{});
  document.getElementById('pageContent').innerHTML=(pages[currentPage]||renderToday)();scheduleTodayRefresh();
  for(const event of data.events||[])event.createdAt=event.createdAt||todayISO();
  if(currentPage==='today'){
    const greeting=document.querySelector('.page-heading h1');
    if(greeting)greeting.textContent=daymarkGreetingTitle();
  }
}

function renderStudyStudio(){
  const imports=data.imports||{courses:[],timetable:[]};
  const formal=learnerTypeOf(data.profile)==='formal';
  const learningProfileTitle=formal?(data.profile.institution||data.profile.learningFocus||'Formal education learner'):(data.profile.learningFocus||learnerTypeLabel(learnerTypeOf(data.profile)));
  const learningProfileDetails=formal?[data.profile.programme,data.profile.level?data.profile.level+' level':'',data.profile.term].filter(Boolean).join(' · '):[learnerTypeLabel(learnerTypeOf(data.profile)),data.profile.studyMode].filter(Boolean).join(' · ');
  const coursesCsv='<button class="secondary-btn" data-action="download-course-template">↓ Learning areas template</button>';
  const timetableCsv='<button class="secondary-btn" data-action="download-timetable-template">↓ Timetable template</button>';
  return `${pageHead('YOUR LEARNING WORKSPACE','Learning studio','Organise the skills, subjects and topics you are learning, add your schedule and materials, then build a learning plan around your available time.','<button class="primary-btn" data-action="generate-plan"><span class="btn-icon">✧</span>Generate my learning plan</button>')}
  <section class="study-profile-banner"><div class="profile-crest">L</div><div class="profile-banner-copy"><div class="card-kicker">YOUR LEARNING PROFILE</div><strong>${safe(learningProfileTitle)}</strong><span>${safe(learningProfileDetails||'Your learning goals and routine')}</span></div><button class="text-btn" data-action="edit-study-profile">Edit profile</button></section>
  ${studioNotice?`<div class="note-callout">${safe(studioNotice)}</div>`:''}
  <div class="studio-grid"><section class="panel upload-panel"><div class="upload-icon">▦</div><div class="panel-head"><div><h3>1. Add your learning areas</h3><p>Names, identifiers and topics help organise your learning plan.</p></div><span class="upload-count">${data.courses.length} saved</span></div><label class="upload-drop"><input id="courseImportFile" type="file" accept=".csv,.tsv,.xls,.xlsx,.json,.txt,.md,.pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp,image/*"><span class="upload-symbol">↑</span><strong>Choose your learning-area list</strong><span>Images, PDFs, Word, PowerPoint, Excel, CSV, JSON, or text · up to 40 MB</span></label><div class="upload-tools"><button class="secondary-btn native-only" data-action="capture-course-photo">Take a photo</button>${coursesCsv}<button class="panel-link" data-page="courses">Add learning areas by hand →</button></div>${imports.courses?.length?`<div class="import-history">Last updated: ${safe(imports.courses[imports.courses.length-1].name)} · ${imports.courses[imports.courses.length-1].count} learning areas</div>`:''}</section>
  <section class="panel upload-panel"><div class="upload-icon purple">▤</div><div class="panel-head"><div><h3>2. Import your schedule</h3><p>Fixed commitments stay in place; personal learning sessions fit around them.</p></div><span class="upload-count">${data.events.filter(e=>e.type==='class').length} classes</span></div><label class="upload-drop"><input id="timetableImportFile" type="file" accept=".csv,.tsv,.xls,.xlsx,.json,.txt,.md,.pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp,image/*"><span class="upload-symbol">↑</span><strong>Choose your schedule</strong><span>Images, PDFs, Word, PowerPoint, Excel, CSV, JSON, or text · up to 40 MB</span></label><div class="upload-tools"><button class="secondary-btn native-only" data-action="capture-timetable-photo">Take a photo</button>${timetableCsv}<button class="panel-link" data-page="timetable">Review timetable →</button></div>${imports.timetable?.length?`<div class="import-history">Last updated: ${safe(imports.timetable[imports.timetable.length-1].name)} · ${imports.timetable[imports.timetable.length-1].count} class blocks</div>`:''}</section></div>
  <section class="panel availability-panel"><div class="panel-head"><div><h3>3. Choose when you can learn</h3><p>The generator works around your existing commitments and spreads learning across your available days.</p></div><span class="habit-badge">◷</span></div><form id="availabilityForm"><div class="availability-days">${STUDIO_DAYS.map((day,i)=>`<label class="day-check"><input type="checkbox" name="studyDay" value="${i}" ${(data.profile.studyDays||[]).includes(i)?'checked':''}><span>${day.slice(0,3)}</span></label>`).join('')}</div><div class="availability-times"><label>Study window starts<input type="time" name="studyStart" value="${safe(data.profile.studyStart)}"></label><span>to</span><label>Study window ends<input type="time" name="studyEnd" value="${safe(data.profile.studyEnd)}"></label><label>Study session length<select name="planSessionMinutes">${[25,30,45,60,75,90].map(n=>`<option value="${n}" ${Number(data.profile.planSessionMinutes)===n?'selected':''}>${n} minutes</option>`).join('')}</select></label></div><div class="availability-footer"><span>Weekly target: <b>${data.profile.weeklyGoal} sessions</b> · you can change this in Settings.</span><button type="submit" class="secondary-btn">Save study times</button></div></form></section>
  <section class="panel material-panel"><div class="panel-head"><div><h3>4. Add textbooks, slides, notes, or past papers</h3><p>Eduvia extracts and indexes text on this device. The same course index powers Ask, tutorials, practice and flashcards.</p></div><span class="upload-count">${data.materials.length} file${data.materials.length===1?'':'s'}</span></div><div class="material-upload-row"><label class="upload-drop compact"><input id="materialImportFile" type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,image/*"><span class="upload-symbol">↑</span><strong>Upload learning material</strong><span>PDF, Word, slides, or text</span></label><button class="secondary-btn native-only" data-action="capture-material-photo">Take a photo</button><div class="material-privacy"><b>Private by default</b><span>Files are read and indexed in this browser. Extracted text and passage references stay on this device; Ask, Study, Play and flashcards reuse the same index. Scanned PDFs may need OCR or a text copy.</span></div></div>${data.materials.length?`<div class="material-list">${data.materials.map(m=>`<div class="material-row"><span class="resource-icon">${m.ext==='pdf'?'PDF':m.ext==='pptx'?'PPT':m.ext==='docx'?'DOC':'TXT'}</span><div><strong>${safe(m.name)}</strong><span>${safe(courseName(m.courseId)||'Not linked to a course')} · ${Number(m.characters||0).toLocaleString()} characters · ${Number(m.chunkCount||0).toLocaleString()} searchable sections${m.pageCount?' · '+Number(m.pageCount)+' pages':''}${m.slideCount?' · '+Number(m.slideCount)+' slides':''}</span><small class="material-index-status">${m.status==='ready'?'Indexed on this device':'Text extracted · index will be built when opened'}</small></div><button class="icon-btn" data-action="delete-material" data-id="${safe(m.id)}" title="Remove material">×</button></div>`).join('')}</div>`:emptyState('▷','No learning materials uploaded yet','Add textbooks, class slides, notes, or past papers to align lessons and practice with your course material.','', '')}</section>
  <div class="studio-bottom-grid"><section class="panel"><div class="panel-head"><div><h3>Learning tutorial</h3><p>Get a focused lesson for one of your learning areas.</p></div><span class="habit-badge">✧</span></div><div class="studio-action-row"><select id="lessonCourse">${courseOptions()}</select><button class="primary-btn" data-action="generate-tutorial">Create tutorial</button></div><div class="source-hint">Uses your linked learning materials first. Without course materials, Eduvia creates a general study guide from your learning details. Use the link below to search the web for an outline.</div><button class="text-btn" data-action="find-curriculum">Find a course outline online ↗</button></section>
  <section class="panel"><div class="panel-head"><div><h3>Practice and tests</h3><p>Try questions from your notes or learning topics.</p></div><span class="habit-badge">✓</span></div><div class="studio-action-row"><select id="practiceCourse">${courseOptions()}</select><button class="secondary-btn" data-page="practice">Open practice →</button></div><div class="source-hint">Practice questions retrieve passages from the same indexed course materials and retain their source references.</div></section></div>
  ${studioLesson?renderGeneratedCard(studioLesson,'tutorial'):''}`;
}

function renderPractice(){
  const course=data.courses.find(c=>c.id===(window.practiceCourseId||''))||data.courses[0];
  return `${pageHead('RECALL IT. APPLY IT.','Practice & tests','Generate questions from your saved learning materials, then check your answers against the source.','<button class="secondary-btn" data-page="study">← Study studio</button>')}
  <section class="panel practice-setup"><details class="action-disclosure"><summary><div><h3>Build a practice set</h3><p>Choose a learning area, question style and number of questions</p></div><span class="disclosure-cta">＋ Build set</span></summary><div class="disclosure-body"><p>Use your saved learning materials first. Without notes, questions use your learning topics and may be broader.</p><div class="practice-controls"><label>Learning area<select id="practiceCourseSelect">${courseOptions(course?.id||'')}</select></label><label>Question style<select id="questionStyle"><option value="mixed">Mixed review</option><option value="short">Short answer</option><option value="essay">Exam-style essay</option><option value="mcq">Multiple choice</option></select></label><label>Number of questions<select id="questionCount"><option>5</option><option selected>10</option><option>15</option></select></label><button class="primary-btn" data-action="generate-practice">Generate practice set</button></div><p class="privacy-note-inline">Practice questions are created on this device from your uploaded materials and learning topics.</p><p class="privacy-note-inline">For multiple-choice questions, select an option and open “Show answer” to check your choice. Written answers are reviewed against the source; Eduvia does not automatically grade this practice set.</p></div></details></section>
  ${studioPractice.length?`<section class="panel practice-results"><div class="panel-head"><div><h3>${safe(studioPractice.title||'Your practice set')}</h3><p>${safe(studioPractice.source||'Generated from your study materials')} · ${studioPractice.questions.length} questions</p></div><button class="panel-link" data-action="generate-practice">Make another set ↻</button></div><div class="question-list">${studioPractice.questions.map((q,i)=>`<article class="question-card"><div class="question-number">${String(i+1).padStart(2,'0')}</div><div class="question-content"><strong>${safe(q.question)}</strong>${q.options?`<div class="question-options">${q.options.map((opt,j)=>`<label><input type="radio" name="q${i}" value="${j}"> ${safe(opt)}</label>`).join('')}</div>`:`<textarea placeholder="Write your answer here…"></textarea>`}<details><summary>${q.options?'Show correct choice / source passage':'Show source passage / sample answer'}</summary><p>${q.options?'Correct choice: '+safe(q.options[q.correctOption]||q.answer):safe(q.answer||'Review the linked course material and explain the key idea in your own words.')}</p>${q.source?'<small>From: '+safe(q.citation||([q.source,q.location].filter(Boolean).join(' · ')))+'</small>':''}</details></div></article>`).join('')}</div></section>`:emptyState('✓','Your practice space is ready','Choose a course and generate a short practice set from your course materials.','', '')}`;
}

function renderSetup(){
  const stages=educationStages(),stage=data.profile.stage||'',learnerType=learnerTypeOf(data.profile);
  const types=[['formal','Formal education'],['independent','Self-directed learning'],['professional','Professional development'],['exam-prep','Exam or certification preparation'],['general','General knowledge and personal interests']];
  const typeOptions=types.map(([v,t])=>'<option value="'+v+'" '+(learnerType===v?'selected':'')+'>'+t+'</option>').join('');
  const stageOptions=stages.map(([v,t])=>'<option value="'+v+'" '+(stage===v?'selected':'')+'>'+t+'</option>').join('');
  return `${pageHead('WELCOME TO EDUVIA','Set up your learning space','Tell Eduvia what you are learning. Formal academic details are optional unless you choose formal education.','')}<section class="panel onboarding-panel"><div class="setup-restore-panel"><div><strong>Already set up Eduvia on another device?</strong><p>Choose your backup to restore your learning space without setting it up again.</p></div><label class="secondary-btn setup-restore-label">Restore from backup<input id="setupBackupFile" type="file" accept=".json,.zip,application/json,application/zip"></label></div><div class="onboarding-intro"><span class="habit-badge">✳</span><div><h2>Your learning, your plan</h2><p>You can change these details at any time. Add learning areas, sessions and materials after setup.</p></div></div><form id="onboardingForm"><div class="form-grid">${field('Learning path','learnerType','<select id="f-learnerType" name="learnerType" required>'+typeOptions+'</select>')}${field('What are you learning?','learningFocus',`<input id="f-learningFocus" name="learningFocus" required maxlength="120" placeholder="e.g. Python, French, design, mathematics" value="${safe(data.profile.learningFocus||data.profile.programme||'')}">`)}</div><div class="form-grid">${field('Country or region','country',studioCountrySelect(data.profile.country))}</div><div class="form-grid" data-setup-formal-only ${learnerType==='formal'?'':'hidden'}>${field('School, organisation or provider','institution',`<input id="f-institution" name="institution" maxlength="100" placeholder="Your school or provider" value="${safe(data.profile.institution)}">`)}${field('Learning stage','stage',`<select id="f-stage" name="stage"><option value="">Choose your learning stage</option>${stageOptions}</select>`)}</div><div class="form-grid" data-setup-formal-only ${learnerType==='formal'?'':'hidden'}>${field('Programme, course or qualification','programme',`<input id="f-programme" name="programme" maxlength="100" placeholder="e.g. B.Sc. Computer Science" value="${safe(data.profile.programme)}">`)}${field('Level, grade or year','level',`<input id="f-level" name="level" maxlength="40" placeholder="e.g. 300 Level" value="${safe(data.profile.level)}">`)}</div><div class="form-grid" data-setup-formal-only ${learnerType==='formal'?'':'hidden'}>${field('Academic session or period','term',`<input id="f-term" name="term" maxlength="60" placeholder="e.g. 2026/2027" value="${safe(data.profile.term)}">`)}</div><div class="form-grid">${field('Learning goal per week','weeklyGoal',`<input id="f-weeklyGoal" name="weeklyGoal" type="number" min="1" max="30" value="${Number(data.profile.weeklyGoal)||5}">`)}${field('Preferred session length','planSessionMinutes',`<select id="f-planSessionMinutes" name="planSessionMinutes">${[15,20,25,30,45,60,75,90].map(n=>`<option value="${n}" ${Number(data.profile.planSessionMinutes||data.profile.sessionMinutes)===n?'selected':''}>${n} minutes</option>`).join('')}</select>`)}</div><div class="form-grid">${field('When can you learn?','studyStart',`<input id="f-studyStart" name="studyStart" type="time" value="${safe(data.profile.studyStart)}">`)}${field('Until','studyEnd',`<input id="f-studyEnd" name="studyEnd" type="time" value="${safe(data.profile.studyEnd)}">`)}</div><div class="onboarding-days"><strong>Choose learning days</strong><div class="availability-days">${STUDIO_DAYS.map((day,i)=>`<label class="day-check"><input type="checkbox" name="studyDay" value="${i}" ${(data.profile.studyDays||[]).includes(i)?'checked':''}><span>${day.slice(0,3)}</span></label>`).join('')}</div></div><div class="onboarding-foot"><span>Your profile, materials and learning records stay on this device.</span><button class="primary-btn" type="submit">Save learning setup →</button></div></form></section>`;
}

function renderMore(){return `${pageHead('MORE TOOLS','More','Additional tools and app controls for your learning space.','')}<div class="course-grid"><button class="course-card" style="text-align:left;border:1px solid var(--line)" data-page="study"><div class="course-card-head"><span class="habit-badge">✧</span><h3>Learning studio</h3></div><p class="course-desc">Import your learning-area list and timetable, add learning materials, set availability, and generate a learning plan.</p></button><button class="course-card" style="text-align:left;border:1px solid var(--line)" data-page="settings"><div class="course-card-head"><span class="habit-badge">⚙</span><h3>Settings</h3></div><p class="course-desc">Appearance, reminders, notification permissions, and backup controls.</p></button></div>`}
function renderGeneratedCard(result,type){return `<section class="panel generated-card"><div class="panel-head"><div><h3>${safe(result.title||'Study session')}</h3><p>${safe(result.course||'Your learning area')} · ${safe(result.source||'Study guide')}</p></div><button class="panel-link" data-action="go-practice">Practice this →</button></div><div class="generated-content">${resultHtml(result.text||'')}</div><div class="ai-caption">Local learning guide built from passages retrieved from your own material. This is not an AI-generated explanation; check the cited locations in the original document.</div></section>`}function resultHtml(text){const escaped=safe(text);return escaped.split(/\n{2,}/).map(block=>{if(/^#{1,3} /.test(block))return `<h4>${block.replace(/^#{1,3} /,'')}</h4>`;if(/^[-*] /m.test(block))return `<ul>${block.split('\n').map(line=>`<li>${line.replace(/^[-*] /,'')}</li>`).join('')}</ul>`;return `<p>${block.replace(/\n/g,'<br>')}</p>`}).join('')}

function studioDb(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(new Error('This browser does not support local document storage.'));return}const request=indexedDB.open(STUDIO_DB,2);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STUDIO_STORE))db.createObjectStore(STUDIO_STORE,{keyPath:'id'});if(!db.objectStoreNames.contains('academicRecords'))db.createObjectStore('academicRecords',{keyPath:'id'});if(!db.objectStoreNames.contains('personalDocuments'))db.createObjectStore('personalDocuments',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function storeMaterial(record){const db=await studioDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STUDIO_STORE,'readwrite');tx.objectStore(STUDIO_STORE).put(record);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
function fallbackMaterial(materialId){return (data.materialText||[]).find(item=>String(item?.id||'')===String(materialId))||null}
async function readMaterial(materialId){
  try{
    const db=await studioDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STUDIO_STORE,'readonly'),req=tx.objectStore(STUDIO_STORE).get(materialId);
      req.onsuccess=()=>{db.close();resolve(req.result||fallbackMaterial(materialId))};
      req.onerror=()=>{db.close();const fallback=fallbackMaterial(materialId);if(fallback)resolve(fallback);else reject(req.error)};
    });
  }catch{return fallbackMaterial(materialId)}
}
window.eduLectureMaterials={
  list(courseId){
    return (data.materials||[]).filter(item=>item?.kind==='recorded-lecture'&&String(item.courseId||'')===String(courseId||''))
      .sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)).map(item=>({...item}));
  },
  async save(record){
    if(!record||!record.id||!String(record.text||'').trim())throw new Error('A lecture transcript or readable slide text is required.');
    data.materials=data.materials||[];
    data.materialText=data.materialText||[];
    const meta={
      id:String(record.id),kind:'recorded-lecture',name:String(record.name||'Recorded lecture'),
      ext:'lecture',courseId:String(record.courseId||''),createdAt:Number(record.createdAt)||Date.now(),
      lectureDate:String(record.lectureDate||''),sourceUrl:String(record.sourceUrl||''),
      characters:String(record.text).length,keyPoints:Array.isArray(record.keyPoints)?record.keyPoints:[],
      topics:Array.isArray(record.topics)?record.topics:[],attachments:Array.isArray(record.attachments)?record.attachments:[],
      summaryMethod:'extractive-local-v1'
    };
    const stored={...record,id:meta.id,name:meta.name,courseId:meta.courseId,createdAt:meta.createdAt};
    let storedInIndexedDb=false;
    try{await storeMaterial(stored);storedInIndexedDb=true}
    catch{data.materialText.push(stored)}
    data.materials.push(meta);
    if(!save()){
      data.materials=data.materials.filter(item=>item.id!==meta.id);
      data.materialText=data.materialText.filter(item=>item.id!==meta.id);
      if(storedInIndexedDb)await removeStoredMaterial(meta.id);
      throw new Error('Eduvia could not save this lecture. Check device storage and try again.');
    }
    return {...meta};
  },
  async read(lectureId){return readMaterial(String(lectureId||''))},
  async remove(lectureId){
    const index=(data.materials||[]).findIndex(item=>item?.kind==='recorded-lecture'&&String(item.id)===String(lectureId));
    if(index<0)return false;
    const [removed]=data.materials.splice(index,1);
    const fallbackIndex=(data.materialText||[]).findIndex(item=>String(item?.id)===String(lectureId));
    const fallback=fallbackIndex>=0?data.materialText.splice(fallbackIndex,1)[0]:null;
    if(!save()){
      data.materials.splice(index,0,removed);
      if(fallback)data.materialText.splice(Math.max(0,fallbackIndex),0,fallback);
      return false;
    }
    await removeStoredMaterial(String(lectureId));
    return true;
  }
};
window.eduExtractLectureAsset=async function(file){
  return extractDocument(file,'material');
};
window.eduOpenCourseMaterial=async function(materialId){
 try{
  const record=await readMaterial(materialId);
  if(!record){toast('This material is not available on this device. Restore the portable backup that contains it.');return}
  const content=String(record.text||'');
  const preview=content.slice(0,30000);
  const note=content.length>preview.length?'<p class="privacy-note-inline">Showing the first 30,000 characters. Download the extracted text to read the remainder.</p>':'';
  openModal('Learning material',String(record.name||'Saved material'),'<div class="course-material-reader"><pre>'+safe(preview||'No extracted text was saved for this file.')+'</pre></div>'+note,'Close',()=>closeModal());
 }catch(error){toast('Could not open this material: '+(error.message||'storage is unavailable'))}
};
window.eduDownloadCourseMaterial=async function(materialId){
 try{
  const record=await readMaterial(materialId);
  if(!record){toast('This material is not available on this device.');return}
  const blob=new Blob([String(record.text||'')],{type:'text/plain;charset=utf-8'});
  download(blob,(String(record.name||'course-material').replace(/\.[^.]+$/,'')||'course-material')+'-extracted.txt');
 }catch(error){toast('Could not download this material: '+(error.message||'storage is unavailable'))}
};

async function removeStoredMaterial(materialId){try{const db=await studioDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STUDIO_STORE,'readwrite');tx.objectStore(STUDIO_STORE).delete(materialId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch{} }
async function getStudioRecord(storeName,recordId){
  const fallback=()=>storeName===STUDIO_STORE?fallbackMaterial(recordId):null;
  try{
    const db=await studioDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readonly'),req=tx.objectStore(storeName).get(recordId);
      req.onsuccess=()=>{db.close();resolve(req.result||fallback())};
      req.onerror=()=>{db.close();const cached=fallback();if(cached)resolve(cached);else reject(req.error)};
    });
  }catch(error){const cached=fallback();if(cached)return cached;throw error}
}
async function putStudioRecord(storeName,record){const db=await studioDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).put(record);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error||new Error('Could not save this item.'))}})}
async function deleteStudioRecord(storeName,recordId){const db=await studioDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).delete(recordId);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function clearStudioStore(storeName){const db=await studioDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).clear();tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}

async function createOcrWorker(){
  if(!window.Tesseract)await loadStudioScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
  return window.Tesseract.createWorker('eng',1,{logger:message=>{if(message.status==='recognizing text')studioNotice='Reading text from the upload…'}});
}
async function recognizeImage(image){
  const worker=await createOcrWorker();
  let bitmap=null;
  try{
    let source=image;
    if(image instanceof Blob&&window.createImageBitmap){
      bitmap=await createImageBitmap(image);
      const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
      canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);source=canvas;
    }
    const result=await worker.recognize(source);return String(result.data.text||'').trim();
  }finally{bitmap?.close();await worker.terminate()}
}

function ensurePdfPageLimit(pageCount){
  if(Number(pageCount)>250)throw new Error('This PDF has more than 250 pages. Split it into smaller files so Eduvia can process every page.');
}

async function extractDocument(file,kind=''){
  if(file.size>40*1024*1024)throw new Error('This file is over 40 MB. Try a smaller file or export selected chapters.');
  const ext=file.name.split('.').pop().toLowerCase();
  if(file.type?.startsWith('image/')||/\.(png|jpe?g|webp)$/i.test(file.name)){
    const text=await recognizeImage(file);
    if(text)return text;
    throw new Error('I could not read text from that image. Try a clearer, well-lit image with the full page in frame.');
  }
  if(['txt','md','csv','tsv','json','vtt','srt'].includes(ext))return await file.text();
  if(['xls','xlsx'].includes(ext)){
    if(!window.XLSX)await loadStudioScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const workbook=window.XLSX.read(await file.arrayBuffer(),{type:'array'});
    const preferred=kind==='courses'?/course|subject|unit|module/i:/timetable|schedule|class|lecture/i;
    const sheetName=workbook.SheetNames.find(name=>preferred.test(name))||workbook.SheetNames[0];
    if(!sheetName)throw new Error('This spreadsheet has no readable sheets.');
    return window.XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName],{FS:'\t'});
  }
  if(ext==='pdf'){
    const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';
    const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    ensurePdfPageLimit(doc.numPages);
    const pages=new Array(doc.numPages).fill(''),missingPages=[];
    for(let pageNum=1;pageNum<=Math.min(doc.numPages,250);pageNum++){
      const page=await doc.getPage(pageNum),content=await page.getTextContent();
      const pageText=content.items.map(x=>x.str).join(' ').trim();
      if(pageText)pages[pageNum-1]=(kind==='material'?'\n\n[PAGE '+pageNum+']\n':'')+pageText;
      else missingPages.push(pageNum);
    }
    if(missingPages.length>20)throw new Error('This PDF has more than 20 scanned pages without embedded text. Split it into smaller sections and upload those.');
    if(missingPages.length){
      const worker=await createOcrWorker();
      try{
        for(const pageNum of missingPages){
          studioNotice='Reading scanned PDF page '+pageNum+' of '+doc.numPages+'…';render();
          const page=await doc.getPage(pageNum),viewport=page.getViewport({scale:1.7}),canvas=document.createElement('canvas');
          canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
          const result=await worker.recognize(canvas);
          const pageText=String(result.data.text||'').trim();
          if(pageText)pages[pageNum-1]=(kind==='material'?'\n\n[PAGE '+pageNum+']\n':'')+pageText;
          canvas.width=0;canvas.height=0;
        }
      }finally{await worker.terminate()}
    }
    const extracted=pages.join('\n');
    if(extracted.trim())return extracted;
    throw new Error('I could not read text from this PDF. Try a clearer scan or upload an image of the page.');
  }
  if(['docx','pptx'].includes(ext)){
    if(!window.JSZip)await loadStudioScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    const zip=await window.JSZip.loadAsync(file);
    const paths=Object.keys(zip.files).filter(p=>ext==='docx'?p==='word/document.xml':/^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    let chunks=[];
    for(const path of paths){
      const xml=await zip.files[path].async('string'),doc= new DOMParser().parseFromString(xml,'application/xml');
      if(ext==='pptx'){
        const slideNumber=Number(path.match(/slide(\d+)\.xml$/)?.[1])||chunks.length+1;
        const slideText=Array.from(doc.getElementsByTagNameNS('*','t')).map(n=>n.textContent).join(' ');
        chunks.push((kind==='material'?'[SLIDE '+slideNumber+']\n':'')+slideText);
      }else{
        const paragraphs=Array.from(doc.getElementsByTagNameNS('*','p'));
        const rows=paragraphs.map(paragraph=>{
          const styleNode=paragraph.getElementsByTagNameNS('*','pStyle')[0];
          const style=styleNode?.getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','val')||styleNode?.getAttribute('w:val')||'';
          const value=Array.from(paragraph.getElementsByTagNameNS('*','t')).map(node=>node.textContent).join('');
          if(!value.trim())return '';
          return kind==='material'&&/^heading|^title/i.test(style)?'\n[SECTION '+value.trim()+']\n'+value:value;
        }).filter(Boolean);
        chunks.push(rows.join('\n'));
      }
    }
    const text=chunks.join('\n\n');
    if(text.trim())return text;
    throw new Error('I could not find readable text in this Office file.');
  }
  throw new Error('Supported formats are images, PDF, Word, PowerPoint, CSV, JSON, and text.');
}
function loadStudioScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Could not load the document reader. Connect to the internet and try again.'));document.head.appendChild(script)})}

function parseCsv(text){
  const firstLine=(text.split(/\r?\n/).find(line=>line.trim())||'');
  let delimiter=',',best=-1;
  for(const candidate of [',','\t',';','|']){
    let count=0,quoted=false;
    for(let i=0;i<firstLine.length;i++){
      const ch=firstLine[i],next=firstLine[i+1];
      if(ch==='"'&&quoted&&next==='"'){i++}
      else if(ch==='"')quoted=!quoted;
      else if(ch===candidate&&!quoted)count++;
    }
    if(count>best){best=count;delimiter=candidate}
  }
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],next=text[i+1];
    if(ch==='"'&&quoted&&next==='"'){cell+='"';i++}
    else if(ch==='"')quoted=!quoted;
    else if(ch===delimiter&&!quoted){row.push(cell.trim());cell=''}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);row=[];cell=''}
    else cell+=ch;
  }
  row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);
  return rows;
}
function normHeader(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function rowsFromText(text,ext,kind=''){if(ext==='json'){const json=JSON.parse(text);return Array.isArray(json)?json:(json.courses||json.timetable||json.classes||json.rows||[])}const rows=parseCsv(text);if(!rows.length)return[];const headers=rows[0].map(normHeader),known=['code','coursecode','courseno','coursenumber','courseid','subjectcode','unitcode','modulecode','name','coursename','coursetitle','subjectname','day','weekday','dayofweek','start','starttime','end','endtime','time','classtime'];const hasHeader=headers.some(h=>known.includes(h));const keys=kind==='courses'?['code','name','credits','topics']:['day','start','end','title','courseCode','location'];const body=hasHeader?rows.slice(1):rows;return body.map(r=>hasHeader?Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])):Object.fromEntries(keys.map((key,i)=>[normHeader(key),r[i]||''])))}
function rowValue(row,keys){for(const key of keys){if(row[key]!=null&&String(row[key]).trim()!=='')return String(row[key]).trim();const found=Object.keys(row).find(k=>normHeader(k)===normHeader(key));if(found&&String(row[found]).trim()!=='')return String(row[found]).trim()}return''}
function parseCourseImport(text,ext){
  let rows=[];
  if(ext==='csv'||ext==='json'){
    rows=rowsFromText(text,ext,'courses').map(r=>({code:rowValue(r,['code','courseCode','courseNo','courseNumber','courseId','course_code','course','subjectCode','unitCode','moduleCode']),name:rowValue(r,['name','courseName','courseTitle','title','description','subjectName','moduleName','courseDescription','subject']),credits:rowValue(r,['credits','creditUnits','creditUnit','units','unit','credit']),topics:rowValue(r,['topics','outline','content','courseTopics','courseOutline','courseContent'])})).filter(x=>x.code||x.name);
  }else{
    for(const rawLine of text.split(/\r?\n/)){
      const line=rawLine.replace(/\s+/g,' ').trim();
      const topicLine=line.match(/^(?:topics?|course\s+(?:outline|content)|outline|content)\s*[:\-]\s*(.+)$/i);
      if(topicLine&&rows.length){rows[rows.length-1].topics=topicLine[1].split(/[;,|]+/).map(topic=>topic.trim()).filter(Boolean);continue;}
      const match=line.match(/\b([A-Z]{2,5})\s*[- ]?(\d{3})\b/i);
      if(!match)continue;
      const code=match[1].toUpperCase()+' '+match[2];
      let before=line.slice(0,match.index).replace(/^\s*\d+[.)]?\s*/,'').replace(/[|:–-]+\s*$/,'').trim();
      let after=line.slice(match.index+match[0].length).replace(/^\s*[-–:|]\s*/,'').trim();
      let credits='';
      const leading=after.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
      if(leading){credits=leading[1];after=leading[2].trim();}
      const trailing=after.match(/^(.*?)\s+(\d+(?:\.\d+)?)$/);
      if(!credits&&trailing){after=trailing[1].trim();credits=trailing[2];}
      const name=[before,after].filter(Boolean).join(' ').replace(/[|–-]+$/,'').trim()||'Course '+code;
      rows.push({code,name,credits,topics:''});
    }
  }
  return rows.map(r=>({...r,topics:Array.isArray(r.topics)?r.topics:String(r.topics||'').split(/[;|\n]+/).map(x=>x.trim()).filter(Boolean)}))
    .filter((r,i,a)=>a.findIndex(x=>String(x.code||x.name||'').toLowerCase()===String(r.code||r.name||'').toLowerCase())===i);
}
function dayNum(value){const v=String(value||'').toLowerCase();const index=STUDIO_DAYS.findIndex(d=>d.toLowerCase().startsWith(v.slice(0,3)));if(index>=0)return index;if(/^[0-6]$/.test(v))return Number(v);return -1}
function normalizeTime(value){let s=String(value||'').trim().toUpperCase().replace(/(\d{1,2})\.(\d{2})/g,'$1:$2');const m=s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);if(!m)return'';let h=Number(m[1]),min=Number(m[2]||0);if(m[3]==='PM'&&h<12)h+=12;if(m[3]==='AM'&&h===12)h=0;if(h>23||min>59)return'';return`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`}
function dayNumbers(value){
  if(typeof value==='number'&&value>=0&&value<=6)return [Number(value)];
  const text=String(value||'').trim(),dayTokens=text.match(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tues?|Wed|Weds?|Thu|Thurs?|Fri|Sat)\b/ig)||[];
  if(dayTokens.length)return [...new Set(dayTokens.map(dayNum).filter(day=>day>=0))];
  const numeric=text.match(/\b[0-6]\b/g)||[];
  if(numeric.length)return [...new Set(numeric.map(Number))];
  const single=dayNum(text);return single>=0?[single]:[];
}
function splitTimeRange(value){
  const match=String(value||'').match(/(\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM)?)\s*(?:-|–|—|to|until)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM)?)/i);
  return match?[normalizeTime(match[1]),normalizeTime(match[2])]:[];
}
function parseTimetableImport(text,ext){
  let rows=[];
  if(ext==='csv'||ext==='tsv'||ext==='xls'||ext==='xlsx'||ext==='json')rows=rowsFromText(text,ext,'timetable');
  else{
    const lineRe=/(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tues?|Wed|Weds?|Thu|Thurs?|Fri|Sat)\b[^\n]*?(\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM)?)\s*(?:-|–|—|to|until)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM)?)[^\n]*/ig;
    let match;
    while((match=lineRe.exec(text))!==null){
      const line=match[0],dayPosition=line.toLowerCase().indexOf(match[1].toLowerCase());
      const startPosition=line.indexOf(match[2],dayPosition+match[1].length),endPosition=line.indexOf(match[3],startPosition+match[2].length);
      if(startPosition<0||endPosition<0)continue;
      const rest=(line.slice(0,dayPosition)+' '+line.slice(dayPosition+match[1].length,startPosition)+' '+line.slice(endPosition+match[3].length)).replace(/\s+/g,' ').trim();
      const code=(rest.match(/\b[A-Z]{2,5}\s*\d{3}\b/i)||[])[0]||'';
      const locationMatch=rest.match(/\b(?:room|venue|location|lab(?:oratory)?|hall)\s*[:#-]?\s*[A-Z0-9]+(?:[-/][A-Z0-9]+)?(?:\s+[A-Z0-9]+(?:[-/][A-Z0-9]+)?)?/i);
      const location=locationMatch?locationMatch[0].trim():'';
      const title=rest.replace(code,'').replace(location,'').replace(/\s+/g,' ').replace(/^[,;|:\s]+|[,;|:\s]+$/g,'').trim()||code||'Class';
      rows.push({day:match[1],start:match[2],end:match[3],courseCode:code,title,location});
    }
  }
  return rows.flatMap(row=>{
    const days=dayNumbers(rowValue(row,['day','weekday','dayOfWeek','classDay','lectureDay']));
    let start=normalizeTime(rowValue(row,['start','startTime','from','timeFrom','lectureStart','classStart']));
    let end=normalizeTime(rowValue(row,['end','endTime','to','until','timeTo','lectureEnd','classEnd']));
    if(!start||!end){const range=splitTimeRange(rowValue(row,['time','classTime','lectureTime','timeSlot','hours']));if(!start)start=range[0]||'';if(!end)end=range[1]||''}
    const courseCode=rowValue(row,['courseCode','course_code','code','subjectCode','unitCode','course']);
    const title=rowValue(row,['title','courseTitle','courseName','subjectName','className','lectureName','module','name','class','subject'])||courseCode;
    const location=rowValue(row,['location','venue','room','classroom','hall']);
    return (days.length?days:[-1]).map(day=>({day,start,end,courseCode,title,location}));
  }).filter(row=>row.title);
}
function fileExt(file){return file.name.split('.').pop().toLowerCase()}

async function handleStudioFile(kind,file,courseId=''){
  if(!file)return;
  const linkedCourseId=kind==='material'?String(courseId||window.eduTargetCourseId||''):'';
  if(kind==='material')window.eduTargetCourseId='';
  studioNotice=`Reading ${file.name}…`;render();
  try{const ext=fileExt(file),text=await extractDocument(file,kind);if(kind==='material'){await previewMaterial(file,text,linkedCourseId);return}const parseExt=['tsv','xls','xlsx'].includes(ext)?'csv':ext;const rows=kind==='courses'?parseCourseImport(text,parseExt):parseTimetableImport(text,parseExt);if(!rows.length)throw new Error(kind==='courses'?'No course rows found. Try a clearer image showing the course codes and names, or use the course CSV template.':'No timetable rows found. Try a clearer image showing the days and times, or use the timetable CSV template.');pendingStudioImport={kind,fileName:file.name,rows};showImportPreview(kind,file.name,rows)}catch(error){studioNotice=error.message||'Could not read that file.';render();toast(studioNotice)}
}
function importField(label,name,value,type='text',placeholder=''){const escaped=typeof value==='string'?value:String(value??'');return `<label class="form-field"><span>${label}</span><input name="${name}" type="${type}" value="${safe(escaped)}" placeholder="${safe(placeholder)}" ${type==='time'?'required':''}></label>`}
function showImportPreview(kind,fileName,rows){const isCourses=kind==='courses';const cards=rows.map((r,i)=>isCourses?`<article class="import-review-row"><strong>Course ${i+1}</strong><div class="import-review-grid">${importField('Course code',`code_${i}`,r.code||'','text','e.g. CSC 301')}${importField('Learning area name',`name_${i}`,r.name||'','text','Full course title')}${importField('Credits',`credits_${i}`,r.credits||'','text','')}${importField('Topics',`topics_${i}`,(r.topics||[]).join('; '),'text','Separate topics with semicolons')}</div></article>`:`<article class="import-review-row"><strong>Class ${i+1}</strong><div class="import-review-grid timetable-review-grid"><label class="form-field"><span>Day</span><select name="day_${i}" required><option value="">Choose a day</option>${STUDIO_DAYS.map((day,index)=>`<option value="${index}" ${Number(r.day)===index?'selected':''}>${day}</option>`).join('')}</select></label>${importField('Course code',`courseCode_${i}`,r.courseCode||'','text','e.g. CSC 301')}${importField('Course name / class',`title_${i}`,r.title||'','text','Class or course name')}${importField('Start time',`start_${i}`,r.start||'','time')}${importField('End time',`end_${i}`,r.end||'','time')}${importField('Room / location',`location_${i}`,r.location||'','text','Optional')}</div></article>`).join('');const note=isCourses?'These learning areas will be added to My Learning. A matching course code or name updates the existing learning area rather than creating a duplicate. Scheduled sessions can be imported separately.':'Importing replaces class entries previously imported through Learning Studio. Manually created classes and personal study sessions are kept; the new rows become the imported timetable.';openModal(isCourses?'Review learning-area list':'Review schedule',`${fileName} · ${rows.length} item${rows.length===1?'':'s'} detected`,`<div class="import-review-list">${cards}</div><p class="preview-note">${note}</p>`,'Import',formData=>{const updated=rows.map((row,i)=>isCourses?({...row,code:String(formData.get(`code_${i}`)||'').trim(),name:String(formData.get(`name_${i}`)||'').trim(),credits:String(formData.get(`credits_${i}`)||'').trim(),topics:String(formData.get(`topics_${i}`)||'').split(/[;|\n]+/).map(x=>x.trim()).filter(Boolean)}):({...row,day:Number(formData.get(`day_${i}`)),courseCode:String(formData.get(`courseCode_${i}`)||'').trim(),title:String(formData.get(`title_${i}`)||'').trim(),start:normalizeTime(formData.get(`start_${i}`)),end:normalizeTime(formData.get(`end_${i}`)),location:String(formData.get(`location_${i}`)||'').trim()}));const invalid=updated.some(row=>isCourses?(!row.code&&!row.name):(!row.title||!row.start||!row.end||minutes(row.end)<=minutes(row.start)));if(invalid){toast(isCourses?'Each course needs a course code or course name. Check the highlighted details.':'Check each class name, day, and start/end time before importing.');return}pendingStudioImport.rows=updated;if(commitStudioImport())closeModal()})}
function matchCourse(value){
  const raw=String(value||'').trim();if(!raw)return null;
  const codeKey=raw.toLocaleLowerCase().replace(/\s+/g,'');
  const nameKey=raw.toLocaleLowerCase().replace(/\s+/g,' ');
  return data.courses.find(course=>String(course.code||'').toLocaleLowerCase().replace(/\s+/g,'')===codeKey)||
    data.courses.find(course=>String(course.name||'').trim().toLocaleLowerCase().replace(/\s+/g,' ')===nameKey)||null;
}
function commitStudioImport(){if(!pendingStudioImport)return false;const {kind,rows,fileName}=pendingStudioImport;const previousCourses=(data.courses||[]).map(course=>({...course,topics:[...(course.topics||[])]})),previousEvents=(data.events||[]).map(event=>({...event})),previousImports={...data.imports,courses:[...(data.imports.courses||[])],timetable:[...(data.imports.timetable||[])]},previousPage=currentPage,previousHash=location.hash,previousPending=pendingStudioImport,previousNotice=studioNotice;let count=0;if(kind==='courses'){for(const row of rows){let course=matchCourse(row.code)||matchCourse(row.name);if(course){if(row.name)course.name=row.name;if(row.code)course.code=row.code;if(row.topics?.length)course.topics=row.topics;if(row.credits)course.credits=Number(row.credits)||row.credits}else{data.courses.push({id:id(),name:row.name||`Course ${row.code}`,code:row.code||'',instructor:'',note:'',color:COLORS[data.courses.length%COLORS.length],credits:Number(row.credits)||0,topics:row.topics||[]})}count++}data.imports.courses.push({name:fileName,count,at:Date.now()});currentPage='courses'}else{data.events=data.events.filter(e=>!e.importedTimetable);for(const row of rows){const c=matchCourse(row.courseCode)||matchCourse(row.title);const existing=data.events.some(e=>e.type==='class'&&e.day===row.day&&e.start===row.start&&e.title.toLowerCase()===row.title.toLowerCase());if(existing)continue;data.events.push({id:id(),title:row.title,type:'class',courseId:c?.id||'',date:'',day:row.day,start:row.start,end:row.end,location:row.location||'',remind:true,duration:minutes(row.end)-minutes(row.start),importedTimetable:true});count++}data.imports.timetable.push({name:fileName,count,at:Date.now()});currentPage='timetable'}location.hash=currentPage;pendingStudioImport=null;studioNotice=kind==='courses'?`${count} courses added to My Learning.`:`${count} class times added to Timetable.`;if(!save()){data.courses=previousCourses;data.events=previousEvents;data.imports=previousImports;currentPage=previousPage;location.hash=previousHash;pendingStudioImport=previousPending;studioNotice=previousNotice;render();return false}toast(studioNotice);return true}

async function previewMaterial(file,text,linkedCourseId=''){
 const courseOptionsHtml=courseOptions(linkedCourseId),materialId=id(),ext=fileExt(file),content=text.slice(0,1200000);
 const index=window.eduCourseIntelligence?.buildIndex(content)||null;
 const material={id:materialId,name:file.name,ext,characters:content.length,courseId:linkedCourseId||'',status:index?'ready':'text-extracted',indexVersion:index?.version||0,chunkCount:index?.chunkCount||0,pageCount:index?.pageCount||0,slideCount:index?.slideCount||0,indexedAt:index?.indexedAt||0};
 pendingStudioImport={kind:'material',material,text:content,index};
 const processing=index?index.chunkCount+' searchable sections created'+(index.pageCount?' · '+index.pageCount+' pages':'')+(index.slideCount?' · '+index.slideCount+' slides':'')+'.':'Text extracted. Search indexing will be available after the reader loads.';
 openModal('Add learning material',file.name,`<div class="form-field full"><label for="materialCourseSelect">Link it to a learning area</label><select id="materialCourseSelect">${courseOptionsHtml}</select></div><p class="preview-note">${content.length.toLocaleString()} characters extracted on this device. ${safe(processing)} The original file is not uploaded to a server.</p><div class="material-excerpt">${safe(content.slice(0,520))}${content.length>520?'…':''}</div>`,'Save material',async()=>{
  const pending=pendingStudioImport;if(!pending?.material)return;
  const m=pending.material,select=document.getElementById('materialCourseSelect');m.courseId=select?.value||'';
  const record={id:m.id,name:m.name,ext:m.ext,text:pending.text,index:pending.index,courseId:m.courseId,createdAt:Date.now(),status:m.status};
  let storedInIndexedDb=false;
  try{await storeMaterial(record);storedInIndexedDb=true}
  catch{data.materialText=data.materialText||[];data.materialText.push(record);m.warning='stored in browser backup instead'}
  data.materials.push(m);
  studioNotice='Learning material saved and indexed on this device. Ask, tutorials, practice and flashcards can retrieve passages with source references.';
  if(!save()){
    data.materials=data.materials.filter(item=>item.id!==m.id);
    data.materialText=(data.materialText||[]).filter(item=>item.id!==m.id);
    if(storedInIndexedDb)await removeStoredMaterial(m.id);
    studioNotice='';
    render();return;
  }
  pendingStudioImport=null;
  closeModal();toast('Course material saved and indexed');
 });
}

function downloadCsv(content,name){const blob=new Blob([content],{type:'text/csv;charset=utf-8'});download(blob,name)}
function courseTemplate(){downloadCsv('code,name,credits,topics\nSUBJ 101,Sample course,3,"Topic one; Topic two; Topic three"\n','eduvia-course-list-template.csv')}
function timetableTemplate(){downloadCsv('day,start,end,title,courseCode,location\nMonday,09:00,10:00,Sample class,SUBJ 101,Room or online\nWednesday,14:00,15:30,Sample tutorial,SUBJ 102,Online\n','eduvia-school-timetable-template.csv')}

function saveAvailability(form){const fd=new FormData(form);const days=fd.getAll('studyDay').map(Number);if(!days.length){toast('Choose at least one day for study.');return false}const start=fd.get('studyStart'),end=fd.get('studyEnd');if(minutes(end)<=minutes(start)){toast('Your study window must end after it starts.');return false}const previous={studyDays:[...(data.profile.studyDays||[])],studyStart:data.profile.studyStart,studyEnd:data.profile.studyEnd,planSessionMinutes:data.profile.planSessionMinutes};data.profile.studyDays=days;data.profile.studyStart=start;data.profile.studyEnd=end;data.profile.planSessionMinutes=Number(fd.get('planSessionMinutes'))||45;if(!save()){Object.assign(data.profile,previous);render();return false}studioNotice='Study times saved. The next plan will fit inside this window.';toast('Study availability saved');return true}
function planningEventIsActive(event,planningDate,nowMinutes){
  if(!event?.date)return true;
  if(event.date>planningDate)return true;
  if(event.date<planningDate)return false;
  return minutes(event.end)>nowMinutes;
}

function generatePlan(){
  if(!data.courses.length){studioNotice='Import your learning-area list or add your courses first. Then the planner can spread sessions across them.';render();toast('Add at least one course before generating a plan.');return}
  const days=(data.profile.studyDays||[]).map(Number),start=minutes(data.profile.studyStart||'17:00'),end=minutes(data.profile.studyEnd||'21:00'),session=Number(data.profile.planSessionMinutes)||45;
  if(!days.length||end<=start){toast('Set your available days and study window first.');return}
  const previousEvents=data.events,previousStudyPlan=data.studyPlan,previousNotice=studioNotice;
  const planningDate=todayISO(),nowMinutes=new Date().getHours()*60+new Date().getMinutes();
  const manual=data.events.filter(e=>!e.generated),blockers=manual.filter(e=>planningEventIsActive(e,planningDate,nowMinutes)),classes=blockers.filter(e=>e.type==='class'),blocks=blockers.filter(e=>e.type==='study');
  const candidates=[];for(const day of days){for(let t=start;t+session<=end;t+=30){const collision=[...classes,...blocks].some(e=>Number(e.day)===day&&minutes(e.start)<t+session+15&&minutes(e.end)+15>t);if(!collision)candidates.push({day,start:t,end:t+session})}}
  const count=Math.max(Number(data.profile.weeklyGoal)||5,data.courses.length);if(!candidates.length){studioNotice='No open study slots fit around your classes. Widen your study window, choose more days, or shorten each session.';render();toast('No available study slots found.');return}
  const deadlinePriority=course=>(data.deadlines||[]).filter(item=>item.courseId===course.id&&!item.completed&&item.dueDate).reduce((score,item)=>{const days=Math.ceil((new Date(item.dueDate+'T23:59:59').getTime()-Date.now())/86400000);return score+(days<0?180:days<=3?150:days<=7?110:days<=14?65:days<=30?25:5)},0);const ranked=[...data.courses].sort((a,b)=>(deadlinePriority(b)+(Number(b.credits)||3))-(deadlinePriority(a)+(Number(a.credits)||3)));const chosen=[];
  for(const slot of candidates){if(chosen.length>=count)break;if(chosen.some(x=>x.day===slot.day&&slot.start<x.end+30&&slot.end+30>x.start))continue;let course=ranked[chosen.length%ranked.length];if(ranked.length>1&&chosen.length&&course.id===chosen[chosen.length-1].course.id)course=ranked[(chosen.length+1)%ranked.length];const idx=chosen.filter(x=>x.course.id===course.id).length;const topics=course.topics||[];const weakTopics=topics.filter(topic=>(data.topicMastery?.[course.id+'::'+topic]?.status||'not-started')!=='confident');const priorityTopics=[...weakTopics,...topics.filter(topic=>!weakTopics.includes(topic))];const topic=priorityTopics.length?priorityTopics[idx%priorityTopics.length]:'next course topic';chosen.push({...slot,course,topic})}
  data.events=manual.concat(chosen.map(x=>({id:id(),title:`Study · ${x.course.code||x.course.name}${x.topic&&x.topic!=='next course topic'?` · ${x.topic}`:''}`,type:'study',createdAt:todayISO(),courseId:x.course.id,date:'',day:x.day,start:toTime(x.start),end:toTime(x.end),location:'',remind:true,duration:session,generated:true,topic:x.topic})));
  studioNotice=`Generated ${chosen.length} weekly learning sessions across ${new Set(chosen.map(x=>x.course.id)).size} of ${data.courses.length} courses. Review the schedule and adjust your availability if you want to fit in more.`;
  data.studyPlan={generatedAt:Date.now(),count:chosen.length,courseCount:data.courses.length};if(!save()){data.events=previousEvents;data.studyPlan=previousStudyPlan;studioNotice=previousNotice;render();return}toast(`${chosen.length} learning sessions added to your timetable`);
}
function toTime(n){return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}

function materialForCourse(courseId){return data.materials.find(m=>m.courseId===courseId)||data.materials.find(m=>!m.courseId)||null}
async function loadCourseText(courseId){
 const materials=data.materials.filter(m=>m.courseId===courseId||!m.courseId),sources=[];
 for(const metadata of materials){
  const stored=await readMaterial(metadata.id);if(!stored?.text)continue;
  let index=stored.index;
  if(window.eduCourseIntelligence&&index?.version!==window.eduCourseIntelligence.version){
   index=window.eduCourseIntelligence.buildIndex(stored.text);
   try{await storeMaterial({...stored,index,status:'ready'})}catch{}
   metadata.status='ready';metadata.indexVersion=index.version;metadata.chunkCount=index.chunkCount;metadata.pageCount=index.pageCount;metadata.slideCount=index.slideCount;metadata.indexedAt=index.indexedAt;
  }
  sources.push({id:metadata.id,name:metadata.name,ext:metadata.ext,courseId:metadata.courseId||'',text:stored.text,index:index||null,createdAt:metadata.createdAt||stored.createdAt||0});
 }
 return sources;
}
function selectedCourse(selectId){const select=document.getElementById(selectId);return data.courses.find(c=>c.id===select?.value)||data.courses[0]||null}
function tutorialText(course,sources){
 const topics=Array.isArray(course.topics)?course.topics:[];
 if(sources.length){
  const query=topics.slice(0,4).join(' ')||course.name||course.code||'';
  const passages=window.eduCourseIntelligence?.search(sources,query,6)||[];
  const selected=passages;
  const sourceNames=[...new Set(selected.map(item=>item.name))];
  const excerpts=selected.slice(0,5).map(item=>'- '+item.text+'\n  Source: '+item.citation).join('\n');
  const prompts=topics.slice(0,4).map((topic,i)=>(i+1)+'. Explain '+topic+' using the definitions and examples in your notes.').join('\n')||'1. Summarise the main idea in the selected passages.\n2. Identify two key terms and explain their relationship.\n3. Give an example supported by your material.';
  return {title:(course.code||course.name)+': focused review',course:course.name,source:sourceNames.join(', ')||sources[0].name,text:'## How to use this guide\nThese are retrieved passages from the material you uploaded. Read them in context and check the cited page, slide or section in the original notes. The prompts below are revision activities, not additional facts.\n\n## Relevant passages from your material\n'+(excerpts||'No searchable passage was indexed for this topic yet.')+'\n\n## Check your understanding\n'+prompts+'\n\n## Active recall\nClose the document and explain the topic from memory. Reopen the cited source to check details you missed.'};
 }
 if(topics.length)return {title:(course.code||course.name)+': guided review',course:course.name,source:'Course topics supplied in your course form',text:'## Learning goals\nUse these topics as a checklist: '+topics.slice(0,5).join(', ')+'.\n\n## Review prompts\n'+topics.slice(0,5).map((topic,i)=>(i+1)+'. Explain '+topic+' using your class notes and one example.').join('\n')+'\n\n## Source note\nNo course document is linked yet. This outline uses only the topic titles from your course form.'};
 return {title:(course.code||course.name)+': first learning session',course:course.name,source:'General study prompts',text:'## Start with your class material\nUpload your lecture notes, select a topic and then create a source-based guide.\n\n## Study routine\n1. Read a section to understand its main idea.\n2. Close the notes and write an explanation from memory.\n3. Reopen the notes and correct missing details.\n4. Solve a question from class.\n\n## Source note\nNo course document is linked yet, so this is a study routine rather than a subject explanation.'};
}

async function generateTutorial(){
  const course=selectedCourse('lessonCourse');
  if(!course){toast('Import or add your courses first.');return}
  studioNotice='';
  const sources=await loadCourseText(course.id);
  studioLesson=tutorialText(course,sources);
  studioNotice=sources.length?(studioLesson.text.includes('No searchable passage')?'No relevant passage matched the selected topic. The guide shows revision prompts, not invented course facts.':'Tutorial created from retrieved passages stored on this device. Check the cited locations in your class notes.'):'Study guide created from your course details. Add a textbook or slides for a guide that follows your class material more closely.';
  currentPage='study';render();document.querySelector('.generated-card')?.scrollIntoView({behavior:'smooth',block:'start'});
}function searchUrl(course){const q=[data.profile.institution,data.profile.country,data.profile.stage,data.profile.programme,data.profile.level,course?.code,course?.name,'official syllabus course outline curriculum'].filter(Boolean).join(' ');return`https://www.google.com/search?q=${encodeURIComponent(q)}`}

function localPractice(course,sources,count,style){
 const topicList=Array.isArray(course.topics)?course.topics:[];
 const query=topicList.slice(0,5).join(' ')||course.name||course.code||'';
 const requested=style==='mcq'?Math.max(count*4,16):Math.max(count,8);
 const passages=window.eduCourseIntelligence?.search(sources,query,requested)||[];
 if(style==='mcq'){
  const engine=window.eduCourseIntelligence;
  if(!engine)return {title:(course.code||course.name)+' · multiple-choice practice',source:'Course retrieval is unavailable',questions:[],requestedCount:count};
  // Use explicit course topics first. Clearly labelled document sections fill gaps,
  // allowing each correct passage to be contrasted with passages about other topics.
  const labels=[];
  const addLabel=value=>{
   const label=String(value||'').trim();
   if(label&&!labels.some(item=>item.toLocaleLowerCase()===label.toLocaleLowerCase()))labels.push(label);
  };
  topicList.forEach(addLabel);
  for(const source of sources){
   const index=source.index?.version===engine.version?source.index:engine.buildIndex(source.text);
   for(const chunk of index.chunks||[]){addLabel(chunk.section);if(labels.length>=12)break}
   if(labels.length>=12)break;
  }
  const groups=labels.map(topic=>{
   const passages=engine.search(sources,topic,20).map(item=>({...item,text:String(item.text||'').replace(/\s+/g,' ').trim().slice(0,220)})).filter(item=>item.text.length>=45);
   const seen=new Set();
   return {topic,passages:passages.filter(item=>{
    const key=item.text.toLocaleLowerCase();if(seen.has(key))return false;seen.add(key);return true;
   })};
  }).filter(group=>group.passages.length);
  if(groups.length<4)return {
   title:(course.code||course.name)+' · multiple-choice practice',
   source:'At least four distinct searchable topics or titled sections are needed for unambiguous choices',
   questions:[],requestedCount:count
  };
  const questions=[],usedAnswers=new Set(),answerOffsets=new Map(groups.map(group=>[group.topic,0]));
  let advanced=true;
  while(questions.length<count&&advanced){
   advanced=false;
   for(let targetIndex=0;targetIndex<groups.length&&questions.length<count;targetIndex++){
    const target=groups[targetIndex],offset=answerOffsets.get(target.topic)||0;
    const remaining=target.passages.slice(offset);
    const correct=remaining.find(item=>!usedAnswers.has(item.text.toLocaleLowerCase()));
    if(!correct)continue;
    const distractors=[];
    for(let step=1;step<groups.length&&distractors.length<3;step++){
     const other=groups[(targetIndex+step)%groups.length];
     const candidate=other.passages.find(item=>{
      const key=item.text.toLocaleLowerCase();
      return key!==correct.text.toLocaleLowerCase()&&!distractors.some(existing=>existing.text.toLocaleLowerCase()===key);
     });
     if(candidate)distractors.push(candidate);
    }
    if(distractors.length<3)continue;
    usedAnswers.add(correct.text.toLocaleLowerCase());
    answerOffsets.set(target.topic,offset+remaining.indexOf(correct)+1);
    const options=[correct,...distractors].map(item=>item.text),correctOption=questions.length%options.length;
    [options[0],options[correctOption]]=[options[correctOption],options[0]];
    questions.push({
     question:'Which passage best explains '+target.topic+' according to your course material?',
     answer:correct.text,options,correctOption,topic:target.topic,
     source:correct.name,location:correct.location,citation:correct.citation,materialId:correct.materialId
    });
    advanced=true;
   }
  }
  return {
   title:(course.code||course.name)+' · multiple-choice practice',
   source:questions.length?'Topic-based choices retrieved from your course materials':'Not enough distinct source passages to form single-answer questions',
   questions,requestedCount:count
  };
 }
 const questions=passages.slice(0,count).map((item,index)=>{
  const essay=style==='essay'||(style==='mixed'&&index%2===1);
  return {
   question:essay?'Using the cited passage, explain the idea in your own words, give an example from your course and state why it matters.':'Explain this idea from your course material in your own words: “'+item.text.slice(0,260)+'”',
   answer:item.text,
   source:item.name,
   location:item.location,
   citation:item.citation,
   materialId:item.materialId
  };
 });
 for(let i=0;questions.length<count&&topicList.length;i++){
  const topic=topicList[i%topicList.length],essay=style==='essay'||(style==='mixed'&&questions.length%2===1);
  questions.push({
   question:essay?'Write an exam-style response about '+topic+'. Support your explanation with a definition and a course example.':'Explain '+topic+' using your learning notes and give one example.',
   answer:'Use the terminology and examples from your instructor’s material for '+topic+'. No matching passage was retrieved for this topic, so check your notes before treating this prompt as course-specific.',
   source:'Course topic list',location:'No matching passage'
  });
 }
 return {
  title:(course.code||course.name)+' · practice',
  source:questions.some(question=>question.materialId)?'Retrieved passages from course materials':passages.length?'Course topic prompts · no matching source passages':'Course topic list',
  questions:questions.slice(0,count)
 };
}
async function generatePractice(){
  const course=selectedCourse('practiceCourseSelect')||selectedCourse('practiceCourse')||data.courses[0];
  if(!course){toast('Import or add your learning-area list first.');return}
  const count=Number(document.getElementById('questionCount')?.value)||10,style=document.getElementById('questionStyle')?.value||'mixed';
  const sources=await loadCourseText(course.id);
  const generated=localPractice(course,sources,count,style);
  if(!generated.questions.length){toast(style==='mcq'?'Multiple-choice questions need at least four distinct searchable topics or titled sections. Add clear course topics/headings or choose another question style.':'Add course topics or searchable learning materials before generating a practice set.');return}
  studioPractice=generated;if(generated.questions.length<count)toast('Created '+generated.questions.length+' of '+count+' requested questions. The available topics or sections limit the source material for this set.');window.practiceCourseId=course.id;currentPage='practice';render();document.querySelector('.practice-results')?.scrollIntoView({behavior:'smooth',block:'start'});
}

document.addEventListener('change',e=>{if(e.target.id==='materialImportFile'&&e.target.files?.length>1){e.stopImmediatePropagation();toast('Add materials one file at a time so you can link each one to the right course.');handleStudioFile('material',e.target.files[0])}},true);
document.addEventListener('change',e=>{if(e.target.id==='courseImportFile')handleStudioFile('courses',e.target.files[0]);if(e.target.id==='timetableImportFile')handleStudioFile('timetable',e.target.files[0]);if(e.target.id==='materialImportFile')handleStudioFile('material',e.target.files[0])});
document.addEventListener('submit',e=>{if(e.target.id==='availabilityForm'){e.preventDefault();saveAvailability(e.target)}});
document.addEventListener('click',e=>{const p=e.target.closest('[data-page="practice"]');if(p){window.practiceCourseId=document.getElementById('practiceCourse')?.value||'';queueMicrotask(render)}});
document.addEventListener('submit',e=>{
 if(e.target.id!=='onboardingForm')return;
 e.preventDefault();
 const fd=new FormData(e.target),days=fd.getAll('studyDay').map(Number),learnerType=String(fd.get('learnerType')||'').trim(),focus=String(fd.get('learningFocus')||'').trim(),formal=learnerType==='formal';
 if(!learnerType||!focus){toast('Choose your learning path and add what you are learning.');return}
 if(formal&&['institution','stage','programme','level','term'].some(key=>!String(fd.get(key)||'').trim())){toast('Formal education learners should complete their institution, learning stage, programme, level and academic period.');return}
 if(!days.length){toast('Choose at least one day you can learn.');return}
 const previousProfile={...data.profile};
 for(const key of ['country','institution','stage','programme','level','term'])data.profile[key]=String(fd.get(key)||'').trim();
 data.profile.learnerType=learnerType;data.profile.learningFocus=focus;data.profile.goal=data.profile.goal||'Make steady progress with learning';
 data.profile.weeklyGoal=Math.min(30,Math.max(1,Number(fd.get('weeklyGoal'))||5));
 data.profile.studyStart=fd.get('studyStart');data.profile.studyEnd=fd.get('studyEnd');
 data.profile.planSessionMinutes=Number(fd.get('planSessionMinutes'))||25;data.profile.sessionMinutes=data.profile.planSessionMinutes;
 data.profile.studyDays=days;data.profile.setupComplete=true;if(!save()){data.profile=previousProfile;return}setPage('my-study');toast('Your learning space is ready. Add a learning area to begin.');
});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  switch(b.dataset.action){
    case'generate-plan':generatePlan();break;
    case'download-course-template':courseTemplate();break;
    case'download-timetable-template':timetableTemplate();break;case'capture-course-photo':window.eduCapturePhonePhoto?.('courses');break;case'capture-timetable-photo':window.eduCapturePhonePhoto?.('timetable');break;case'capture-material-photo':window.eduCapturePhonePhoto?.('material');break;case'capture-document-photo':window.eduCapturePhonePhoto?.('document');break;
    case'edit-study-profile':editStudyProfile();break;
    case'open-practice':window.practiceCourseId=document.getElementById('practiceCourse')?.value||'';setPage('practice');break;
    case'generate-tutorial':generateTutorial();break;
    case'find-curriculum':findCurriculum();break;
    case'generate-practice':generatePractice();break;
    case'go-practice':window.practiceCourseId=data.courses.find(c=>c.name===studioLesson?.course)?.id||'';setPage('practice');break;
    case'delete-material':removeStoredMaterial(b.dataset.id);data.materials=data.materials.filter(m=>m.id!==b.dataset.id);data.materialText=(data.materialText||[]).filter(m=>m.id!==b.dataset.id);save();toast('Material removed from this device');break;
  }
});

function findCurriculum(){
  const course=selectedCourse('lessonCourse')||data.courses[0],url=searchUrl(course),searchTab=window.open(url,'_blank');
  if(searchTab){searchTab.opener=null;studioNotice='Opened a web search for a course outline. Check that the result matches your school, level, and current curriculum.'}
  else studioNotice='Your browser blocked the web search. Allow pop-ups for Eduvia, then try again.';
  render();
}
function isStudyCompletion(item){
  if(item.type)return item.type==='study';
  const event=(data.events||[]).find(x=>x.id===item.eventId);
  return event?event.type==='study':String(item.eventId||'').startsWith('focus-');
}
function studyWasDoneOn(date){return (data.completed||[]).some(item=>item.date===date&&isStudyCompletion(item))}
function studyStreak(){
  const today=todayISO(),start=studyWasDoneOn(today)?0:1;
  let count=0;
  for(let offset=start;offset<365;offset++){
    const date=addDays(parseISO(today),-offset).toLocaleDateString('en-CA');
    if(!studyWasDoneOn(date))break;
    count++;
  }
  return count;
}
function studyConsistency(){
  const today=todayISO(),last30=addDays(parseISO(today),-29).toLocaleDateString('en-CA');
  const start=(data.profile.setupAt&&data.profile.setupAt>last30)?data.profile.setupAt:last30;
  const studyEvents=(data.events||[]).filter(event=>event.type==='study');
  const hasStudySchedule=studyEvents.length>0;
  const studyDays=(data.profile.studyDays||[]).map(Number);
  let expected=0,completed=0;
  for(let offset=0;offset<30;offset++){
    const date=addDays(parseISO(start),offset).toLocaleDateString('en-CA');
    if(date>today)break;
    const day=parseISO(date).getDay();
    const planned=hasStudySchedule?studyEvents.filter(event=>{
      const created=event.createdAt||today;
      return created<=date&&(event.date?event.date===date:Number(event.day)===day);
    }).length:(studyDays.includes(day)?1:0);
    expected+=planned;
    if(planned)completed+=Math.min(planned,(data.completed||[]).filter(item=>item.date===date&&isStudyCompletion(item)).length);
  }
  return {expected,ratio:expected?completed/expected:null};
}

function daymarkGreeting(){
  const hour=new Date().getHours();
  if(hour>=5&&hour<12)return 'Good morning';
  if(hour>=12&&hour<17)return 'Good afternoon';
  return 'Good evening';
}
function daymarkGreetingTitle(){return daymarkGreeting()}
window.daymarkGreeting=daymarkGreeting;
document.addEventListener('submit',e=>{
  if(e.target.id!=='onboardingForm')return;
  const fd=new FormData(e.target);
  if(fd.get('stage')&&fd.getAll('studyDay').length)data.profile.setupAt=todayISO();
},true);
function stageLabel(stage){return ({primary:'Primary / elementary',secondary:'Secondary / high school',college:'College / polytechnic',undergraduate:'University / undergraduate',postgraduate:'Postgraduate',vocational:'Vocational / professional training',other:'Other / self-directed learning'})[stage]||stage||'Not set'}
function recordDate(timestamp){return new Date(timestamp||Date.now()).toLocaleDateString('en-NG',{year:'numeric',month:'short',day:'numeric'})}
function academicResultRowMarkup(result={}){
  return '<div class="academic-result-row"><input name="academicSubject" aria-label="Subject or course" maxlength="100" placeholder="Subject or course" value="'+safe(result.subject||'')+'"><input name="academicCode" aria-label="Course code (optional)" maxlength="30" placeholder="Code (optional)" value="'+safe(result.code||'')+'"><input name="academicGrade" aria-label="Grade or score" maxlength="60" placeholder="Grade, score, or Pass" value="'+safe(result.grade||'')+'"><label class="carryover-row-toggle"><input name="academicCarryover" type="checkbox" value="1" '+(result.carryover?'checked':'')+'> Carryover</label><button type="button" class="icon-btn" data-action="remove-academic-result-row" title="Remove row" aria-label="Remove result row">×</button></div>';
}
function academicResultRowsMarkup(results=[],courses=[]){
  const initial=results.length?results:(courses||[]).map(course=>({subject:course.name,code:course.code||'',grade:''}));
  if(!initial.length)initial.push({});
  return '<div class="academic-result-table-head"><span>Subject or course</span><span>Code (optional)</span><span>Grade or score</span><span>Carryover next academic year</span><span></span></div><div id="academicResultRows">'+initial.map(academicResultRowMarkup).join('')+'</div><button type="button" class="secondary-btn" data-action="add-academic-result-row">＋ Add a subject or course</button>';
}
function collectAcademicResults(formData,optional=false){
  const subjects=formData.getAll('academicSubject'),codes=formData.getAll('academicCode'),grades=formData.getAll('academicGrade');
  const carryovers=[...document.querySelectorAll('#academicResultRows .academic-result-row')].map(row=>!!row.querySelector('[name="academicCarryover"]')?.checked);
  const rows=subjects.map((subject,index)=>({subject:String(subject||'').trim(),code:String(codes[index]||'').trim(),grade:String(grades[index]||'').trim(),carryover:carryovers[index]||false}));
  if(optional){
    if(rows.some(row=>row.grade&&!row.subject)){toast('Add a subject or course name for each grade or score.');return null}
    return rows.filter(row=>row.subject&&(row.grade||row.carryover));
  }
  if(rows.some(row=>(row.subject||row.code||row.grade||row.carryover)&&(!row.subject||(!row.grade&&!row.carryover)))){
    toast('For each result, add a subject and either its grade or mark it as a carryover.');return null;
  }
  return rows.filter(row=>row.subject&&(row.grade||row.carryover));
}
function academicResultFields(results=[],courses=[]){
  return '<section class="academic-result-section"><div class="panel-head"><div><h3>Subject or course results</h3><p>Enter the grade, score, or outcome exactly as your school reported it.</p></div></div>'+academicResultRowsMarkup(results,courses)+'</section>';
}
function educationStages(){return [['primary','Primary / elementary'],['secondary','Secondary / high school'],['college','College / polytechnic'],['undergraduate','University / undergraduate'],['postgraduate','Postgraduate'],['vocational','Vocational / professional training'],['other','Other / self-directed learning']]}
function educationRecordSummary(record){
  const profile=record.profile||{};
  return {id:record.id,label:record.label||'Education record',recordType:record.recordType||'term-archive',stage:record.stage||profile.stage||'',level:record.level||profile.level||'',term:record.term||profile.term||'',institution:record.institution||record.school||profile.institution||'',programme:record.programme||profile.programme||'',academicYear:record.academicYear||'',archivedAt:record.archivedAt||record.recordedAt||Date.now(),courseCount:(record.courses||[]).length,classCount:(record.events||[]).filter(event=>event.type==='class').length,studyCount:(record.completed||[]).filter(item=>item.type==='study'||(!item.type&&String(item.eventId||'').startsWith('focus-'))).length,studyMinutes:Number(record.studyMinutes)||0,resultCount:(record.results||[]).length};
}
function upsertEducationSummary(summary){data.academicHistory=Array.isArray(data.academicHistory)?data.academicHistory:[];const index=data.academicHistory.findIndex(item=>item.id===summary.id);if(index<0)data.academicHistory.unshift(summary);else data.academicHistory[index]=summary}

function academicYearKey(value=''){
  const match=String(value||'').match(/((?:19|20)\d{2})\s*[\/–-]\s*((?:(?:19|20)\d{2})|\d{2})/);
  if(!match)return '';
  const start=Number(match[1]),rawEnd=match[2];
  const end=rawEnd.length===2?Math.floor(start/100)*100+Number(rawEnd):Number(rawEnd);
  return end===start+1?start+'/'+end:'';
}
function firstAcademicYear(...values){
  for(const value of values){const year=academicYearKey(value);if(year)return year}
  return '';
}
function syncPendingCarryovers(record){
  data.pendingCarryovers=Array.isArray(data.pendingCarryovers)?data.pendingCarryovers:[];
  const previous=new Map(data.pendingCarryovers.map(item=>[item.id,item]));
  data.pendingCarryovers=data.pendingCarryovers.filter(item=>item.sourceRecordId!==record.id);
  const profile=record.profile||{};
  const sourceYear=firstAcademicYear(record.academicYear,profile.academicSession,profile.academicYear,record.term,profile.term);
  (record.results||[]).forEach((result,index)=>{
    if(!result.carryover||!result.subject)return;
    const key=String(record.id)+':'+index,prior=previous.get(key);
    data.pendingCarryovers.push({
      id:key,
      sourceRecordId:record.id,
      subject:result.subject,
      code:result.code||'',
      grade:result.grade||'',
      sourcePeriod:[record.level||profile.level,record.term||profile.term,sourceYear].filter(Boolean).join(' · ')||record.label||'Previous academic year',
      sourceAcademicYear:sourceYear,
      status:prior?.status||'pending',
      activatedAcademicYear:prior?.activatedAcademicYear||'',
      activatedAt:prior?.activatedAt||null,
      createdAt:prior?.createdAt||Date.now()
    });
  });
}
function openCarryoverActivation(){
  const pending=(data.pendingCarryovers||[]).filter(item=>item.status!=='active');
  if(!pending.length){toast('There are no pending carryover courses.');return}
  const years=[...new Set(pending.map(item=>item.sourceAcademicYear).filter(Boolean))];
  const currentYear=firstAcademicYear(data.profile.academicSession,data.profile.academicYear,data.profile.term);
  if(!currentYear){toast('Set the active academic year in your learning profile before activating carryovers. Use a format such as 2026/2027.');return}
  if(pending.some(item=>!academicYearKey(item.sourceAcademicYear))){toast('Some carryover records are missing a valid original academic year. Edit those results before activating carryovers.');return}
  const body='<p class="preview-note"><strong>Important:</strong> Use this only after the previous academic year is complete. Carryovers must not be activated when moving from first semester to second semester. First move the active student profile into the new academic year, then add these carryovers.</p>'+
    field('New academic year','nextAcademicYear','<input id="f-nextAcademicYear" name="nextAcademicYear" required maxlength="24" placeholder="e.g. 2027/2028">')+
    '<div class="note-callout">'+pending.length+' carryover course(s) are waiting. They will be added to the active course list only after this confirmation.</div>'+
    '<label class="form-field"><span><input type="checkbox" name="confirmNewYear" value="yes" required> I confirm that this is a different academic year, not the next semester of the same year.</span></label>';
  openModal('Start a new academic year','Activate carryover courses for the year the student is now entering.',body,'Add carryovers to new year',fd=>{
    const entered=String(fd.get('nextAcademicYear')||'').trim(),enteredKey=academicYearKey(entered);
    if(!enteredKey){toast('Enter a valid academic year such as 2027/2028.');return}
    if(enteredKey!==currentYear){
      toast('The new year must match the active academic year in the student profile. Do not activate carryovers during the second semester of the old year.');return;
    }
    if(years.some(year=>year===enteredKey)){
      toast('A carryover can only be activated in an academic year after its original year.');return;
    }
    let added=0;
    for(const item of pending){
      const exists=data.courses.some(course=>(item.code&&String(course.code||'').toLowerCase()===item.code.toLowerCase())||String(course.name||'').trim().toLowerCase()===item.subject.trim().toLowerCase());
      if(!exists){
        data.courses.push({id:id(),name:item.subject,code:item.code||'',instructor:'',note:'Carryover course from '+item.sourcePeriod+'. Retake in academic year '+entered+'.',topics:[],credits:0,color:COLORS[data.courses.length%COLORS.length],carryover:true,carryoverSourceRecordId:item.sourceRecordId});
        added++;
      }
      item.status='active';
      item.activatedAcademicYear=entered;
      item.activatedAt=Date.now();
    }
    closeModal();save();
    toast(added?added+' carryover course(s) added for '+entered+'.':'These carryovers are already in the active course list.');
  });
}


document.addEventListener('change',event=>{
  if(!['f-learnerType','f-profile-learnerType'].includes(event.target?.id))return;
  const form=event.target.closest('form'),formal=event.target.value==='formal';
  const groups=form?.querySelectorAll('[data-profile-formal-only],[data-setup-formal-only],[data-learning-profile-formal]')||[];
  groups.forEach(group=>{
    group.hidden=!formal;
    group.querySelectorAll('[name]').forEach(control=>{
      control.required=formal&&['institution','stage','degreeProgramme','programme','level','academicSession','term'].includes(control.name);
    });
  });
});
document.addEventListener('submit',event=>{
  if(event.target.id!=='studentProfileForm')return;
  event.preventDefault();
  const fd=new FormData(event.target),name=String(fd.get('name')||'').trim(),focus=String(fd.get('learningFocus')||'').trim(),learnerType=String(fd.get('learnerType')||'independent');
  if(!name||!focus){toast('Enter your name and main learning focus before saving.');return}
  const requiredFormal=['institution','stage','degreeProgramme','level','academicSession'];
  if(learnerType==='formal'&&requiredFormal.some(key=>!String(fd.get(key)||'').trim())){
    toast('Complete your school, learning stage, programme, level and academic session for a formal education profile.');
    return;
  }
  for(const key of ['name','email','country','learnerType','learningFocus','institution','stage','department','matricNumber','faculty','specialization','studyMode','studentStatus','level','academicSession','semester','degreeProgramme'])data.profile[key]=String(fd.get(key)||'').trim();
  data.profile.programme=data.profile.degreeProgramme||data.profile.programme||data.profile.learningFocus||'';
  save();
  toast('Your learning profile has been saved.');
});

function renderProfile(){
  const profile=data.profile||{},stages=educationStages(),learnerType=learnerTypeOf(profile),formal=learnerType==='formal';
  const types=[['formal','Formal education'],['independent','Self-directed learning'],['professional','Professional development'],['exam-prep','Exam or certification preparation'],['general','General knowledge and personal interests']];
  const typeOptions=types.map(([v,t])=>'<option value="'+v+'" '+(learnerType===v?'selected':'')+'>'+t+'</option>').join('');
  const stageOptions=stages.map(([v,t])=>'<option value="'+v+'" '+(profile.stage===v?'selected':'')+'>'+t+'</option>').join('');
  const avatar=profile.avatarData?'<img src="'+safe(profile.avatarData)+'" alt="Profile photograph">':'<span>'+safe(Array.from(String(profile.name||'Learner').trim())[0]?.toUpperCase()||'L')+'</span>';
  const info=(symbol,label,value,colour='blue')=>'<div class="student-id-field"><span class="student-id-icon '+colour+'">'+symbol+'</span><div class="student-id-copy"><span>'+label+'</span><strong>'+safe(value||'Not provided')+'</strong></div></div>';
  const primary=[info('✎','Full name',profile.name||'Learner','navy'),info('✦','Learning focus',profile.learningFocus||(formal?(profile.degreeProgramme||profile.programme):''),'purple'),info('◎','Learning path',learnerTypeLabel(learnerType),'blue'),info('⌖','Country',profile.country,'green')];
  const secondary=formal?[
    info('▣','Student number',profile.matricNumber,'gold'),info('▦','Faculty',profile.faculty,'green'),info('▤','Department',profile.department,'purple'),
    info('◈','Programme',profile.degreeProgramme||profile.programme,'blue'),info('♙','Learning mode',profile.studyMode,'gold'),info('●','Status',profile.studentStatus||'Active','grey')
  ]:[
    info('♙','Learning mode',profile.studyMode,'gold'),info('●','Learning status',profile.studentStatus||'Active','grey')
  ];
  const bottom=formal?[
    info('↗','Level',profile.level,'navy'),info('▣','Academic session',profile.academicSession||profile.term,'blue'),info('▦','Term or semester',profile.semester,'purple')
  ]:[
    info('◎','Weekly learning goal',(Number(profile.weeklyGoal)||5)+' sessions','navy'),info('◷','Session length',(Number(profile.planSessionMinutes||profile.sessionMinutes)||25)+' minutes','blue'),
    info('▤','Learning days',(profile.studyDays||[]).map(day=>STUDIO_DAYS[day]?.slice(0,3)).filter(Boolean).join(', '),'purple')
  ];
  const card='<section class="panel student-id-card">'+
    '<header class="student-id-header"><div><strong>'+safe(profile.learningFocus||(formal?profile.institution:'')||'Eduvia')+'</strong><span>LEARNING PROFILE · '+safe(learnerTypeLabel(learnerType).toUpperCase())+'</span></div><span class="student-id-mark">'+(formal?'ST':'LP')+'</span></header>'+
    '<div class="student-id-top"><div class="student-id-photo-col"><div class="student-id-photo">'+avatar+'</div></div><div class="student-id-primary-grid">'+primary.join('')+'</div></div>'+
    '<div class="student-id-secondary-grid">'+secondary.join('')+'</div><div class="student-id-divider"></div><div class="student-id-bottom-grid">'+bottom.join('')+'</div></section>';
  const editForm='<details class="profile-edit-details"><summary><span>Edit learning profile</span><small>Update your learning path, details and photograph</small></summary>'+
    '<form id="studentProfileForm" class="profile-edit-panel">'+profilePhotoSettingsMarkup()+
      '<div class="form-grid">'+field('Full name','name','<input id="f-name" name="name" required maxlength="60" autocomplete="name" value="'+safe(profile.name||'')+'" placeholder="Your full name">')+field('Learning path','learnerType','<select id="f-learnerType" name="learnerType" required>'+typeOptions+'</select>')+'</div>'+
      '<div class="form-grid">'+field('What are you learning?','learningFocus','<input id="f-learningFocus" name="learningFocus" required maxlength="120" value="'+safe(profile.learningFocus||profile.degreeProgramme||profile.programme||'')+'" placeholder="e.g. Data analysis, French, Computer Science">')+field('Country','country',studioCountrySelect(profile.country))+'</div>'+
      '<div class="profile-formal-fields" data-profile-formal-only '+(formal?'':'hidden')+'>'+
      '<div class="form-grid">'+field('School, organisation or provider','institution','<input id="f-institution" name="institution" maxlength="100" value="'+safe(profile.institution||'')+'" placeholder="Only if applicable">')+field('Learning stage','stage','<select id="f-stage" name="stage"><option value="">Choose if applicable</option>'+stageOptions+'</select>')+'</div>'+
      '<div class="form-grid">'+field('Programme, course or qualification','degreeProgramme','<input id="f-degreeProgramme" name="degreeProgramme" maxlength="120" value="'+safe(profile.degreeProgramme||profile.programme||'')+'" placeholder="Only if applicable">')+field('Level, grade or experience level','level','<input id="f-level" name="level" maxlength="40" value="'+safe(profile.level||'')+'" placeholder="e.g. 300 Level, beginner or advanced">')+'</div>'+
      
        '<div class="form-grid">'+field('Academic session or period','academicSession','<input id="f-academicSession" name="academicSession" maxlength="40" value="'+safe(profile.academicSession||profile.term||'')+'" placeholder="e.g. 2026/2027">')+field('Term or semester','semester','<input id="f-semester" name="semester" maxlength="50" value="'+safe(profile.semester||'')+'" placeholder="Only if applicable">')+'</div>'+
        '<div class="form-grid">'+field('Faculty','faculty','<input id="f-faculty" name="faculty" maxlength="120" value="'+safe(profile.faculty||'')+'" placeholder="Only if applicable">')+field('Department','department','<input id="f-department" name="department" maxlength="100" value="'+safe(profile.department||'')+'" placeholder="Only if applicable">')+'</div>'+
        '<div class="form-grid">'+field('Student ID','matricNumber','<input id="f-matricNumber" name="matricNumber" maxlength="40" value="'+safe(profile.matricNumber||'')+'" placeholder="Only if applicable">')+'</div></div>'+
      '<div class="form-grid">'+field('Learning mode','studyMode','<input id="f-studyMode" name="studyMode" maxlength="80" value="'+safe(profile.studyMode||'')+'" placeholder="e.g. Full-time, online or self-paced">')+field('Learning status','studentStatus','<select id="f-studentStatus" name="studentStatus"><option '+(['Active','active'].includes(profile.studentStatus)?'selected':'')+' value="Active">Active</option><option '+(['Paused','Inactive'].includes(profile.studentStatus)?'selected':'')+' value="Paused">Paused</option><option '+(['Completed','Graduated'].includes(profile.studentStatus)?'selected':'')+' value="Completed">Completed</option><option '+(profile.studentStatus==='Deferred'?'selected':'')+' value="Deferred">Deferred</option></select>')+'</div>'+
      '<div class="form-grid">'+field('Email address','email','<input id="f-email" name="email" type="email" maxlength="120" autocomplete="email" value="'+safe(profile.email||'')+'" placeholder="you@example.com">')+'</div>'+
      '<div class="profile-form-actions"><button class="primary-btn" type="submit">Save learning profile</button></div>'+
    '</form></details>';
  return card.slice(0,-'</section>'.length)+editForm+'</section>';
}
function renderEducation(compact=false){
  const profile=data.profile,history=[...(data.academicHistory||[])].sort((a,b)=>(b.archivedAt||0)-(a.archivedAt||0));
  const currentLabel=[profile.institution,stageLabel(profile.stage),profile.programme,profile.level,profile.term].filter(Boolean).join(' · ');
  const resultCount=history.reduce((total,record)=>total+Number(record.resultCount||0),0);
  const historyCards=history.map(record=>{
    const isResultEntry=record.recordType==='results',period=[record.institution,record.stage?stageLabel(record.stage):'',record.programme,record.level,record.term,record.academicYear].filter(Boolean).join(' · ');
    const description=isResultEntry?Number(record.resultCount||0)+' subject results · Saved '+recordDate(record.archivedAt):Number(record.courseCount||0)+' courses · '+Number(record.classCount||0)+' classes · '+Number(record.studyCount||0)+' completed study sessions · '+Number(record.resultCount||0)+' results';
    return '<article class="course-card"><div class="course-card-head"><span class="habit-badge">▤</span><div><h3>'+safe(record.label||'Education record')+'</h3><span class="course-code">'+safe(period||'Past education record')+'</span></div></div><p class="course-desc">'+safe(description)+'</p><div class="course-card-foot"><span>'+(!isResultEntry&&record.studyMinutes?Number(record.studyMinutes)+' focused minutes':'Education record')+'</span><div class="academic-history-actions"><button class="secondary-btn" data-action="view-academic-record" data-id="'+safe(record.id)+'">View record</button><button class="icon-btn" title="Edit results" aria-label="Edit results" data-action="edit-academic-results" data-id="'+safe(record.id)+'">✎</button>'+(isResultEntry?'<button class="icon-btn" title="Remove record" aria-label="Remove record" data-action="delete-academic-record" data-id="'+safe(record.id)+'">×</button>':'')+'</div></div></article>';
  }).join('');
  const currentStudies=(data.completed||[]).filter(item=>isStudyCompletion(item)).length;
  const carryovers=(data.pendingCarryovers||[]).filter(item=>item.status!=='active');
  const carryoverPanel=carryovers.length?'<section class="panel carryover-panel"><div class="panel-head"><div><h3>Carryover courses · next academic year</h3><p>These remain pending throughout the current academic year, including the second semester.</p></div><span class="upload-count">'+carryovers.length+'</span></div><div class="resource-list">'+carryovers.map(item=>'<article class="resource-card"><div class="resource-icon">↻</div><div style="min-width:0;flex:1"><strong>'+safe(item.subject)+'</strong><p>'+safe(item.code||'No course code')+' · '+safe(item.sourcePeriod||'Previous academic year')+'</p></div></article>').join('')+'</div><button class="primary-btn" data-action="activate-carryovers-new-year">Start new academic year & add carryovers</button></section>':'';
  const actions='<div class="education-actions"><button class="secondary-btn" data-action="add-academic-results">＋ Add past results</button><button class="primary-btn" data-action="archive-term">Finish and archive current term</button></div>';
  return (compact?'':pageHead('YOUR EDUCATION','My education journey','Keep a record of your learning from any starting point, then add results as you move through each term or school year.',actions))+
    '<section class="panel"><div class="panel-head"><div><h3>Current study period</h3><p>Your active profile and planner</p></div><span class="habit-badge">↗</span></div><strong>'+safe(currentLabel||'Add your current school and level in Study profile')+'</strong><div class="stats-row education-stats" style="margin-top:17px"><div class="stat-card"><div class="stat-label">ACTIVE COURSES</div><div class="stat-value">'+data.courses.length+'</div></div><div class="stat-card"><div class="stat-label">COMPLETED STUDY SESSIONS</div><div class="stat-value">'+currentStudies+'</div></div><div class="stat-card"><div class="stat-label">SAVED PERIODS</div><div class="stat-value">'+history.length+'</div></div><div class="stat-card"><div class="stat-label">RESULTS RECORDED</div><div class="stat-value">'+resultCount+'</div></div></div></section>'+
    '<div class="note-callout">Add earlier results without changing your current timetable or courses. You can start at any level, from Primary 4 to university or postgraduate study. When you advance, enter this term’s results as you archive it. Store report cards or transcripts in Personal documents.</div>'+carryoverPanel+
    '<div class="section-title-row"><h3>Education history and results</h3><span>'+history.length+' saved</span></div>'+
    (history.length?'<div class="course-grid">'+historyCards+'</div>':emptyState('▤','Start your education history','Add past school years, semesters, or sessions and record each subject’s result. Your current study plan stays as it is.','Add past results','add-academic-results'));
}
function addAcademicResultRow(){const rows=document.getElementById('academicResultRows');if(rows)rows.insertAdjacentHTML('beforeend',academicResultRowMarkup())}
function removeAcademicResultRow(button){const rows=document.getElementById('academicResultRows'),row=button.closest('.academic-result-row');if(!rows||!row)return;if(rows.children.length===1){row.querySelectorAll('input').forEach(input=>input.value='');return}row.remove()}
function academicResultFormBody(record=null,archiveMode=false){
  const profile=record?.profile||data.profile,stages=educationStages(),stage=record?.stage||profile.stage||'',resultRows=academicResultFields(record?.results||[],archiveMode?(record?.courses||[]):[]);
  if(archiveMode)return '<p class="preview-note">Add this period’s results before moving forward. You can enter marks, letter grades, or outcomes such as Pass. Leaving the rows empty is okay.</p>'+resultRows+field('Overall note (optional)','resultsNotes','<textarea id="f-resultsNotes" name="resultsNotes" maxlength="1000" placeholder="Honours, teacher comments, or other details">'+safe(record?.resultsNotes||'')+'</textarea>',true);
  const stageOptions=stages.map(([value,label])=>'<option value="'+value+'" '+(stage===value?'selected':'')+'>'+label+'</option>').join('');
  return '<div class="form-grid">'+field('School or provider (optional)','school','<input id="f-school" name="school" maxlength="120" value="'+safe(record?.school||record?.institution||data.profile.institution||'')+'" placeholder="School name">')+field('Learning stage','stage','<select id="f-stage" name="stage"><option value="">Choose one</option>'+stageOptions+'</select>')+'</div>'+ 
    '<div class="form-grid">'+field('Programme or class (optional)','programme','<input id="f-programme" name="programme" maxlength="100" value="'+safe(record?.programme||data.profile.programme||'')+'" placeholder="e.g. Primary school, Computer Science">')+field('Level, grade, or year','level','<input id="f-level" name="level" required maxlength="60" value="'+safe(record?.level||data.profile.level||'')+'" placeholder="e.g. Primary 4, 300 level">')+'</div>'+ 
    '<div class="form-grid">'+field('Academic year or session (optional)','academicYear','<input id="f-academicYear" name="academicYear" maxlength="60" value="'+safe(record?.academicYear||'')+'" placeholder="e.g. 2024/2025">')+field('Term, semester, or session (optional)','term','<input id="f-term" name="term" maxlength="60" value="'+safe(record?.term||'')+'" placeholder="e.g. First term, Semester 1">')+'</div>'+resultRows+field('Overall note (optional)','resultsNotes','<textarea id="f-resultsNotes" name="resultsNotes" maxlength="1000" placeholder="Honours, teacher comments, or other details">'+safe(record?.resultsNotes||record?.notes||'')+'</textarea>',true)+'<p class="preview-note">Enter results in your school’s own format. To keep a photo of the report card or transcript, add it in Personal documents.</p>';
}
function openAcademicResultsForm(record=null,archiveMode=false){
  const body=academicResultFormBody(record,archiveMode),isEdit=Boolean(record),title=archiveMode?(isEdit?'Update saved term results':'Add term results'):isEdit?'Edit education results':'Add past education results';
  openModal(title,archiveMode?'Update grades for this archived period.':'Record a previous school year, semester, or session without changing your current planner.',body,archiveMode?'Save results':isEdit?'Save changes':'Save results',async fd=>{
    const results=collectAcademicResults(fd,archiveMode);if(!results)return;if(!archiveMode&&!results.length){toast('Add at least one subject or course with a grade or score.');return}
    const now=Date.now();let updated;
    if(archiveMode){updated={...record,results,resultsNotes:String(fd.get('resultsNotes')||'').trim()};updated.resultCount=results.length}
    else{
      const stage=String(fd.get('stage')||'').trim(),level=String(fd.get('level')||'').trim(),term=String(fd.get('term')||'').trim(),academicYear=String(fd.get('academicYear')||'').trim(),institution=String(fd.get('school')||'').trim(),programme=String(fd.get('programme')||'').trim();
      const label=[level,term,academicYear].filter(Boolean).join(' · ')||[stageLabel(stage),academicYear].filter(Boolean).join(' · ')||'Education results';
      updated={id:record?.id||id(),recordType:'results',label,institution,school:institution,stage,level,term,academicYear,programme,results,resultsNotes:String(fd.get('resultsNotes')||'').trim(),recordedAt:record?.recordedAt||now};
    }
    try{await putStudioRecord('academicRecords',updated)}catch(error){toast('Could not save these results: '+(error.message||'storage is unavailable'));return}
    syncPendingCarryovers(updated);
    upsertEducationSummary(educationRecordSummary(updated));closeModal();save();toast(archiveMode?'Term results saved':'Education results saved');
  });
}
async function editAcademicResults(recordId){try{const record=await getStudioRecord('academicRecords',recordId);if(!record){toast('This education record is unavailable on this device. Import the backup that contains it.');return}openAcademicResultsForm(record,record.recordType!=='results')}catch(error){toast('Could not open this education record: '+(error.message||'storage is unavailable'))}}
async function deleteAcademicRecord(recordId){if(!confirm('Remove this past education results record from your history?'))return;try{await deleteStudioRecord('academicRecords',recordId);data.academicHistory=(data.academicHistory||[]).filter(record=>record.id!==recordId);data.pendingCarryovers=(data.pendingCarryovers||[]).filter(item=>item.sourceRecordId!==recordId);closeModal();save();toast('Education record removed')}catch(error){toast('Could not remove this record: '+(error.message||'storage is unavailable'))}}
function archiveCurrentTerm(){
  const profile=data.profile,defaultLabel=[stageLabel(profile.stage),profile.level,profile.term].filter(Boolean).join(' · ')||'Current study period';
  const stages=educationStages();
  const stageOptions=stages.map(([value,label])=>'<option value="'+value+'" '+(profile.stage===value?'selected':'')+'>'+label+'</option>').join('');
  const body=field('Archive label','archiveLabel','<input id="f-archiveLabel" name="archiveLabel" required maxlength="120" value="'+safe(defaultLabel)+'">')+
    '<div class="form-grid">'+field('Next level or year','nextLevel','<input id="f-nextLevel" name="nextLevel" maxlength="40" value="'+safe(profile.level||'')+'" placeholder="e.g. 400 level, MSc, PhD">')+
    field('Next academic year/session','nextAcademicSession','<input id="f-nextAcademicSession" name="nextAcademicSession" required maxlength="24" value="'+safe(profile.academicSession||academicYearKey(profile.term))+'" placeholder="e.g. 2027/2028">')+'</div>'+
    '<div class="form-grid">'+field('Next term or semester','nextTerm','<input id="f-nextTerm" name="nextTerm" maxlength="60" placeholder="e.g. Semester 2">')+
    field('Next education stage','nextStage','<select id="f-nextStage" name="nextStage">'+stageOptions+'</select>')+'</div>'+
    '<p class="preview-note">Your courses, timetable, reflections, deadlines, exams, revision plans, mock papers and topic mastery will be saved in this term’s archive. Period-specific records will reset for the new term. Your personal documents, uploaded materials, flashcards and roadmaps will remain available.</p>'+academicResultFields([],data.courses)+field('Overall result note (optional)','resultsNotes','<textarea id="f-resultsNotes" name="resultsNotes" maxlength="1000" placeholder="Honours, teacher comments, or other details"></textarea>',true);
  openModal('Finish and archive this term','Save this period before moving to the next term. Carryover courses stay pending until a new academic year.',body,'Archive and start next term',async fd=>{
    const courses=JSON.parse(JSON.stringify(data.courses||[])),events=JSON.parse(JSON.stringify(data.events||[])),completed=JSON.parse(JSON.stringify(data.completed||[])),resources=JSON.parse(JSON.stringify(data.resources||[])),materials=JSON.parse(JSON.stringify(data.materials||[]));
    const archiveId=id(),label=String(fd.get('archiveLabel')||defaultLabel).trim(),studyItems=completed.filter(item=>item.type==='study'||(!item.type&&String(item.eventId||'').startsWith('focus-')));
    const studyMinutes=studyItems.reduce((total,item)=>total+(Number(item.minutes)||Number(data.profile.sessionMinutes)||0),0);
    const materialRecords=[];for(const material of materials){const saved=await readMaterial(material.id);if(saved?.text)materialRecords.push(saved)}
    const nextAcademicYear=String(fd.get('nextAcademicSession')||'').trim();
    if(!academicYearKey(nextAcademicYear)){toast('Enter the next academic year in a valid format, such as 2027/2028.');return}
    const results=collectAcademicResults(fd,true);if(!results)return;
    const archive={id:archiveId,label,recordType:'term-archive',stage:data.profile.stage||'',level:data.profile.level||'',term:data.profile.term||'',institution:data.profile.institution||'',programme:data.profile.programme||'',archivedAt:Date.now(),profile:JSON.parse(JSON.stringify(data.profile)),courses,events,completed,resources,materials,materialText:JSON.parse(JSON.stringify(data.materialText||[])),materialRecords,studyRecords:JSON.parse(JSON.stringify(data.studyRecords||[])),deadlines:JSON.parse(JSON.stringify(data.deadlines||[])),exams:JSON.parse(JSON.stringify(data.exams||[])),revisionTasks:JSON.parse(JSON.stringify(data.revisionTasks||[])),mockExamAttempts:JSON.parse(JSON.stringify(data.mockExamAttempts||[])),activeMockExam:JSON.parse(JSON.stringify(data.activeMockExam||null)),lastMockExam:JSON.parse(JSON.stringify(data.lastMockExam||null)),flashcards:JSON.parse(JSON.stringify(data.flashcards||[])),topicMastery:JSON.parse(JSON.stringify(data.topicMastery||{})),imports:JSON.parse(JSON.stringify(data.imports||{courses:[],timetable:[]})),studyPlan:data.studyPlan||null,results,resultsNotes:String(fd.get('resultsNotes')||'').trim()};
    const summary={...educationRecordSummary(archive),studyMinutes};
    try{await putStudioRecord('academicRecords',archive)}catch(error){toast('Could not save this term to local storage: '+(error.message||'storage is unavailable'));return}
    const previousData=JSON.parse(JSON.stringify(data));
    syncPendingCarryovers(archive);
    data.academicHistory.unshift(summary);
    data.courses=[];data.events=[];data.completed=[];data.studyRecords=[];data.deadlines=[];data.exams=[];data.revisionTasks=[];data.mockExamAttempts=[];data.activeMockExam=null;data.lastMockExam=null;data.topicMastery={};data.studyPlan=null;data.imports={courses:[],timetable:[]};
    // Keep reusable assets available in the new period, but unlink them from archived courses.
    const archivedCourseNames=new Map(courses.map(course=>[String(course.id),course.name||'']));
    for(const collection of [data.resources,data.materials,data.materialText,data.personalDocuments,data.flashcards,data.roadmaps])for(const item of collection||[]){
      if(item&&item.courseId){item.courseName=item.courseName||archivedCourseNames.get(String(item.courseId))||'';item.courseId=''}
    }
    data.profile.stage=String(fd.get('nextStage')||data.profile.stage||'');data.profile.level=String(fd.get('nextLevel')||'').trim();data.profile.academicSession=nextAcademicYear;data.profile.term=String(fd.get('nextTerm')||'').trim();data.profile.setupAt=todayISO();
    if(!save()){
      data=previousData;
      try{await deleteStudioRecord('academicRecords',archiveId)}catch{}
      render();toast('The archive was saved, but Eduvia could not save the new-term state. No term rollover was applied.');return;
    }
    closeModal();toast('Term archived. Your next study period is ready.');
  });
}
async function viewAcademicRecord(recordId){
  try{
    const record=await getStudioRecord('academicRecords',recordId);
    if(!record){toast('This saved term is not available in this browser. Import the portable backup that contains it.');return}
    const courseList=(record.courses||[]).map(course=>'<li><b>'+safe(course.code||'COURSE')+'</b> · '+safe(course.name)+(course.credits?' · '+safe(course.credits)+' credits':'')+((course.topics||[]).length?'<br><small>'+safe(course.topics.join(', '))+'</small>':'')+'</li>').join('')||'<li>No course list was saved.</li>';
    const classes=(record.events||[]).filter(event=>event.type==='class').map(event=>'<li>'+safe(event.title)+' · '+safe(STUDIO_DAYS[event.day]||'')+' '+safe(timeLabel(event.start))+'–'+safe(timeLabel(event.end))+(event.location?' · '+safe(event.location):'')+'</li>').join('')||'<li>No learning schedule was saved.</li>';
    const plannedStudy=(record.events||[]).filter(event=>event.type==='study').map(event=>'<li>'+safe(event.title)+' · '+safe(STUDIO_DAYS[event.day]||'')+' '+safe(timeLabel(event.start))+'–'+safe(timeLabel(event.end))+'</li>').join('')||'<li>No planned study sessions were saved.</li>';
    const completed=(record.completed||[]).filter(item=>item.type==='study'||(!item.type&&String(item.eventId||'').startsWith('focus-'))).slice(-12).reverse().map(item=>'<li>'+safe(item.date||'')+' · '+Number(item.minutes||0)+' minutes'+(item.courseId?' · '+safe((record.courses||[]).find(course=>course.id===item.courseId)?.name||'Course'):'')+'</li>').join('')||'<li>No completed study sessions were saved.</li>';
    const resources=(record.resources||[]).map(resource=>'<li>'+safe(resource.title||'Saved note')+(resource.kind?' · '+safe(resource.kind):'')+'</li>').join('')||'<li>No tutorials or notes were saved.</li>';
    const sessionRecords=(record.studyRecords||[]).map(item=>'<li>'+safe(item.date||'')+' · '+safe(item.type==='class'?'Class':'Study')+' · '+safe(item.title||'Learning session')+' · '+(item.quizAttempts||[]).length+' quiz attempts</li>').join('')||'<li>No detailed class reflections or study quiz records were saved.</li>';
    const materials=(record.materials||[]).map(material=>'<li>'+safe(material.name||'Course material')+' · '+Number(material.characters||0).toLocaleString()+' characters</li>').join('')||'<li>No course materials were saved.</li>';
    const archivedDeadlines=(record.deadlines||[]).map(item=>'<li>'+safe(item.dueDate||'No date')+' · '+safe(item.title||'Deadline')+' · '+safe(item.kind||'Task')+(item.completed?' · Completed':'')+'</li>').join('')||'<li>No deadlines were saved.</li>';
    const archivedExams=(record.exams||[]).map(item=>'<li>'+safe(item.date||'No date')+' · '+safe(item.title||'Examination')+'</li>').join('')||'<li>No examination dates were saved.</li>';
    const archivedRevision=(record.revisionTasks||[]).map(item=>'<li>'+safe(item.date||'')+' · '+safe(item.title||'Revision task')+(item.completed?' · Completed':'')+'</li>').join('')||'<li>No revision tasks were saved.</li>';
    const archivedMocks=(record.mockExamAttempts||[]).map(item=>'<li>'+safe(item.courseName||'Mock examination')+' · '+(item.questions||[]).length+' questions · '+Number(item.answeredCount||0)+' answered · '+recordDate(item.submittedAt)+'</li>').join('')||'<li>No completed mock examinations were saved.</li>';
    const archivedMastery=Object.entries(record.topicMastery||{}).map(([key,item])=>'<li>'+safe(key)+' · '+safe(item.status||'Not started')+(item.score!==undefined&&item.score!==null?' · '+Number(item.score)+'%':'')+'</li>').join('')||'<li>No topic mastery records were saved.</li>';
    const resultRows=(record.results||[]).map(item=>'<div class="academic-result-view-row"><strong>'+safe(item.subject)+'</strong><span>'+safe(item.code||'')+'</span><b>'+safe(item.grade)+'</b>'+(item.carryover?'<small class="carryover-result-flag">Carryover · retake next academic year</small>':'')+'</div>').join('')||'<p class="preview-note">No results saved for this period yet.</p>';
    const isResultEntry=record.recordType==='results',recordProfile=record.profile||{},recordDetails=[record.institution||record.school||recordProfile.institution,(record.stage||recordProfile.stage)?stageLabel(record.stage||recordProfile.stage):'',record.programme||recordProfile.programme,record.level||recordProfile.level,record.term||recordProfile.term,record.academicYear].filter(Boolean).join(' · ');
    const actions='<div class="academic-record-actions"><button type="button" class="secondary-btn" data-action="edit-academic-results" data-id="'+safe(record.id)+'">Edit results</button>'+(isResultEntry?'<button type="button" class="danger-btn" data-action="delete-academic-record" data-id="'+safe(record.id)+'">Remove record</button>':'')+'</div>';
    const resultSection='<section class="academic-result-section"><div class="panel-head"><div><h3>Results</h3><p>'+Number((record.results||[]).length)+' subject or course results</p></div></div><div class="academic-result-view-list">'+resultRows+'</div>'+(record.resultsNotes?'<p class="academic-record-note">'+safe(record.resultsNotes)+'</p>':'')+actions+'</section>';
    const archivedContent=isResultEntry?'':('<div class="form-grid"><section><h3>Courses</h3><ul>'+courseList+'</ul></section><section><h3>Classes</h3><ul>'+classes+'</ul></section></div><section><h3>Planned study sessions</h3><ul>'+plannedStudy+'</ul></section><section><h3>Recent completed study sessions</h3><ul>'+completed+'</ul></section><section><h3>Class reflections and study quiz records</h3><ul>'+sessionRecords+'</ul></section><div class="form-grid"><section><h3>Tutorials and notes</h3><ul>'+resources+'</ul></section><section><h3>Course materials</h3><ul>'+materials+'</ul></section></div><div class="form-grid"><section><h3>Deadlines and assignments</h3><ul>'+archivedDeadlines+'</ul></section><section><h3>Examinations</h3><ul>'+archivedExams+'</ul></section></div><div class="form-grid"><section><h3>Revision plans</h3><ul>'+archivedRevision+'</ul></section><section><h3>Mock examinations</h3><ul>'+archivedMocks+'</ul></section></div><section><h3>Topic mastery</h3><ul>'+archivedMastery+'</ul><p>'+((record.flashcards||[]).length)+' flashcards were saved in this archive. Active review cards remain available in the current learning space.</p></section>');
    openModal(record.label||'Education record',recordDetails||'Saved '+recordDate(record.archivedAt||record.recordedAt),'<p class="preview-note">'+(isResultEntry?'Past education results saved on this device.':'This term’s results and study record are saved on this device.')+'</p>'+resultSection+archivedContent,'Done',()=>closeModal());
  }catch(error){toast('Could not open this saved term: '+(error.message||'storage is unavailable'))}
}
function formatFileSize(bytes){if(bytes<1024)return bytes+' B';if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';return (bytes/1024/1024).toFixed(1)+' MB'}
function renderVault(compact=false){
  const documents=data.personalDocuments||[];
  const cards=documents.map(docMeta=>'<article class="schedule-row"><div class="schedule-time">'+safe(docMeta.category||'Document')+'</div><div class="schedule-row-main"><i class="course-swatch" style="background:#7da9be"></i><div><strong>'+safe(docMeta.title||docMeta.name)+'</strong><span>'+safe(docMeta.name)+' · '+formatFileSize(Number(docMeta.size)||0)+' · Saved '+recordDate(docMeta.addedAt)+'</span></div></div><div class="schedule-actions"><button class="secondary-btn" data-action="open-personal-document" data-id="'+safe(docMeta.id)+'">Open</button><button class="icon-btn" title="Download" data-action="download-personal-document" data-id="'+safe(docMeta.id)+'">↓</button><button class="icon-btn" title="Remove" data-action="delete-personal-document" data-id="'+safe(docMeta.id)+'">×</button></div></article>').join('');
  const backupTools=compact?'':'<button class="secondary-btn" data-action="export-portable-backup">Download portable backup</button><label class="secondary-btn">Import backup from another device<input id="portableBackupFile" type="file" accept=".zip" style="display:none"></label>';
  const storageNote=compact?'':'<div class="note-callout" style="margin:14px 0 0">Documents and study records are stored on this browser and device. To move them to another phone or laptop, download a portable backup and import it there. The backup is not encrypted and contains your private files; keep it private.</div>';
  return (compact?'':pageHead('YOUR PRIVATE FILES','Personal documents','Keep your school ID, receipts, certificates, transcripts, and other important documents in one place.',''))+
    '<section class="panel"><div class="panel-head"><div><h3>My document cabinet</h3><p>Add a label so files are easy to find later.</p></div><span class="upload-count">'+documents.length+' saved</span></div><div class="upload-tools"><label class="primary-btn">＋ Add a document<input id="personalDocumentFile" type="file" style="display:none"></label><button class="secondary-btn native-only" data-action="capture-document-photo">Take a photo</button>'+backupTools+'</div>'+storageNote+'</section>'+
    '<div class="section-title-row"><h3>Saved documents</h3><span>'+documents.length+' files</span></div>'+
    (documents.length?'<div class="schedule-list">'+cards+'</div>':emptyState('▤','Your document cabinet is empty','Upload a photo or file and choose a category for it.','', ''));
}
function addPersonalDocument(file,courseIdOverride=''){
  if(!file)return;
  if(file.size>40*1024*1024){toast('That file is over 40 MB. Choose a smaller file.');return}
  const categories=['School ID','Receipt','Certificate','Transcript','Admission or registration','Other'];
  const options=categories.map(category=>'<option value="'+safe(category)+'">'+safe(category)+'</option>').join('');
  const linkedCourse=String(courseIdOverride||window.eduTargetDocumentCourseId||'');const body=field('Name to show','documentTitle','<input id="f-documentTitle" name="documentTitle" required maxlength="100" value="'+safe(file.name)+'">')+field('Document type','documentCategory','<select id="f-documentCategory" name="documentCategory">'+options+'</select>')+field('Link to course','documentCourseId','<select id="f-documentCourseId" name="documentCourseId">'+courseOptions(linkedCourse)+'</select>')+'<p class="preview-note">This file is saved on this browser and device. It is not uploaded to an online account.</p>';
  openModal('Save a personal document',file.name,body,'Save document',async fd=>{
    const documentId=id(),metadata={id:documentId,title:String(fd.get('documentTitle')||file.name).trim(),name:file.name,category:String(fd.get('documentCategory')||'Other'),courseId:String(fd.get('documentCourseId')||''),type:file.type||'application/octet-stream',size:file.size,addedAt:Date.now()};
    try{await putStudioRecord('personalDocuments',{id:documentId,blob:file,name:file.name,type:metadata.type})}catch(error){toast('Could not save this file: '+(error.message||'local storage is unavailable'));return}
    data.personalDocuments.unshift(metadata);
    if(!save()){
      data.personalDocuments=data.personalDocuments.filter(item=>item.id!==documentId);
      try{await deleteStudioRecord('personalDocuments',documentId)}catch{}
      render();return;
    }
    window.eduTargetDocumentCourseId='';closeModal();toast('Document saved on this device');
  });
}
async function openPersonalDocument(documentId){
  const tab=window.open('about:blank','_blank');
  if(!tab){toast('Allow a new tab to open the document, or use Download.');return}
  try{const record=await getStudioRecord('personalDocuments',documentId),blob=record?.blob||record?.file;if(!blob){tab.close();toast('This file is not available in this browser. Import the portable backup that contains it.');return}const url=URL.createObjectURL(blob);tab.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),120000)}catch(error){tab.close();toast('Could not open this file: '+(error.message||'storage is unavailable'))}
}
async function downloadPersonalDocument(documentId){
  try{const record=await getStudioRecord('personalDocuments',documentId),blob=record?.blob||record?.file;if(!blob){toast('This file is not available in this browser. Import the portable backup that contains it.');return}download(blob,record.name||'personal-document')}catch(error){toast('Could not download this file: '+(error.message||'storage is unavailable'))}
}
async function deletePersonalDocument(documentId){
  if(!confirm('Remove this document from your personal cabinet?'))return;
  const previous=data.personalDocuments||[],remaining=previous.filter(docMeta=>docMeta.id!==documentId);
  data.personalDocuments=remaining;
  if(!save()){data.personalDocuments=previous;render();return}
  try{await deleteStudioRecord('personalDocuments',documentId);toast('Document removed')}
  catch(error){toast('The document was removed from your cabinet, but its stored file could not be cleaned up: '+(error.message||'storage is unavailable'))}
}
async function listStudioRecords(storeName){const db=await studioDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readonly'),req=tx.objectStore(storeName).getAll();req.onsuccess=()=>{db.close();resolve(req.result||[])};req.onerror=()=>{db.close();reject(req.error)}})}
async function exportPortableBackup(){
  try{
    if(!window.JSZip)await loadStudioScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    const zip=new window.JSZip();zip.file('eduvia-data.json',JSON.stringify(data,null,2));
    const documents=zip.folder('personal-documents');
    for(const metadata of data.personalDocuments||[]){
      const record=await getStudioRecord('personalDocuments',metadata.id),blob=record?.blob||record?.file;
      if(!blob)throw new Error('A saved personal document is missing from device storage: '+String(metadata.name||metadata.id)+'. Restore it before exporting.');
      documents.file(String(metadata.id),blob);
    }
    const archives=zip.folder('academic-records');
    for(const metadata of data.academicHistory||[]){
      const record=await getStudioRecord('academicRecords',metadata.id);
      if(!record)throw new Error('An archived academic record is missing from device storage: '+String(metadata.label||metadata.id)+'. Restore it before exporting.');
      archives.file(String(metadata.id)+'.json',JSON.stringify(record));
    }
    const materials=zip.folder('course-materials');
    for(const metadata of data.materials||[]){
      const record=await getStudioRecord(STUDIO_STORE,metadata.id);
      if(!record)throw new Error('Extracted course material is missing from device storage: '+String(metadata.name||metadata.id)+'. Restore it before exporting.');
      materials.file(String(metadata.id)+'.json',JSON.stringify(record));
    }
    const bundle=await zip.generateAsync({type:'blob',compression:'STORE'});
    download(bundle,'eduvia-portable-backup-'+todayISO()+'.zip');
    toast('Portable backup ready. Keep the file private.');
  }catch(error){toast('Could not create the backup: '+(error.message||'storage is unavailable'))}
}
async function importPlannerJsonBackup(file){
  if(!file)return;
  if(file.size>50*1024*1024){toast('That JSON backup is over 50 MB. Use the portable ZIP backup for large files.');return}
  let source;
  try{
    source=JSON.parse(await file.text());
    if(!source||typeof source!=='object'||Array.isArray(source)||!source.profile||typeof source.profile!=='object'||Array.isArray(source.profile)||!Array.isArray(source.courses)||!Array.isArray(source.events))throw new Error('This file is not a valid Eduvia planner JSON backup.');
  }catch(error){toast('Could not read this JSON backup: '+(error.message||'file is invalid'));return}
  const currentHistory=Array.isArray(data.academicHistory)?data.academicHistory:[];
  const currentDocuments=Array.isArray(data.personalDocuments)?data.personalDocuments:[];
  const currentMaterials=Array.isArray(data.materials)?data.materials:[];
  const currentText=Array.isArray(data.materialText)?data.materialText:[];
  const defaults=defaultData();
  const restored={...defaults,...source,profile:{...defaults.profile,...source.profile}};
  Object.assign(restored.profile,{
    institution:restored.profile.institution||'',centre:restored.profile.centre||'',programme:restored.profile.programme||'',level:restored.profile.level||'',country:restored.profile.country||'',stage:restored.profile.stage||'',term:restored.profile.term||'',
    studyDays:Array.isArray(restored.profile.studyDays)?restored.profile.studyDays:[1,2,3,4,5,6],studyStart:restored.profile.studyStart||'17:00',studyEnd:restored.profile.studyEnd||'21:00',planSessionMinutes:Number(restored.profile.planSessionMinutes)||45
  });
  for(const key of ['courses','events','resources','completed','studyRecords'])if(!Array.isArray(restored[key]))restored[key]=[];
  const textById=new Map();
  for(const item of [...currentText,...(Array.isArray(source.materialText)?source.materialText:[])])if(item&&typeof item==='object'&&item.id)textById.set(item.id,item);
  restored.materialText=[...textById.values()];
  const materialsById=new Map(currentMaterials.filter(item=>item&&item.id).map(item=>[item.id,item]));
  for(const item of Array.isArray(source.materials)?source.materials:[])if(item&&item.id&&textById.has(item.id))materialsById.set(item.id,item);
  restored.materials=[...materialsById.values()];
  restored.academicHistory=currentHistory;
  restored.personalDocuments=currentDocuments;
  restored.imports=source.imports&&typeof source.imports==='object'&&!Array.isArray(source.imports)?source.imports:{courses:[],timetable:[]};
  if(!Array.isArray(restored.imports.courses))restored.imports.courses=[];
  if(!Array.isArray(restored.imports.timetable))restored.imports.timetable=[];
  if(!confirm('Restore this planner JSON on this PC? It replaces the current profile, courses, timetable, notes, progress, and study records. Existing files and full education records on this PC will be kept. This JSON does not include files or full archived education records from your phone; use the portable ZIP backup for those.'))return;
  try{localStorage.setItem(STORE_KEY,JSON.stringify(restored))}catch(error){toast('Could not save this backup in this browser. Try the portable ZIP backup or free some browser storage.');return}
  data=restored;currentPage='today';location.hash='today';save();
  toast('Planner JSON restored. Use the portable ZIP to move phone documents and full education records.');
}
async function replaceStudioStoresAtomically(groups){
  const storeNames=Object.keys(groups);
  const db=await studioDb();
  return await new Promise((resolve,reject)=>{
    let tx;
    try{
      tx=db.transaction(storeNames,'readwrite');
      for(const storeName of storeNames){
        const store=tx.objectStore(storeName);
        store.clear();
        for(const record of groups[storeName]||[])store.put(record);
      }
    }catch(error){db.close();reject(error);return}
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{db.close();reject(tx.error||new Error('The device could not save the restored files.'))};
    tx.onabort=()=>{db.close();reject(tx.error||new Error('The file restore was cancelled by device storage.'))};
  });
}
async function importPortableBackup(file){
  if(!file)return;
  if(file.size>500*1024*1024){toast('That backup is over 500 MB.');return}
  try{
    if(!window.JSZip)await loadStudioScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    const zip=await window.JSZip.loadAsync(file),dataFile=zip.file('eduvia-data.json')||zip.file('daymark-data.json');
    if(!dataFile)throw new Error('This ZIP does not contain an Eduvia backup.');
    const imported=JSON.parse(await dataFile.async('string'));
    if(!imported||typeof imported!=='object'||Array.isArray(imported)||!imported.profile||typeof imported.profile!=='object'||Array.isArray(imported.profile)||!Array.isArray(imported.courses)||!Array.isArray(imported.events))throw new Error('The ZIP does not contain a complete Eduvia planner backup.');

    const uniqueRecords=(items,label)=>{
      if(!Array.isArray(items))throw new Error('The backup contains an invalid '+label+' list.');
      const seen=new Set();
      return items.map((item,index)=>{
        if(!item||typeof item!=='object'||Array.isArray(item)||item.id===undefined||item.id===null||String(item.id).trim()==='')throw new Error('Backup '+label+' item '+(index+1)+' has no valid ID.');
        const idValue=String(item.id);
        if(seen.has(idValue))throw new Error('The backup contains duplicate '+label+' IDs: '+idValue+'.');
        seen.add(idValue);
        return {...item,id:idValue};
      });
    };
    imported.academicHistory=uniqueRecords(imported.academicHistory||[],'academic record');
    imported.personalDocuments=uniqueRecords(imported.personalDocuments||[],'personal document');
    imported.materials=uniqueRecords(imported.materials||[],'course material');
    imported.materialText=Array.isArray(imported.materialText)?imported.materialText:[];
    const fallbackMaterials=new Map(imported.materialText.filter(item=>item&&item.id!==undefined).map(item=>[String(item.id),item]));

    // Read and validate every attachment before writing to IndexedDB or replacing planner data.
    const documentRecords=[];
    for(const metadata of imported.personalDocuments){
      const entry=zip.file('personal-documents/'+metadata.id);
      if(!entry)throw new Error('The backup is missing the file for personal document "'+String(metadata.name||metadata.title||metadata.id)+'". Nothing was restored.');
      const blob=await entry.async('blob');
      documentRecords.push({id:metadata.id,blob:new Blob([blob],{type:metadata.type||''}),name:metadata.name||metadata.title||''});
    }
    const academicRecords=[];
    for(const metadata of imported.academicHistory){
      const entry=zip.file('academic-records/'+metadata.id+'.json');
      if(!entry)throw new Error('The backup is missing archived academic record "'+String(metadata.label||metadata.id)+'". Nothing was restored.');
      const record=JSON.parse(await entry.async('string'));
      if(!record||typeof record!=='object'||Array.isArray(record)||String(record.id)!==metadata.id)throw new Error('An archived academic record in the backup is invalid. Nothing was restored.');
      academicRecords.push(record);
    }
    const materialRecords=[];
    const fallbackIds=new Set();
    for(const metadata of imported.materials){
      const entry=zip.file('course-materials/'+metadata.id+'.json');
      let record;
      if(entry){
        record=JSON.parse(await entry.async('string'));
      }else{
        record=fallbackMaterials.get(metadata.id);
        if(!record)throw new Error('The backup is missing extracted course material "'+String(metadata.name||metadata.id)+'". Nothing was restored.');
        fallbackIds.add(metadata.id);
      }
      if(!record||typeof record!=='object'||Array.isArray(record)||String(record.id)!==metadata.id||typeof record.text!=='string')throw new Error('Extracted course material "'+String(metadata.name||metadata.id)+'" is invalid. Nothing was restored.');
      materialRecords.push(record);
    }

    if(!confirm('Replace the planner data on this device with the selected backup? This changes the current courses, history, and document list.'))return;
    const previousRaw=storageGet(STORE_KEY);
    const restored={...defaultData(),...imported,profile:{...defaultData().profile,...imported.profile}};
    restored.imports=restored.imports&&typeof restored.imports==='object'&&!Array.isArray(restored.imports)?restored.imports:{courses:[],timetable:[]};
    restored.imports.courses=Array.isArray(restored.imports.courses)?restored.imports.courses:[];
    restored.imports.timetable=Array.isArray(restored.imports.timetable)?restored.imports.timetable:[];
    // Keep only a localStorage fallback for materials whose archive entry is absent.
    // Every material, including localStorage-only fallback records, is restored into IndexedDB.
    restored.materialText=[];

    const storageError=storageSet(STORE_KEY,JSON.stringify(restored));
    if(storageError)throw new Error('Could not save the restored planner data: '+(storageError.message||'device storage is unavailable')+'. No existing files were changed.');
    try{
      await replaceStudioStoresAtomically({
        personalDocuments:documentRecords,
        academicRecords,
        [STUDIO_STORE]:materialRecords
      });
    }catch(error){
      const rollbackError=previousRaw===null?storageRemove(STORE_KEY):storageSet(STORE_KEY,previousRaw);
      if(rollbackError)throw new Error('File restore failed and the previous planner data could not be fully rolled back. Keep the safety copy: '+(error.message||'storage error'));
      throw error;
    }
    data=restored;
    currentPage='vault';location.hash='vault';
    applyTheme();render();scheduleEventAlert();schedulePushSync();
    toast('Portable backup restored on this device.');
  }catch(error){toast('Could not import this backup: '+(error.message||'file is invalid'))}
}
async function clearAllStudioRecords(){
  if(!('indexedDB' in window))return;
  const db=await studioDb(),stores=[STUDIO_STORE,'academicRecords','personalDocuments'];
  await new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error)=>{
      if(settled)return;settled=true;db.close();
      if(error)reject(error);else resolve();
    };
    let tx;
    try{
      tx=db.transaction(stores,'readwrite');
      for(const storeName of stores)tx.objectStore(storeName).clear();
    }catch(error){finish(error);return}
    tx.oncomplete=()=>finish();
    tx.onerror=()=>finish(tx.error||new Error('The device could not clear uploaded files.'));
    tx.onabort=()=>finish(tx.error||new Error('The device cancelled the file-storage clear operation.'));
  });
}
async function clearData(){
  if(!confirm('This will remove your courses, class and study schedule, notes, education history, personal documents, progress, profile, and uploaded material from this device. Continue?'))return;
  const previousData=data;
  data=defaultData();data.imports={courses:[],timetable:[]};data.materials=[];
  studioLesson=null;studioPractice=[];studioNotice='';currentPage='setup';
  if(!save()){data=previousData;render();return}
  try{
    await clearAllStudioRecords();
    toast('Planner data and uploaded material cleared');
  }catch(error){
    toast('Planner data was cleared, but Eduvia could not clear uploaded file storage: '+(error.message||'storage is unavailable')+'. Try again or clear this site’s storage.');
  }
}
document.addEventListener('change',e=>{
  if(e.target.id==='setupBackupFile'){const file=e.target.files?.[0];e.target.value='';if(file){if(file.type==='application/zip'||file.name.toLowerCase().endsWith('.zip'))importPortableBackup(file);else importPlannerJsonBackup(file)}}
  if(e.target.id==='personalDocumentFile'){const file=e.target.files?.[0];e.target.value='';addPersonalDocument(file)}if(e.target.id==='courseMaterialFile'){const file=e.target.files?.[0];e.target.value='';if(file)handleStudioFile('material',file,e.target.dataset.courseId||'')}if(e.target.id==='courseDocumentFile'){const file=e.target.files?.[0];e.target.value='';if(file)addPersonalDocument(file,e.target.dataset.courseId||'')}
  if(e.target.id==='plannerJsonBackupFile'){const file=e.target.files?.[0];e.target.value='';importPlannerJsonBackup(file)}
  if(e.target.id==='portableBackupFile'){const file=e.target.files?.[0];e.target.value='';importPortableBackup(file)}
});
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action,idValue=e.target.closest('[data-action]')?.dataset.id;
  if(action==='add-academic-results')openAcademicResultsForm();
  if(action==='add-academic-result-row')addAcademicResultRow();
  if(action==='remove-academic-result-row')removeAcademicResultRow(e.target.closest('[data-action]'));
  if(action==='edit-academic-results')editAcademicResults(idValue);
  if(action==='delete-academic-record')deleteAcademicRecord(idValue);
  if(action==='archive-term')archiveCurrentTerm();
  if(action==='view-academic-record')viewAcademicRecord(idValue);
  if(action==='open-personal-document')openPersonalDocument(idValue);
  if(action==='download-personal-document')downloadPersonalDocument(idValue);
  if(action==='delete-personal-document')deletePersonalDocument(idValue);
  if(action==='export-portable-backup')exportPortableBackup();
});
window.eduCaptureStudioPhoto=window.eduCapturePhonePhoto;window.eduHandleStudioFile=handleStudioFile;window.eduSavePersonalDocument=addPersonalDocument;window.eduPageRenderers=window.eduPageRenderers||{};
Object.assign(window.eduPageRenderers,{study:renderStudyStudio,practice:renderPractice,setup:renderSetup,education:renderEducation,vault:renderVault,more:renderMore,records:renderStudyRecords});
function renderStudyRecords(){
  const records=(data.studyRecords||[]).slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const cards=records.map(record=>{
    const attempts=record.quizAttempts||[],course=data.courses.find(item=>item.id===record.courseId);
    const attendanceLabels={attended:'Attended',student_absent:'I was absent',lecturer_absent:'Lecturer was absent',postponed:'Class postponed'};
    const attendance=record.type==='class'?attendanceLabels[record.reflection?.attendance||'attended']:'';
    const kind=record.type==='class'?'Class reflection':'Study session';
    const last=attempts[0];
    const score=last?' · Latest quiz '+last.score+'/'+last.total:'';
    return '<article class="course-card session-record-card"><div class="course-card-head"><span class="habit-badge">'+(record.type==='class'?'▤':'✓')+'</span><div><h3>'+safe(record.title||course?.name||kind)+'</h3><span class="course-code">'+kind+' · '+safe(record.date||'')+(attendance?' · '+attendance:'')+'</span></div></div><p class="course-desc">'+safe(record.reflection?.topics||(attendance==='Class postponed'?'No lecture took place on this date.':attendance?'Attendance recorded':'Session reflection saved'))+score+'</p><div class="course-card-foot"><span>'+attempts.length+' quiz attempt'+(attempts.length===1?'':'s')+'</span><button class="secondary-btn" data-action="view-session-record" data-record-id="'+safe(record.id)+'">Open record</button></div></article>'
  }).join('');
  return pageHead('YOUR LEARNING HISTORY','Session records','Keep class reflections, assignments, study notes, quiz scores, and retake counts together.','')+(records.length?'<div class="course-grid session-record-grid">'+cards+'</div>':emptyState('▤','Your session records will appear here','Complete a class or study session from your plan to start building your learning record.','',''));
}
function splitSessionList(value){return String(value||'').split(/\r?\n+|[,;]+/).map(item=>item.replace(/^\s*\d+[.)-]\s*/,'').trim()).filter(Boolean)}
function completeSessionRecord(record){
  if(record.completedAt)return;
  record.completedAt=Date.now();
  const countsAsSession=record.type!=='class'||(record.reflection?.attendance||'attended')==='attended';
  if(countsAsSession&&!data.completed.some(item=>item.eventId===record.eventId&&item.date===record.date))data.completed.push({id:id(),eventId:record.eventId,date:record.date,courseId:record.courseId,type:record.type,minutes:record.minutes,recordId:record.id});
}
function saveCompletedSession(event,date,reflection,complete=true){
  const record={id:id(),eventId:event.id,date,type:event.type,courseId:event.courseId||'',courseName:data.courses.find(item=>item.id===event.courseId)?.name||'',title:event.title||'Study session',minutes:event.duration||data.profile.sessionMinutes,createdAt:Date.now(),reflection,quizQuestions:[],quizAttempts:[]};
  data.studyRecords=Array.isArray(data.studyRecords)?data.studyRecords:[];
  data.studyRecords.unshift(record);
  if(complete)completeSessionRecord(record);
  closeModal();save();return record;
}
function beginSessionCompletion(event,date){
  const unfinished=(data.studyRecords||[]).find(record=>record.eventId===event.id&&record.date===date&&record.type==='study'&&!record.completedAt);
  if(unfinished){openSessionQuiz(unfinished.id);return}
  const course=data.courses.find(item=>item.id===event.courseId),subtitle=(course?.code?course.code+' · ':'')+(event.title||'Planned session');
  if(event.type==='class'){
    const body='<p class="session-modal-intro">Record whether the lecture held, was postponed, or you were absent.</p>'+
      field('Attendance','attendance','<select id="f-attendance" name="attendance"><option value="attended">I attended</option><option value="student_absent">I was absent</option><option value="lecturer_absent">Lecturer was absent</option><option value="postponed">Class postponed</option></select>',true)+
      '<div id="classReflectionFields">'+
      field('Topics covered','topics','<textarea id="f-topics" name="topics" required placeholder="List the lecture topics"></textarea>',true)+
      field('Five things you learned','learned','<textarea id="f-learned" name="learned" required placeholder="Write exactly five items, one per line"></textarea>',true)+
      field('Study areas to review','studyAreas','<textarea id="f-studyAreas" name="studyAreas" placeholder="Topics or skills you want to revisit"></textarea>',true)+
      '<div class="form-grid">'+field('Assignment (optional)','assignment','<input id="f-assignment" name="assignment" maxlength="180" placeholder="Assignment or task">')+field('Assignment deadline','assignmentDue','<input id="f-assignmentDue" name="assignmentDue" type="date">')+'</div>'+
      '<div class="form-grid">'+field('Classwork (optional)','classwork','<input id="f-classwork" name="classwork" maxlength="180" placeholder="Classwork or in-class task">')+field('Classwork deadline','classworkDue','<input id="f-classworkDue" name="classworkDue" type="date">')+'</div></div>';
    openModal('Class reflection',subtitle,body,'Save and complete class',fd=>{
      const attendance=String(fd.get('attendance')||'attended'),attended=attendance==='attended',learned=String(fd.get('learned')||'').split(/\\r?\\n+/).map(item=>item.replace(/^\\s*\\d+[.)-]\\s*/,'').trim()).filter(Boolean),assignment=String(fd.get('assignment')||'').trim(),assignmentDue=String(fd.get('assignmentDue')||''),classwork=String(fd.get('classwork')||'').trim(),classworkDue=String(fd.get('classworkDue')||'');
      if(attended&&learned.length!==5){toast('Please enter exactly five learning points, one per line.');return}
      if(attended&&assignment&&!assignmentDue){toast('Add a deadline for the assignment.');return}
      if(attended&&classwork&&!classworkDue){toast('Add a deadline for the classwork.');return}
      const tasks=[];if(attended&&assignment)tasks.push({type:'Assignment',title:assignment,dueDate:assignmentDue});if(attended&&classwork)tasks.push({type:'Classwork',title:classwork,dueDate:classworkDue});
      saveCompletedSession(event,date,{attendance,topics:attended?String(fd.get('topics')||'').trim():'',learned:attended?learned:[],studyAreas:attended?String(fd.get('studyAreas')||'').trim():'',tasks});
      toast(attended?'Class reflection saved and class completed':attendance==='postponed'?'Class marked as postponed. It was not counted as attended.':'Class attendance record saved');
    });
    const attendanceSelect=document.getElementById('f-attendance'),reflectionFields=document.getElementById('classReflectionFields');
    const syncAttendanceFields=()=>{const attended=attendanceSelect.value==='attended';reflectionFields.style.display=attended?'grid':'none';reflectionFields.querySelectorAll('input,textarea,select').forEach(control=>{control.disabled=!attended})};
    attendanceSelect.addEventListener('change',syncAttendanceFields);syncAttendanceFields();
    return;
  }
  const body='<p class="session-modal-intro">Capture what you studied and five key takeaways. Eduvia will follow with a 10-question recall check. You can retake it as often as you like.</p>'+
    field('Topics studied','topics','<textarea id="f-topics" name="topics" required placeholder="List the topics you reviewed"></textarea>',true)+
    field('Five key points learned','keyPoints','<textarea id="f-keyPoints" name="keyPoints" required placeholder="Enter five key points, one per line"></textarea>',true)+
    field('Additional reflection (optional)','gained','<textarea id="f-gained" name="gained" placeholder="Anything else you gained from this session"></textarea>',true);
  openModal('Study reflection',subtitle,body,'Save and start 10-question quiz',fd=>{
    const keyPoints=splitSessionList(String(fd.get('keyPoints')||''));
    if(keyPoints.length!==5){toast('Please enter exactly five key points, one per line.');return}
    const record=saveCompletedSession(event,date,{topics:String(fd.get('topics')||'').trim(),keyPoints,gained:String(fd.get('gained')||'').trim()},false);
    toast('Study reflection saved');
    openSessionQuiz(record.id);
  });
}
function sessionQuizSources(courseId){
  return (async()=>{
    let sources=[];
    try{if(typeof loadCourseText==='function')sources=await loadCourseText(courseId)}catch{}
    if(!sources.length)sources=(data.materialText||[]).filter(item=>!item.courseId||item.courseId===courseId).map(item=>({name:item.name||'Saved study material',text:item.text||''})).filter(item=>item.text);
    return sources;
  })();
}
function buildSessionQuiz(record,sources){
  const course=data.courses.find(item=>item.id===record.courseId),reflection=record.reflection||{};
  const topics=[...splitSessionList(reflection.topics),...(course?.topics||[])].filter(Boolean).sort((a,b)=>b.length-a.length);
  const stop=new Set('about after again also another because before being between could course during each from have into more most other over should some such than that their there these they this those through under very what when where which while with would your lecture material process learn learned theory using used into'.split(' '));
  const questions=[],seen=new Set();
  const sentenceList=sources.flatMap(source=>String(source.text||'').replace(/\s+/g,' ').split(/(?<=[.!?])\s+|(?<=:)\s+|\n+/).map(sentence=>({sentence:sentence.trim(),source:source.name||'Course material'}))).filter(item=>item.sentence.length>=35&&item.sentence.length<=360);
  const addQuestion=(prompt,answer,mode,source)=>{
    const key=prompt.toLowerCase();if(seen.has(key))return;seen.add(key);questions.push({prompt,answer,mode,source});
  };
  for(const item of sentenceList){
    if(questions.length>=10)break;
    const topic=topics.find(value=>value.length>2&&item.sentence.toLowerCase().includes(value.toLowerCase()));
    let answer='',masked='';
    if(topic){answer=topic;const escaped=topic.replace(/[.*+?^$()|[\]\\]/g,'\\$&');masked=item.sentence.replace(new RegExp(escaped,'i'),'_____')}
    else{
      const words=item.sentence.match(/[A-Za-z][A-Za-z'-]{5,}/g)||[];
      const term=words.find(word=>!stop.has(word.toLowerCase()));
      if(!term)continue;
      answer=term;const escaped=term.replace(/[.*+?^$()|[\]\\]/g,'\\$&');masked=item.sentence.replace(new RegExp('\\b'+escaped+'\\b','i'),'_____');
    }
    addQuestion('Complete the missing topic or key term: “'+masked+'”',answer,'term',item.source);
  }
  const learned=[...splitSessionList(reflection.keyPoints),...splitSessionList(reflection.gained)];
  if(questions.length<10&&learned.length){
    const templates=['What key point did you record about ','State one detail you learned about ','How would you explain your main takeaway on ','What idea from your study notes can you recall about ','Which important point did you gain about '];
    for(let index=0;questions.length<10;index++){
      const point=learned[index%learned.length],topic=topics[index%Math.max(1,topics.length)]||record.title||'your topic';
      addQuestion(templates[index%templates.length]+'“'+topic+'”?',point,'keywords','Your study reflection');
      if(index>50)break;
    }
  }

  return questions.slice(0,10);
}
function normalizeQuizText(value){return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function gradeSessionAnswer(question,response){
  const actual=normalizeQuizText(response),expected=normalizeQuizText(question.answer);
  if(!actual||!expected)return false;
  if(question.mode==='term')return (' '+actual+' ').includes(' '+expected+' ');
  const skip=new Set('about after again also because before being between could each from have into more most other should some than that their there these they this those through under very what when where which while with would your'.split(' '));
  const keywords=expected.split(' ').filter(word=>word.length>2&&!skip.has(word));
  const matched=keywords.filter(word=>(' '+actual+' ').includes(' '+word+' ')).length;
  return matched>=Math.max(1,Math.ceil(keywords.length*0.4));
}
async function openSessionQuiz(recordId){
  const record=(data.studyRecords||[]).find(item=>item.id===recordId);if(!record||record.type!=='study')return;
  if(!Array.isArray(record.quizQuestions)||record.quizQuestions.length!==10){
    const sources=await sessionQuizSources(record.courseId);
    record.quizQuestions=buildSessionQuiz(record,sources);
    const fallbackPoints=[...splitSessionList(record.reflection?.keyPoints),...splitSessionList(record.reflection?.gained)],fallbackTopics=splitSessionList(record.reflection?.topics);while(record.quizQuestions.length<10){const number=record.quizQuestions.length+1,topic=fallbackTopics[(number-1)%Math.max(1,fallbackTopics.length)]||record.title||'your topic',answer=fallbackPoints[(number-1)%Math.max(1,fallbackPoints.length)]||record.reflection?.gained||topic;record.quizQuestions.push({prompt:'Recall check '+number+': Write one key idea you learned about '+topic+'.',answer,mode:'keywords',source:'Your study reflection'})}
    save();
  }
  const questions=record.quizQuestions;
  const keyPoints=record.reflection?.keyPoints||[];const content='<p class="session-modal-intro">10 questions · on-device grading checks key terms from your course notes or study reflection. Unlimited retakes are saved.</p>'+(keyPoints.length?'<section class="session-key-points"><h3>Five key points from your session</h3><ol>'+keyPoints.map(point=>'<li>'+safe(point)+'</li>').join('')+'</ol></section>':'')+'<div class="quick-quiz-list">'+questions.map((question,index)=>'<div class="form-field full"><label for="f-quiz-'+index+'">'+String(index+1).padStart(2,'0')+'. '+safe(question.prompt)+'</label><input id="f-quiz-'+index+'" name="answer'+index+'" required autocomplete="off" placeholder="Your short answer"></div>').join('')+'</div>';
  openModal('10-question study quiz',record.title,content,'Grade my quiz',fd=>{
    const responses=questions.map((question,index)=>{const answer=String(fd.get('answer'+index)||'').trim();return {question:question.prompt,answer,key:question.answer,source:question.source,correct:gradeSessionAnswer(question,answer)}});
    const score=responses.filter(item=>item.correct).length,attempts=record.quizAttempts=Array.isArray(record.quizAttempts)?record.quizAttempts:[];
    const attempt={number:attempts.length+1,completedAt:Date.now(),score,total:questions.length,responses};attempts.unshift(attempt);completeSessionRecord(record);save();showSessionQuizResult(record.id,attempt);
  });
}
function showSessionQuizResult(recordId,attempt){
  const record=(data.studyRecords||[]).find(item=>item.id===recordId);if(!record)return;
  const rows=attempt.responses.map((result,index)=>'<article class="quiz-result-row '+(result.correct?'correct':'incorrect')+'"><div><strong>'+String(index+1).padStart(2,'0')+'. '+(result.correct?'Correct':'Review this answer')+'</strong><p>'+safe(result.question)+'</p><small>Your answer: '+safe(result.answer||'No answer')+'</small><small>Answer key: '+safe(result.key)+'</small></div></article>').join('');
  const stats=sessionQuizStats(record.quizAttempts||[]);const body='<div class="quiz-score-banner"><strong>'+attempt.score+'/'+attempt.total+'</strong><span>Attempt '+attempt.number+' · '+Math.round(attempt.score/attempt.total*100)+'%</span></div><div class="quiz-performance-summary"><div><span>First</span><strong>'+stats.first.score+'/'+stats.first.total+'</strong></div><div><span>Latest</span><strong>'+stats.latest.score+'/'+stats.latest.total+'</strong></div><div><span>Best</span><strong>'+stats.best.score+'/'+stats.best.total+'</strong></div></div><div class="quiz-result-list">'+rows+'</div><button type="button" class="secondary-btn quiz-retake-btn" data-action="retake-session-quiz" data-record-id="'+safe(record.id)+'">Retake this quiz</button>';
  openModal('Quiz result',record.title,body,'Close',()=>closeModal());
}
function sessionQuizStats(attempts){
  const list=Array.isArray(attempts)?attempts:[];
  if(!list.length)return {first:null,latest:null,best:null};
  const first=list[list.length-1],latest=list[0],best=list.reduce((top,item)=>!top||Number(item.score)>Number(top.score)?item:top,null);
  return {first,latest,best};
}
function showSessionRecord(recordId){
  const record=(data.studyRecords||[]).find(item=>item.id===recordId);if(!record)return;
  const reflection=record.reflection||{},attempts=record.quizAttempts||[],course=data.courses.find(item=>item.id===record.courseId);
  const when=record.date?formatDate(parseISO(record.date),{weekday:'long',month:'long',day:'numeric',year:'numeric'}):'Session record';
  let body='<div class="session-record-detail"><p><strong>'+safe(when)+'</strong> · '+safe(course?.name||record.courseName||'Course')+'</p>';
  if(record.type==='class'){
    const attendanceLabels={attended:'Attended',student_absent:'I was absent',lecturer_absent:'Lecturer was absent',postponed:'Class postponed'},attendance=reflection.attendance||'attended';
    body+='<h3>Attendance</h3><p>'+safe(attendanceLabels[attendance]||attendanceLabels.attended)+'</p>';
    if(attendance==='attended'){
      body+='<h3>Topics</h3><p>'+safe(reflection.topics||'None saved')+'</p><h3>Five things learned</h3><ol>'+(reflection.learned||[]).map(item=>'<li>'+safe(item)+'</li>').join('')+'</ol><h3>Study areas to revisit</h3><p>'+safe(reflection.studyAreas||'None listed')+'</p>';
      const tasks=reflection.tasks||[];body+='<h3>Assignments and classwork</h3>'+(tasks.length?'<ul>'+tasks.map(task=>'<li><strong>'+safe(task.type)+':</strong> '+safe(task.title)+' · due '+safe(task.dueDate)+'</li>').join('')+'</ul>':'<p>No assignments or classwork recorded.</p>');
    }else body+=(attendance==='postponed'?'<p>No lecture took place on this date, so no learning reflection is required.</p>':'<p>Learning details were skipped for this attendance record.</p>');
  }else{
    body+='<h3>Topics</h3><p>'+safe(reflection.topics||'None saved')+'</p><h3>Five key points</h3>'+(reflection.keyPoints?.length?'<ol>'+reflection.keyPoints.map(point=>'<li>'+safe(point)+'</li>').join('')+'</ol>':'<p>'+safe(reflection.gained||'None saved')+'</p>')+'<h3>Quiz performance</h3><p>'+attempts.length+' attempt'+(attempts.length===1?'':'s')+' · unlimited retakes</p>';
    const stats=sessionQuizStats(attempts);if(stats.latest)body+='<div class="quiz-performance-summary"><div><span>First</span><strong>'+stats.first.score+'/'+stats.first.total+'</strong></div><div><span>Latest</span><strong>'+stats.latest.score+'/'+stats.latest.total+'</strong></div><div><span>Best</span><strong>'+stats.best.score+'/'+stats.best.total+'</strong></div></div>';
    body+=attempts.length?'<div class="quiz-attempt-list">'+attempts.map(item=>'<div><strong>Attempt '+item.number+': '+item.score+'/'+item.total+'</strong><span>'+new Date(item.completedAt).toLocaleString()+'</span></div>').join('')+'</div>':'<p>No quiz taken yet.</p>';
    body+='<button type="button" class="secondary-btn quiz-retake-btn" data-action="retake-session-quiz" data-record-id="'+safe(record.id)+'">'+(attempts.length?'Retake quiz':'Take 10-question quiz')+'</button>';
  }
  openModal(record.type==='class'?'Class record':'Study record',record.title,body,'Close',()=>closeModal());
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  if(button.dataset.action==='view-session-record'){showSessionRecord(button.dataset.recordId);return}
  if(button.dataset.action==='retake-session-quiz'){closeModal();openSessionQuiz(button.dataset.recordId)}
});
window.eduBeginSessionCompletion=beginSessionCompletion;
window.eduShowSessionRecord=showSessionRecord;
window.eduCaptureStudioPhoto=window.eduCapturePhonePhoto;window.eduHandleStudioFile=handleStudioFile;window.eduSavePersonalDocument=addPersonalDocument;window.eduPageRenderers=window.eduPageRenderers||{};
window.eduPageRenderers.records=renderStudyRecords;
document.addEventListener('click',event=>{const button=event.target.closest('[data-action="activate-carryovers-new-year"]');if(!button)return;openCarryoverActivation();});
if(!data.profile.setupComplete)currentPage='setup';
scheduleEventAlert();


// Final universal learning-profile editor. Academic details are revealed only for formal education.
function editStudyProfile(){
  const formal=learnerTypeOf(data.profile)==='formal';
  const types=[['formal','Formal education'],['independent','Self-directed learning'],['professional','Professional development'],['exam-prep','Exam or certification preparation'],['general','General knowledge and personal interests']];
  const stages=educationStages();
  const typeOptions=types.map(([value,label])=>'<option value="'+value+'" '+(learnerTypeOf(data.profile)===value?'selected':'')+'>'+label+'</option>').join('');
  const stageOptions=stages.map(([value,label])=>'<option value="'+value+'" '+(data.profile.stage===value?'selected':'')+'>'+label+'</option>').join('');
  const academicFields='<div data-learning-profile-formal '+(formal?'':'hidden')+'>'+
    '<div class="form-grid">'+
      field('Learning provider','institution','<input id="f-institution" name="institution" value="'+safe(data.profile.institution||'')+'" placeholder="Your school or organisation">')+
      field('Learning stage','stage','<select id="f-stage" name="stage"><option value="">Choose your stage</option>'+stageOptions+'</select>')+
    '</div><div class="form-grid">'+
      field('Programme, course or qualification','programme','<input id="f-programme" name="programme" value="'+safe(data.profile.programme||'')+'" placeholder="e.g. B.Sc. Computer Science">')+
      field('Level or grade','level','<input id="f-level" name="level" value="'+safe(data.profile.level||'')+'" placeholder="e.g. 300 Level">')+
    '</div><div class="form-grid">'+
      field('Academic session or period','term','<input id="f-term" name="term" value="'+safe(data.profile.term||data.profile.academicSession||'')+'" placeholder="e.g. 2026/2027">')+
      field('Faculty or department (optional)','department','<input name="department" value="'+safe(data.profile.department||'')+'" placeholder="Only if applicable">')+
    '</div></div>';
  const body='<div class="form-grid">'+
    field('Learning path','learnerType','<select id="f-profile-learnerType" name="learnerType" required>'+typeOptions+'</select>')+
    field('What are you learning?','learningFocus','<input id="f-profile-learningFocus" name="learningFocus" required maxlength="120" value="'+safe(data.profile.learningFocus||data.profile.degreeProgramme||data.profile.programme||'')+'" placeholder="e.g. Data analysis, French or Computer Science">')+
    '</div><div class="form-grid">'+
    field('Country or region','country','<input id="f-profile-country" name="country" value="'+safe(data.profile.country||'')+'">')+
    field('Learning mode (optional)','studyMode','<input name="studyMode" value="'+safe(data.profile.studyMode||'')+'" placeholder="e.g. Online, full-time or self-paced">')+
    '</div>'+academicFields+
    '<div class="form-grid">'+field('Email address (optional)','email','<input type="email" name="email" value="'+safe(data.profile.email||'')+'" placeholder="you@example.com">')+'</div>';
  openModal('Learning profile','Choose your learning path. Academic details appear only when you select formal education.',body,'Save profile',fd=>{
    const focus=String(fd.get('learningFocus')||'').trim();
    if(!focus){toast('Add the main subject, skill or topic you are learning.');return}
    const type=String(fd.get('learnerType')||'independent');
    const requiredFormal=['institution','stage','programme','level','term'];
    if(type==='formal'&&requiredFormal.some(key=>!String(fd.get(key)||'').trim())){
      toast('Complete your learning provider, stage, programme, level and academic session for a formal education profile.');
      return;
    }
    for(const key of ['learnerType','learningFocus','country','studyMode','email'])data.profile[key]=String(fd.get(key)||'').trim();
    if(type==='formal'){
      for(const key of ['institution','stage','programme','level','term','department'])data.profile[key]=String(fd.get(key)||'').trim();
      data.profile.degreeProgramme=data.profile.programme||'';data.profile.academicSession=data.profile.term||'';
    }else{
      data.profile.programme=data.profile.learningFocus;
    }
    closeModal();save();toast('Learning profile updated');
  });
}
