se()}

async function handleStudioFile(kind,file){
  if(!file)return;studioNotice=`Reading ${file.name}…`;render();
  try{const ext=fileExt(file),text=await extractDocument(file,kind);if(kind==='material'){await previewMaterial(file,text);return}const parseExt=['tsv','xls','xlsx'].includes(ext)?'csv':ext;const rows=kind==='courses'?parseCourseImport(text,parseExt):parseTimetableImport(text,parseExt);if(!rows.length)throw new Error(kind==='courses'?'No course rows found. Try a clearer image showing the course codes and names, or use the course CSV template.':'No timetable rows found. Try a clearer image showing the days and times, or use the timetable CSV template.');pendingStudioImport={kind,fileName:file.name,rows};showImportPreview(kind,file.name,rows)}catch(error){studioNotice=error.message||'Could not read that file.';render();toast(studioNotice)}
}
function importField(label,name,value,type='text',placeholder=''){const escaped=typeof value==='string'?value:String(value??'');return `<label class="form-field"><span>${label}</span><input name="${name}" type="${type}" value="${safe(escaped)}" placeholder="${safe(placeholder)}" ${type==='time'?'required':''}></label>`}
function showImportPreview(kind,fileName,rows){const isCourses=kind==='courses';const cards=rows.map((r,i)=>isCourses?`<article class="import-review-row"><strong>Course ${i+1}</strong><div class="import-review-grid">${importField('Course code',`code_${i}`,r.code||'','text','e.g. CSC 301')}${importField('Course name',`name_${i}`,r.name||'','text','Full course title')}${importField('Credits',`credits_${i}`,r.credits||'','text','')}${importField('Topics',`topics_${i}`,(r.topics||[]).join('; '),'text','Separate topics with semicolons')}</div></article>`:`<article class="import-review-row"><strong>Class ${i+1}</strong><div class="import-review-grid timetable-review-grid"><label class="form-field"><span>Day</span><select name="day_${i}" required><option value="">Choose a day</option>${STUDIO_DAYS.map((day,index)=>`<option value="${index}" ${Number(r.day)===index?'selected':''}>${day}</option>`).join('')}</select></label>${importField('Course code',`courseCode_${i}`,r.courseCode||'','text','e.g. CSC 301')}${importField('Course name / class',`title_${i}`,r.title||'','text','Class or course name')}${importField('Start time',`start_${i}`,r.start||'','time')}${importField('End time',`end_${i}`,r.end||'','time')}${importField('Room / location',`location_${i}`,r.location||'','text','Optional')}</div></article>`).join('');const note=isCourses?'These courses will be added to My Courses. Timetable entries are imported separately.':'These class times will be added to Timetable. Your course list stays in My Courses.';openModal(isCourses?'Review course list':'Review school timetable',`${fileName} · ${rows.length} item${rows.length===1?'':'s'} detected`,`<div class="import-review-list">${cards}</div><p class="preview-note">${note}</p>`,'Import',formData=>{const updated=rows.map((row,i)=>isCourses?({...row,code:String(formData.get(`code_${i}`)||'').trim(),name:String(formData.get(`name_${i}`)||'').trim(),credits:String(formData.get(`credits_${i}`)||'').trim(),topics:String(formData.get(`topics_${i}`)||'').split(/[;|\n]+/).map(x=>x.trim()).filter(Boolean)}):({...row,day:Number(formData.get(`day_${i}`)),courseCode:String(formData.get(`courseCode_${i}`)||'').trim(),title:String(formData.get(`title_${i}`)||'').trim(),start:normalizeTime(formData.get(`start_${i}`)),end:normalizeTime(formData.get(`end_${i}`)),location:String(formData.get(`location_${i}`)||'').trim()}));const invalid=updated.some(row=>isCourses?(!row.code&&!row.name):(!row.title||!row.start||!row.end||minutes(row.end)<=minutes(row.start)));if(invalid){toast(isCourses?'Each course needs a course code or course name. Check the highlighted details.':'Check each class name, day, and start/end time before importing.');return}pendingStudioImport.rows=updated;commitStudioImport();closeModal()})}
function matchCourse(value){const v=String(value||'').toLowerCase().replace(/\s+/g,'');return data.courses.find(c=>String(c.code||'').toLowerCase().replace(/\s+/g,'')===v||String(c.name||'').toLowerCase()===String(value||'').toLowerCase())}
function commitStudioImport(){if(!pendingStudioImport)return;const {kind,rows,fileName}=pendingStudioImport;let count=0;if(kind==='courses'){for(const row of rows){let course=matchCourse(row.code||row.name);if(course){if(row.name)course.name=row.name;if(row.code)course.code=row.code;if(row.topics?.length)course.topics=row.topics;if(row.credits)course.credits=Number(row.credits)||row.credits}else{data.courses.push({id:id(),name:row.name||`Course ${row.code}`,code:row.code||'',instructor:'',note:'',color:COLORS[data.courses.length%COLORS.length],credits:Number(row.credits)||0,topics:row.topics||[]})}count++}data.imports.courses.push({name:fileName,count,at:Date.now()});currentPage='courses'}else{data.events=data.events.filter(e=>!e.importedTimetable);for(const row of rows){const c=matchCourse(row.courseCode||row.title);const existing=data.events.some(e=>e.type==='class'&&e.day===row.day&&e.start===row.start&&e.title.toLowerCase()===row.title.toLowerCase());if(existing)continue;data.events.push({id:id(),title:row.title,type:'class',courseId:c?.id||'',date:'',day:row.day,start:row.start,end:row.end,location:row.location||'',remind:false,duration:minutes(row.end)-minutes(row.start),importedTimetable:true});count++}data.imports.timetable.push({name:fileName,count,at:Date.now()});currentPage='timetable'}location.hash=currentPage;pendingStudioImport=null;studioNotice=kind==='courses'?`${count} courses added to My Courses.`:`${count} class times added to Timetable.`;save();toast(studioNotice)}

async function previewMaterial(file,text){const courseOptionsHtml=courseOptions();const materialId=id(),ext=fileExt(file),content=text.slice(0,1200000);pendingStudioImport={kind:'material',material:{id:materialId,name:file.name,ext,characters:content.length},text:content};openModal('Add course material',file.name,`<div class="form-field full"><label for="materialCourseSelect">Link it to a course</label><select id="materialCourseSelect">${courseOptionsHtml}</select></div><p class="preview-note">${content.length.toLocaleString()} characters of text extracted. A 40 MB upload limit applies. The original file is not uploaded to a server.</p><div class="material-excerpt">${safe(content.slice(0,520))}${content.length>520?'…':''}</div>`,'Save material',async()=>{const m=pendingStudioImport?.material;if(!m)return;const select=document.getElementById('materialCourseSelect');m.courseId=select?.value||'';try{await storeMaterial({id:m.id,name:m.name,ext:m.ext,text:pendingStudioImport.text,courseId:m.courseId,createdAt:Date.now()})}catch{data.materialText=data.materialText||[];data.materialText.push({id:m.id,name:m.name,ext:m.ext,text:pendingStudioImport.text,courseId:m.courseId});m.warning='stored in browser backup instead'}data.materials.push(m);pendingStudioImport=null;closeModal();studioNotice='Material saved. Tutorials and practice use this material locally on your device.';save();toast('Course material saved')})}

function downloadCsv(content,name){const blob=new Blob([content],{type:'text/csv;charset=utf-8'});download(blob,name)}
function courseTemplate(){downloadCsv('code,name,credits,topics\nSUBJ 101,Sample course,3,"Topic one; Topic two; Topic three"\n','eduvia-course-list-template.csv')}
function timetableTemplate(){downloadCsv('day,start,end,title,courseCode,location\nMonday,09:00,10:00,Sample class,SUBJ 101,Room or online\nWednesday,14:00,15:30,Sample tutorial,SUBJ 102,Online\n','eduvia-school-timetable-template.csv')}

function saveAvailability(form){const fd=new FormData(form);const days=fd.getAll('studyDay').map(Number);if(!days.length){toast('Choose at least one day for study.');return false}const start=fd.get('studyStart'),end=fd.get('studyEnd');if(minutes(end)<=minutes(start)){toast('Your study window must end after it starts.');return false}data.profile.studyDays=days;data.profile.studyStart=start;data.profile.studyEnd=end;data.profile.planSessionMinutes=Number(fd.get('planSessionMinutes'))||45;save();studioNotice='Study times saved. The next plan will fit inside this window.';toast('Study availability saved');return true}
function generatePlan(){
  if(!data.courses.length){studioNotice='Import your course form or add your courses first. Then the planner can spread sessions across them.';render();toast('Add at least one course before generating a plan.');return}
  const days=(data.profile.studyDays||[]).map(Number),start=minutes(data.profile.studyStart||'17:00'),end=minutes(data.profile.studyEnd||'21:00'),session=Number(data.profile.planSessionMinutes)||45;
  if(!days.length||end<=start){toast('Set your available days and study window first.');return}
  const manual=data.events.filter(e=>!e.generated),classes=manual.filter(e=>e.type==='class'),blocks=manual.filter(e=>e.type==='study');
  const candidates=[];for(const day of days){for(let t=start;t+session<=end;t+=30){const collision=[...classes,...blocks].some(e=>Number(e.day)===day&&minutes(e.start)<t+session+15&&minutes(e.end)+15>t);if(!collision)candidates.push({day,start:t,end:t+session})}}
  const count=Math.max(Number(data.profile.weeklyGoal)||5,data.courses.length);if(!candidates.length){studioNotice='No open study slots fit around your classes. Widen your study window, choose more days, or shorten each session.';render();toast('No available study slots found.');return}
  const ranked=[...data.courses].sort((a,b)=>(Number(b.credits)||3)-(Number(a.credits)||3));const chosen=[];
  for(const slot of candidates){if(chosen.length>=count)break;if(chosen.some(x=>x.day===slot.day&&slot.start<x.end+30&&slot.end+30>x.start))continue;let course=ranked[chosen.length%ranked.length];if(ranked.length>1&&chosen.length&&course.id===chosen[chosen.length-1].course.id)course=ranked[(chosen.length+1)%ranked.length];const idx=chosen.filter(x=>x.course.id===course.id).length;const topics=course.topics||[];const topic=topics.length?topics[idx%topics.length]:'next course topic';chosen.push({...slot,course,topic})}
  data.events=manual.concat(chosen.map(x=>({id:id(),title:`Study · ${x.course.code||x.course.name}${x.topic&&x.topic!=='next course topic'?` · ${x.topic}`:''}`,type:'study',createdAt:todayISO(),courseId:x.course.id,date:'',day:x.day,start:toTime(x.start),end:toTime(x.end),location:'',remind:false,duration:session,generated:true,topic:x.topic})));
  studioNotice=`Generated ${chosen.length} weekly study sessions across ${new Set(chosen.map(x=>x.course.id)).size} of ${data.courses.length} courses. Review the schedule and adjust your availability if you want to fit in more.`;
  data.studyPlan={generatedAt:Date.now(),count:chosen.length,courseCount:data.courses.length};save();toast(`${chosen.length} study sessions added to your timetable`);
}
function toTime(n){return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}

function materialForCourse(courseId){return data.materials.find(m=>m.courseId===courseId)||data.materials.find(m=>!m.courseId)||null}
async function loadCourseText(courseId){const materials=data.materials.filter(m=>m.courseId===courseId||!m.courseId);const chunks=[];for(const m of materials){const stored=await readMaterial(m.id);if(stored?.text)chunks.push({name:m.name,text:stored.text.slice(0,120000)})}return chunks}
function selectedCourse(selectId){const select=document.getElementById(selectId);return data.courses.find(c=>c.id===select?.value)||data.courses[0]||null}
function tutorialText(course,sources){const topics=course.topics||[];const source=sources[0];if(source){const sentences=source.text.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.length>45&&x.length<600);const chosen=sentences.slice(0,6);return {title:`${course.code||course.name}: ${topics[0]||'focused review'}`,course:course.name,source:source.name,text:`## What to focus on\nUse this short guide to review ${course.name}. Read the selected explanation, identify the important terms, then answer the recall prompts without looking at your notes.\n\n## From your material\n${chosen.slice(0,4).map(x=>`- ${x}`).join('\n')||source.text.slice(0,1800)}\n\n## Check your understanding\n${topics.slice(0,3).map((t,i)=>`${i+1}. Explain **${t}** in your own words. Give one example and connect it to the material above.`).join('\n')||'1. Summarise the main idea in the material.\n2. Identify two key terms and explain how they relate.\n3. Give one practical example from your course.'}\n\n## Active recall\nClose the material and write down five key points. Reopen it only to check what you missed.`}}if(topics.length){return {title:`${course.code||course.name}: guided review`,course:course.name,source:'Course topics supplied in your course form',text:`## Learning goals\nBy the end of this session, you should be able to explain ${topics.slice(0,3).join(', ')}.\n\n## Guided study\nStart with **${topics[0]}**. Write down its definition, the problem it solves, and one example from your lectures. Then connect it to ${topics[1]||'a second topic in the course'}. Check your teacher’s or instructor’s slides for terminology, diagrams, and any specific method your class uses.\n\n## Review prompts\n${topics.slice(0,5).map((t,i)=>`${i+1}. Explain ${t} and give one example.\n${i+1}. What is a common mistake or misconception about ${t}?`).join('\n')}\n\n## Source note\nThis is a study outline from the topic titles in your course form. Add your lecture slides or textbook for a lesson that follows the actual class material more closely.`}}return {title:`${course.code||course.name}: first study session`,course:course.name,source:'General study prompts',text:`## Start with your class material\nOpen the latest lecture notes for **${course.name}**. List the topic headings and choose one that you found difficult.\n\n## Study routine\n1. Read the chosen section once to understand the main idea.\n2. Close the notes and write a short explanation from memory.\n3. Reopen the notes and correct missing details.\n4. Solve one example or practice question from class.\n\n## Check your understanding\n- What is the main idea of this topic?\n- Which term, formula, or process needs more revision?\n- Can you explain it with an example?\n\nAdd a course outline or tutorial material to get a course-specific lesson.`}}

async function generateTutorial(){
  const course=selectedCourse('lessonCourse');
  if(!course){toast('Import or add your courses first.');return}
  studioNotice='';
  const sources=await loadCourseText(course.id);
  studioLesson=tutorialText(course,sources);
  studioNotice=sources.length?'Tutorial created from the course material stored on this device. Check details against your class notes.':'Study guide created from your course details. Add a textbook or slides for a guide that follows your class material more closely.';
  currentPage='study';render();document.querySelector('.generated-card')?.scrollIntoView({behavior:'smooth',block:'start'});
}function editStudyProfile(){
  const stages=educationStages();
  const options=stages.map(([value,label])=>'<option value="'+value+'" '+(data.profile.stage===value?'selected':'')+'>'+label+'</option>').join('');
  const body='<div class="form-grid">'+field('Country or region','country','<input id="f-country" name="country" value="'+safe(data.profile.country)+'">')+field('School or learning provider','institution','<input id="f-institution" name="institution" value="'+safe(data.profile.institution)+'">')+'</div>'+
    '<div class="form-grid">'+field('Learning stage','stage','<select id="f-stage" name="stage"><option value="">Choose one</option>'+options+'</select>')+field('Centre or study mode (optional)','centre','<input id="f-centre" name="centre" value="'+safe(data.profile.centre)+'">')+'</div>'+
    '<div class="form-grid">'+field('Programme, class, or subject','programme','<input id="f-programme" name="programme" value="'+safe(data.profile.programme)+'">')+field('Level, grade, or year','level','<input id="f-level" name="level" value="'+safe(data.profile.level)+'">')+'</div>'+
    '<div class="form-grid">'+field('Term or session','term','<input id="f-term" name="term" value="'+safe(data.profile.term)+'">')+field('Usual exam or test style','examStyle','<input id="f-examStyle" name="examStyle" value="'+safe(data.profile.examStyle||'')+'" placeholder="Multiple choice, essays, practicals, etc.">')+'</div>'+greetingPreferencesMarkup();
  openModal('Study profile','Set the school and study details used to personalize your study plan.',body,'Save profile',fd=>{for(const key of ['country','institution','stage','centre','programme','level','term','examStyle','regionOrLanguage','greetingStyle'])data.profile[key]=String(fd.get(key)||'').trim();closeModal();save();toast('Study profile updated')});
}
function searchUrl(course){const q=[data.profile.institution,data.profile.country,data.profile.stage,data.profile.programme,data.profile.level,course?.code,course?.name,'official syllabus course outline curriculum'].filter(Boolean).join(' ');return`https://www.google.com/search?q=${encodeURIComponent(q)}`}

function localPractice(course,sources,count,style){const topicList=course.topics||[];let sentences=sources.flatMap(s=>s.text.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).filter(x=>x.length>55&&x.length<420).map(sentence=>({sentence,source:s.name})));sentences=sentences.slice(0,count);const sourceName=sources[0]?.name||'course topics';const prompts=sentences.map((x,i)=>({question:style==='essay'?`Discuss the following point from your course material. Explain it, give an example, and state one implication: “${x.sentence}”`:`In your own words, explain this idea from your notes and give one example: “${x.sentence}”`,answer:x.sentence,source:x.source}));for(let i=0;prompts.length<count&&topicList.length;i++){const topic=topicList[i%topicList.length];prompts.push({question:style==='essay'?`Write an exam-style answer on ${topic}. Define it, explain its main parts, and use an example.`:`What is ${topic}, what problem does it address, and how would you explain it to a classmate?`,answer:`Use your teacher’s or instructor’s definition and examples for ${topic}. Include key terms, steps or properties, and an example.`,source:sourceName})}if(!prompts.length){prompts.push({question:`Using your latest lecture material for ${course.name}, explain one important idea and apply it to a practical example.`,answer:'Refer to your course material and include a definition, explanation, and example.',source:sourceName})}return {title:`${course.code||course.name} · practice`,source:sources[0]?.name||'Course topics',questions:prompts.slice(0,count)}}
async function generatePractice(){
  const course=selectedCourse('practiceCourseSelect')||selectedCourse('practiceCourse')||data.courses[0];
  if(!course){toast('Import or add your course list first.');return}
  const count=Number(document.getElementById('questionCount')?.value)||10,style=document.getElementById('questionStyle')?.value||'mixed';
  const sources=await loadCourseText(course.id);
  studioPractice=localPractice(course,sources,count,style);window.practiceCourseId=course.id;currentPage='practice';render();document.querySelector('.practice-results')?.scrollIntoView({behavior:'smooth',block:'start'});
}function editStudyProfile(){const stages=educationStages();openModal('Study profile','This information helps tailor course searches and study materials. It is always editable.',`<div class="form-grid">${field('Country or region','country',`<input id="f-country" name="country" value="${safe(data.profile.country)}">`)}${field('School, university, or provider','institution',`<input id="f-institution" name="institution" value="${safe(data.profile.institution)}">`)}</div><div class="form-grid">${field('Learning stage','stage',`<select id="f-stage" name="stage"><option value="">Choose one</option>${stages.map(([v,t])=>`<option value="${v}" ${data.profile.stage===v?'selected':''}>${t}</option>`).join('')}</select>`)}${field('Centre or study mode (optional)','centre',`<input id="f-centre" name="centre" value="${safe(data.profile.centre)}">`)}</div><div class="form-grid">${field('Programme, class, or main subject','programme',`<input id="f-programme" name="programme" value="${safe(data.profile.programme)}">`)}${field('Level, grade, or year','level',`<input id="f-level" name="level" value="${safe(data.profile.level)}">`)}</div>${field('Term, semester, or session','term',`<input id="f-term" name="term" value="${safe(data.profile.term)}">`)}`,'Save profile',fd=>{for(const key of ['country','institution','stage','centre','programme','level','term'])data.profile[key]=fd.get(key).trim();closeModal();save();toast('Study profile updated')})}

document.addEventListener('change',e=>{if(e.target.id==='materialImportFile'&&e.target.files?.length>1){e.stopImmediatePropagation();toast('Add materials one file at a time so you can link each one to the right course.');handleStudioFile('material',e.target.files[0])}},true);
document.addEventListener('change',e=>{if(e.target.id==='courseImportFile')handleStudioFile('courses',e.target.files[0]);if(e.target.id==='timetableImportFile')handleStudioFile('timetable',e.target.files[0]);if(e.target.id==='materialImportFile')handleStudioFile('material',e.target.files[0])});
document.addEventListener('submit',e=>{if(e.target.id==='availabilityForm'){e.preventDefault();saveAvailability(e.target)}});
document.addEventListener('click',e=>{const p=e.target.closest('[data-page="practice"]');if(p){window.practiceCourseId=document.getElementById('practiceCourse')?.value||'';queueMicrotask(render)}});
document.addEventListener('submit',e=>{if(e.target.id!=='onboardingForm')return;e.preventDefault();const fd=new FormData(e.target),days=fd.getAll('studyDay').map(Number);if(!fd.get('stage')){toast('Choose your school or learning stage to continue.');return}if(!days.length){toast('Choose at least one day you can study.');return}for(const key of ['country','institution','stage','programme','level','term','examStyle'])data.profile[key]=String(fd.get(key)||'').trim();data.profile.weeklyGoal=Math.min(30,Math.max(1,Number(fd.get('weeklyGoal'))||5));data.profile.studyStart=fd.get('studyStart');data.profile.studyEnd=fd.get('studyEnd');data.profile.planSessionMinutes=Number(fd.get('planSessionMinutes'))||45;data.profile.studyDays=days;data.profile.setupComplete=true;save();setPage('study');toast('Your planner is ready. Add your course list to begin.')});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  switch(b.dataset.action){
    case'generate-plan':generatePlan();break;
    case'download-course-template':courseTemplate();break;
    case'download-timetable-template':timetableTemplate();break;
    case'edit-study-profile':editStudyProfile();break;
    case'open-practice':window.practiceCourseId=document.getElementById('practiceCourse')?.value||'';setPage('practice');break;
    case'generate-tutorial':generateTutorial();break;
    case'find-curriculum':findCurriculum();break;
    case'generate-practice':generatePractice();break;
    case'go-practice':window.practiceCourseId=data.courses.find(c=>c.name===studioLesson?.course)?.id||'';setPage('practice');break;
    case'delete-material':removeStoredMaterial(b.dataset.id);data.materials=data.materials.filter(m=>m.id!==b.dataset.id);data.materialText=(data.materialText||[]).filter(m=>m.id!==b.dataset.id);save();toast('Material removed from this device');break;
  }
});

function localPractice(course,sources,count,style){
  const topicList=course.topics||[];
  const sentences=sources.flatMap(s=>s.text.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).filter(x=>x.length>55&&x.length<420).map(sentence=>({sentence,source:s.name}))).slice(0,count);
  const sourceName=sources[0]?.name||'course topics';
  const prompts=sentences.map((x,i)=>{const essay=style==='essay'||(style==='mixed'&&i%2===1);return {question:essay?`Discuss the following point from your course material. Explain it, give an example, and state one implication: “${x.sentence}”`:`In your own words, explain this idea from your notes and give one example: “${x.sentence}”`,answer:x.sentence,source:x.source}});
  for(let i=0;prompts.length<count&&topicList.length;i++){const topic=topicList[i%topicList.length],essay=style==='essay'||(style==='mixed'&&prompts.length%2===1);prompts.push({question:essay?`Write an exam-style answer on ${topic}. Define it, explain its main parts, and use an example.`:`What is ${topic}, what problem does it address, and how would you explain it to a classmate?`,answer:`Use your course material’s definitions and examples for ${topic}. Include key terms, steps or properties, and an example.`,source:sourceName})}
  if(!prompts.length)prompts.push({question:`Using your course material for ${course.name}, explain one important idea and apply it to an example.`,answer:'Refer to your course material and include a definition, explanation, and example.',source:sourceName});
  return {title:`${course.code||course.name} · practice`,source:sources[0]?.name||'Course topics',questions:prompts.slice(0,count)};
}
function editStudyProfile(){
  const stages=educationStages();
  const options=stages.map(([value,label])=>'<option value="'+value+'" '+(data.profile.stage===value?'selected':'')+'>'+label+'</option>').join('');
  const body='<div class="form-grid">'+field('Country or region','country','<input id="f-country" name="country" value="'+safe(data.profile.country)+'">')+field('School or learning provider','institution','<input id="f-institution" name="institution" value="'+safe(data.profile.institution)+'">')+'</div>'+
    '<div class="form-grid">'+field('Learning stage','stage','<select id="f-stage" name="stage"><option value="">Choose one</option>'+options+'</select>')+field('Centre or study mode (optional)','centre','<input id="f-centre" name="centre" value="'+safe(data.profile.centre)+'">')+'</div>'+
    '<div class="form-grid">'+field('Programme, class, or subject','programme','<input id="f-programme" name="programme" value="'+safe(data.profile.programme)+'">')+field('Level, grade, or year','level','<input id="f-level" name="level" value="'+safe(data.profile.level)+'">')+'</div>'+
    '<div class="form-grid">'+field('Term or session','term','<input id="f-term" name="term" value="'+safe(data.profile.term)+'">')+field('Usual exam or test style','examStyle','<input id="f-examStyle" name="examStyle" value="'+safe(data.profile.examStyle||'')+'" placeholder="Multiple choice, essays, practicals, etc.">')+'</div>'+greetingPreferencesMarkup();
  openModal('Study profile','Set the school and study details used to personalize your study plan.',body,'Save profile',fd=>{for(const key of ['country','institution','stage','centre','programme','level','term','examStyle','regionOrLanguage','greetingStyle'])data.profile[key]=String(fd.get(key)||'').trim();closeModal();save();toast('Study profile updated')});
}
function findCurriculum(){
  const course=selectedCourse('lessonCourse')||data.courses[0],url=searchUrl(course),searchTab=window.open(url,'_blank');
  if(searchTab){searchTab.opener=null;studioNotice='Opened a web search for a course outline. Check that the result matches your school, level, and current curriculum.'}
  else studioNotice='Your browser blocked the web search. Allow pop-ups for Eduvia, then try again.';
  render();
}function greetingPreferencesMarkup(){
  const styles=[['neutral','Neutral nicknames'],['masculine','Masculine nicknames'],['feminine','Feminine nicknames']];
  const options=styles.map(([value,label])=>'<option value="'+value+'" '+((data.profile.greetingStyle||'neutral')===value?'selected':'')+'>'+label+'</option>').join('');
  return '<div class="form-grid">'+
    field('Greeting style','greetingStyle','<select id="f-greetingStyle" name="greetingStyle">'+options+'</select>')+
    field('Region or language (optional)','regionOrLanguage','<input id="f-regionOrLanguage" name="regionOrLanguage" maxlength="80" placeholder="e.g. Yoruba, Southwest Nigeria" value="'+safe(data.profile.regionOrLanguage||'')+'">')+
    '</div><small class="privacy-note-inline">Nicknames rotate daily. Scholar follows a 30-day study streak; Lazy Youth appears below 50% consistency after at least 3 planned sessions.</small>';
}
const renderSetupWithGreetingPreferences=renderSetup;
renderSetup=function(){return renderSetupWithGreetingPreferences().replace('<div class="onboarding-days">',greetingPreferencesMarkup()+'<div class="onboarding-days">')};
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
function isYorubaOrSouthwest(){
  const context=((data.profile.regionOrLanguage||'')+' '+(data.profile.country||'')).toLocaleLowerCase();
  return /\byoruba\b|south[\s-]*west(?:ern)?\b|\b(?:lagos|ogun|oyo|osun|ondo|ekiti)\b/.test(context);
}
function daymarkGreeting(){
  if(studyStreak()>=30)return 'Scholar';
  const consistency=studyConsistency();
  if(consistency.expected>=3&&consistency.ratio<0.5)return 'Lazy Youth';
  const names={masculine:['My Odogwu','Idan','Ace'],feminine:['Big Mama','Queen','My Star'],neutral:['Ace','My Star','Bright Mind']};
  const style=names[data.profile.greetingStyle]?data.profile.greetingStyle:'neutral';
  const rotating=[...names[style]];
  if(isYorubaOrSouthwest())rotating.push('Egbon');
  const day=Math.floor(Date.parse(todayISO()+'T00:00:00')/86400000);
  return rotating[day%rotating.length];
}
function daymarkGreetingTitle(){
  const name=String(data.profile.name||'').trim();
  return 'Hi, '+daymarkGreeting()+(name&&name.toLowerCase()!=='student'?' '+name:'')+' 👋';
}
window.daymarkGreeting=daymarkGreeting;
document.addEventListener('submit',e=>{
  if(e.target.id!=='onboardingForm')return;
  const fd=new FormData(e.target);
  if(!fd.get('stage')||!fd.getAll('studyDay').length)return;
  data.profile.regionOrLanguage=String(fd.get('regionOrLanguage')||'').trim();
  data.profile.greetingStyle=String(fd.get('greetingStyle')||'neutral');
  data.profile.setupAt=todayISO();
},true);
function stageLabel(stage){return ({primary:'Primary / elementary',secondary:'Secondary / high school',college:'College / polytechnic',undergraduate:'University / undergraduate',postgraduate:'Postgraduate',vocational:'Vocational / professional training',other:'Other / self-directed learning'})[stage]||stage||'Not set'}
function recordDate(timestamp){return new Date(timestamp||Date.now()).toLocaleDateString('en-NG',{year:'numeric',month:'short',day:'numeric'})}
function academicResultRowMarkup(result={}){
  return '<div class="academic-result-row"><input name="academicSubject" aria-label="Subject or course" maxlength="100" placeholder="Subject or course" value="'+safe(result.subject||'')+'"><input name="academicCode" aria-label="Course code (optional)" maxlength="30" placeholder="Code (optional)" value="'+safe(result.code||'')+'"><input name="academicGrade" aria-label="Grade or score" maxlength="60" placeholder="Grade, score, or Pass" value="'+safe(result.grade||'')+'"><button type="button" class="icon-btn" data-action="remove-academic-result-row" title="Remove row" aria-label="Remove result row">×</button></div>';
}
function academicResultRowsMarkup(results=[],courses=[]){
  const initial=results.length?results:(courses||[]).map(course=>({subject:course.name,code:course.code||'',grade:''}));
  if(!initial.length)initial.push({});
  return '<div class="academic-result-table-head"><span>Subject or course</span><span>Code (optional)</span><span>Grade or score</span><span></span></div><div id="academicResultRows">'+initial.map(academicResultRowMarkup).join('')+'</div><button type="button" class="secondary-btn" data-action="add-academic-result-row">＋ Add a subject or course</button>';
}
function collectAcademicResults(formData,optional=false){
  const subjects=formData.getAll('academicSubject'),codes=formData.getAll('academicCode'),grades=formData.getAll('academicGrade');
  const rows=subjects.map((subject,index)=>({subject:String(subject||'').trim(),code:String(codes[index]||'').trim(),grade:String(grades[index]||'').trim()}));
  if(optional){if(rows.some(row=>row.grade&&!row.subject)){toast('Add a subject or course name for each grade or score.');return null}return rows.filter(row=>row.subject&&row.grade)}
  if(rows.some(row=>(row.subject||row.code||row.grade)&&(!row.subject||!row.grade))){toast('For each result, add both the subject or course and its grade or score.');return null}
  return rows.filter(row=>row.subject&&row.grade);
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
function renderEducation(){
  const profile=data.profile,history=[...(data.academicHistory||[])].sort((a,b)=>(b.archivedAt||0)-(a.archivedAt||0));
  const currentLabel=[profile.institution,stageLabel(profile.stage),profile.programme,profile.level,profile.term].filter(Boolean).join(' · ');
  const resultCount=history.reduce((total,record)=>total+Number(record.resultCount||0),0);
  const historyCards=history.map(record=>{
    const isResultEntry=record.recordType==='results',period=[record.institution,record.stage?stageLabel(record.stage):'',record.programme,record.level,record.term,record.academicYear].filter(Boolean).join(' · ');
    const description=isResultEntry?Number(record.resultCount||0)+' subject results · Saved '+recordDate(record.archivedAt):Number(record.courseCount||0)+' courses · '+Number(record.classCount||0)+' classes · '+Number(record.studyCount||0)+' completed study sessions · '+Number(record.resultCount||0)+' results';
    return '<article class="course-card"><div class="course-card-head"><span class="habit-badge">▤</span><div><h3>'+safe(record.label||'Education record')+'</h3><span class="course-code">'+safe(period||'Past education record')+'</span></div></div><p class="course-desc">'+safe(description)+'</p><div class="course-card-foot"><span>'+(!isResultEntry&&record.studyMinutes?Number(record.studyMinutes)+' focused minutes':'Education record')+'</span><div class="academic-history-actions"><button class="secondary-btn" data-action="view-academic-record" data-id="'+safe(record.id)+'">View record</button><button class="icon-btn" title="Edit results" aria-label="Edit results" data-action="edit-academic-results" data-id="'+safe(record.id)+'">✎</button>'+(isResultEntry?'<button class="icon-btn" title="Remove record" aria-label="Remove record" data-action="delete-academic-record" data-id="'+safe(record.id)+'">×</button>':'')+'</div></div></article>';
  }).join('');
  const currentStudies=(data.completed||[]).filter(item=>isStudyCompletion(item)).length;
  const actions='<div class="education-actions"><button class="secondary-btn" data-action="add-academic-results">＋ Add past results</button><button class="primary-btn" data-action="archive-term">Finish and archive current term</button></div>';
  return pageHead('YOUR EDUCATION','My education journey','Keep a record of your learning from any starting point, then add results as you move through each term or school year.',actions)+
    '<section class="panel"><div class="panel-head"><div><h3>Current study period</h3><p>Your active profile and planner</p></div><span class="habit-badge">↗</span></div><strong>'+safe(currentLabel||'Add your current school and level in Study profile')+'</strong><div class="stats-row education-stats" style="margin-top:17px"><div class="stat-card"><div class="stat-label">ACTIVE COURSES</div><div class="stat-value">'+data.courses.length+'</div></div><div class="stat-card"><div class="stat-label">COMPLETED STUDY SESSIONS</div><div class="stat-value">'+currentStudies+'</div></div><div class="stat-card"><div class="stat-label">SAVED PERIODS</div><div class="stat-value">'+history.length+'</div></div><div class="stat-card"><div class="stat-label">RESULTS RECORDED</div><div class="stat-value">'+resultCount+'</div></div></div></section>'+
    '<div class="note-callout">Add earlier results without changing your current timetable or courses. You can start at any level, from Primary 4 to university or postgraduate study. When you advance, enter this term’s results as you archive it. Store report cards or transcripts in Personal documents.</div>'+
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
    upsertEducationSummary(educationRecordSummary(updated));closeModal();save();toast(archiveMode?'Term results saved':'Education results saved');
  });
}
async function editAcademicResults(recordId){try{const record=await getStudioRecord('academicRecords',recordId);if(!record){toast('This education record is unavailable on this device. Import the backup that contains it.');return}openAcademicResultsForm(record,record.recordType!=='results')}catch(error){toast('Could not open this education record: '+(error.message||'storage is unavailable'))}}
async function deleteAcademicRecord(recordId){if(!confirm('Remove this past education results record from your history?'))return;try{await deleteStudioRecord('academicRecords',recordId);data.academicHistory=(data.academicHistory||[]).filter(record=>record.id!==recordId);closeModal();save();toast('Education record removed')}catch(error){toast('Could not remove this record: '+(error.message||'storage is unavailable'))}}
function archiveCurrentTerm(){
  const profile=data.profile,defaultLabel=[stageLabel(profile.stage),profile.level,profile.term].filter(Boolean).join(' · ')||'Current study period';
  const stages=educationStages();
  const stageOptions=stages.map(([value,label])=>'<option value="'+value+'" '+(profile.stage===value?'selected':'')+'>'+label+'</option>').join('');
  const body=field('Archive label','archiveLabel','<input id="f-archiveLabel" name="archiveLabel" required maxlength="120" value="'+safe(defaultLabel)+'">')+
    '<div class="form-grid">'+field('Next level or year','nextLevel','<input id="f-nextLevel" name="nextLevel" maxlength="40" value="'+safe(profile.level||'')+'" placeholder="e.g. 400 level, MSc, PhD">')+
    field('Next term, semester, or session','nextTerm','<input id="f-nextTerm" name="nextTerm" maxlength="60" placeholder="e.g. Semester 1, 2027/28">')+'</div>'+
    field('Next education stage','nextStage','<select id="f-nextStage" name="nextStage">'+stageOptions+'</select>')+
    '<p class="preview-note">Your current courses, timetable, notes, results, and progress will be saved before the active planner moves to the next term.</p>'+academicResultFields([],data.courses)+field('Overall result note (optional)','resultsNotes','<textarea id="f-resultsNotes" name="resultsNotes" maxlength="1000" placeholder="Honours, teacher comments, or other details"></textarea>',true);
  openModal('Finish and archive this term','Save this period before moving up a level or starting a new semester.',body,'Archive and start next term',async fd=>{
    const courses=JSON.parse(JSON.stringify(data.courses||[])),events=JSON.parse(JSON.stringify(data.events||[])),completed=JSON.parse(JSON.stringify(data.completed||[])),resources=JSON.parse(JSON.stringify(data.resources||[])),materials=JSON.parse(JSON.stringify(data.materials||[]));
    const archiveId=id(),label=String(fd.get('archiveLabel')||defaultLabel).trim(),studyItems=completed.filter(item=>item.type==='study'||(!item.type&&String(item.eventId||'').startsWith('focus-')));
    const studyMinutes=studyItems.reduce((total,item)=>total+(Number(item.minutes)||Number(data.profile.sessionMinutes)||0),0);
    const materialRecords=[];for(const material of materials){const saved=await readMaterial(material.id);if(saved?.text)materialRecords.push(saved)}
    const results=collectAcademicResults(fd,true);if(!results)return;
    const archive={id:archiveId,label,recordType:'term-archive',stage:data.profile.stage||'',level:data.profile.level||'',term:data.profile.term||'',institution:data.profile.institution||'',programme:data.profile.programme||'',archivedAt:Date.now(),profile:JSON.parse(JSON.stringify(data.profile)),courses,events,completed,resources,materials,materialText:JSON.parse(JSON.stringify(data.materialText||[])),materialRecords,studyPlan:data.studyPlan||null,results,resultsNotes:String(fd.get('resultsNotes')||'').trim()};
    const summary={...educationRecordSummary(archive),studyMinutes};
    try{await putStudioRecord('academicRecords',archive)}catch(error){toast('Could not save this term to local storage: '+(error.message||'storage is unavailable'));return}
    data.academicHistory.unshift(summary);data.courses=[];data.events=[];data.completed=[];data.resources=[];data.studyPlan=null;
    data.profile.stage=String(fd.get('nextStage')||data.profile.stage||'');data.profile.level=String(fd.get('nextLevel')||'').trim();data.profile.term=String(fd.get('nextTerm')||'').trim();data.profile.setupAt=todayISO();
    closeModal();save();toast('Term archived. Your next study period is ready.');
  });
}
async function viewAcademicRecord(recordId){
  try{
    const record=await getStudioRecord('academicRecords',recordId);
    if(!record){toast('This saved term is not available in this browser. Import the portable backup that contains it.');return}
    const courseList=(record.courses||[]).map(course=>'<li><b>'+safe(course.code||'COURSE')+'</b> · '+safe(course.name)+(course.credits?' · '+safe(course.credits)+' credits':'')+((course.topics||[]).length?'<br><small>'+safe(course.topics.join(', '))+'</small>':'')+'</li>').join('')||'<li>No course list was saved.</li>';
    const classes=(record.events||[]).filter(event=>event.type==='class').map(event=>'<li>'+safe(event.title)+' · '+safe(STUDIO_DAYS[event.day]||'')+' '+safe(timeLabel(event.start))+'–'+safe(timeLabel(event.end))+(event.location?' · '+safe(event.location):'')+'</li>').join('')||'<li>No class timetable was saved.</li>';
    const plannedStudy=(record.events||[]).filter(event=>event.type==='study').map(event=>'<li>'+safe(event.title)+' · '+safe(STUDIO_DAYS[event.day]||'')+' '+safe(timeLabel(event.start))+'–'+safe(timeLabel(event.end))+'</li>').join('')||'<li>No planned study sessions were saved.</li>';
    const completed=(record.completed||[]).filter(item=>item.type==='study'||(!item.type&&String(item.eventId||'').startsWith('focus-'))).slice(-12).reverse().map(item=>'<li>'+safe(item.date||'')+' · '+Number(item.minutes||0)+' minutes'+(item.courseId?' · '+safe((record.courses||[]).find(course=>course.id===item.courseId)?.name||'Course'):'')+'</li>').join('')||'<li>No completed study sessions were saved.</li>';
    const resources=(record.resources||[]).map(resource=>'<li>'+safe(resource.title||'Saved note')+(resource.kind?' · '+safe(resource.kind):'')+'</li>').join('')||'<li>No tutorials or notes were saved.</li>';
    const materials=(record.materials||[]).map(material=>'<li>'+safe(material.name||'Course material')+' · '+Number(material.characters||0).toLocaleString()+' characters</li>').join('')||'<li>No course materials were saved.</li>';
    const resultRows=(record.results||[]).map(item=>'<div class="academic-result-view-row"><strong>'+safe(item.subject)+'</strong><span>'+safe(item.code||'')+'</span><b>'+safe(item.grade)+'</b></div>').join('')||'<p class="preview-note">No results saved for this period yet.</p>';
    const isResultEntry=record.recordType==='results',recordProfile=record.profile||{},recordDetails=[record.institution||record.school||recordProfile.institution,(record.stage||recordProfile.stage)?stageLabel(record.stage||recordProfile.stage):'',record.programme||recordProfile.programme,record.level||recordProfile.level,record.term||recordProfile.term,record.academicYear].filter(Boolean).join(' · ');
    const actions='<div class="academic-record-actions"><button type="button" class="secondary-btn" data-action="edit-academic-results" data-id="'+safe(record.id)+'">Edit results</button>'+(isResultEntry?'<button type="button" class="danger-btn" data-action="delete-academic-record" data-id="'+safe(record.id)+'">Remove record</button>':'')+'</div>';
    const resultSection='<section class="academic-result-section"><div class="panel-head"><div><h3>Results</h3><p>'+Number((record.results||[]).length)+' subject or course results</p></div></div><div class="academic-result-view-list">'+resultRows+'</div>'+(record.resultsNotes?'<p class="academic-record-note">'+safe(record.resultsNotes)+'</p>':'')+actions+'</section>';
    const archivedContent=isResultEntry?'':('<div class="form-grid"><section><h3>Courses</h3><ul>'+courseList+'</ul></section><section><h3>Classes</h3><ul>'+classes+'</ul></section></div><section><h3>Planned study sessions</h3><ul>'+plannedStudy+'</ul></section><section><h3>Recent completed study sessions</h3><ul>'+completed+'</ul></section><div class="form-grid"><section><h3>Tutorials and notes</h3><ul>'+resources+'</ul></section><section><h3>Course materials</h3><ul>'+materials+'</ul></section></div>');
    openModal(record.label||'Education record',recordDetails||'Saved '+recordDate(record.archivedAt||record.recordedAt),'<p class="preview-note">'+(isResultEntry?'Past education results saved on this device.':'This term’s results and study record are saved on this device.')+'</p>'+resultSection+archivedContent,'Done',()=>closeModal());
  }catch(error){toast('Could not open this saved term: '+(error.message||'storage is unavailable'))}
}
function formatFileSize(bytes){if(bytes<1024)return bytes+' B';if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';return (bytes/1024/1024).toFixed(1)+' MB'}
function renderVault(){
  const documents=data.personalDocuments||[];
  const cards=documents.map(docMeta=>'<article class="schedule-row"><div class="schedule-time">'+safe(docMeta.category||'Document')+'</div><div class="schedule-row-main"><i class="course-swatch" style="background:#7da9be"></i><div><strong>'+safe(docMeta.title||docMeta.name)+'</strong><span>'+safe(docMeta.name)+' · '+formatFileSize(Number(docMeta.size)||0)+' · Saved '+recordDate(docMeta.addedAt)+'</span></div></div><div class="schedule-actions"><button class="secondary-btn" data-action="open-personal-document" data-id="'+safe(docMeta.id)+'">Open</button><button class="icon-btn" title="Download" data-action="download-personal-document" data-id="'+safe(docMeta.id)+'">↓</button><button class="icon-btn" title="Remove" data-action="delete-personal-document" data-id="'+safe(docMeta.id)+'">×</button></div></article>').join('');
  return pageHead('YOUR PRIVATE FILES','Personal documents','Keep your school ID, receipts, certificates, transcripts, and other important documents in one place.','')+
    '<section class="panel"><div class="panel-head"><div><h3>My document cabinet</h3><p>Add a label so files are easy to find later.</p></div><span class="upload-count">'+documents.length+' saved</span></div><div class="upload-tools"><label class="primary-btn">＋ Add a document<input id="personalDocumentFile" type="file" style="display:none"></label><button class="secondary-btn" data-action="export-portable-backup">Download portable backup</button><label class="secondary-btn">Import backup from another device<input id="portableBackupFile" type="file" accept=".zip" style="display:none"></label></div><div class="note-callout" style="margin:14px 0 0">Documents and study records are stored on this browser and device. To move them to another phone or laptop, download a portable backup and import it there. The backup is not encrypted and contains your private files; keep it private.</div></section>'+
    '<div class="section-title-row"><h3>Saved documents</h3><span>'+documents.length+' files</span></div>'+
    (documents.length?'<div class="schedule-list">'+cards+'</div>':emptyState('▤','Your document cabinet is empty','Upload a photo or file and choose a category for it.','', ''));
}
function addPersonalDocument(file){
  if(!file)return;
  if(file.size>40*1024*1024){toast('That file is over 40 MB. Choose a smaller file.');return}
  const categories=['School ID','Receipt','Certificate','Transcript','Admission or registration','Other'];
  const options=categories.map(category=>'<option value="'+safe(category)+'">'+safe(category)+'</option>').join('');
  const body=field('Name to show','documentTitle','<input id="f-documentTitle" name="documentTitle" required maxlength="100" value="'+safe(file.name)+'">')+field('Document type','documentCategory','<select id="f-documentCategory" name="documentCategory">'+options+'</select>')+'<p class="preview-note">This file is saved on this browser and device. It is not uploaded to an online account.</p>';
  openModal('Save a personal document',file.name,body,'Save document',async fd=>{
    const documentId=id(),metadata={id:documentId,title:String(fd.get('documentTitle')||file.name).trim(),name:file.name,category:String(fd.get('documentCategory')||'Other'),type:file.type||'application/octet-stream',size:file.size,addedAt:Date.now()};
    try{await putStudioRecord('personalDocuments',{id:documentId,blob:file,name:file.name,type:metadata.type})}catch(error){toast('Could not save this file: '+(error.message||'local storage is unavailable'));return}
    data.personalDocuments.unshift(metadata);closeModal();save();toast('Document saved on this device');
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
  try{await deleteStudioRecord('personalDocuments',documentId);data.personalDocuments=(data.personalDocuments||[]).filter(docMeta=>docMeta.id!==documentId);save();toast('Document removed')}catch(error){toast('Could not remove this document: '+(error.message||'storage is unavailable'))}
}
async function listStudioRecords(storeName){const db=await studioDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readonly'),req=tx.objectStore(storeName).getAll();req.onsuccess=()=>{db.close();resolve(req.result||[])};req.onerror=()=>{db.close();reject(req.error)}})}
async function exportPortableBackup(){
  try{
    if(!window.JSZip)await loadStudioScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    const zip=new window.JSZip();zip.file('eduvia-data.json',JSON.stringify(data,null,2));
    const documents=zip.folder('personal-documents');
    for(const metadata of data.personalDocuments||[]){const record=await getStudioRecord('personalDocuments',metadata.id);const blob=record?.blob||record?.file;if(blob)documents.file(metadata.id,blob)}
    const archives=zip.folder('academic-records');
    for(const metadata of data.academicHistory||[]){const record=await getStudioRecord('academicRecords',metadata.id);if(record)archives.file(metadata.id+'.json',JSON.stringify(record))}
    const materials=zip.folder('course-materials');
    for(const metadata of data.materials||[]){const record=await getStudioRecord(STUDIO_STORE,metadata.id);if(record)materials.file(metadata.id+'.json',JSON.stringify(record))}
    const bundle=await zip.generateAsync({type:'blob',compression:'STORE'});download(bundle,'eduvia-portable-backup-'+todayISO()+'.zip');toast('Portable backup ready. Keep the file private.');
  }catch(error){toast('Could not create the backup: '+(error.message||'storage is unavailable'))}
}
async function importPortableBackup(file){
  if(!file)return;
  if(file.size>500*1024*1024){toast('That backup is over 500 MB.');return}
  try{
    if(!window.JSZip)await loadStudioScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    const zip=await window.JSZip.loadAsync(file),dataFile=zip.file('eduvia-data.json')||zip.file('daymark-data.json');
    if(!dataFile)throw new Error('This ZIP does not contain an Eduvia backup.');
    const imported=JSON.parse(await dataFile.async('string'));
    if(!imported.profile)throw new Error('The backup does not contain a student profile.');
    if(!confirm('Replace the planner data on this device with the selected backup? This changes the current courses, history, and document list.'))return;
    imported.academicHistory=Array.isArray(imported.academicHistory)?imported.academicHistory:[];
    imported.personalDocuments=Array.isArray(imported.personalDocuments)?imported.personalDocuments:[];
    imported.materials=Array.isArray(imported.materials)?imported.materials:[];
    const importedDocs=[];
    for(const metadata of imported.personalDocuments){const entry=zip.file('personal-documents/'+metadata.id);if(!entry)continue;const blob=await entry.async('blob');await putStudioRecord('personalDocuments',{id:metadata.id,blob:new Blob([blob],{type:metadata.type||''}),name:metadata.name});importedDocs.push(metadata)}
    imported.personalDocuments=importedDocs;
    const importedArchives=[];
    for(const metadata of imported.academicHistory){const entry=zip.file('academic-records/'+metadata.id+'.json');if(!entry)continue;const record=JSON.parse(await entry.async('string'));await putStudioRecord('academicRecords',record);importedArchives.push(metadata)}
    imported.academicHistory=importedArchives;
    const importedMaterials=[];
    for(const metadata of imported.materials){const entry=zip.file('course-materials/'+metadata.id+'.json');if(!entry)continue;await putStudioRecord(STUDIO_STORE,JSON.parse(await entry.async('string')));importedMaterials.push(metadata)}
    imported.materials=importedMaterials;
    data={...defaultData(),...imported,profile:{...defaultData().profile,...imported.profile}};
    data.imports=data.imports||{courses:[],timetable:[]};
    const keepDocs=new Set(data.personalDocuments.map(item=>item.id)),keepArchives=new Set(data.academicHistory.map(item=>item.id)),keepMaterials=new Set(data.materials.map(item=>item.id));
    for(const [storeName,keep] of [['personalDocuments',keepDocs],['academicRecords',keepArchives],[STUDIO_STORE,keepMaterials]])for(const oldRecord of await listStudioRecords(storeName))if(!keep.has(oldRecord.id))await deleteStudioRecord(storeName,oldRecord.id);
    currentPage='vault';location.hash='vault';save();toast('Portable backup restored on this device.');
  }catch(error){toast('Could not import this backup: '+(error.message||'file is invalid'))}
}
function clearData(){
  if(!confirm('This will remove your courses, class and study schedule, notes, education history, personal documents, progress, profile, and uploaded material from this device. Continue?'))return;
  data=defaultData();data.imports={courses:[],timetable:[]};data.materials=[];
  try{indexedDB.deleteDatabase(STUDIO_DB)}catch{}
  studioLesson=null;studioPractice=[];studioNotice='';currentPage='setup';save();toast('Planner data and uploaded material cleared');
}
document.addEventListener('change',e=>{
  if(e.target.id==='personalDocumentFile'){const file=e.target.files?.[0];e.target.value='';addPersonalDocument(file)}
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
if(!data.profile.setupComplete)currentPage='setup';
render();

