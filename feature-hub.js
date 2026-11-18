/* Eduvia feature pack: planner, spaced review, mastery, portable backup, document metadata. */
(() => {
  const defaults = { deadlines: [], flashcards: [], topicMastery: {} };
  Object.assign(data, defaults, data);
  data.deadlines = Array.isArray(data.deadlines) ? data.deadlines : [];
  data.flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];
  data.topicMastery = data.topicMastery && typeof data.topicMastery === 'object' ? data.topicMastery : {};
  data.personalDocuments = Array.isArray(data.personalDocuments) ? data.personalDocuments : [];
  const uid = () => 'ev-' + Math.random().toString(36).slice(2, 11);
  const esc = value => safe(String(value ?? ''));
  const today = () => todayISO();
  const cardBox = (title, body, extra='') => '<section class="panel" style="margin-bottom:16px"><div class="panel-head"><div><h3>'+title+'</h3></div>'+extra+'</div>'+body+'</section>';
  const input = (name, type='text', value='', attrs='') => '<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+attrs+'>';
  const selectCourse = (name='courseId', selected='') => '<select name="'+name+'"><option value="">Choose a course</option>'+data.courses.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===selected?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select>';
  function renderPlanner(){
    const items=[...data.deadlines].sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
    const upcoming=items.filter(x=>!x.completed);
    return pageHead('PLAN AHEAD','Planner','Keep assignments, tests and examinations alongside your study schedule.','<button class="primary-btn" data-feature="add-deadline">＋ Add deadline</button>')+
      '<div class="stats-row"><div class="stat-card"><div class="stat-label">UPCOMING</div><div class="stat-value">'+upcoming.length+'</div><div class="stat-note">open deadlines</div></div><div class="stat-card"><div class="stat-label">OVERDUE</div><div class="stat-value">'+upcoming.filter(x=>x.dueDate<today()).length+'</div><div class="stat-note">need attention</div></div><div class="stat-card"><div class="stat-label">COMPLETED</div><div class="stat-value">'+items.filter(x=>x.completed).length+'</div><div class="stat-note">finished items</div></div></div>'+
      cardBox('Add an assignment or exam','<form id="deadlineForm" class="form-grid"><label class="form-field">Title'+input('title','text','','required maxlength="100" placeholder="e.g. CSC 201 assignment"')+'</label><label class="form-field">Type<select name="kind"><option value="assignment">Assignment</option><option value="exam">Examination</option><option value="test">Test</option><option value="project">Project</option></select></label><label class="form-field">Course'+selectCourse()+'</label><label class="form-field">Due date'+input('dueDate','date',today(),'required')+'</label><label class="form-field full">Notes<textarea name="notes" maxlength="500" placeholder="Submission details or revision notes"></textarea></label><div class="form-field full"><button class="primary-btn" type="submit">Save deadline</button></div></form>')+
      cardBox('Your deadlines',items.length?'<div class="schedule-list">'+items.map(x=>'<div class="schedule-row"><div class="schedule-time">'+esc(x.dueDate)+'</div><div class="schedule-row-main"><i class="course-swatch" style="background:'+(x.kind==='exam'?'#d38887':'#7ba883')+'"></i><div><strong>'+esc(x.title)+'</strong><span>'+esc(x.kind)+' · '+esc(courseName(x.courseId)||'No course')+(x.dueDate<today()&&!x.completed?' · Overdue':'')+'</span></div></div><div class="schedule-actions"><button class="secondary-btn" data-feature="toggle-deadline" data-id="'+esc(x.id)+'">'+(x.completed?'Reopen':'Complete')+'</button><button class="icon-btn" data-feature="delete-deadline" data-id="'+esc(x.id)+'">×</button></div></div>').join('')+'</div>':emptyState('◷','No deadlines yet','Add your next assignment, test or examination to start planning.','','') )+
      '<div class="note-callout">Class-reflection deadlines can be added here as well. Eduvia keeps these records linked to your course and study plan; it will not invent dates from reflection text.</div>';
  }
  function reviewInterval(card, remembered){
    const steps=[1,3,7,14,30];
    const level=remembered?Math.min(4,(Number(card.level)||0)+1):0;
    return {level,nextReview:new Date(Date.now()+(remembered?steps[level]:1)*86400000).toLocaleDateString('en-CA')};
  }
  function renderFlashcards(){
    const due=data.flashcards.filter(c=>!c.nextReview||c.nextReview<=today());
    return pageHead('ACTIVE RECALL','Flashcards','Turn topics and your own notes into short questions, then schedule reviews based on recall.','<button class="primary-btn" data-feature="add-card">＋ Create card</button>')+
      '<div class="stats-row"><div class="stat-card"><div class="stat-label">TOTAL CARDS</div><div class="stat-value">'+data.flashcards.length+'</div></div><div class="stat-card"><div class="stat-label">DUE TODAY</div><div class="stat-value">'+due.length+'</div></div><div class="stat-card"><div class="stat-label">MASTERED REVIEWS</div><div class="stat-value">'+data.flashcards.filter(c=>(c.level||0)>=3).length+'</div></div></div>'+
      cardBox('Create from a course topic or uploaded notes','<form id="cardGenerateForm" class="form-grid"><label class="form-field">Course'+selectCourse()+'</label><label class="form-field">Topic'+input('topic','text','','required maxlength="120" placeholder="e.g. Database normalisation"')+'</label><label class="form-field full">Notes or explanation<textarea name="notes" rows="4" placeholder="Paste notes here, or leave blank to create a topic prompt."></textarea></label><div class="form-field full"><button class="primary-btn" type="submit">Create review cards</button></div></form>')+
      cardBox('Review queue',due.length?'<div class="resource-list">'+due.map(c=>'<article class="resource-card"><div class="resource-icon">✧</div><div style="min-width:0;flex:1"><h4>'+esc(c.front)+'</h4><p>'+esc(courseName(c.courseId)||'Personal review')+' · due '+esc(c.nextReview||today())+'</p><details><summary>Reveal answer</summary><p>'+esc(c.back)+'</p></details><div style="display:flex;gap:8px;margin-top:10px"><button class="secondary-btn" data-feature="rate-card" data-id="'+esc(c.id)+'" data-known="1">I remembered</button><button class="secondary-btn" data-feature="rate-card" data-id="'+esc(c.id)+'" data-known="0">Review again</button></div></div><button class="icon-btn" data-feature="delete-card" data-id="'+esc(c.id)+'">×</button></article>').join('')+'</div>':emptyState('✧','You are up to date','Create cards from a course topic or your own notes.','',''))+
      cardBox('All cards',data.flashcards.length?'<div class="resource-list">'+data.flashcards.map(c=>'<article class="resource-card"><div class="resource-icon">▤</div><div style="flex:1"><h4>'+esc(c.front)+'</h4><p>'+esc(courseName(c.courseId)||'Personal')+' · next review '+esc(c.nextReview||'Now')+'</p></div></article>').join('')+'</div>': '<p class="privacy-note-inline">No cards saved yet.</p>');
  }
  function masteryKey(courseId, topic){return courseId+'::'+topic;}
  function renderMastery(){
    const selected=window.eduMasteryCourse||data.courses[0]?.id||'';
    const course=data.courses.find(c=>c.id===selected);
    if(!course)return pageHead('COURSE PROGRESS','Course mastery','Add a course and its topics to track your confidence.','<button class="secondary-btn" data-page="courses">My courses</button>')+emptyState('▦','No course selected','Add a course first.','','');
    const topics=Array.isArray(course.topics)?course.topics:[];
    const rows=topics.map(topic=>{const item=data.topicMastery[masteryKey(course.id,topic)]||{status:'not-started',score:null};return '<div class="schedule-row"><div class="schedule-row-main"><i class="course-swatch" style="background:'+esc(course.color||'#7ba883')+'"></i><div><strong>'+esc(topic)+'</strong><span>'+(item.score===null||item.score===undefined?'No quiz score recorded':'Latest quiz score: '+Number(item.score)+'%')+'</span></div></div><select data-feature="mastery-status" data-course="'+esc(course.id)+'" data-topic="'+esc(topic)+'"><option value="not-started" '+(item.status==='not-started'?'selected':'')+'>Not started</option><option value="learning" '+(item.status==='learning'?'selected':'')+'>Learning</option><option value="confident" '+(item.status==='confident'?'selected':'')+'>Confident</option></select><button class="secondary-btn" data-feature="topic-score" data-course="'+esc(course.id)+'" data-topic="'+esc(topic)+'">Add quiz score</button></div>'}).join('');
    const count=topics.filter(t=>(data.topicMastery[masteryKey(course.id,t)]||{}).status==='confident').length;
    return pageHead('KNOW WHAT YOU KNOW','Course mastery','Track each topic and connect your confidence to quiz performance.','')+
      '<section class="panel" style="margin-bottom:16px"><div class="panel-head"><div><h3>Choose a course</h3><p>Topic progress is saved separately for each course.</p></div></div><select id="masteryCourseSelect">'+data.courses.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===selected?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select><div class="progress-track"><i style="width:'+(topics.length?Math.round(count/topics.length*100):0)+'%"></i></div><p class="privacy-note-inline">'+count+' of '+topics.length+' topics marked confident</p></section>'+
      cardBox('Topic progress',rows||'<p class="privacy-note-inline">Add topics in the course details to see them here.</p>')+
      '<div class="note-callout">Quiz scores are student-entered in this first version. A score of 80% or above can guide you toward Confident, but you remain in control of each topic status.</div>';
  }
  async function dbOpen(){
    return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(new Error('IndexedDB is unavailable'));return}const req=indexedDB.open('daymark-materials-v1',2);req.onupgradeneeded=()=>{const db=req.result;for(const s of ['materials','academicRecords','personalDocuments'])if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  }
  function blobToDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
  async function jsonSafe(value){
    if(value instanceof Blob)return {$eduviaBlob:await blobToDataURL(value),type:value.type};
    if(Array.isArray(value))return Promise.all(value.map(jsonSafe));
    if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=await jsonSafe(v);return out}
    return value;
  }
  async function restoreBlobs(value){
    if(Array.isArray(value))return Promise.all(value.map(restoreBlobs));
    if(value&&typeof value==='object'){
      if(value.$eduviaBlob){const response=await fetch(value.$eduviaBlob);return response.blob()}
      const out={};for(const [k,v] of Object.entries(value))out[k]=await restoreBlobs(v);return out
    }
    return value;
  }
  async function readAllStore(db,name){
    if(!db.objectStoreNames.contains(name))return [];
    return new Promise((resolve,reject)=>{const tx=db.transaction(name,'readonly'),req=tx.objectStore(name).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)});
  }
  async function portableSnapshot(){
    const db=await dbOpen();const stores={};
    try{for(const name of ['materials','academicRecords','personalDocuments'])stores[name]=await Promise.all((await readAllStore(db,name)).map(jsonSafe))}
    finally{db.close()}
    return {format:'eduvia-portable-backup',version:1,createdAt:new Date().toISOString(),data:JSON.parse(JSON.stringify(data)),stores};
  }
  async function downloadBackup(snapshot,name='eduvia-portable-backup.json'){
    const blob=new Blob([JSON.stringify(snapshot)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function validBackup(value){
    return value&&value.format==='eduvia-portable-backup'&&value.version===1&&value.data&&value.data.profile&&Array.isArray(value.data.courses)&&Array.isArray(value.data.events)&&value.stores&&typeof value.stores==='object';
  }
  async function restoreBackupFile(file){
    if(!file||file.size>250*1024*1024){toast('Choose a backup smaller than 250 MB.');return}
    let backup;try{backup=JSON.parse(await file.text())}catch{toast('This file is not valid Eduvia backup JSON.');return}
    if(!validBackup(backup)){toast('This backup is incomplete or from an unsupported format. Nothing was changed.');return}
    const summary='Courses: '+backup.data.courses.length+' · Timetable items: '+backup.data.events.length+' · Study cards: '+(backup.data.flashcards||[]).length+' · Documents: '+(backup.data.personalDocuments||[]).length;
    openModal('Review backup before restoring','Created '+new Date(backup.createdAt).toLocaleString()+' · '+summary,'<p>Eduvia will first download a safety copy of your current data, then replace this device’s planner and local document stores.</p><p><b>Do not close Eduvia while restoration is running.</b></p>','Restore safely',async()=>{
      try{
        const safety=await portableSnapshot();await downloadBackup(safety,'eduvia-safety-copy-before-restore.json');
        const next=JSON.parse(JSON.stringify(backup.data));data=next;
        localStorage.setItem(STORE_KEY,JSON.stringify(data));
        const db=await dbOpen();
        try{for(const name of ['materials','academicRecords','personalDocuments']){if(!db.objectStoreNames.contains(name))continue;const tx=db.transaction(name,'readwrite'),store=tx.objectStore(name);store.clear();for(const row of (backup.stores[name]||[]))store.put(await restoreBlobs(row));await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Restore transaction failed'))})}}
        finally{db.close()}
        closeModal();toast('Backup restored. Your previous data safety copy was downloaded.');render();
      }catch(error){toast('Restore failed: '+(error.message||'unknown error')+'. Keep the safety copy before trying again.')}
    });
  }
  function renderDocumentTools(){
    const docs=data.personalDocuments||[];
    return cardBox('Document search and reminders','<input id="documentSearch" type="search" placeholder="Search document names, tags or categories…"><div class="resource-list" id="documentMetaList">'+(docs.length?docs.map(d=>'<article class="resource-card" data-doc-search="'+esc([d.name,d.title,d.category,...(d.tags||[])].join(' ').toLowerCase())+'"><div class="resource-icon">▣</div><div style="flex:1;min-width:0"><h4>'+esc(d.name||d.title||'Saved document')+'</h4><p>'+esc(d.category||'Document')+' · '+esc((d.tags||[]).join(', ')||'No tags')+(d.expiryDate?' · Expires '+esc(d.expiryDate):'')+'</p><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="secondary-btn" data-feature="edit-document-meta" data-id="'+esc(d.id)+'">Edit tags / reminder</button></div></div></article>').join(''):'<p class="privacy-note-inline">Your saved documents will appear here when added in Personal documents.</p>')+'</div>');
  }
  function renderVaultWithTools(){
    const original=window.eduOriginalVaultRender?window.eduOriginalVaultRender():renderVault();
    return original+renderDocumentTools();
  }
  function renderSettingsWithBackup(){
    const original=window.eduOriginalSettingsRender?window.eduOriginalSettingsRender():renderSettings();
    return original+cardBox('Portable backup and restore','<p>Export courses, results, study records, flashcards, documents and locally stored materials in one portable file.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="primary-btn" data-feature="export-backup">Download full backup</button><label class="secondary-btn">Choose backup to restore<input id="portableBackupFile" type="file" accept=".json,application/json" style="display:none"></label></div><p class="privacy-note-inline">Restoration previews contents and downloads a safety copy before replacing data.</p>');
  }
  function renderMoreWithFeatures(){
    const original=window.eduOriginalMoreRender?window.eduOriginalMoreRender():renderMore();
    return original.replace('</div>', '<button class="course-card" style="text-align:left" data-page="planner"><div class="course-card-head"><span class="habit-badge">◷</span><h3>Planner</h3></div><p class="course-desc">Assignments, tests and examinations.</p></button><button class="course-card" style="text-align:left" data-page="flashcards"><div class="course-card-head"><span class="habit-badge">✧</span><h3>Flashcards</h3></div><p class="course-desc">Spaced review from topics and notes.</p></button><button class="course-card" style="text-align:left" data-page="mastery"><div class="course-card-head"><span class="habit-badge">↗</span><h3>Course mastery</h3></div><p class="course-desc">Track confidence by course topic.</p></button></div>');
  }
  window.eduOriginalVaultRender=window.eduOriginalVaultRender||window.renderVault;
  window.eduOriginalSettingsRender=window.eduOriginalSettingsRender||window.renderSettings;
  window.eduOriginalMoreRender=window.eduOriginalMoreRender||window.renderMore;
  window.eduPageRenderers=Object.assign(window.eduPageRenderers||{},{planner:renderPlanner,flashcards:renderFlashcards,mastery:renderMastery,vault:renderVaultWithTools,settings:renderSettingsWithBackup,more:renderMoreWithFeatures});
  const originalCourses=window.renderCourses;
  if(typeof originalCourses==='function'&&!window.eduCoursesFeatureWrapped){
    window.eduCoursesFeatureWrapped=true;
    window.renderCourses=function(){return originalCourses().replace(/<\/article>/g,'<div style="margin-top:10px"><button class="text-btn" data-feature="open-mastery" data-course="__COURSE_ID__">Topic mastery →</button></div></article>')};
  }
  document.addEventListener('click',async event=>{
    const b=event.target.closest('[data-feature]');if(!b)return;
    const action=b.dataset.feature,idValue=b.dataset.id;
    if(action==='add-deadline'){document.getElementById('deadlineForm')?.scrollIntoView({behavior:'smooth'});return}
    if(action==='toggle-deadline'){const item=data.deadlines.find(x=>x.id===idValue);if(item)item.completed=!item.completed;save();return}
    if(action==='delete-deadline'){data.deadlines=data.deadlines.filter(x=>x.id!==idValue);save();return}
    if(action==='add-card'){openModal('Create a flashcard','Write a clear prompt and a concise answer.','<label class="form-field">Course'+selectCourse('courseId')+'</label><label class="form-field">Question<input name="front" required maxlength="180"></label><label class="form-field">Answer<textarea name="back" required maxlength="500"></textarea></label>','Save card',fd=>{data.flashcards.push({id:uid(),courseId:fd.get('courseId'),front:fd.get('front').trim(),back:fd.get('back').trim(),level:0,nextReview:today(),createdAt:Date.now()});closeModal();save()});return}
    if(action==='rate-card'){const card=data.flashcards.find(x=>x.id===idValue);if(card){const next=reviewInterval(card,b.dataset.known==='1');Object.assign(card,next);card.lastReviewed=Date.now();save();}return}
    if(action==='delete-card'){data.flashcards=data.flashcards.filter(x=>x.id!==idValue);save();return}
    if(action==='open-mastery'){window.eduMasteryCourse=b.dataset.course;setPage('mastery');return}
    if(action==='edit-document-meta'){const doc=data.personalDocuments.find(x=>x.id===idValue);if(!doc)return;openModal('Document tags and expiry reminder','Add search tags and an optional expiry date.','<label class="form-field">Tags<input name="tags" value="'+esc((doc.tags||[]).join(', '))+'" placeholder="ID, registration, results"></label><label class="form-field">Expiry date<input name="expiryDate" type="date" value="'+esc(doc.expiryDate||'')+'"></label><label class="form-field">Reminder lead time<select name="remindDays"><option value="30">30 days before</option><option value="14">14 days before</option><option value="7">7 days before</option><option value="1">1 day before</option></select></label>','Save',fd=>{doc.tags=fd.get('tags').split(',').map(x=>x.trim()).filter(Boolean);doc.expiryDate=fd.get('expiryDate');doc.remindDays=Number(fd.get('remindDays')||14);save()});return}
    if(action==='export-backup'){try{const snap=await portableSnapshot();await downloadBackup(snap);toast('Portable backup downloaded.')}catch(e){toast('Backup failed: '+e.message)}return}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id==='deadlineForm'){e.preventDefault();const fd=new FormData(e.target);data.deadlines.push({id:uid(),title:fd.get('title').trim(),kind:fd.get('kind'),courseId:fd.get('courseId'),dueDate:fd.get('dueDate'),notes:fd.get('notes').trim(),completed:false,createdAt:Date.now()});save();return}
    if(e.target.id==='cardGenerateForm'){e.preventDefault();const fd=new FormData(e.target),topic=fd.get('topic').trim(),notes=fd.get('notes').trim(),courseId=fd.get('courseId');const sentences=notes.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>35);if(sentences.length){sentences.slice(0,12).forEach((s,i)=>data.flashcards.push({id:uid(),courseId,front:'Explain: '+(i===0?topic:topic+' — key point '+(i+1)),back:s.slice(0,480),level:0,nextReview:today(),createdAt:Date.now()}))}else data.flashcards.push({id:uid(),courseId,front:'Explain '+topic+' in your own words.',back:'Use your course notes to explain the key definition, main principles and one example of '+topic+'.',level:0,nextReview:today(),createdAt:Date.now()});save();toast('Review cards created from your topic and notes.');return}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='masteryCourseSelect'){window.eduMasteryCourse=e.target.value;render();return}
    if(e.target.matches('[data-feature="mastery-status"]')){const key=masteryKey(e.target.dataset.course,e.target.dataset.topic);data.topicMastery[key]=data.topicMastery[key]||{};data.topicMastery[key].status=e.target.value;save();return}
    if(e.target.id==='portableBackupFile'){restoreBackupFile(e.target.files?.[0]);e.target.value='';return}
    if(e.target.id==='documentSearch'){const q=e.target.value.toLowerCase();document.querySelectorAll('[data-doc-search]').forEach(el=>el.hidden=!el.dataset.docSearch.includes(q));return}
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-feature="topic-score"]');if(!b)return;
    const score=prompt('Enter the latest quiz score for '+b.dataset.topic+' (0–100):');if(score===null)return;
    const n=Number(score);if(!Number.isFinite(n)||n<0||n>100){toast('Enter a score between 0 and 100.');return}
    const key=masteryKey(b.dataset.course,b.dataset.topic);data.topicMastery[key]=data.topicMastery[key]||{};data.topicMastery[key].score=n;if(n>=80)data.topicMastery[key].status='confident';else if(n>=50)data.topicMastery[key].status='learning';else data.topicMastery[key].status='not-started';save();
  });
  document.addEventListener('change',e=>{if(e.target.id==='documentSearch'){const q=e.target.value.toLowerCase();document.querySelectorAll('[data-doc-search]').forEach(el=>el.hidden=!el.dataset.docSearch.includes(q))}});
  document.addEventListener('DOMContentLoaded',()=>{});
  const originalRenderSettings=window.renderSettings;
  const originalRenderVault=window.renderVault;
  if(originalRenderSettings)window.renderSettings=originalRenderSettings;
  if(originalRenderVault)window.renderVault=originalRenderVault;
  const backupInputHandler=async e=>{if(e.target.id!=='portableBackupFile')return;await restoreBackupFile(e.target.files?.[0]);e.target.value=''};
  document.addEventListener('change',backupInputHandler);
})();