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
  function reflectionDeadlines(){return (data.studyRecords||[]).flatMap(r=>(r.reflection?.tasks||[]).filter(t=>t.dueDate&&/^\d{4}-\d{2}-\d{2}$/.test(String(t.dueDate))).map((t,i)=>({id:'reflection-'+r.id+'-'+i,title:String(t.title||t.type||'Class task'),kind:String(t.type||'Assignment').toLowerCase()==='classwork'?'assignment':'assignment',dueDate:String(t.dueDate),courseId:r.courseId||'',sourceId:r.id+'-'+i})))}
  function renderPlanner(){
    const reflected=reflectionDeadlines().filter(r=>!data.deadlines.some(d=>d.sourceId===r.sourceId));
    const items=[...data.deadlines].sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
    const upcoming=items.filter(x=>!x.completed);
    return pageHead('PLAN AHEAD','Planner','Keep assignments, tests and examinations alongside your study schedule.','<button class="primary-btn" data-feature="add-deadline">＋ Add deadline</button>')+
      '<div class="stats-row"><div class="stat-card"><div class="stat-label">UPCOMING</div><div class="stat-value">'+upcoming.length+'</div><div class="stat-note">open deadlines</div></div><div class="stat-card"><div class="stat-label">OVERDUE</div><div class="stat-value">'+upcoming.filter(x=>x.dueDate<today()).length+'</div><div class="stat-note">need attention</div></div><div class="stat-card"><div class="stat-label">COMPLETED</div><div class="stat-value">'+items.filter(x=>x.completed).length+'</div><div class="stat-note">finished items</div></div></div>'+
      cardBox('Add an assignment or exam','<details id="deadlineEntryDetails" class="action-disclosure"><summary><div><strong>Add assignment, test or exam</strong><p>Enter the title, course and due date</p></div><span class="disclosure-cta">＋ Add</span></summary><div class="disclosure-body"><form id="deadlineForm" class="form-grid"><label class="form-field">Title'+input('title','text','','required maxlength="100" placeholder="e.g. CSC 201 assignment"')+'</label><label class="form-field">Type<select name="kind"><option value="assignment">Assignment</option><option value="exam">Examination</option><option value="test">Test</option><option value="project">Project</option></select></label><label class="form-field">Course'+selectCourse()+'</label><label class="form-field">Due date'+input('dueDate','date',today(),'required')+'</label><label class="form-field full">Notes<textarea name="notes" maxlength="500" placeholder="Submission details or revision notes"></textarea></label><div class="form-field full"><button class="primary-btn" type="submit">Save deadline</button></div></form></div></details>')+
      cardBox('Deadlines found in class reflections',reflected.length?'<div class="schedule-list">'+reflected.map(x=>'<div class="schedule-row"><div class="schedule-time">'+esc(x.dueDate)+'</div><div class="schedule-row-main"><div><strong>'+esc(x.title)+'</strong><span>From a saved class reflection</span></div></div><button class="secondary-btn" data-feature="import-reflection-deadline" data-id="'+esc(x.sourceId)+'" data-date="'+esc(x.dueDate)+'" data-title="'+esc(x.title)+'" data-course="'+esc(x.courseId)+'">Add to planner</button></div>').join('')+'</div>':'<p class="privacy-note-inline">No dated assignment or exam details were found in saved class reflections.</p>')+cardBox('Your deadlines',items.length?'<div class="schedule-list">'+items.map(x=>'<div class="schedule-row"><div class="schedule-time">'+esc(x.dueDate)+'</div><div class="schedule-row-main"><i class="course-swatch" style="background:'+(x.kind==='exam'?'#d38887':'#7ba883')+'"></i><div><strong>'+esc(x.title)+'</strong><span>'+esc(x.kind)+' · '+esc(courseName(x.courseId)||'No course')+(x.dueDate<today()&&!x.completed?' · Overdue':'')+'</span></div></div><div class="schedule-actions"><button class="secondary-btn" data-feature="toggle-deadline" data-id="'+esc(x.id)+'">'+(x.completed?'Reopen':'Complete')+'</button><button class="icon-btn" data-feature="delete-deadline" data-id="'+esc(x.id)+'">×</button></div></div>').join('')+'</div>':emptyState('◷','No deadlines yet','Add your next assignment, test or examination to start planning.','','') )+
      '<div class="note-callout">Class-reflection deadlines can be added here as well. Eduvia keeps these records linked to your course and study plan; it will not invent dates from reflection text.</div>';
  }
  function reviewInterval(card, remembered){
    const steps=[1,3,7,14,30];
    const level=remembered?Math.min(4,(Number(card.level)||0)+1):0;
    return {level,nextReview:new Date(Date.now()+(remembered?steps[Math.max(0,level-1)]:1)*86400000).toLocaleDateString('en-CA')};
  }
  function renderFlashcards(){
    const due=data.flashcards.filter(c=>!c.nextReview||c.nextReview<=today());
    return pageHead('ACTIVE RECALL','Flashcards','Turn topics and your own notes into short questions, then schedule reviews based on recall.','<button class="primary-btn" data-feature="add-card">＋ Create card</button>')+
      '<div class="stats-row"><div class="stat-card"><div class="stat-label">TOTAL CARDS</div><div class="stat-value">'+data.flashcards.length+'</div></div><div class="stat-card"><div class="stat-label">DUE TODAY</div><div class="stat-value">'+due.length+'</div></div><div class="stat-card"><div class="stat-label">MASTERED REVIEWS</div><div class="stat-value">'+data.flashcards.filter(c=>(c.level||0)>=3).length+'</div></div></div>'+
      cardBox('Create from a course topic or uploaded notes','<details class="action-disclosure"><summary><div><strong>Create review cards</strong><p>Choose a course and topic, optionally add notes</p></div><span class="disclosure-cta">＋ Create</span></summary><div class="disclosure-body"><form id="cardGenerateForm" class="form-grid"><label class="form-field">Course'+selectCourse()+'</label><label class="form-field">Topic'+input('topic','text','','required maxlength="120" placeholder="e.g. Database normalisation"')+'</label><label class="form-field full">Notes or explanation<textarea name="notes" rows="4" placeholder="Paste notes here, or leave blank to create a topic prompt."></textarea></label><div class="form-field full"><button class="primary-btn" type="submit">Create review cards</button></div></form></div></details>')+
      cardBox('Review queue',due.length?'<div class="resource-list">'+due.map(c=>'<article class="resource-card"><div class="resource-icon">✧</div><div style="min-width:0;flex:1"><h4>'+esc(c.front)+'</h4><p>'+esc(courseName(c.courseId)||'Personal review')+' · due '+esc(c.nextReview||today())+'</p><details><summary>Reveal answer</summary><p>'+esc(c.back)+'</p></details><div style="display:flex;gap:8px;margin-top:10px"><button class="secondary-btn" data-feature="rate-card" data-id="'+esc(c.id)+'" data-known="1">I remembered</button><button class="secondary-btn" data-feature="rate-card" data-id="'+esc(c.id)+'" data-known="0">Review again</button></div></div><button class="icon-btn" data-feature="delete-card" data-id="'+esc(c.id)+'">×</button></article>').join('')+'</div>':emptyState('✧','You are up to date','Create cards from a course topic or your own notes.','',''))+
      cardBox('All cards',data.flashcards.length?'<div class="resource-list">'+data.flashcards.map(c=>'<article class="resource-card"><div class="resource-icon">▤</div><div style="flex:1"><h4>'+esc(c.front)+'</h4><p>'+esc(courseName(c.courseId)||'Personal')+' · next review '+esc(c.nextReview||'Now')+'</p></div></article>').join('')+'</div>': '<p class="privacy-note-inline">No cards saved yet.</p>');
  }
  function masteryKey(courseId, topic){return courseId+'::'+topic;}
  function renderMastery(){
    const selected=window.eduMasteryCourse||data.courses[0]?.id||'';
    const course=data.courses.find(c=>c.id===selected);
    if(!course)return pageHead('COURSE PROGRESS','Course mastery','Add a course and its topics to track your confidence.','<button class="secondary-btn" data-page="courses">My courses</button>')+emptyState('▦','No course selected','Add a course first.','','');
    const topics=Array.isArray(course.topics)?course.topics:[];
    const rows=topics.map(topic=>{const item=data.topicMastery[masteryKey(course.id,topic)]||{status:'not-started',score:null};const matched=(data.studyRecords||[]).filter(r=>r.courseId===course.id&&String(r.reflection?.topics||'').toLowerCase().includes(String(topic).toLowerCase())&&r.quizAttempts?.length).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];const quiz=matched?.quizAttempts?.[0];const derived=quiz&&Number(quiz.total)>0?Math.round(Number(quiz.score)/Number(quiz.total)*100):null;const shown=item.score??derived;return '<div class="schedule-row"><div class="schedule-row-main"><i class="course-swatch" style="background:'+esc(course.color||'#7ba883')+'"></i><div><strong>'+esc(topic)+'</strong><span>'+(shown===null||shown===undefined?'No linked quiz score yet':'Latest linked quiz score: '+Number(shown)+'%')+'</span></div></div><select data-feature="mastery-status" data-course="'+esc(course.id)+'" data-topic="'+esc(topic)+'"><option value="not-started" '+(item.status==='not-started'?'selected':'')+'>Not started</option><option value="learning" '+(item.status==='learning'?'selected':'')+'>Learning</option><option value="confident" '+(item.status==='confident'?'selected':'')+'>Confident</option></select><button class="secondary-btn" data-feature="topic-score" data-course="'+esc(course.id)+'" data-topic="'+esc(topic)+'">Add quiz score</button></div>'}).join('');
    const count=topics.filter(t=>(data.topicMastery[masteryKey(course.id,t)]||{}).status==='confident').length;
    return pageHead('KNOW WHAT YOU KNOW','Course mastery','Track each topic and connect your confidence to quiz performance.','')+
      '<section class="panel" style="margin-bottom:16px"><div class="panel-head"><div><h3>Choose a course</h3><p>Topic progress is saved separately for each course.</p></div></div><select id="masteryCourseSelect">'+data.courses.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===selected?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select><div class="progress-track"><i style="width:'+(topics.length?Math.round(count/topics.length*100):0)+'%"></i></div><p class="privacy-note-inline">'+count+' of '+topics.length+' topics marked confident</p></section>'+
      cardBox('Topic progress',rows||'<p class="privacy-note-inline">Add topics in the course details to see them here.</p>')+
      '<div class="note-callout">Quiz scores are student-entered in this first version. A score of 80% or above can guide you toward Confident, but you remain in control of each topic status.</div>';
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
    return original+cardBox('Separate course and timetable backups','<p>Export or restore either section independently. Restores merge records into this device and skip duplicates; they never delete existing courses or timetable entries.</p><div class="backup-actions" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="primary-btn" data-action="export-category-backup" data-kind="courses">Download courses</button><label class="secondary-btn backup-file-label">Restore courses<input id="coursesCategoryBackupFile" type="file" accept=".json,application/json"></label></div><p class="privacy-note-inline">Courses are matched by ID first, then course code or name.</p><div class="backup-actions" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px"><button class="primary-btn" data-action="export-category-backup" data-kind="timetable">Download timetable</button><label class="secondary-btn backup-file-label">Restore timetable<input id="timetableCategoryBackupFile" type="file" accept=".json,application/json"></label></div><p class="privacy-note-inline">Timetable entries are matched by ID, then their schedule details. Course links are reconnected to matching courses where possible.</p><hr style="border:0;border-top:1px solid var(--line);margin:16px 0"><p>Need everything in one file? Keep using the full backup options below.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="primary-btn" data-action="export-portable-backup">Download full backup</button><button class="secondary-btn" data-page="vault">Open restore and documents</button></div><p class="privacy-note-inline">Before a category restore, Eduvia downloads a safety copy of the current device data.</p>');
  }
  function renderMoreWithFeatures(){return window.eduOriginalMoreRender?window.eduOriginalMoreRender():renderMore()}
  const originalSyncNav=window.syncNav;
  if(typeof originalSyncNav==='function'&&!window.eduFeatureNavWrapped){
    window.eduFeatureNavWrapped=true;
    window.syncNav=function(){
      originalSyncNav();
      const destinations={planner:'timetable',flashcards:'courses',mastery:'courses',practice:'courses',tutorials:'courses',progress:'habit',records:'habit',education:'more',vault:'more',profile:'more',study:'more',settings:'more',setup:'more'};
      const destination=destinations[currentPage]||currentPage;
      document.querySelectorAll('.mobile-nav-item[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===destination));
      const labels={planner:'Assignments & deadlines',flashcards:'Flashcards',mastery:'Course mastery',practice:'Practice & tests',tutorials:'Tutorials & notes',progress:'Study progress',records:'Session records',education:'Academic history',vault:'Student documents'};
      if(labels[currentPage])document.getElementById('crumbCurrent').textContent=labels[currentPage];
    };
  }
  window.eduOriginalVaultRender=window.eduOriginalVaultRender||window.renderVault;
  window.eduOriginalSettingsRender=window.eduOriginalSettingsRender||window.renderSettings;
  window.eduOriginalMoreRender=window.eduOriginalMoreRender||window.renderMore;
  window.eduPageRenderers=Object.assign(window.eduPageRenderers||{},{planner:renderPlanner,flashcards:renderFlashcards,mastery:renderMastery,vault:renderVaultWithTools,settings:renderSettingsWithBackup,more:renderMoreWithFeatures});
  function removeNestedPageHeading(markup){
    return String(markup||'').replace(/<div class="page-heading">[\s\S]*?<\/div><\/div>/,'');
  }
  function integratedSection(title,description,markup){
    return '<details class="panel integrated-tab-section"><summary><span><strong>'+title+'</strong><small>'+description+'</small></span><span class="integrated-section-toggle">＋</span></summary><div class="integrated-section-content">'+removeNestedPageHeading(markup)+'</div></details>';
  }
data.exams=Array.isArray(data.exams)?data.exams:[];let editingExamId='';function examDaysLeft(exam){const a=parseISO(today());a.setHours(0,0,0,0);const b=parseISO(exam.date);b.setHours(0,0,0,0);return Math.round((b-a)/86400000)}
function examFormMarkup(){const exam=data.exams.find(item=>item.id===editingExamId)||{},editing=!!exam.id;return '<details id="examEntryDetails" class="action-disclosure" '+(editing?'open':'')+'><summary><div><strong>'+(editing?'Edit examination':'Add an examination')+'</strong><p>Save the paper date and connect it to a course</p></div><span class="disclosure-cta">'+(editing?'Edit':'＋ Add exam')+'</span></summary><div class="disclosure-body"><form id="examForm" class="form-grid">'+'<label class="form-field">Examination title'+input('title','text',exam.title||'','required maxlength="100" placeholder="e.g. First semester examination"')+'</label>'+'<label class="form-field">Course'+selectCourse('courseId',exam.courseId||'')+'</label>'+'<label class="form-field">Examination date'+input('date','date',exam.date||'','required')+'</label>'+'<label class="form-field">Start time'+input('startTime','time',exam.startTime||'')+'</label>'+'<label class="form-field full">Topics to revise<textarea name="topics" rows="3" maxlength="1500" placeholder="One topic per line">'+esc(exam.topics||'')+'</textarea></label>'+'<button class="primary-btn" type="submit">Save examination</button></form></div></details>'}
function renderExamTimetable(){const exams=data.exams.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));const upcoming=exams.filter(exam=>examDaysLeft(exam)>=0);const rows=upcoming.map(exam=>{const left=examDaysLeft(exam),course=data.courses.find(item=>String(item.id)===String(exam.courseId));return '<article class="exam-list-card"><div class="exam-date-block"><strong>'+left+'</strong><small>'+(left===0?'TODAY':left===1?'DAY LEFT':'DAYS LEFT')+'</small></div><div class="exam-list-main"><strong>'+esc(exam.title)+'</strong><span>'+esc(course?.code||course?.name||'General examination')+' · '+esc(formatDate(parseISO(exam.date),{month:'short',day:'numeric',year:'numeric'}))+(exam.startTime?' · '+esc(timeLabel(exam.startTime)):'')+'</span><div class="exam-list-actions"><button class="icon-btn" data-exam-action="edit" data-id="'+esc(exam.id)+'">✎</button><button class="icon-btn" data-exam-action="delete" data-id="'+esc(exam.id)+'">×</button></div></div></article>'}).join('');return '<div class="exam-timetable-module"><p class="exam-intro">Add your examination dates and link each paper to a course.</p>'+examFormMarkup()+(rows?'<div class="section-title-row"><h3>Upcoming examinations</h3><span>'+upcoming.length+' scheduled</span></div><div class="exam-list">'+rows+'</div>':'<div class="exam-empty">No examinations scheduled yet.</div>')+'</div>'}
function upcomingExam(){return data.exams.filter(exam=>examDaysLeft(exam)>=0).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0]||null}function examHomeWidget(){const exam=upcomingExam();if(!exam)return '';const left=examDaysLeft(exam),course=data.courses.find(item=>String(item.id)===String(exam.courseId));return '<section class="panel exam-home-widget"><div class="exam-home-head"><div><div class="eyebrow">EXAM COUNTDOWN</div><h3>'+esc(exam.title)+'</h3><p>'+esc(course?.name||'General examination')+' · '+esc(exam.date)+'</p></div><div class="exam-countdown-number"><strong>'+left+'</strong><small>'+(left===0?'TODAY':left===1?'DAY LEFT':'DAYS LEFT')+'</small></div></div><button class="secondary-btn" data-page="timetable">Open examination timetable →</button></section>'}
document.addEventListener('submit',event=>{if(event.target.id!=='examForm')return;event.preventDefault();const fd=new FormData(event.target),title=String(fd.get('title')||'').trim(),date=String(fd.get('date')||'');if(!title||!date){toast('Add an examination title and date.');return}const record={id:editingExamId||uid(),title,courseId:String(fd.get('courseId')||''),date,startTime:String(fd.get('startTime')||''),topics:String(fd.get('topics')||'').trim(),createdAt:Date.now()};if(editingExamId){data.exams=data.exams.map(item=>item.id===editingExamId?record:item);editingExamId=''}else data.exams.push(record);save();toast('Examination saved to your timetable.')});document.addEventListener('click',event=>{const b=event.target.closest('[data-exam-action]');if(!b)return;const idValue=b.dataset.id;if(b.dataset.examAction==='delete'){if(!confirm('Remove this examination?'))return;data.exams=data.exams.filter(item=>item.id!==idValue);save();return}if(b.dataset.examAction==='edit'){editingExamId=idValue;render();document.getElementById('examEntryDetails')?.scrollIntoView({behavior:'smooth',block:'center'})}})

data.revisionTasks=Array.isArray(data.revisionTasks)?data.revisionTasks:[];
function topicsForExam(exam){
 const course=data.courses.find(item=>String(item.id)===String(exam.courseId));
 const typed=String(exam.topics||'').split('\n').map(item=>item.trim()).filter(Boolean);
 const fromCourse=Array.isArray(course?.topics)?course.topics.map(item=>String(item).trim()).filter(Boolean):[];
 return [...new Set(typed.concat(fromCourse))];
}
function renderRevisionTask(task){
 return '<div class="revision-task '+(task.completed?'completed':'')+'"><button class="revision-check" data-exam-action="toggle-task" data-id="'+esc(task.id)+'">'+(task.completed?'✓':'')+'</button><div><strong>'+esc(task.title)+'</strong><small>'+esc(task.date)+' · '+esc(task.type)+'</small></div></div>';
}
function generateRevisionPlan(examId){
 const exam=data.exams.find(item=>item.id===examId);if(!exam)return;
 const left=examDaysLeft(exam);if(left<0){toast('This examination date has passed.');return}
 const existing=data.revisionTasks.filter(task=>task.examId===examId);
 if(existing.length&&!confirm('Replace the existing revision plan? Completed checklist items will be replaced.'))return;
 const topics=topicsForExam(exam),examDate=parseISO(exam.date),studyDays=(data.profile.studyDays||[1,2,3,4,5,6]).map(Number);
 const firstDate=addDays(examDate,-Math.min(14,Math.max(1,left)));
 let dates=[];
 for(let d=new Date(Math.max(parseISO(today()).getTime(),firstDate.getTime()));d<examDate;d=addDays(d,1)){if(studyDays.includes(d.getDay()))dates.push(d.toLocaleDateString('en-CA'))}
 if(!dates.length)dates=[today()];
 const work=topics.length?topics.map(topic=>({title:'Review '+topic,topic,type:'Topic review'})):[
  {title:'Review uploaded course materials',topic:'Course materials',type:'Notes review'},
  {title:'List key topics from your lecture notes',topic:'Lecture topics',type:'Active recall'}
 ];
 work.push({title:'Complete a practice set and review mistakes',topic:topics[0]||exam.title,type:'Practice'});
 work.push({title:'Final active recall and light revision',topic:'Final review',type:'Final review'});
 const tasks=work.map((item,index)=>({id:uid(),examId:exam.id,courseId:exam.courseId||'',date:dates[Math.min(dates.length-1,Math.floor(index*dates.length/work.length))],title:item.title,topic:item.topic,type:item.type,completed:false,createdAt:Date.now()}));
 data.revisionTasks=data.revisionTasks.filter(task=>task.examId!==examId).concat(tasks);
 save();toast(tasks.length+' revision tasks added to your plan.');
}
function renderRevisionPlans(){
 const exams=data.exams.filter(exam=>examDaysLeft(exam)>=0&&data.revisionTasks.some(task=>task.examId===exam.id));
 return exams.map(exam=>{
  const tasks=data.revisionTasks.filter(task=>task.examId===exam.id).sort((a,b)=>a.date.localeCompare(b.date));
  const done=tasks.filter(task=>task.completed).length;
  return '<section class="exam-plan-summary"><div class="panel-head"><div><h4>'+esc(exam.title)+'</h4><p>'+done+' of '+tasks.length+' tasks completed</p></div><span class="upload-count">'+Math.round(done/Math.max(1,tasks.length)*100)+'%</span></div><div class="revision-task-list">'+tasks.slice(0,10).map(renderRevisionTask).join('')+(tasks.length>10?'<small>+'+(tasks.length-10)+' more</small>':'')+'</div></section>';
 }).join('');
}
function renderExamTimetable(){
 const exams=data.exams.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const upcoming=exams.filter(exam=>examDaysLeft(exam)>=0),past=exams.filter(exam=>examDaysLeft(exam)<0);
 const rows=upcoming.map(exam=>{
  const left=examDaysLeft(exam),course=data.courses.find(item=>String(item.id)===String(exam.courseId)),tasks=data.revisionTasks.filter(task=>task.examId===exam.id);
  return '<article class="exam-list-card"><div class="exam-date-block"><strong>'+left+'</strong><small>'+(left===0?'TODAY':left===1?'DAY LEFT':'DAYS LEFT')+'</small></div><div class="exam-list-main"><strong>'+esc(exam.title)+'</strong><span>'+esc(course?.code||course?.name||'General examination')+' · '+esc(formatDate(parseISO(exam.date),{month:'short',day:'numeric',year:'numeric'}))+(exam.startTime?' · '+esc(timeLabel(exam.startTime)):'')+'</span><div class="exam-list-actions"><button class="text-btn" data-exam-action="build-plan" data-id="'+esc(exam.id)+'">'+(tasks.length?'Regenerate revision plan':'Build revision plan')+'</button><button class="icon-btn" data-exam-action="edit" data-id="'+esc(exam.id)+'">✎</button><button class="icon-btn" data-exam-action="delete" data-id="'+esc(exam.id)+'">×</button></div></div></article>';
 }).join('');
 return '<div class="exam-timetable-module"><p class="exam-intro">Add each examination date and connect the paper to its course. Eduvia uses your listed topics and available study days to organise revision.</p>'+examFormMarkup()+
  (upcoming.length?'<div class="section-title-row"><h3>Upcoming examinations</h3><span>'+upcoming.length+' scheduled</span></div><div class="exam-list">'+rows+'</div>':'<div class="exam-empty">No examinations scheduled yet.</div>')+
  (past.length?'<details class="exam-past-list"><summary>Past examinations ('+past.length+')</summary>'+past.map(exam=>'<p>'+esc(exam.date)+' · '+esc(exam.title)+'</p>').join('')+'</details>':'')+'</div>';
}
function examHomeWidget(){
 const exam=upcomingExam();if(!exam)return '';
 const left=examDaysLeft(exam),course=data.courses.find(item=>String(item.id)===String(exam.courseId));
 const tasks=data.revisionTasks.filter(task=>task.examId===exam.id),todayTasks=tasks.filter(task=>task.date===today()),pending=todayTasks.filter(task=>!task.completed);
 return '<section class="panel exam-home-widget"><div class="exam-home-head"><div><div class="eyebrow">EXAM COUNTDOWN</div><h3>'+esc(exam.title)+'</h3><p>'+esc(course?.name||'General examination')+' · '+esc(exam.date)+'</p></div><div class="exam-countdown-number"><strong>'+left+'</strong><small>'+(left===0?'TODAY':left===1?'DAY LEFT':'DAYS LEFT')+'</small></div></div>'+
  (tasks.length?'<div class="exam-home-tasks"><div class="panel-head"><div><h4>Today’s revision</h4><p>'+pending.length+' tasks remaining</p></div></div>'+todayTasks.map(renderRevisionTask).join('')+'</div>':'<p class="exam-home-note">Build a revision plan for this paper from the Schedule tab.</p>')+
  '<div class="exam-home-actions">'+(tasks.length?'':'<button class="primary-btn" data-exam-action="build-plan" data-id="'+esc(exam.id)+'">Build revision plan</button>')+'<button class="secondary-btn" data-page="timetable">Open examination timetable →</button></div></section>';
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-exam-action]');if(!b)return;
 const action=b.dataset.examAction,idValue=b.dataset.id;
 if(action==='build-plan'){generateRevisionPlan(idValue);return}
 if(action==='toggle-task'){const task=data.revisionTasks.find(item=>item.id===idValue);if(task)task.completed=!task.completed;save()}
});

  const originalCourses=window.renderCourses;
  if(typeof originalCourses==='function'&&!window.eduCoursesFeatureWrapped){
    window.eduCoursesFeatureWrapped=true;
    window.renderCourses=function(){
      const base=originalCourses().replace(/(<button class="icon-btn" title="Edit course" data-action="edit-course" data-id="([^"]+)">)/g,'<button class="text-btn" data-feature="open-mastery" data-course="$2">Topic mastery →</button>$1');
      const tools='<section class="courses-integrated-tools"><div class="section-title-row"><h3>Learning and revision tools</h3><span>Organised with your courses</span></div>'+
        integratedSection('Tutorials and notes','Saved resources and study notes',renderTutorials())+
        integratedSection('Practice and tests','Generate and review questions',renderPractice())+
        integratedSection('Flashcards','Recall cards and scheduled reviews',renderFlashcards())+
        integratedSection('Course mastery','Track confidence by topic',renderMastery())+
      '</section>';
      return base+tools;
    };
  }
  const originalTimetable=window.renderTimetable;
  if(typeof originalTimetable==='function'&&!window.eduScheduleToolsWrapped){
    window.eduScheduleToolsWrapped=true;
    window.renderTimetable=function(){return originalTimetable()+integratedSection('Examination timetable','Exam dates, revision plans and countdowns',renderExamTimetable()+renderRevisionPlans())+integratedSection('Assignments, tests and deadlines','Plan coursework alongside your classes',renderPlanner())};
  }
  const originalToday=window.renderToday;
  if(typeof originalToday==='function'&&!window.eduExamTodayWrapped){
    window.eduExamTodayWrapped=true;
    window.renderToday=function(){return originalToday().replace('<div class="hero-grid">',examHomeWidget()+'<div class="hero-grid">')};
  }

  const originalHabit=window.renderHabit;
  if(typeof originalHabit==='function'&&!window.eduHabitToolsWrapped){
    window.eduHabitToolsWrapped=true;
    window.renderHabit=function(){return originalHabit()+integratedSection('Detailed study progress','Weekly performance and focus by course',renderProgress())+integratedSection('Session records','Class reflections, study notes and quiz results',renderStudyRecords())};
  }
  const originalProfile=window.renderProfile;
  if(typeof originalProfile==='function'&&!window.eduProfileSectionsWrapped){
    window.eduProfileSectionsWrapped=true;
    window.renderProfile=function(){return originalProfile()+integratedSection('Academic history and results','Past levels, sessions and recorded results',renderEducation(true))+integratedSection('Student documents','IDs, certificates, transcripts and saved files',renderVault(true))};
  }
  const originalImportZip=window.importPortableBackup;
  const originalImportJson=window.importPlannerJsonBackup;
  async function safetyPortableZip(){
    if(!window.JSZip)await loadStudioScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    const zip=new window.JSZip();zip.file('eduvia-data.json',JSON.stringify(data,null,2));
    for(const [folder,store,metas] of [['personal-documents','personalDocuments',data.personalDocuments||[]],['academic-records','academicRecords',data.academicHistory||[]],['course-materials','materials',data.materials||[]]]){
      const target=zip.folder(folder);for(const meta of metas){const record=await getStudioRecord(store,meta.id);if(!record)continue;if(store==='personalDocuments'){const blob=record.blob||record.file;if(blob)target.file(meta.id,blob)}else target.file(meta.id+'.json',JSON.stringify(record))}
    }
    const blob=await zip.generateAsync({type:'blob',compression:'STORE'});download(blob,'eduvia-safety-copy-before-restore-'+today()+'.zip');
  }
  async function previewAndRestore(file,isZip){
    if(!file)return;let incoming,summary='';
    try{
      if(isZip){if(!window.JSZip)await loadStudioScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');const zip=await window.JSZip.loadAsync(file),entry=zip.file('eduvia-data.json')||zip.file('daymark-data.json');if(!entry)throw new Error('No Eduvia data file was found in this ZIP.');incoming=JSON.parse(await entry.async('string'));summary='Courses '+(incoming.courses||[]).length+' · documents '+(incoming.personalDocuments||[]).length+' · education records '+(incoming.academicHistory||[]).length+' · study materials '+(incoming.materials||[]).length;
      }else{incoming=JSON.parse(await file.text());if(!incoming?.profile||!Array.isArray(incoming.courses)||!Array.isArray(incoming.events))throw new Error('This is not a valid Eduvia JSON backup.');summary='Courses '+incoming.courses.length+' · timetable items '+incoming.events.length+' · study records '+(incoming.studyRecords||[]).length;}
    }catch(error){toast('Backup preview failed: '+error.message+'. Nothing was changed.');return}
    openModal('Preview backup','Selected file: '+file.name+' · '+summary,'<p>Eduvia will first download a portable safety copy of the data currently on this device.</p><p>The selected backup will only be restored after you confirm the next step. Keep both files private because they may contain personal documents.</p>','Continue to restore',async()=>{
      try{await safetyPortableZip();closeModal();if(isZip&&typeof originalImportZip==='function')await originalImportZip(file);else if(!isZip&&typeof originalImportJson==='function')await originalImportJson(file);else throw new Error('The existing restore handler is unavailable.');data.deadlines=Array.isArray(data.deadlines)?data.deadlines:[];data.flashcards=Array.isArray(data.flashcards)?data.flashcards:[];data.topicMastery=data.topicMastery&&typeof data.topicMastery==='object'?data.topicMastery:{};save();}
      catch(error){toast('Restore stopped: '+error.message+'. Your current data was not intentionally replaced.');}
    });
  }
  document.addEventListener('change',e=>{
    const target=e.target;if(!['portableBackupFile','plannerJsonBackupFile','setupBackupFile'].includes(target.id))return;
    const file=target.files?.[0];if(!file)return;target.value='';e.stopImmediatePropagation();
    const zip=target.id==='portableBackupFile'||(target.id==='setupBackupFile'&&(file.name.toLowerCase().endsWith('.zip')||file.type==='application/zip'));
    previewAndRestore(file,zip);
  },true);
  if(typeof window.buildPushReminders==='function'&&!window.eduExpiryRemindersWrapped){
    window.eduExpiryRemindersWrapped=true;const base=window.buildPushReminders;
    window.buildPushReminders=function(now=new Date()){
      const reminders=base(now),until=now.getTime()+90*86400000;
      for(const d of data.deadlines||[]){if(d.completed||!d.dueDate)continue;const at=new Date(d.dueDate+'T09:00:00').getTime()-86400000;if(at>now.getTime()&&at<=until)reminders.push({id:'deadline:'+d.id,title:'Deadline tomorrow',body:String(d.title)+' is due tomorrow.',fireAt:at})}
      for(const d of data.personalDocuments||[]){if(!d.expiryDate)continue;const lead=Math.max(0,Number(d.remindDays)||14),at=new Date(d.expiryDate+'T09:00:00').getTime()-lead*86400000;if(at>now.getTime()&&at<=until)reminders.push({id:'document-expiry:'+d.id,title:'Document expiry coming up',body:String(d.title||d.name)+' expires on '+d.expiryDate+'.',fireAt:at})}
      return reminders.sort((a,b)=>a.fireAt-b.fireAt);
    };
  }
  function notifyExpiringDocuments(){
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    const now=new Date();for(const d of data.personalDocuments||[]){if(!d.expiryDate)continue;const days=Math.ceil((new Date(d.expiryDate+'T23:59:59').getTime()-now.getTime())/86400000),lead=Math.max(0,Number(d.remindDays)||14);if(days>lead)continue;const key='eduvia-doc-expiry:'+d.id+':'+d.expiryDate;if(localStorage.getItem(key)==='1')continue;localStorage.setItem(key,'1');showStudyNotification(days<0?'Document has expired':'Document expiry reminder',String(d.title||d.name)+' '+(days<0?'expired':'expires')+(days===0?' today':days===1?' tomorrow':' in '+days+' days')+'.');}
  }
  window.addEventListener('focus',notifyExpiringDocuments);setTimeout(notifyExpiringDocuments,1500);
  document.addEventListener('click',async event=>{
    const b=event.target.closest('[data-feature]');if(!b)return;
    const action=b.dataset.feature,idValue=b.dataset.id;
    if(action==='add-deadline'){const disclosure=document.getElementById('deadlineEntryDetails');if(disclosure)disclosure.open=true;disclosure?.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(action==='import-reflection-deadline'){if(!data.deadlines.some(x=>x.sourceId===idValue)){data.deadlines.push({id:uid(),sourceId:idValue,title:b.dataset.title||'Class reflection deadline',kind:'assignment',courseId:b.dataset.course||'',dueDate:b.dataset.date,completed:false,createdAt:Date.now()});save();}return}
    if(action==='toggle-deadline'){const item=data.deadlines.find(x=>x.id===idValue);if(item)item.completed=!item.completed;save();return}
    if(action==='delete-deadline'){data.deadlines=data.deadlines.filter(x=>x.id!==idValue);save();return}
    if(action==='add-card'){openModal('Create a flashcard','Write a clear prompt and a concise answer.','<label class="form-field">Course'+selectCourse('courseId')+'</label><label class="form-field">Question<input name="front" required maxlength="180"></label><label class="form-field">Answer<textarea name="back" required maxlength="500"></textarea></label>','Save card',fd=>{data.flashcards.push({id:uid(),courseId:fd.get('courseId'),front:fd.get('front').trim(),back:fd.get('back').trim(),level:0,nextReview:today(),createdAt:Date.now()});closeModal();save()});return}
    if(action==='rate-card'){const card=data.flashcards.find(x=>x.id===idValue);if(card){const next=reviewInterval(card,b.dataset.known==='1');Object.assign(card,next);card.lastReviewed=Date.now();save();}return}
    if(action==='delete-card'){data.flashcards=data.flashcards.filter(x=>x.id!==idValue);save();return}
    if(action==='open-mastery'){window.eduMasteryCourse=b.dataset.course;setPage('mastery');return}
    if(action==='edit-document-meta'){const doc=data.personalDocuments.find(x=>x.id===idValue);if(!doc)return;openModal('Document tags and expiry reminder','Add search tags and an optional expiry date.','<label class="form-field">Tags<input name="tags" value="'+esc((doc.tags||[]).join(', '))+'" placeholder="ID, registration, results"></label><label class="form-field">Link to course'+selectCourse('courseId',doc.courseId||'')+'</label><label class="form-field">Expiry date<input name="expiryDate" type="date" value="'+esc(doc.expiryDate||'')+'"></label><label class="form-field">Reminder lead time<select name="remindDays"><option value="30">30 days before</option><option value="14">14 days before</option><option value="7">7 days before</option><option value="1">1 day before</option></select></label>','Save',fd=>{doc.tags=fd.get('tags').split(',').map(x=>x.trim()).filter(Boolean);doc.courseId=String(fd.get('courseId')||'');doc.expiryDate=fd.get('expiryDate');doc.remindDays=Number(fd.get('remindDays')||14);save()});return}
    if(action==='export-backup'){try{const snap=await portableSnapshot();await downloadBackup(snap);toast('Portable backup downloaded.')}catch(e){toast('Backup failed: '+e.message)}return}
  });
  document.addEventListener('submit',async e=>{
    if(e.target.id==='deadlineForm'){e.preventDefault();const fd=new FormData(e.target);data.deadlines.push({id:uid(),title:fd.get('title').trim(),kind:fd.get('kind'),courseId:fd.get('courseId'),dueDate:fd.get('dueDate'),notes:fd.get('notes').trim(),completed:false,createdAt:Date.now()});save();return}
    if(e.target.id==='cardGenerateForm'){e.preventDefault();const fd=new FormData(e.target),topic=fd.get('topic').trim(),courseId=fd.get('courseId');let notes=fd.get('notes').trim();if(!notes&&courseId&&typeof sessionQuizSources==='function'){try{const sources=await sessionQuizSources(courseId);notes=sources.map(x=>x.text||'').join('\n')}catch{}}const sentences=notes.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>35);if(sentences.length){sentences.slice(0,12).forEach((s,i)=>data.flashcards.push({id:uid(),courseId,front:'Explain: '+(i===0?topic:topic+' — key point '+(i+1)),back:s.slice(0,480),level:0,nextReview:today(),createdAt:Date.now()}))}else data.flashcards.push({id:uid(),courseId,front:'Explain '+topic+' in your own words.',back:'Use your course notes to explain the key definition, main principles and one example of '+topic+'.',level:0,nextReview:today(),createdAt:Date.now()});save();toast('Review cards created from your topic and notes.');return}
  });
  document.addEventListener('input',e=>{if(e.target.id==='documentSearch'){const q=e.target.value.toLowerCase();document.querySelectorAll('[data-doc-search]').forEach(el=>el.hidden=!el.dataset.docSearch.includes(q));}});
  document.addEventListener('change',e=>{
  function categoryKey(value){return String(value??'').trim().toLocaleLowerCase().replace(/\\s+/g,' ')}
  function courseMatchKeys(course){return [categoryKey(course?.code),categoryKey(course?.name)].filter(Boolean)}
  function eventMatchKey(event,courseId=event?.courseId){return [event?.type,event?.date||'weekly',event?.day??'',event?.start,event?.end,categoryKey(event?.title),categoryKey(event?.location),courseId||''].join('|')}
  function exportCategoryBackup(kind){
    const payload={format:'eduvia-category-backup',version:1,kind,createdAt:new Date().toISOString(),items:kind==='courses'?(data.courses||[]):(data.events||[])};
    if(kind==='timetable')payload.courseReferences=(data.courses||[]).map(c=>({id:c.id,name:c.name,code:c.code||''}));
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    download(blob,'eduvia-'+kind+'-backup-'+today()+'.json');toast((kind==='courses'?'Courses':'Timetable')+' backup downloaded.');
  }
  async function importCategoryBackup(file,expectedKind){
    if(!file)return;if(file.size>25*1024*1024){toast('This backup is too large for a category restore.');return}
    let source;
    try{source=JSON.parse(await file.text());if(source?.format!=='eduvia-category-backup'||source.kind!==expectedKind||!Array.isArray(source.items))throw new Error('Choose a valid '+expectedKind+' backup exported by Eduvia.');if(source.items.some(item=>!item||typeof item!=='object'||Array.isArray(item)||!item.id))throw new Error('The backup contains an invalid record.');if(expectedKind==='courses'&&source.items.some(item=>typeof item.name!=='string'||!item.name.trim()))throw new Error('A course is missing its name.');if(expectedKind==='timetable'&&source.items.some(item=>typeof item.title!=='string'||!item.title.trim()))throw new Error('A timetable item is missing its title.')}catch(error){toast('Backup could not be read: '+error.message+'. Nothing was changed.');return}
    openModal('Preview '+(expectedKind==='courses'?'courses':'timetable')+' restore',file.name+' · '+source.items.length+' record'+(source.items.length===1?'':'s'),'<p>Eduvia will merge these records with the existing '+(expectedKind==='courses'?'courses':'timetable')+'. Matching records will be skipped. Nothing already saved will be deleted or overwritten.</p><p>A full safety copy of the current device data will be downloaded before importing.</p>','Merge backup',async()=>{
      try{await safetyPortableZip();let added=0,duplicates=0,unlinked=0;
        if(expectedKind==='courses'){
          const byId=new Map((data.courses||[]).map(c=>[String(c.id),c])),byKey=new Map();for(const c of data.courses||[])for(const key of courseMatchKeys(c))if(!byKey.has(key))byKey.set(key,c);
          for(const course of source.items){const match=byId.get(String(course.id))||courseMatchKeys(course).map(key=>byKey.get(key)).find(Boolean);if(match){duplicates++;continue}const copy={...course,id:String(course.id)};data.courses.push(copy);byId.set(String(copy.id),copy);for(const key of courseMatchKeys(copy))if(!byKey.has(key))byKey.set(key,copy);added++}
        }else{
          const refs=new Map((Array.isArray(source.courseReferences)?source.courseReferences:[]).map(c=>[String(c.id),c])),courses=data.courses||[];
          const resolveCourse=oldId=>{if(!oldId)return '';const exact=courses.find(c=>String(c.id)===String(oldId));if(exact)return exact.id;const ref=refs.get(String(oldId)),key=courseMatchKey(ref);return courses.find(c=>key&&courseMatchKey(c)===key)?.id||''};
          const ids=new Set((data.events||[]).map(e=>String(e.id))),signatures=new Set((data.events||[]).map(e=>eventMatchKey(e,e.courseId)));
          for(const event of source.items){const mappedCourse=resolveCourse(event.courseId),copy={...event,id:String(event.id),courseId:mappedCourse};if(event.courseId&&!mappedCourse)unlinked++;const signature=eventMatchKey(copy,mappedCourse);if(ids.has(String(copy.id))||signatures.has(signature)){duplicates++;continue}data.events.push(copy);ids.add(String(copy.id));signatures.add(signature);added++}
        }
        save();closeModal();render();toast('Restore complete: '+added+' added, '+duplicates+' duplicates skipped'+(unlinked?'; '+unlinked+' timetable item(s) have no matching course link.':''));
      }catch(error){toast('Restore failed: '+(error.message||'unknown error'))}
    });
  }
    if(e.target.id==='coursesCategoryBackupFile'||e.target.id==='timetableCategoryBackupFile'){const file=e.target.files?.[0],kind=e.target.id==='coursesCategoryBackupFile'?'courses':'timetable';e.target.value='';if(file)importCategoryBackup(file,kind);return}
    if(e.target.id==='masteryCourseSelect'){window.eduMasteryCourse=e.target.value;render();return}
    if(e.target.matches('[data-feature="mastery-status"]')){const key=masteryKey(e.target.dataset.course,e.target.dataset.topic);data.topicMastery[key]=data.topicMastery[key]||{};data.topicMastery[key].status=e.target.value;save();return}
    if(e.target.id==='documentSearch'){const q=e.target.value.toLowerCase();document.querySelectorAll('[data-doc-search]').forEach(el=>el.hidden=!el.dataset.docSearch.includes(q));return}
  });
  document.addEventListener('click',e=>{
    const categoryButton=e.target.closest('[data-action="export-category-backup"]');if(categoryButton){exportCategoryBackup(categoryButton.dataset.kind);return}
    const b=e.target.closest('[data-feature="topic-score"]');if(!b)return;
    const score=prompt('Enter the latest quiz score for '+b.dataset.topic+' (0–100):');if(score===null)return;
    const n=Number(score);if(!Number.isFinite(n)||n<0||n>100){toast('Enter a score between 0 and 100.');return}
    const key=masteryKey(b.dataset.course,b.dataset.topic);data.topicMastery[key]=data.topicMastery[key]||{};data.topicMastery[key].score=n;if(n>=80)data.topicMastery[key].status='confident';else if(n>=50)data.topicMastery[key].status='learning';else data.topicMastery[key].status='not-started';save();
  });
  document.addEventListener('change',e=>{if(e.target.id==='documentSearch'){const q=e.target.value.toLowerCase();document.querySelectorAll('[data-doc-search]').forEach(el=>el.hidden=!el.dataset.docSearch.includes(q))}});
  // Render once after every page renderer and feature-page override has been registered.
  if(typeof window.render==='function')window.render();
})();