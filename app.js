const STORE_KEY = 'daymark-data-v1';
const PUSH_API_URL = String(window.EDUVIA_PUSH_API_URL || '').replace(/\/+$/, '');
const PUSH_TOKEN_KEY = 'eduvia-push-device-v1';
const PUSH_ENABLED_KEY = 'eduvia-push-enabled-v1';
const PUSH_DISABLED_KEY = 'eduvia-push-disabled-v1';
const NATIVE_ALERTS_ENABLED_KEY = 'eduvia-native-alerts-enabled-v1';
const FIRST_LAUNCH_ALERT_PROMPT_KEY = 'eduvia-first-launch-alert-prompt-v1';
const COLORS = ['#7ba883','#e5a477','#9f8bc2','#7da9be','#d38887','#c4a955'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const todayISO = () => new Date().toLocaleDateString('en-CA');
const id = () => Math.random().toString(36).slice(2,10);
const defaultData = () => ({profile:{name:'Learner',learnerType:'',learningFocus:'',goal:'Make steady progress with learning',weeklyGoal:5,sessionMinutes:25,studyReminder:true,theme:'system',themePreferenceVersion:1},courses:[],events:[],resources:[],completed:[],studyRecords:[],academicHistory:[],personalDocuments:[],exams:[],revisionTasks:[],mockExamAttempts:[],lastMockExam:null,activeMockExam:null,deadlines:[],flashcards:[],topicMastery:{},materials:[],materialText:[],imports:{courses:[],timetable:[]},pendingCarryovers:[],studyPlan:null,askHistory:[],discoverSavedGuides:[],discoverReadHistory:[],playChallengeAttempts:[],wellnessCheckins:[],roadmaps:[],createdAt:Date.now()});
const MOTIVATION_QUOTES = [
  'Every new idea you explore adds another layer to what you know.',
  'Small learning steps build lasting understanding.',
  'Your future self will thank you for the effort you make today.',
  'One focused session is progress worth celebrating.',
  'Learning grows each time you choose to stay curious.',
  'You do not need to master everything today. Take the next step.',
  'Your goals deserve the time and attention you give them.',
  'A little practice today can make a difficult skill feel easier tomorrow.',
  'Stay curious, keep showing up, and trust your progress.',
  'Every skill you develop starts with the courage to begin.',
  'Build your future one learning session at a time.',
  'Be proud of the progress that nobody else sees.',
  'Your pace is valid. Keep moving forward.',
  'Today’s effort is tomorrow’s confidence.',
  'You can learn difficult things one idea at a time.'
];
function storageGet(key){
  try{return window.localStorage.getItem(key)}catch{return null}
}
function storageSet(key,value){
  try{window.localStorage.setItem(key,value);return null}catch(error){return error}
}
function storageRemove(key){
  try{window.localStorage.removeItem(key);return null}catch(error){return error}
}
// Only a completed profile or existing learning records identify a legacy install.
// Country selection is persisted during onboarding, so the mere presence of planner
// storage must not suppress the first-run invitation for an unfinished profile.
function isLegacyEduviaInstall(){
  try{
    const saved=JSON.parse(storageGet(STORE_KEY)||'null');
    if(!saved||typeof saved!=='object'||Array.isArray(saved))return false;
    if(saved.profile?.setupComplete===true)return true;
    return ['courses','events','resources','completed','studyRecords','academicHistory','personalDocuments']
      .some(key=>Array.isArray(saved[key])&&saved[key].length>0);
  }catch{return false}
}
if(storageGet(FIRST_LAUNCH_ALERT_PROMPT_KEY)===null&&isLegacyEduviaInstall()){
  storageSet(FIRST_LAUNCH_ALERT_PROMPT_KEY,'1');
}
function chooseEntryMotivationQuote(){let previous=-1;try{const value=storageGet('eduvia-entry-quote-v1'),saved=value===null?-1:Number(value);if(Number.isInteger(saved))previous=saved}catch{}const choices=MOTIVATION_QUOTES.map((_,index)=>index).filter(index=>index!==previous);const selected=choices[Math.floor(Math.random()*choices.length)];try{storageSet('eduvia-entry-quote-v1',String(selected))}catch{}return MOTIVATION_QUOTES[selected]}
const entryMotivationQuote = chooseEntryMotivationQuote();
let data = loadData();
if(!data.profile.themePreferenceVersion){
  data.profile.theme='system';
  data.profile.themePreferenceVersion=1;
  try{storageSet(STORE_KEY,JSON.stringify(data))}catch{}
}
function applyTheme(){
  const preference=['system','light','dark'].includes(data.profile.theme)?data.profile.theme:'system';
  const prefersDark=Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const dark=preference==='dark'||(preference==='system'&&prefersDark);
  document.documentElement.dataset.theme=dark?'dark':'light';
  document.documentElement.dataset.themePreference=preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#111426':'#f7f8fd');
}
applyTheme();
const systemThemeQuery=window.matchMedia?.('(prefers-color-scheme: dark)');
systemThemeQuery?.addEventListener?.('change',()=>{if(data.profile.theme==='system')applyTheme()});
if(systemThemeQuery&&!systemThemeQuery.addEventListener)systemThemeQuery.addListener(()=>{if(data.profile.theme==='system')applyTheme()});
const SUPPORTED_PAGE_ROUTES=new Set([
  'today','my-study','courses','course-detail','timetable','habit','tutorials','study','practice','setup',
  'progress','records','education','vault','settings','profile','more','planner','flashcards','mastery',
  'mock-exam','mock-results','exams','play','ask','discover','wellness','insights','roadmaps','recall','integrations','ai-tutor'
]);
function resolveHashRoute(hash){
  const route=String(hash||'').replace(/^#/,'');
  if(route.startsWith('recall/')){
    const recallQuestionId=route.slice(7);
    return /^[A-Za-z0-9_-]{1,64}$/.test(recallQuestionId)?{page:'recall',recallQuestionId}:{page:'recall',recallQuestionId:''};
  }
  if(route.startsWith('course/')){
    try{
      const courseId=decodeURIComponent(route.slice(7));
      return courseId?{page:'course-detail',courseId}:{page:'courses',courseId:''};
    }catch{
      return {page:'courses',courseId:''};
    }
  }
  return {page:SUPPORTED_PAGE_ROUTES.has(route)?route:'today',courseId:''};
}
const initialRoute=resolveHashRoute(location.hash);
let currentPage=initialRoute.page;
let selectedCourseId=initialRoute.courseId;
let currentRecallQuestionId=initialRoute.recallQuestionId||'';
let selectedDate = todayISO();

let weekOffset = 0;
let toastTimer;
let focusRemaining = (Number(data.profile.sessionMinutes) || 25) * 60;
let focusSessionMinutes = Number(data.profile.sessionMinutes) || 25;
let focusEndAt = null;
let focusInterval = null;
let focusRunning = false;
let focusCompleted = false;
let deferredInstallPrompt = null;
let todayRefreshTimeout = null;
let eventAlertTimer = null;
let pushSyncTimer = null;
let pushSyncPromise = null;

function loadData(){
  try{
    const saved=JSON.parse(storageGet(STORE_KEY));
    if(!saved||typeof saved!=='object'||Array.isArray(saved)||!saved.profile||typeof saved.profile!=='object'||Array.isArray(saved.profile))return defaultData();
    const defaults=defaultData(),loaded={...defaults,...saved,profile:{...defaults.profile,...saved.profile}};
    const arrays=['courses','events','resources','completed','studyRecords','academicHistory','personalDocuments','exams','revisionTasks','mockExamAttempts','deadlines','flashcards','materials','materialText','pendingCarryovers','askHistory','discoverReadHistory','playChallengeAttempts','wellnessCheckins','roadmaps'];
    for(const key of arrays)loaded[key]=Array.isArray(saved[key])?saved[key].filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):defaults[key];
    loaded.discoverSavedGuides=Array.isArray(saved.discoverSavedGuides)?saved.discoverSavedGuides.filter(item=>typeof item==='string'):[];
    loaded.topicMastery=saved.topicMastery&&typeof saved.topicMastery==='object'&&!Array.isArray(saved.topicMastery)?saved.topicMastery:{};
    loaded.imports=saved.imports&&typeof saved.imports==='object'&&!Array.isArray(saved.imports)?saved.imports:{courses:[],timetable:[]};
    loaded.imports.courses=Array.isArray(loaded.imports.courses)?loaded.imports.courses:[];
    loaded.imports.timetable=Array.isArray(loaded.imports.timetable)?loaded.imports.timetable:[];
    loaded.profile.studyDays=Array.isArray(loaded.profile.studyDays)?loaded.profile.studyDays:[1,2,3,4,5,6];
    loaded.studyPlan=saved.studyPlan&&typeof saved.studyPlan==='object'&&!Array.isArray(saved.studyPlan)?saved.studyPlan:null;
    loaded.activeMockExam=saved.activeMockExam&&typeof saved.activeMockExam==='object'&&!Array.isArray(saved.activeMockExam)?saved.activeMockExam:null;
    loaded.lastMockExam=saved.lastMockExam&&typeof saved.lastMockExam==='object'&&!Array.isArray(saved.lastMockExam)?saved.lastMockExam:null;
    return loaded;
  }catch{return defaultData()}
}
function learnerTypeOf(profile=data.profile||{}){
  return window.EduviaLearnerProfile.resolveLearnerType(profile);
}
function learnerTypeLabel(type){
  return window.EduviaLearnerProfile.label(type);
}
function isFormalLearner(profile=data.profile||{}){
  return window.EduviaLearnerProfile.isFormalLearner(profile);
}

function save(){applyTheme();const storageError=storageSet(STORE_KEY,JSON.stringify(data));if(storageError){toast(storageError?.name==='QuotaExceededError'?'Storage is full. Export a backup and remove large files or photos.':'Eduvia could not save your changes. Check your device storage.');return false}render();scheduleEventAlert();schedulePushSync();return true}
function safe(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeHttpUrl(value=''){try{const url=new URL(String(value||''));return ['http:','https:'].includes(url.protocol)?safe(url.href):'#'}catch{return '#'}}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function formatDate(date,options={weekday:'long',month:'long',day:'numeric'}){return new Intl.DateTimeFormat('en-NG',options).format(date)}
function parseISO(value){const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d)}
function startOfWeek(date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d}
function minutes(time){const [h,m]=time.split(':').map(Number);return h*60+m}
function timeLabel(t){if(!t)return '';const [h,m]=t.split(':').map(Number);return `${((h+11)%12)+1}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`}
function duration(start,end){return Math.max(0,Math.round((minutes(end)-minutes(start))/60*10)/10)}
function courseById(courseId){return data.courses.find(c=>String(c.id)===String(courseId))}
function eventIsOnDate(event,date){return event.date===date||(!event.date&&Number(event.day)===parseISO(date).getDay()&&(!event.repeatFrom||date>=String(event.repeatFrom))&&(!event.repeatUntil||date<=String(event.repeatUntil)))}
function dayEvents(date){return data.events.filter(e=>eventIsOnDate(e,date)).sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')))}
function completedForDate(date){return data.completed.filter(x=>x.date===date)}
function isStudyCompletionEntry(item){
 if(item?.type)return item.type==='study';
 const event=(data.events||[]).find(entry=>entry.id===item?.eventId);
 return event?event.type==='study':String(item?.eventId||'').startsWith('focus-');
}
function studyCompletionsForDate(date){return completedForDate(date).filter(isStudyCompletionEntry)}
function classRecordForDate(eventId,date){return (data.studyRecords||[]).find(record=>record.type==='class'&&record.eventId===eventId&&record.date===date&&record.completedAt)}
function setPage(page,courseId=''){currentPage=page;if(page==='course-detail'){selectedCourseId=String(courseId||selectedCourseId||'');location.hash='course/'+encodeURIComponent(selectedCourseId)}else{location.hash=page}render()}
function syncNav(){const morePages=['study','practice','education','vault','records','settings'];document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===currentPage||(morePages.includes(currentPage)&&el.dataset.page==='more')));const labels={today:'Home','my-study':'My Learning',courses:'Learning areas',timetable:'Schedule',habit:'Learning habit',tutorials:'Learning resources',study:'Learning studio',practice:'Practice & tests',setup:'Set up your learning',progress:'Learning progress',education:'Academic history',vault:'Personal library',records:'Learning records',settings:'Settings',more:'More'};document.getElementById('crumbCurrent').textContent=labels[currentPage]||'Home'}
function pageHead(eyebrow,title,description,button=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${button}</div>`}
function emptyState(icon,title,text,buttonText,action){return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${text}</p>${buttonText?`<button class="primary-btn" data-action="${action}">${buttonText}</button>`:''}</div>`}
function courseColor(course){return course?.color||COLORS[0]}
function courseName(courseId){return courseById(courseId)?.name||''}
function getWeekStats(){const monday=startOfWeek(new Date());const days=Array.from({length:7},(_,i)=>addDays(monday,i));const doneByDay=days.map(d=>studyCompletionsForDate(d.toLocaleDateString('en-CA')).length);return {days,doneByDay,total:doneByDay.reduce((a,b)=>a+b,0)}}
function streakCount(){let n=0,d=parseISO(todayISO());for(let i=0;i<365;i++){const iso=d.toLocaleDateString('en-CA');if(!studyCompletionsForDate(iso).length){if(i===0){d=addDays(d,-1);continue}break}n++;d=addDays(d,-1)}return n}
function scheduleTodayRefresh(){clearTimeout(todayRefreshTimeout);if(currentPage!=='today')return;const now=new Date(),minuteDelay=60000-(now.getSeconds()*1000+now.getMilliseconds())+80,display=todayPlanDisplay(todayISO(),now),switchDelay=display.switchAt?display.switchAt.getTime()-now.getTime():Infinity,delay=Math.min(minuteDelay,switchDelay>0?switchDelay:minuteDelay);todayRefreshTimeout=setTimeout(()=>{if(currentPage==='today')render()},Math.max(100,delay))}
function refreshTodayWhenVisible(){if(document.visibilityState==='hidden')return;if(currentPage==='today')render();scheduleReminder();scheduleEventAlert();schedulePushSync()}
window.addEventListener('focus',refreshTodayWhenVisible);
document.addEventListener('visibilitychange',refreshTodayWhenVisible);
function updateSidebarGoal(){const stats=getWeekStats();const goal=Math.max(1,Number(data.profile.weeklyGoal)||5);document.getElementById('sideGoal').textContent=`${stats.total} / ${goal}`;document.getElementById('sideGoalFill').style.width=`${Math.min(100,stats.total/goal*100)}%`}

function renderToday(){const today=todayISO(),date=parseISO(today),events=dayEvents(today),done=studyCompletionsForDate(today),now=new Date(),plan=todayPlanDisplay(today,now),planDate=parseISO(plan.date),planEvents=dayEvents(plan.date);const classes=events.filter(e=>e.type==='class'),learningSessions=events.length;const minutesDone=done.reduce((sum,x)=>sum+(x.minutes||data.profile.sessionMinutes),0);const week=getWeekStats();const pct=Math.min(100,week.total/Math.max(1,data.profile.weeklyGoal)*100);const nowMinutes=now.getHours()*60+now.getMinutes(),completedIds=new Set(completedForDate(today).map(item=>item.eventId));const next=events.find(e=>minutes(e.start)>nowMinutes&&!completedIds.has(e.id)&&!classRecordForDate(e.id,today));const coursesMarkup=data.courses.length?`<div class="course-list">${data.courses.slice(0,3).map(c=>`<a class="course-mini" href="#course/${encodeURIComponent(c.id)}" aria-label="Open ${safe(c.name)}"><i class="course-swatch" style="background:${safe(c.color)}"></i><span class="course-mini-copy"><strong>${safe(c.name)}</strong><span class="course-code">${safe(c.code||'COURSE')}</span></span></a>`).join('')}</div>`:emptyState('▦','Your learning areas start here','Add a skill, subject, topic or course you are exploring. Connect sessions and materials to each learning area.','Add learning','add-course');
return `${pageHead(formatDate(date,{weekday:'long',month:'long',day:'numeric'}),`Hi, ${safe(data.profile.name||'Learner')} 👋`,entryMotivationQuote,'<button class="primary-btn" data-action="add-session"><span class="btn-icon">＋</span>Plan a learning session</button>')}
<div class="hero-grid"><section class="welcome-card"><div class="eyebrow">YOUR NEXT SMALL WIN</div><h2>${next?`You’ve got ${next.type==='study'?'learning time':'learning session'} at ${timeLabel(next.start)}.`:'Make a little time for the goal you care about.'}</h2><p>${next?`${safe(next.title)}${next.location?` · ${safe(next.location)}`:''}`:'A short, focused session is enough to keep your learning habit moving.'}</p><button class="primary-btn" data-action="${next?.type==='study'?'start-focus':'add-session'}">${next?.type==='study'?'Start a focus session':'Plan a session'} <span>→</span></button></section>
<button type="button" class="habit-card" data-page="habit" aria-label="Open your learning habit details"><div class="habit-top"><div><div class="card-kicker">THIS WEEK'S LEARNING HABIT</div><div class="habit-value">${week.total}<small> / ${data.profile.weeklyGoal} sessions</small></div><p>${week.total>=data.profile.weeklyGoal?'You reached your weekly target. Great work!':'Every session counts, even a short one.'}</p></div><div class="habit-badge">✳</div></div><div class="habit-bottom"><div class="progress-track"><i style="width:${pct}%"></i></div><span class="streak-pill">🔥 ${streakCount()} day streak</span></div></button></div>
<div class="stats-row"><button type="button" class="stat-card" data-page="courses" aria-label="Open My learning areas"><span class="stat-mark">▦</span><div class="stat-label">MY LEARNING AREAS</div><div class="stat-value">${data.courses.length}</div><div class="stat-note">skills, subjects and training</div></button><button type="button" class="stat-card" data-page="timetable" aria-label="Open today's learning schedule"><span class="stat-mark">◷</span><div class="stat-label">TODAY'S LEARNING SESSIONS</div><div class="stat-value">${learningSessions}</div><div class="stat-note">${learningSessions?'on your schedule':'nothing scheduled yet'}</div></button><button type="button" class="stat-card" data-page="records" aria-label="Open your learning session records"><span class="stat-mark">✳</span><div class="stat-label">LEARNING SESSIONS</div><div class="stat-value">${done.length}</div><div class="stat-note">${minutesDone?`${minutesDone} focused minutes`: 'complete a session to log it'}</div></button><button type="button" class="stat-card" data-page="habit" aria-label="Open your weekly learning goal"><span class="stat-mark">↗</span><div class="stat-label">WEEKLY LEARNING GOAL</div><div class="stat-value">${Math.round(pct)}%</div><div class="stat-note">${Math.max(0,data.profile.weeklyGoal-week.total)} to go this week</div></button></div>
<div class="content-grid"><section class="panel"><div class="panel-head"><div><h3>${plan.isTomorrow?'Tomorrow’s plan':'Today’s plan'}</h3><p>${formatDate(planDate,{month:'long',day:'numeric'})} · your classes and learning sessions</p></div><button class="panel-link" data-page="timetable">Full schedule →</button></div>${planEvents.length?`<div class="agenda-list">${planEvents.map(e=>agendaMarkup(e,plan.date)).join('')}</div>`:plan.isTomorrow?'<div class="agenda-empty"><p>Nothing planned for tomorrow yet.</p><button class="panel-link" data-page="timetable">Open timetable →</button></div>':emptyState('◷','Your day is open','Add your class times or plan a short learning session.','Add to today','add-session')}</section>
<section class="panel"><div class="panel-head"><div><h3>My learning areas</h3><p>${data.courses.length?'Keep your current learning in view':'Start with the skills or subjects you’re exploring'}</p></div><button class="panel-link" data-page="courses">See learning →</button></div>${coursesMarkup}</section></div>`}
function agendaMarkup(e,date){const c=courseById(e.courseId);const completed=completedForDate(date).some(x=>x.eventId===e.id),classRecord=e.type==='class'?classRecordForDate(e.id,date):null,attendanceLabels={attended:'Attended',student_absent:'Absent',lecturer_absent:'Lecturer absent',postponed:'Postponed'},attendance=classRecord?.reflection?.attendance||'attended';return `<div class="agenda-item" data-action="edit-event" data-id="${safe(e.id)}" role="button" tabindex="0" aria-label="Edit ${safe(e.title)}"><div class="agenda-time">${timeLabel(e.start)}<br>${timeLabel(e.end)}</div><i class="agenda-bar" style="background:${safe(c?.color|| (e.type==='study'?'#9f8bc2':'#7ba883'))}"></i><div><div class="agenda-title">${safe(e.title)}</div><div class="agenda-sub">${safe(c?.name||e.location|| (e.type==='study'?'Learning session':'Class'))}${e.location&&c?` · ${safe(e.location)}`:''}</div></div><button class="agenda-tag ${e.type==='study'?'tag-study':'tag-class'}" data-action="complete-event" data-id="${safe(e.id)}" data-date="${date}">${classRecord?attendanceLabels[attendance]||'Attended':completed?'Done':e.type==='study'?'Learning':'Class'}</button></div>`}
function todayPlanDisplay(today,now=new Date()){
  const ends=dayEvents(today).map(event=>event.end&&/^\d{1,2}:\d{2}$/.test(event.end)?minutes(event.end):NaN).filter(Number.isFinite);
  if(!ends.length)return {date:today,isTomorrow:false,switchAt:null};
  const lastEnd=Math.max(...ends),switchAt=new Date(parseISO(today));
  switchAt.setHours(Math.floor(lastEnd/60)+1,lastEnd%60,0,0);
  const isTomorrow=now>=switchAt;
  return {date:isTomorrow?addDays(parseISO(today),1).toLocaleDateString('en-CA'):today,isTomorrow,switchAt:isTomorrow?null:switchAt};
}

function renderCourses(){const btn='<button class="primary-btn" data-action="add-course"><span class="btn-icon">＋</span>Add learning</button>';return `${pageHead('YOUR LEARNING','My learning','Keep the subjects, skills, topics, courses and training you are exploring together.',btn)}${data.courses.length?`<div class="course-grid">${data.courses.map(c=>`<article class="course-card"><a class="course-open-button" href="#course/${encodeURIComponent(c.id)}" aria-label="Open ${safe(c.name)}"><div class="course-card-head"><i class="course-swatch" style="background:${safe(c.color)}"></i><div><h3>${safe(c.name)}</h3><span class="course-code">${safe(c.code||'LEARNING AREA')}</span></div></div><p class="course-desc">${safe(c.note||'Add a short note about what you want to learn.')}</p><span class="course-open-label">Open learning area →</span></a><div class="course-card-foot"><span>${data.events.filter(e=>e.courseId===c.id).length} scheduled item${data.events.filter(e=>e.courseId===c.id).length===1?'':'s'}</span><div class="course-actions"><button class="icon-btn" title="Edit learning area" data-action="edit-course" data-id="${safe(c.id)}">✎</button><button class="icon-btn" title="Remove learning area" data-action="delete-course" data-id="${safe(c.id)}">×</button></div></div></article>`).join('')}</div>`:emptyState('▦','Your learning starts here','Add a skill, subject, topic, course or training area. Then connect sessions and materials to it.','Add your first learning area','add-course')}`}

function addCourseNote(courseId){
 const course=courseById(courseId);if(!course)return;
 openModal('Add a learning note',course.name+' · keep this note inside the course workspace',
  field('Note title','title','<input id="f-title" name="title" required maxlength="80" placeholder="e.g. Week 1 lecture notes">',true)+
  field('Note','body','<textarea id="f-body" name="body" required rows="7" placeholder="Write your lecture notes, ideas or reminders here"></textarea>',true),
  'Save note',fd=>{
   const body=String(fd.get('body')||'').trim();if(!body){toast('Write something before saving this note.');return}
   data.resources.unshift({id:id(),title:String(fd.get('title')||'Course note').trim(),kind:'note',courseId:String(course.id),url:'',body,createdAt:Date.now()});
   closeModal();save();toast('Note saved under '+course.name);
  });
}
function addCourseDeadline(courseId){
 const course=courseById(courseId);if(!course)return;
 openModal('Add course task',course.name+' · add an assignment, classwork, test or exam',
  field('Title','title','<input id="f-title" name="title" required maxlength="100" placeholder="e.g. Submit lab report">',true)+
  '<div class="form-grid">'+
  field('Type','kind','<select id="f-kind" name="kind"><option value="assignment">Assignment</option><option value="classwork">Classwork</option><option value="test">Test</option><option value="exam">Examination</option><option value="project">Project</option></select>')+
  field('Due date','dueDate','<input id="f-dueDate" name="dueDate" type="date" value="'+todayISO()+'" required>')+'</div>'+
  field('Instructions / notes','notes','<textarea id="f-notes" name="notes" maxlength="500" placeholder="Add submission instructions or reminders"></textarea>',true),
  'Save task',fd=>{
   const dueDate=String(fd.get('dueDate')||'');if(!dueDate){toast('Choose a due date for this task.');return}
   data.deadlines=data.deadlines||[];
   data.deadlines.push({id:id(),title:String(fd.get('title')||'').trim(),kind:String(fd.get('kind')||'assignment'),courseId:String(course.id),dueDate,notes:String(fd.get('notes')||'').trim(),completed:false,createdAt:Date.now()});
   closeModal();save();toast('Task saved under '+course.name);
  });
}
function renderCourseDetail(){
 const c=courseById(selectedCourseId);
 if(!c)return pageHead('YOUR LEARNING','Learning area not found','This learning area may have been removed.','<button class="secondary-btn" data-page="courses">← Back to learning</button>')+emptyState('▦','Learning area unavailable','Choose a learning area from your list.','View learning areas','');
 const sameCourse=value=>String(value||'')===String(c.id);
 const events=data.events.filter(e=>sameCourse(e.courseId)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.start||'').localeCompare(String(b.start||'')));
 const resources=(data.resources||[]).filter(r=>sameCourse(r.courseId));
 const notes=resources.filter(r=>r.kind==='note');
 const links=resources.filter(r=>r.kind!=='note');
 const courseMaterials=(data.materials||[]).filter(m=>sameCourse(m.courseId));
 const materials=courseMaterials.filter(m=>m.kind!=='recorded-lecture');
 const recordedLectures=courseMaterials.filter(m=>m.kind==='recorded-lecture');
 const documents=(data.personalDocuments||[]).filter(d=>sameCourse(d.courseId));
 const deadlines=(data.deadlines||[]).filter(d=>sameCourse(d.courseId)).sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')));
 const records=(data.studyRecords||[]).filter(r=>sameCourse(r.courseId)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const classRecords=records.filter(r=>r.type==='class');
 const studyRecords=records.filter(r=>r.type!=='class');
 const flashcards=(data.flashcards||[]).filter(card=>sameCourse(card.courseId));
 const reflectionTasks=classRecords.flatMap(record=>(record.reflection?.tasks||[]).map((task,index)=>({record,task,index,sourceId:record.id+'-'+index}))).filter(item=>!deadlines.some(d=>d.sourceId===item.sourceId));
 const topics=Array.isArray(c.topics)?c.topics:[];
 const eventRows=events.length?'<div class="schedule-list">'+events.map(e=>'<div class="schedule-row"><div class="schedule-time">'+safe(e.date||(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Number(e.day)]||'Class'))+(e.start?'<br>'+timeLabel(e.start):'')+'</div><div class="schedule-row-main"><i class="course-swatch" style="background:'+safe(c.color)+'"></i><div><strong>'+safe(e.title||(e.type==='study'?'Study session':'Class'))+'</strong><span>'+(e.type==='study'?'Reading / study':'Class / lecture')+(e.location?' · '+safe(e.location):'')+'</span></div></div></div>').join('')+'</div>':'<p class="privacy-note-inline">No classes or study sessions are linked to this course yet.</p>';
 const noteRows=notes.length?resourceMarkup(notes):'<p class="privacy-note-inline">No notes saved for this course yet. Add lecture notes or your own study summaries here.</p>';
 const linkRows=links.length?resourceMarkup(links):'<p class="privacy-note-inline">No tutorial links or external resources are linked to this course.</p>';
 const materialRows=materials.length?'<div class="resource-list">'+materials.map(m=>'<article class="resource-card"><div class="resource-icon">'+safe(String(m.ext||'FILE').toUpperCase())+'</div><div style="min-width:0;flex:1"><h4>'+safe(m.name||'Course material')+'</h4><p>'+Number(m.characters||0).toLocaleString()+' extracted characters · uploaded to this device</p></div><div class="course-item-actions"><button class="secondary-btn" data-action="open-course-material" data-id="'+safe(m.id)+'">Read</button><button class="icon-btn" title="Download extracted text" data-action="download-course-material" data-id="'+safe(m.id)+'">↓</button></div></article>').join('')+'</div>':'<p class="privacy-note-inline">No textbooks, slides, PDFs or uploaded study files are linked to this course.</p>';
 const documentRows=documents.length?'<div class="schedule-list">'+documents.map(d=>'<div class="schedule-row"><div class="schedule-time">FILE</div><div class="schedule-row-main"><i class="course-swatch" style="background:#7da9be"></i><div><strong>'+safe(d.title||d.name||'Saved document')+'</strong><span>'+safe(d.category||'Course document')+' · '+safe(d.name||'')+'</span></div></div><div class="schedule-actions"><button class="secondary-btn" data-action="open-personal-document" data-id="'+safe(d.id)+'">Open</button><button class="icon-btn" title="Download" data-action="download-personal-document" data-id="'+safe(d.id)+'">↓</button></div></div>').join('')+'</div>':'<p class="privacy-note-inline">No personal documents are linked to this course. Use Upload document to attach a file.</p>';
 const deadlineRows=deadlines.length?'<div class="schedule-list">'+deadlines.map(d=>'<div class="schedule-row"><div class="schedule-time">'+safe(d.dueDate||'No date')+'</div><div class="schedule-row-main"><i class="course-swatch" style="background:'+(d.completed?'#7ba883':'#d6a15f')+'"></i><div><strong>'+safe(d.title||'Course task')+'</strong><span>'+safe(String(d.kind||'assignment').replace(/-/g,' '))+(d.completed?' · Completed':(d.dueDate&&d.dueDate<todayISO()?' · Overdue':' · Pending'))+(d.notes?' · '+safe(d.notes):'')+'</span></div></div><div class="schedule-actions"><button class="secondary-btn" data-feature="toggle-deadline" data-id="'+safe(d.id)+'">'+(d.completed?'Reopen':'Complete')+'</button><button class="icon-btn" title="Remove task" data-feature="delete-deadline" data-id="'+safe(d.id)+'">×</button></div></div>').join('')+'</div>':'<p class="privacy-note-inline">No assignments, tests or deadlines have been added to this course.</p>';
 const reflectionTaskRows=reflectionTasks.length?'<div class="schedule-list">'+reflectionTasks.map(item=>'<div class="schedule-row"><div class="schedule-time">'+safe(item.task.dueDate||'No date')+'</div><div class="schedule-row-main"><i class="course-swatch" style="background:#9f8bc2"></i><div><strong>'+safe(item.task.title||item.task.type||'Class task')+'</strong><span>'+safe(item.task.type||'Classwork')+' · From '+safe(item.record.date||'class reflection')+'</span></div></div>'+(item.task.dueDate?'<button class="secondary-btn" data-feature="import-reflection-deadline" data-id="'+safe(item.sourceId)+'" data-date="'+safe(item.task.dueDate)+'" data-title="'+safe(item.task.title||item.task.type||'Class task')+'" data-course="'+safe(c.id)+'">Add to planner</button>':'')+'</div>').join('')+'</div>':'<p class="privacy-note-inline">Classwork recorded during completed classes will appear here.</p>';
 const classRows=classRecords.length?'<div class="resource-list">'+classRecords.map(r=>'<article class="resource-card"><div class="resource-icon">▤</div><div style="min-width:0;flex:1"><h4>'+safe(r.title||'Class reflection')+'</h4><p>'+safe(r.date||'')+' · '+safe(({attended:'Attended',student_absent:'I was absent',lecturer_absent:'Lecturer was absent',postponed:'Class postponed'})[r.reflection?.attendance]||r.reflection?.attendance||'Attendance recorded')+'</p><p>'+safe(r.reflection?.topics||'No lecture topics recorded')+'</p><button class="text-btn" data-action="view-session-record" data-record-id="'+safe(r.id)+'">Open full class record →</button></div></article>').join('')+'</div>':'<p class="privacy-note-inline">Class attendance, lecture topics and five learning points will appear after you complete a class reflection.</p>';
 const studyRows=studyRecords.length?'<div class="resource-list">'+studyRecords.map(r=>'<article class="resource-card"><div class="resource-icon">✧</div><div style="min-width:0;flex:1"><h4>'+safe(r.title||'Study session')+'</h4><p>'+safe(r.date||'')+' · '+safe(r.reflection?.topics||'Study reflection')+'</p><p>'+safe(r.reflection?.gained||'No study summary recorded')+'</p><button class="text-btn" data-action="view-session-record" data-record-id="'+safe(r.id)+'">Open study record →</button></div></article>').join('')+'</div>':'<p class="privacy-note-inline">Completed study reflections and quiz results for this course will appear here.</p>';
 const flashcardRows=flashcards.length?'<div class="resource-list">'+flashcards.map(card=>'<article class="resource-card"><div class="resource-icon">✧</div><div style="min-width:0;flex:1"><h4>'+safe(card.front||'Review card')+'</h4><p>'+safe(card.back||'')+'</p><span class="course-code">Next review: '+safe(card.nextReview||'Today')+'</span></div></article>').join('')+'</div>':'<p class="privacy-note-inline">No flashcards are attached to this course yet.</p>';
 const totalTasks=deadlines.length+reflectionTasks.filter(item=>item.task.type==='Assignment'||item.task.type==='Classwork').length;
 const section=(title,description,count,content,tools='')=>'<section class="panel course-detail-section"><div class="panel-head"><div><h3>'+title+'</h3><p>'+description+'</p></div><span class="upload-count">'+count+'</span></div>'+content+(tools?'<div class="course-section-tools">'+tools+'</div>':'')+'</section>';
 const addNote='<button class="secondary-btn" data-action="add-course-note" data-id="'+safe(c.id)+'">＋ Add note</button>';
 const addTask='<button class="secondary-btn" data-action="add-course-deadline" data-id="'+safe(c.id)+'">＋ Add assignment / classwork</button>';
 const addMaterial='<label class="secondary-btn course-file-button">＋ Upload material<input type="file" id="courseMaterialFile" data-course-id="'+safe(c.id)+'" accept=".pdf,.docx,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,image/*"></label>';
 const addDocument='<label class="secondary-btn course-file-button">＋ Upload document<input type="file" id="courseDocumentFile" data-course-id="'+safe(c.id)+'" accept="*/*"></label>';
 return pageHead('COURSE WORKSPACE',safe(c.name),safe(c.code||'Your course · everything in one place'),'<button class="secondary-btn" data-page="courses">← All courses</button>')+
 '<section class="panel course-detail-hero"><div class="course-card-head"><i class="course-swatch" style="background:'+safe(c.color)+'"></i><div><h2>'+safe(c.name)+'</h2><span class="course-code">'+safe(c.code||'COURSE')+'</span></div></div><p class="course-desc">'+safe(c.note||'Your notes, classes, files and coursework are organised here.')+'</p><div class="course-detail-actions"><button class="secondary-btn" data-action="edit-course" data-id="'+safe(c.id)+'">Edit learning area</button><button class="primary-btn" data-action="add-course-session" data-id="'+safe(c.id)+'">＋ Add class / study session</button><button class="secondary-btn" data-action="open-course-practice" data-id="'+safe(c.id)+'">Open practice →</button><button class="secondary-btn" data-action="open-course-mastery" data-id="'+safe(c.id)+'">Topic mastery →</button></div></section>'+
 '<div class="stats-row course-detail-stats"><div class="stat-card"><span class="stat-label">Topics</span><strong class="stat-value">'+topics.length+'</strong></div><div class="stat-card"><span class="stat-label">Tasks</span><strong class="stat-value">'+totalTasks+'</strong></div><div class="stat-card"><span class="stat-label">Notes</span><strong class="stat-value">'+notes.length+'</strong></div><div class="stat-card"><span class="stat-label">Files</span><strong class="stat-value">'+(materials.length+documents.length+recordedLectures.length)+'</strong></div></div>'+
 section('Topics & units','The course outline and learning areas',topics.length,topics.length?'<div class="course-topic-list">'+topics.map(t=>'<span class="filter-chip">'+safe(t)+'</span>').join('')+'</div>':'<p class="privacy-note-inline">Add topics or units when editing this course.</p>','<button class="secondary-btn" data-action="open-course-mastery" data-id="'+safe(c.id)+'">Track topic mastery →</button>')+
 section('Notes','Your saved notes and study summaries',notes.length,noteRows,addNote)+
 section('Documents','Files you have attached to this course',documents.length,documentRows,addDocument)+
 section('Course materials','Textbooks, lecture slides, PDFs and uploaded resources',materials.length,materialRows,addMaterial)+
 section('Recorded lectures','Turn transcripts, lecture slides and scanned images into source-linked key points',recordedLectures.length,window.eduLectureIntelligence?.renderCourseSection(c.id,recordedLectures)||'<p class="privacy-note-inline">Recorded lecture tools are loading.</p>')+
 section('Assignments & deadlines','Assignments, tests, exams and project due dates',deadlines.length,deadlineRows,addTask)+
 section('Classwork','Tasks recorded in class reflections',reflectionTasks.length,reflectionTaskRows)+
 section('Classes & lecture records','Attendance, lecture topics and class reflections',classRecords.length,classRows,'<button class="secondary-btn" data-action="add-course-session" data-id="'+safe(c.id)+'">＋ Add class</button>')+
 section('Study records','Your study reflections and quiz history',studyRecords.length,studyRows)+
 section('Tutorial links','External learning resources saved for this course',links.length,linkRows,'<button class="secondary-btn" data-page="tutorials">Browse learning kit →</button>')+
 section('Flashcards','Active-recall cards saved for this course',flashcards.length,flashcardRows,'<button class="secondary-btn" data-page="flashcards">Open flashcards →</button>')+
 section('Classes & study plan','Scheduled sessions connected to this course',events.length,eventRows,'<button class="secondary-btn" data-action="add-course-session" data-id="'+safe(c.id)+'">＋ Add session</button>');
}
function renderTimetable(){const monday=startOfWeek(addDays(new Date(),weekOffset*7));const dates=Array.from({length:7},(_,i)=>addDays(monday,i));let selected=parseISO(selectedDate);if(selected<dates[0]||selected>dates[6]){selected=dates[0];selectedDate=selected.toLocaleDateString('en-CA')}const dISO=selectedDate,events=dayEvents(dISO);const weekLabel=`${dates[0].toLocaleDateString('en-NG',{month:'short',day:'numeric'})} – ${dates[6].toLocaleDateString('en-NG',{month:'short',day:'numeric'})}`;return `${pageHead('YOUR WEEK','Timetable','See your classes, practice sessions and personal learning blocks together. Add the time blocks you want to protect.','<div class="timetable-heading-actions"><button class="primary-btn" data-action="add-session"><span class="btn-icon">＋</span>Add to timetable</button><button type="button" class="secondary-btn" data-action="add-extra-class"><span class="btn-icon">＋</span>Add extra class</button></div>')}<section class="panel"><div class="panel-head"><div class="week-switch"><button data-action="week-back">‹</button><div class="week-label">${weekLabel}</div><button data-action="week-forward">›</button></div><button type="button" class="panel-link" data-page="settings">Phone alerts by Eduvia →</button></div><div class="day-tabs">${dates.map(d=>{const iso=d.toLocaleDateString('en-CA');return `<button class="day-tab ${iso===dISO?'selected':''}" data-action="select-date" data-date="${iso}"><span>${SHORT_DAYS[d.getDay()]}</span><strong>${d.getDate()}</strong></button>`}).join('')}</div><div class="section-title-row"><h3>${formatDate(selected,{weekday:'long',month:'long',day:'numeric'})}</h3><span>${events.length} item${events.length===1?'':'s'}</span></div>${events.length?`<div class="schedule-list">${events.map(e=>{const c=courseById(e.courseId),record=e.type==='class'?classRecordForDate(e.id,dISO):null,attendanceLabels={attended:'Attended',student_absent:'Absent',lecturer_absent:'Lecturer absent',postponed:'Postponed'},attendance=record?attendanceLabels[record.reflection?.attendance]||'Recorded':'';return `<div class="schedule-row"><div class="schedule-time">${timeLabel(e.start)}<br>${timeLabel(e.end)}</div><div class="schedule-row-main"><i class="course-swatch" style="background:${safe(c?.color||(e.type==='study'?'#9f8bc2':'#7ba883'))}"></i><div><strong>${safe(e.title)}</strong><span>${e.type==='study'?'Learning session':e.extraClass?'Extra class':'Class'}${c?` · ${safe(c.name)}`:''}${e.location?` · ${safe(e.location)}`:''}${attendance?` · ${safe(attendance)}`:''}</span></div></div><div class="schedule-actions"><button class="icon-btn" title="Edit" data-action="edit-event" data-id="${safe(e.id)}">✎</button><button class="icon-btn" title="Remove" data-action="delete-event" data-id="${safe(e.id)}">×</button></div></div>`}).join('')}</div>`:emptyState('◷','No plans for this day','Add a class, practice session or personal learning block.','Add a class or session','add-session')}</section><div class="note-callout">Enable Eduvia phone notifications in Settings to get scheduled class and learning-session alerts at their scheduled start times, even when the app is closed. iPhone and iPad require Eduvia on the Home Screen. Android Do Not Disturb and silent mode can still silence alerts.</div>`}

function renderHabit(){const w=getWeekStats(),goal=Math.max(1,Number(data.profile.weeklyGoal)||5),pct=Math.min(100,w.total/goal*100),monday=startOfWeek(new Date()),today=todayISO(),consistency=typeof studyConsistency==='function'?studyConsistency():{ratio:null},consistencyText=consistency.ratio===null?'Not enough learning history':Math.round(consistency.ratio*100)+'%';return `${pageHead('SMALL STEPS, OFTEN','Build your learning habit','Choose a rhythm you can keep. Track each completed learning session and adjust your weekly target anytime.','<button class="secondary-btn" data-page="settings">Adjust my goal</button>')}<div class="stats-row habit-insight-stats"><div class="stat-card"><div class="stat-label">CURRENT STREAK</div><div class="stat-value">${streakCount()} days</div><div class="stat-note">consecutive learning days</div></div><div class="stat-card"><div class="stat-label">LAST 30 DAYS</div><div class="stat-value">${consistencyText}</div><div class="stat-note">${consistency.expected||0} planned learning sessions</div></div></div><div class="habit-layout"><div><section class="panel"><div class="goal-banner"><div><h2>${w.total>=goal?'Weekly goal reached 🎉':'Your weekly rhythm'}</h2><p>${w.total>=goal?'Keep going at a pace that feels good.':`${Math.max(0,goal-w.total)} more ${goal-w.total===1?'session':'sessions'} to reach your goal.`}</p></div><div class="goal-number">${w.total}<span> / ${goal}</span></div></div><div class="progress-track"><i style="width:${pct}%"></i></div><div class="section-title-row"><h3>This week</h3><span>${Math.round(pct)}% complete</span></div><div class="habit-days">${w.days.map((d,i)=>{const iso=d.toLocaleDateString('en-CA'),count=studyCompletionsForDate(iso).length;return `<div class="habit-day ${count?'done':''} ${iso===today?'today':''}"><span>${SHORT_DAYS[d.getDay()]}</span><i>${count?'✓':d.getDate()}</i></div>`}).join('')}</div><div class="section-title-row"><h3>My learning sessions</h3><button class="panel-link" data-action="add-session">＋ Add session</button></div>${data.events.filter(e=>e.type==='study').length?`<div class="schedule-list">${data.events.filter(e=>e.type==='study').sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.start.localeCompare(b.start)).slice(0,5).map(e=>`<div class="schedule-row"><div class="schedule-time">${e.date?formatDate(parseISO(e.date),{month:'short',day:'numeric'}):SHORT_DAYS[e.day]}</div><div class="schedule-row-main"><i class="course-swatch" style="background:#9f8bc2"></i><div><strong>${safe(e.title)}</strong><span>${e.date?'One-time session':'Weekly'} · ${timeLabel(e.start)} · ${e.duration||data.profile.sessionMinutes} min</span></div></div><button class="icon-btn" title="Edit" data-action="edit-event" data-id="${safe(e.id)}">✎</button></div>`).join('')}</div>`:emptyState('✳','Make room for learning','Add a learning block to your week. Keep it short enough that it feels doable.','Plan a learning session','add-session')}</section></div><div><section class="focus-card"><div class="card-kicker">FOCUS TIMER</div><div class="focus-ring"><div><div class="focus-time" id="focusTime">${formatTimer(focusRemaining)}</div><div class="focus-caption">minutes of focus</div></div></div><div class="focus-controls"><button class="primary-btn" data-action="focus-toggle">${focusRunning?'Pause focus':focusCompleted?`Start ${Number(data.profile.sessionMinutes)||25} min`:focusRemaining<focusSessionMinutes*60?'Resume focus':`Start ${Number(data.profile.sessionMinutes)||25} min`}</button><button class="secondary-btn" data-action="focus-reset">Reset</button></div><p class="habit-tip">Choose one topic and focus for ${focusSessionMinutes} minutes. Your completed focus session is added to today's progress.</p></section><section class="panel" style="margin-top:15px"><div class="panel-head"><div><h3>Your reminder</h3><p>Get a nudge to set aside learning time</p></div><span class="habit-badge">◷</span></div><p class="habit-reminder-copy">${data.profile.reminderTime?`Daily reminder set for <b>${timeLabel(data.profile.reminderTime)}</b>.`: 'Set a daily learning reminder in Settings.'}</p><button class="secondary-btn" data-page="settings">Set reminder</button></section></div></div>`}
function formatTimer(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}

function renderTutorials(){return `${pageHead('YOUR LEARNING KIT','Tutorials & notes','Save helpful links and notes next to your courses so they’re easy to come back to.','<button class="primary-btn" data-action="add-resource"><span class="btn-icon">＋</span>Save a resource</button>')}<div class="filter-row" style="margin-bottom:14px"><button class="filter-chip active" data-action="filter-resource" data-filter="all">All resources</button><button class="filter-chip" data-action="filter-resource" data-filter="link">Tutorial links</button><button class="filter-chip" data-action="filter-resource" data-filter="note">Study notes</button></div><div id="resourceList">${resourceMarkup(data.resources)}</div>`}
function resourceMarkup(resources){if(!resources.length)return emptyState('▷','Your learning kit is empty','Save a tutorial link or a quick note. Your materials stay on this device.','Save a tutorial or note','add-resource');return `<div class="resource-list">${resources.map(r=>`<article class="resource-card"><div class="resource-icon">${r.kind==='note'?'✎':'▷'}</div><div style="min-width:0;flex:1"><h4>${safe(r.title)}</h4><p>${safe(courseName(r.courseId)|| (r.kind==='note'?'Personal note':'Tutorial link'))}</p>${r.kind==='note'?`<div class="resource-note-copy">${safe(r.body)}</div>`:`<a href="${safeHttpUrl(r.url)}" target="_blank" rel="noopener noreferrer">Open tutorial ↗</a>`}</div><button class="resource-remove" aria-label="Remove resource" data-action="delete-resource" data-id="${safe(r.id)}">×</button></article>`).join('')}</div>`}

function renderProgress(){const w=getWeekStats(),goal=Math.max(1,Number(data.profile.weeklyGoal)||5),pct=Math.min(100,Math.round(w.total/goal*100)),studyDone=(data.completed||[]).filter(isStudyCompletionEntry),allMinutes=studyDone.reduce((s,x)=>s+(x.minutes||data.profile.sessionMinutes),0),byCourse=data.courses.map(c=>({course:c,minutes:studyDone.filter(x=>x.courseId===c.id).reduce((s,x)=>s+(x.minutes||data.profile.sessionMinutes),0)}));return `${pageHead('YOUR GROWTH','My progress','Notice the effort you’re putting in. Progress grows one session at a time.','<button class="secondary-btn" data-page="habit">View learning habit</button>')}<div class="progress-hero"><div><h2>${pct>=100?'You met your weekly goal!':'You are showing up for yourself.'}</h2><p>${w.total} of ${goal} planned sessions completed this week.</p></div><div class="progress-score">${pct}%</div></div><div class="stats-row"><div class="stat-card"><div class="stat-label">THIS WEEK</div><div class="stat-value">${w.total}</div><div class="stat-note">learning sessions completed</div></div><div class="stat-card"><div class="stat-label">FOCUS TIME</div><div class="stat-value">${Math.floor(allMinutes/60)}h ${allMinutes%60}m</div><div class="stat-note">all-time learning time</div></div><div class="stat-card"><div class="stat-label">CURRENT STREAK</div><div class="stat-value">${streakCount()} days</div><div class="stat-note">keep your rhythm going</div></div><div class="stat-card"><div class="stat-label">LEARNING AREAS</div><div class="stat-value">${data.courses.length}</div><div class="stat-note">you’re learning in</div></div></div><section class="panel"><div class="panel-head"><div><h3>Sessions this week</h3><p>Tick off a session when you finish it.</p></div></div><div class="day-progress">${w.days.map((d,i)=>{const n=w.doneByDay[i];return `<div class="day-progress-row"><span class="day-name">${formatDate(d,{weekday:'short'})}</span><div class="progress-track"><i style="width:${n?Math.min(100,n*38):0}%"></i></div><span class="day-count">${n} done</span></div>`}).join('')}</div></section>${byCourse.length?`<div class="section-title-row"><h3>Focus by learning area</h3></div><div class="course-grid">${byCourse.map(x=>`<div class="course-card"><div class="course-card-head"><i class="course-swatch" style="background:${safe(x.course.color)}"></i><div><h3>${safe(x.course.name)}</h3><span class="course-code">${safe(x.course.code||'COURSE')}</span></div></div><div class="course-card-foot"><span>Focused time</span><b style="font-size:11px">${x.minutes} min</b></div></div>`).join('')}</div>`:''}`}

function renderSettings(){
 const theme=['system','light','dark'].includes(data.profile.theme)?data.profile.theme:'system';
 const native=Boolean(window.EduviaNative?.isNative);
 const pushEnabled=native?nativeAlertsAreActive():storageGet(PUSH_ENABLED_KEY)==="1";
 const notificationText=native?'Eduvia schedules class and learning-session alerts directly on this phone, including while the app is closed. Allow notifications and exact alarms. Android Do Not Disturb, silent mode, and notification-channel settings can still silence alerts; Eduvia cannot override them automatically.':'Get scheduled class and learning-session alerts at their scheduled start times, plus your daily learning reminder. Background delivery requires the notification service and operating-system permissions to be available. Browser and phone sound settings, including Do Not Disturb, can still silence alerts. The phone subscription and scheduled learning titles and times are stored by Eduvia’s free notification service; the rest of your planner stays on this device. iPhone and iPad require Eduvia on the Home Screen.';
 const notificationButton=pushEnabled?'Turn off':(native?'Enable alarms &amp; notifications':'Enable &amp; send test');
 return `${pageHead('MAKE IT YOURS','Settings','Make Eduvia feel comfortable on your device, and choose a learning routine that fits your day.','')}
 <section class="panel settings-panel">
  <div class="panel-head"><div><h3>Your learning space</h3><p>Personalise the app without changing your learning history.</p></div></div>
  ${profilePhotoSettingsMarkup()}
  <div class="setting-row"><div><strong>Appearance</strong><p>Follow your phone setting, or choose light or dark mode.</p></div><select id="settingTheme" aria-label="Appearance"><option value="system" ${theme==='system'?'selected':''}>System setting</option><option value="light" ${theme==='light'?'selected':''}>Light</option><option value="dark" ${theme==='dark'?'selected':''}>Dark</option></select></div>
  <div class="setting-row"><div><strong>Name</strong><p>Used for your welcome message</p></div><input type="text" id="settingName" value="${safe(data.profile.name)}" maxlength="40" /></div>
  <div class="setting-row"><div><strong>Weekly learning goal</strong><p>How many learning sessions would feel realistic?</p></div><input type="number" id="settingGoal" value="${Number(data.profile.weeklyGoal)||5}" min="1" max="30" /></div>
  <div class="setting-row"><div><strong>Learning session length</strong><p>Minutes for each guided focus session</p></div><input type="number" id="settingMinutes" value="${Number(data.profile.sessionMinutes)||25}" min="5" max="180" /></div>
  <div class="setting-row"><div><strong>Daily learning reminder</strong><p>${data.profile.reminderTime?'Your daily reminder time':'Pick a time to build your rhythm'}</p></div><input type="time" id="settingReminder" value="${safe(data.profile.reminderTime||'19:00')}" /></div>
  <div class="setting-row"><div><strong>Eduvia phone notifications</strong><p>${notificationText}</p></div><button class="secondary-btn" data-action="${pushEnabled?'disable-notifications':'enable-notifications'}">${notificationButton}</button></div>
  <div class="setting-row backup-setting-row"><div><strong>Planner backup</strong><p>Restore your profile, courses, timetable, notes, progress and study records. Personal documents, full education records and saved class voice recordings need the portable ZIP in Personal documents.</p></div><div class="backup-actions"><button class="secondary-btn" data-action="export-data">Download JSON</button><label class="secondary-btn backup-file-label">Restore from phone JSON<input id="plannerJsonBackupFile" type="file" accept=".json,application/json"></label></div></div>
  <div class="setting-row"><div><strong>Clear planner data</strong><p>Remove all locally saved courses, events and notes from this device.</p></div><button class="danger-btn" data-action="clear-data">Clear data</button></div>
  <div class="settings-save"><button class="primary-btn" data-action="save-settings">Save settings</button></div>
 </section>
 <div class="note-callout">Your planner data stays in this browser on this device. Clearing browser storage will also remove it, so download a backup if you want to keep a copy.</div>`;
}
function renderMore(){
 const type=learnerTypeOf(data.profile),formal=type==='formal',examLearner=type==='exam-prep';
 const sections=[
  {eyebrow:'ORGANISE & PREPARE',title:'Make room for focused learning',items:[
   ['study','✧','Learning studio','Add course materials, notes and availability, then build a personal learning plan.','purple'],
   ['tutorials','▷','Learning resources','Keep useful tutorials, links and study notes together.','blue'],
   ['planner','◷','Assignments & planner','Track coursework, tests and revision deadlines in one place.','orange'],
   ['roadmaps','↗','Learning roadmaps','Turn a larger learning goal into practical milestones.','lime']
  ]},
  {eyebrow:'WELLBEING & INSIGHTS',title:'Understand your learning rhythm',items:[
   ['wellness','♡','Study wellness','Check in with your energy and workload and review your study balance.','lime'],
   ['insights','↗','Performance insights','Review recorded quiz results, topic confidence and learning activity.','purple']
  ]},
  {eyebrow:'PERSONAL SPACE',title:'Keep your records and preferences in order',items:[
   ['vault','▣','Personal library','Keep documents, certificates and other useful files together.','blue'],
   ['profile','♙','Learning profile','Update your learning details and personal learning path.','pink'],
   ['settings','⚙','Settings','Manage appearance, reminders, notifications and backups.','purple']
  ]}
 ];
 if(formal)sections[2].items.splice(1,0,['education','▤','Education history','Keep academic periods, results and carryover records together.','orange']);
 if(formal||examLearner)sections[0].items.splice(3,0,['exams','🎓','Examination centre','Manage exam dates, revision plans and timed mock examinations.','pink']);
 const card=item=>'<button type="button" class="more-tool-card more-tool-card-'+item[4]+'" data-page="'+item[0]+'"><span class="more-tool-icon">'+item[1]+'</span><span class="more-tool-copy"><strong>'+item[2]+'</strong><span>'+item[3]+'</span></span><span class="more-tool-open" aria-hidden="true">↗</span></button>';
 return pageHead('MORE TOOLS','More tools','A considered home for the tools that support your learning, wellbeing and personal records.','')+
  sections.map(section=>'<section class="more-tool-section"><div class="more-tool-section-head"><div><span class="eyebrow">'+section.eyebrow+'</span><h2>'+section.title+'</h2></div><span>'+section.items.length+' tools</span></div><div class="more-tool-grid">'+section.items.map(card).join('')+'</div></section>').join('');
}

function openModal(title,subtitle,body,submitText='Save',onSubmit=null){document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${safe(title)}"><div class="modal-head"><div><h2>${safe(title)}</h2><p>${safe(subtitle)}</p></div><button class="modal-close" data-action="close-modal" aria-label="Close">×</button></div><form id="activeForm">${body}<div class="modal-foot"><button type="button" class="secondary-btn" data-action="close-modal">Cancel</button><button type="submit" class="primary-btn">${safe(submitText)}</button></div></form></section></div>`;document.querySelector('.modal-backdrop').addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()});document.getElementById('activeForm').addEventListener('submit',e=>{e.preventDefault();if(onSubmit)onSubmit(new FormData(e.currentTarget))})}
function closeModal(){window.EduviaVoiceReflection?.cancel?.();document.getElementById('modalRoot').innerHTML=''}
function courseOptions(selected=''){return `<option value="">No course attached</option>${data.courses.map(c=>`<option value="${safe(c.id)}" ${c.id===selected?'selected':''}>${safe(c.name)}</option>`).join('')}`}
function field(label,name,html,full=false){return `<div class="form-field ${full?'full':''}"><label for="f-${name}">${label}</label>${html}</div>`}
function addCourse(course=null){let chosen=COLORS.includes(course?.color)?course.color:COLORS[0];const colorHtml=COLORS.map(c=>`<button type="button" class="color-option ${c===chosen?'selected':''}" data-color="${c}" style="background:${c}" aria-label="Select color"></button>`).join('');openModal(course?'Edit learning area':'Add a learning area',course?'Update the details for this learning area.':'Add a skill, subject, topic or training area.',`${field('Learning area or subject name','name',`<input id="f-name" name="name" required maxlength="70" placeholder="e.g. Biology" value="${safe(course?.name||'')}">`,true)}<div class="form-grid">${field('Short code (optional)','code',`<input id="f-code" name="code" maxlength="20" placeholder="e.g. BIO 201" value="${safe(course?.code||'')}">`)}${field('Instructor, tutor or mentor (optional)','instructor',`<input id="f-instructor" name="instructor" maxlength="50" placeholder="Instructor name" value="${safe(course?.instructor||'')}">`)}</div>${field('What do you want to remember?','note',`<textarea id="f-note" name="note" maxlength="220" placeholder="A goal, topic, or quick course note">${safe(course?.note||'')}</textarea>`,true)}${field('Topics or units','topics',`<textarea id="f-topics" name="topics" placeholder="Add topics or units, one per line">${safe((course?.topics||[]).join('\n'))}</textarea>`,true)}${field('Learning-area colour','color',`<div class="color-picker">${colorHtml}</div><input type="hidden" id="f-color" name="color" value="${chosen}">`,true)}`,course?'Save changes':'Add learning area',fd=>{const obj={id:course?.id||id(),name:fd.get('name').trim(),code:fd.get('code').trim(),instructor:fd.get('instructor').trim(),note:fd.get('note').trim(),topics:fd.get('topics').split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean),credits:course?.credits||0,color:fd.get('color')};if(course)data.courses=data.courses.map(x=>x.id===course.id?obj:x);else data.courses.push(obj);closeModal();save();toast(course?'Learning area updated':'Learning area added')});document.querySelectorAll('.color-option').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.color-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');document.getElementById('f-color').value=b.dataset.color}))}
function addEvent(event=null,typeOverride=null,courseIdOverride='',options={}){const selected=event?.date||selectedDate||todayISO();const type=typeOverride||event?.type||'study';const extraClass=Boolean(options.oneTime)&&!event;const isRecurring=event?!event.date:type==='class'&&!options.oneTime;const heading=event?'Edit timetable item':extraClass?'Schedule an extra class':type==='class'?'Add a class':'Plan a study session';const description=event?'Update the time or details.':extraClass?'Add a one-off class without changing your regular weekly timetable.':type==='class'?'Add a class to a day of your week.':'Choose a reading time you can keep.';const openingNote=extraClass?'<p class="session-modal-intro">This class will appear only on the selected date. Your regular weekly timetable will stay unchanged.</p>':'';openModal(heading,description,`${openingNote}${field('What is it?','title',`<input id="f-title" name="title" required maxlength="70" placeholder="e.g. Read chapter 3" value="${safe(event?.title||'')}">`,true)}<div class="form-grid">${field('Type','type',`<select id="f-type" name="type"><option value="study" ${type==='study'?'selected':''}>Reading / study</option><option value="class" ${type==='class'?'selected':''}>Class / lecture</option></select>`)}${field('Course','courseId',`<select id="f-courseId" name="courseId">${courseOptions(event?.courseId||courseIdOverride)}</select>`)}</div><div class="form-grid">${field('Date','date',`<input id="f-date" name="date" type="date" required value="${safe(selected)}" ${isRecurring?'disabled':''}>`)}${field('Repeat','repeat',`<select id="f-repeat" name="repeat"><option value="once" ${!isRecurring?'selected':''}>One time</option><option value="weekly" ${isRecurring?'selected':''}>Every week</option></select>`)}</div><div class="form-grid">${field('Start','start',`<input id="f-start" name="start" type="time" required value="${safe(event?.start||'18:00')}">`)}${field('End','end',`<input id="f-end" name="end" type="time" required value="${safe(event?.end||'18:25')}">`)}</div><div class="form-grid">${field('Day of week','day',`<select id="f-day" name="day">${DAYS.map((d,i)=>`<option value="${i}" ${(String(event?.day??parseISO(selected).getDay())===String(i))?'selected':''}>${d}</option>`).join('')}</select>`)}${field('Location (optional)','location',`<input id="f-location" name="location" maxlength="70" placeholder="e.g. Room 12 or home" value="${safe(event?.location||'')}">`)}</div><label class="checkbox-row" style="margin-top:11px"><input type="checkbox" name="remind" ${event?.remind!==false?'checked':''}> Alert me when this starts</label>`,event?'Save changes':'Add to timetable',fd=>{const repeat=fd.get('repeat'),date=repeat==='weekly'?'':fd.get('date'),day=repeat==='weekly'?fd.get('day'):parseISO(fd.get('date')).getDay();const obj={id:event?.id||id(),createdAt:event?.createdAt||todayISO(),title:fd.get('title').trim(),type:fd.get('type'),extraClass:options.oneTime?true:!!event?.extraClass,courseId:fd.get('courseId'),date,day:Number(day),start:fd.get('start'),end:fd.get('end'),location:fd.get('location').trim(),remind:fd.get('remind')==='on',importedTimetable:!!event?.importedTimetable,generated:!!event?.generated,duration:Math.max(1,Math.round((minutes(fd.get('end'))-minutes(fd.get('start')))))};if(minutes(obj.end)<=minutes(obj.start)){toast('End time needs to be after start time.');return}const conflictDay=Number(obj.day),conflicts=data.events.filter(existing=>{if(existing.id===obj.id)return false;const sameOccurrence=obj.date&&existing.date?obj.date===existing.date:!obj.date&&!existing.date?Number(existing.day)===conflictDay:obj.date?Number(existing.day)===conflictDay:parseISO(existing.date).getDay()===conflictDay;return sameOccurrence&&minutes(obj.start)<minutes(existing.end)&&minutes(obj.end)>minutes(existing.start)});if(conflicts.length){const names=conflicts.slice(0,3).map(item=>item.title).join(', '),more=conflicts.length>3?' and '+(conflicts.length-3)+' more':'';if(!confirm('This time overlaps with '+names+more+'. Save it anyway?'))return}if(event)data.events=data.events.map(x=>x.id===event.id?obj:x);else data.events.push(obj);selectedDate=date||selectedDate;closeModal();save();toast(event?'Timetable updated':'Added to your timetable')});const repeatSelect=document.getElementById('f-repeat'),dateInput=document.getElementById('f-date'),dayField=document.getElementById('f-day').closest('.form-field');repeatSelect.addEventListener('change',()=>{const weekly=repeatSelect.value==='weekly';dateInput.disabled=weekly;document.getElementById('f-day').disabled=!weekly;if(weekly)dateInput.value='';else dateInput.value=selectedDate});document.getElementById('f-type').addEventListener('change',()=>{if(document.getElementById('f-type').value==='class'&&repeatSelect.value==='once'&&!options.oneTime){repeatSelect.value='weekly';repeatSelect.dispatchEvent(new Event('change'))}});if(isRecurring){dateInput.disabled=true;document.getElementById('f-day').disabled=false}else document.getElementById('f-day').disabled=true}
function addResource(){openModal('Save a tutorial or note','Keep the learning material you want close by.',`${field('Title','title','<input id="f-title" name="title" required maxlength="80" placeholder="e.g. Photosynthesis overview">',true)}<div class="form-grid">${field('Type','kind','<select id="f-kind" name="kind"><option value="link">Tutorial link</option><option value="note">Study note</option></select>')}${field('Course','courseId',`<select id="f-courseId" name="courseId">${courseOptions()}</select>`)}</div>${field('Link','url','<input id="f-url" name="url" type="url" placeholder="https://">',true)}${field('Note','body','<textarea id="f-body" name="body" placeholder="Write down a key idea or reminder"></textarea>',true)}`,'Save to my learning kit',fd=>{const kind=fd.get('kind'),url=fd.get('url').trim();if(kind==='link'&&!url){toast('Add a link for this tutorial.');return}if(kind==='link'&&!/^https?:\/\//i.test(url)){toast('Use a full link starting with https://');return}const r={id:id(),title:fd.get('title').trim(),kind,courseId:fd.get('courseId'),url,body:fd.get('body').trim()};data.resources.unshift(r);closeModal();save();toast('Saved to your learning kit')});const sync=()=>{const note=document.getElementById('f-kind').value==='note';document.getElementById('f-url').closest('.form-field').style.display=note?'none':'grid';document.getElementById('f-body').closest('.form-field').style.display=note?'grid':'none'};document.getElementById('f-kind').addEventListener('change',sync);sync()}

function completeEvent(eventId,date){const event=data.events.find(e=>e.id===eventId);if(!event)return;const classRecord=classRecordForDate(eventId,date);if(classRecord&&window.eduShowSessionRecord){window.eduShowSessionRecord(classRecord.id);return}const existing=data.completed.find(x=>x.eventId===eventId&&x.date===date);if(existing){const record=(data.studyRecords||[]).find(x=>x.id===existing.recordId);if(record&&window.eduShowSessionRecord){window.eduShowSessionRecord(record.id);return}data.completed=data.completed.filter(x=>x!==existing);save();toast('Session mark removed');return}if(window.eduBeginSessionCompletion){window.eduBeginSessionCompletion(event,date);return}data.completed.push({id:id(),eventId,date,courseId:event.courseId,type:event.type,minutes:event.duration||data.profile.sessionMinutes});save();toast('Nice work — session complete!')}
function configuredFocusMinutes(){return Math.min(180,Math.max(5,Number(data.profile.sessionMinutes)||25))}
function finishFocusSession(){if(!focusRunning&&focusCompleted)return;clearInterval(focusInterval);focusInterval=null;focusEndAt=null;focusRemaining=0;focusRunning=false;focusCompleted=true;const date=todayISO();data.completed.push({id:id(),eventId:`focus-${id()}`,date,minutes:focusSessionMinutes,courseId:'',type:'study'});save();toast('Focus session complete. You did it!');showStudyNotification('Focus session complete','Your '+focusSessionMinutes+'-minute focus session is complete. Take a short break.')}
function updateFocusCountdown(){if(!focusRunning||!focusEndAt)return;focusRemaining=Math.max(0,Math.ceil((focusEndAt-Date.now())/1000));const display=document.getElementById('focusTime');if(display)display.textContent=formatTimer(focusRemaining);if(focusRemaining<=0)finishFocusSession()}
function startFocus(){if(focusRunning)return;if(focusCompleted||focusRemaining<=0){focusSessionMinutes=configuredFocusMinutes();focusRemaining=focusSessionMinutes*60;focusCompleted=false}else if(focusRemaining===configuredFocusMinutes()*60){focusSessionMinutes=configuredFocusMinutes()}focusRunning=true;focusEndAt=Date.now()+focusRemaining*1000;clearInterval(focusInterval);focusInterval=setInterval(updateFocusCountdown,250);render()}
function stopFocus(){if(focusRunning&&focusEndAt)focusRemaining=Math.max(0,Math.ceil((focusEndAt-Date.now())/1000));clearInterval(focusInterval);focusInterval=null;focusEndAt=null;focusRunning=false;if(focusRemaining<=0)finishFocusSession();else render()}
function resetFocus(){clearInterval(focusInterval);focusInterval=null;focusEndAt=null;focusRunning=false;focusCompleted=false;focusSessionMinutes=configuredFocusMinutes();focusRemaining=focusSessionMinutes*60;render()}
function saveSettings(){
 data.profile.name=document.getElementById('settingName').value.trim()||'Learner';
 data.profile.theme=document.getElementById('settingTheme')?.value||data.profile.theme||'system';
 data.profile.themePreferenceVersion=1;
 data.profile.weeklyGoal=Math.min(30,Math.max(1,Number(document.getElementById('settingGoal').value)||5));
 data.profile.sessionMinutes=Math.min(180,Math.max(5,Number(document.getElementById('settingMinutes').value)||25));
 data.profile.reminderTime=document.getElementById('settingReminder').value;
 if(!focusRunning){focusSessionMinutes=configuredFocusMinutes();focusRemaining=focusSessionMinutes*60;focusCompleted=false;focusEndAt=null}
 save();scheduleReminder();toast('Your study plan is saved');
}
function exportData(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});download(blob,'eduvia-backup.json');toast('Your backup has been downloaded')}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function scheduleReminder(){clearTimeout(window.daymarkReminder);if(!data.profile.reminderTime||nativeAlertsAreActive()||pushIsActive()||pushIsDisabled())return;const [h,m]=data.profile.reminderTime.split(':').map(Number);const now=new Date(),next=new Date();next.setHours(h,m,0,0);if(next<=now)next.setDate(next.getDate()+1);window.daymarkReminder=setTimeout(async()=>{if('Notification'in window&&Notification.permission==='granted')await showStudyNotification('Time for a little reading','A short study session keeps your goal moving.');scheduleReminder()},next-now)}
function eventHasPhoneAlert(event){return event.remind!==false}
function nextEventReminder(now=new Date()){
  let next=null;const firstDay=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  for(let offset=0;offset<=7;offset++){
    const day=addDays(firstDay,offset),date=day.toLocaleDateString('en-CA');
    for(const event of dayEvents(date)){
      if(!eventHasPhoneAlert(event)||data.completed.some(item=>item.eventId===event.id&&item.date===date)||classRecordForDate(event.id,date))continue;
      const [hour,minute]=String(event.start||'').split(':').map(Number);if(!Number.isFinite(hour)||!Number.isFinite(minute))continue;
      const at=new Date(day);at.setHours(hour,minute,0,0);
      const alertKey='eduvia-event-alert:'+event.id+':'+date;
      if(storageGet(alertKey)==='1'||at.getTime()<=now.getTime()-10*60*1000)continue;
      if(!next||at<next.at)next={event,date,at};
    }
  }
  return next;
}
function scheduleEventAlert(){
  clearTimeout(eventAlertTimer);eventAlertTimer=null;
  if(!('Notification'in window)||Notification.permission!=='granted'||nativeAlertsAreActive()||pushIsActive()||pushIsDisabled())return;
  const next=nextEventReminder(),delay=next?next.at.getTime()-Date.now():6*60*60*1000;
  eventAlertTimer=setTimeout(async()=>{
    if(next){
      const key='eduvia-event-alert:'+next.event.id+':'+next.date;
      const label=next.event.type==='class'?'Class':'Learning session';
      const shown=await showStudyNotification(label+' starts now',next.event.title+' is scheduled to start now.');
      if(!shown){
        eventAlertTimer=setTimeout(()=>scheduleEventAlert(),60_000);
        return;
      }
      storageSet(key,'1');
    }
    scheduleEventAlert();
  },Math.max(100,Math.min(delay,24*60*60*1000)));
}
function pushIsActive(){return storageGet(PUSH_ENABLED_KEY)==='1'}
function pushIsDisabled(){return storageGet(PUSH_DISABLED_KEY)==='1'}
function nativeAlertsAreActive(){return Boolean(window.EduviaNative?.isNative)&&storageGet(NATIVE_ALERTS_ENABLED_KEY)==='1'}
function pushDeviceToken(){let token=storageGet(PUSH_TOKEN_KEY);if(token)return token;const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);token=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');storageSet(PUSH_TOKEN_KEY,token);return token}
function pushKeyBytes(value){const normalized=value.replace(/-/g,'+').replace(/_/g,'/');const padded=normalized+'='.repeat((4-normalized.length%4)%4);return Uint8Array.from(atob(padded),c=>c.charCodeAt(0))}
async function pushApi(path,options={},token=''){if(!PUSH_API_URL)throw new Error('Eduvia’s free notification service is not connected yet.');const headers={...(options.headers||{})};if(options.body)headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;const response=await fetch(PUSH_API_URL+path,{...options,headers,cache:'no-store'});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'The notification service could not be reached.');return result}
function buildPushReminders(now=new Date()){const reminders=[],until=now.getTime()+90*24*60*60*1000;for(let offset=0;offset<90;offset++){const day=addDays(new Date(now.getFullYear(),now.getMonth(),now.getDate()),offset),date=day.toLocaleDateString('en-CA');for(const event of dayEvents(date)){if(!eventHasPhoneAlert(event)||data.completed.some(item=>item.eventId===event.id&&item.date===date)||classRecordForDate(event.id,date))continue;const [hour,minute]=String(event.start||'').split(':').map(Number);if(!Number.isFinite(hour)||!Number.isFinite(minute))continue;const start=new Date(day);start.setHours(hour,minute,0,0);const fireAt=start.getTime();if(fireAt<=now.getTime()||fireAt>until)continue;const kind=event.type==='study'?'Study session':'Lecture';reminders.push({id:String(event.id)+':'+date,title:kind+' starts now',body:String(event.title)+' is scheduled to start now.',fireAt})}if(data.profile.reminderTime){const [hour,minute]=String(data.profile.reminderTime).split(':').map(Number);if(Number.isFinite(hour)&&Number.isFinite(minute)){const at=new Date(day);at.setHours(hour,minute,0,0);if(at>now&&at.getTime()<=until)reminders.push({id:'daily-reading:'+date,title:'Time for a little reading',body:'A short study session keeps your goal moving.',fireAt:at.getTime()})}}}if(typeof window.eduRecallBuildReminders==='function')reminders.push(...window.eduRecallBuildReminders(now));return reminders.filter(item=>item&&Number.isFinite(Number(item.fireAt))&&Number(item.fireAt)>now.getTime()).sort((a,b)=>Number(a.fireAt)-Number(b.fireAt)).slice(0,600)}
async function syncPushSchedule(subscription=null,token=''){if(!PUSH_API_URL||!pushIsActive()||!('serviceWorker'in navigator))return;if(pushSyncPromise)return pushSyncPromise;pushSyncPromise=(async()=>{const deviceToken=token||storageGet(PUSH_TOKEN_KEY);if(!deviceToken)return;const registration=await navigator.serviceWorker.ready,pushSubscription=subscription||await registration.pushManager.getSubscription();if(!pushSubscription)return;await pushApi('/v1/schedule',{method:'POST',body:JSON.stringify({subscription:pushSubscription.toJSON(),reminders:buildPushReminders()})},deviceToken)})();try{return await pushSyncPromise}finally{pushSyncPromise=null}}
function schedulePushSync(){clearTimeout(pushSyncTimer);if(window.EduviaNative?.isNative){if(!nativeAlertsAreActive())return;pushSyncTimer=setTimeout(async()=>{try{const result=await window.EduviaNative.scheduleReminders(buildPushReminders());if(!result.enabled&&nativeAlertsAreActive()){storageRemove(NATIVE_ALERTS_ENABLED_KEY);updatePhoneNotificationButton(false);if(currentPage==='settings')render();toast(result.reason==='exact-alarm'?'Eduvia alarms paused. Allow exact alarms again in your phone settings.':'Eduvia notifications paused. Allow notifications again in your phone settings.')}}catch{}},1500);return}if(!PUSH_API_URL||!pushIsActive())return;pushSyncTimer=setTimeout(()=>syncPushSchedule().catch(()=>{}),1500)}
function updatePhoneNotificationButton(active){const button=document.querySelector('[data-action="enable-notifications"],[data-action="disable-notifications"]');if(!button)return;button.dataset.action=active?'disable-notifications':'enable-notifications';button.textContent=active?'Turn off':(window.EduviaNative?.isNative?'Enable alarms & notifications':'Enable & send test');}
async function showStudyNotification(title,body){try{if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.ready;await registration.showNotification(title,{body,icon:'./icon.svg',badge:'./icon.svg'});return true}if('Notification'in window&&Notification.permission==='granted'){new Notification(title,{body,icon:'./icon.svg'});return true}}catch{}return false}
async function enableNotifications(){if(window.EduviaNative?.isNative){try{const result=await window.EduviaNative.enableAlerts(buildPushReminders());if(!result.enabled){toast(result.reason==='exact-alarm'?'Allow Eduvia to schedule exact alarms in the phone settings, then try again.':'Allow Eduvia notifications in the phone settings, then try again.');return}storageSet(NATIVE_ALERTS_ENABLED_KEY,'1');storageRemove(PUSH_DISABLED_KEY);updatePhoneNotificationButton(true);scheduleReminder();scheduleEventAlert();toast(`Eduvia alerts are on. ${result.scheduled} class and study reminders are scheduled on this phone.`)}catch(error){toast(error.message||'Eduvia could not set up phone alarms.')}return}if(!PUSH_API_URL){toast('Eduvia’s free phone notification service is not connected yet.');return}if(!window.isSecureContext||!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator)){toast('Phone push notifications are not supported by this browser.');return}if(isIosDevice()&&!isStandaloneApp()){openModal('Add Eduvia to your Home Screen','iPhone and iPad web apps can receive Eduvia alerts after they are added to the Home Screen.','<ol><li>Open Eduvia in Safari.</li><li>Tap Share.</li><li>Choose “Add to Home Screen”, then open the new Eduvia icon.</li><li>Return to Settings and enable phone notifications.</li></ol>','Got it',()=>closeModal());return}try{let permission=Notification.permission;if(permission==='default')permission=await Notification.requestPermission();if(permission!=='granted'){toast('Allow notifications in your phone settings, then try again.');return}const config=await pushApi('/v1/config');if(!config.publicKey)throw new Error('Eduvia could not prepare its notification keys.');const registration=await navigator.serviceWorker.ready;let subscription=await registration.pushManager.getSubscription();if(subscription){const savedKey=subscription.options?.applicationServerKey;if(savedKey&&btoa(String.fromCharCode(...new Uint8Array(savedKey))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')!==config.publicKey){await subscription.unsubscribe();subscription=null}}if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyBytes(config.publicKey)});const token=pushDeviceToken();await pushApi('/v1/schedule',{method:'POST',body:JSON.stringify({subscription:subscription.toJSON(),reminders:buildPushReminders()})},token);storageSet(PUSH_ENABLED_KEY,'1');storageRemove(PUSH_DISABLED_KEY);updatePhoneNotificationButton(true);try{await pushApi('/v1/test',{method:'POST'},token);toast('Eduvia notifications are on. A test alert is on its way.')}catch{toast('Eduvia notifications are on, but the test alert could not be sent.')}scheduleReminder();scheduleEventAlert()}catch(error){storageRemove(PUSH_ENABLED_KEY);toast(error.message||'Eduvia could not enable phone notifications.')}}
function promptFirstLaunchNotifications(){
 if(storageGet(FIRST_LAUNCH_ALERT_PROMPT_KEY)==='1')return;
 const native=Boolean(window.EduviaNative?.isNative);
 const alreadyEnabled=native?nativeAlertsAreActive():pushIsActive();
 if(alreadyEnabled){storageSet(FIRST_LAUNCH_ALERT_PROMPT_KEY,'1');return}
 const browserCanRequest=!native&&PUSH_API_URL&&window.isSecureContext&&('Notification'in window)&&('PushManager'in window)&&('serviceWorker'in navigator);
 if(!native&&!browserCanRequest){storageSet(FIRST_LAUNCH_ALERT_PROMPT_KEY,'1');return}
 if(!native&&Notification.permission==='denied'){storageSet(FIRST_LAUNCH_ALERT_PROMPT_KEY,'1');return}
 // Record the invitation before showing it so dismissing or reopening the app never repeats it.
 storageSet(FIRST_LAUNCH_ALERT_PROMPT_KEY,'1');
 openModal(
  'Enable Eduvia alerts',
  'Would you like Eduvia to remind you about classes and learning sessions?',
  '<p>Allow notifications and, on Android, exact-alarm access so your planned reminders can reach you even when Eduvia is closed. You can change this later in Settings.</p>',
  'Enable alerts',
  ()=>{closeModal();enableNotifications()}
 );
}
function markFirstLaunchNotificationsPending(){
 if(storageGet(FIRST_LAUNCH_ALERT_PROMPT_KEY)!=='1')storageSet(FIRST_LAUNCH_ALERT_PROMPT_KEY,'pending');
}
window.eduPromptFirstLaunchNotifications=promptFirstLaunchNotifications;
window.eduMarkFirstLaunchNotificationsPending=markFirstLaunchNotificationsPending;

async function disableNotifications(){if(window.EduviaNative?.isNative){try{await window.EduviaNative.disableAlerts();storageRemove(NATIVE_ALERTS_ENABLED_KEY);updatePhoneNotificationButton(false);clearTimeout(eventAlertTimer);clearTimeout(window.daymarkReminder);render();toast('Eduvia alarms and notifications are off on this phone.')}catch(error){toast(error.message||'Eduvia could not turn off phone alerts.')}return}const token=storageGet(PUSH_TOKEN_KEY);try{if(token)await pushApi('/v1/unsubscribe',{method:'POST'},token);if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();if(subscription)await subscription.unsubscribe()}storageRemove(PUSH_TOKEN_KEY);storageRemove(PUSH_ENABLED_KEY);storageSet(PUSH_DISABLED_KEY,'1');updatePhoneNotificationButton(false);clearTimeout(eventAlertTimer);clearTimeout(window.daymarkReminder);render();toast('Eduvia phone notifications are off.')}catch(error){toast(error.message||'Could not turn off phone notifications. Try again when online.')}}
function deleteCourse(courseId){
 const course=data.courses.find(item=>String(item.id)===String(courseId));
 if(!course)return;
 if(!confirm('Remove '+course.name+' and its timetable entries? Your notes, uploaded files, documents, deadlines, flashcards, study records, exams and roadmaps will be kept as unlinked personal records.'))return;
 const unlink=record=>{
  if(!record||String(record.courseId||'')!==String(courseId))return;
  record.courseName=record.courseName||course.name;
  record.courseId='';
 };
 data.events=data.events.filter(event=>String(event.courseId||'')!==String(courseId));
 for(const collection of [data.resources,data.deadlines,data.personalDocuments,data.materials,data.materialText,data.studyRecords,data.completed,data.flashcards,data.exams,data.revisionTasks,data.roadmaps]){
  if(Array.isArray(collection))collection.forEach(unlink);
 }
 data.courses=data.courses.filter(item=>String(item.id)!==String(courseId));
 if(String(selectedCourseId)===String(courseId)){selectedCourseId='';currentPage='courses';location.hash='courses'}
 save();toast('Course removed. Its learning records were kept and unlinked.');
}
function deleteEvent(eventId){data.events=data.events.filter(e=>e.id!==eventId);save();toast('Timetable item removed')}
function clearData(){if(!confirm('This will permanently remove your learning areas, schedule, resources, and progress from this device. Download a backup first if you want to keep them.'))return;data=defaultData();if(!save())return;toast('Learning data cleared')}

// Course navigation supports touch, pointer and click input on mobile browsers and installed PWAs.
function openCourseFromCard(card,event){
 if(!card)return false;
 const courseId=card.getAttribute('data-open-course');
 if(!courseId)return false;
 const course=data.courses.find(item=>String(item.id)===String(courseId));
 if(!course)return false;
 if(event){event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation()}
 selectedCourseId=course.id;
 setPage('course-detail',course.id);
 return true;
}
window.addEventListener('pointerup',event=>{
 const target=event.target instanceof Element?event.target:null;
 const card=target?.closest('[data-open-course]');
 if(card)openCourseFromCard(card,event);
},true);
window.addEventListener('touchend',event=>{
 const target=event.target instanceof Element?event.target:null;
 const card=target?.closest('[data-open-course]');
 if(card)openCourseFromCard(card,event);
},{capture:true,passive:false});
window.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target:null;
 const card=target?.closest('[data-open-course]');
 if(card)openCourseFromCard(card,event);
},true);
document.addEventListener('click',e=>{const nav=e.target.closest('[data-page]');if(nav){if(nav.dataset.page==='mastery'&&nav.dataset.course)window.eduMasteryCourse=nav.dataset.course;setPage(nav.dataset.page);return}const b=e.target.closest('[data-action]');if(b){const a=b.dataset.action;switch(a){case'add-course':addCourse();break;case'open-course':setPage('course-detail',b.dataset.id);break;case'add-course-session':selectedDate=todayISO();addEvent(null,'study',b.dataset.id);break;case'add-course-note':addCourseNote(b.dataset.id);break;case'add-course-deadline':addCourseDeadline(b.dataset.id);break;case'add-course-material':window.eduTargetCourseId=b.dataset.id;setPage('study');break;case'open-course-material':window.eduOpenCourseMaterial?.(b.dataset.id);break;case'download-course-material':window.eduDownloadCourseMaterial?.(b.dataset.id);break;case'open-course-practice':window.practiceCourseId=b.dataset.id;setPage('practice');break;case'add-course-document':window.eduTargetDocumentCourseId=b.dataset.id;setPage('vault');break;case'open-course-mastery':window.eduMasteryCourse=b.dataset.id;setPage('mastery');break;case'edit-course':addCourse(courseById(b.dataset.id));break;case'delete-course':deleteCourse(b.dataset.id);break;case'add-session':if(currentPage==='today'||currentPage==='habit')selectedDate=todayISO();addEvent(null,'study');break;case'add-class':if(currentPage==='today'||currentPage==='habit')selectedDate=todayISO();addEvent(null,'class');break;case'add-extra-class':addEvent(null,'class','',{oneTime:true});break;case'edit-event':addEvent(data.events.find(x=>x.id===b.dataset.id));break;case'delete-event':deleteEvent(b.dataset.id);break;case'select-date':selectedDate=b.dataset.date;render();break;case'week-back':weekOffset--;selectedDate=addDays(parseISO(selectedDate),-7).toLocaleDateString('en-CA');render();break;case'week-forward':weekOffset++;selectedDate=addDays(parseISO(selectedDate),7).toLocaleDateString('en-CA');render();break;case'complete-event':completeEvent(b.dataset.id,b.dataset.date);break;case'add-resource':addResource();break;case'delete-resource':data.resources=data.resources.filter(x=>x.id!==b.dataset.id);save();toast('Resource removed');break;case'focus-toggle':focusRunning?stopFocus():startFocus();break;case'focus-reset':resetFocus();break;case'save-settings':saveSettings();break;case'toggle-theme':data.profile.theme=data.profile.theme==="dark"?"light":"dark";applyTheme();save();toast(data.profile.theme==="dark"?"Dark mode is on":"Light mode is on");break;case'remove-profile-photo':delete data.profile.avatarData;save();toast('Profile photo removed');break;case'capture-profile-photo':capturePhonePhoto('profile');break;case'enable-notifications':enableNotifications();break;case'disable-notifications':disableNotifications();break;case'export-data':exportData();break;case'clear-data':clearData();break;case'close-modal':closeModal();break;case'start-focus':setPage('habit');startFocus();break;case'filter-resource':document.querySelectorAll('.filter-chip').forEach(x=>x.classList.toggle('active',x===b));const f=b.dataset.filter;document.getElementById('resourceList').innerHTML=resourceMarkup(f==='all'?data.resources:data.resources.filter(x=>x.kind===f));break;}return;}});
document.getElementById('profileButton').addEventListener('click',()=>setPage('profile'));
// Bind the mobile tab bar directly as well as through the global action router.
document.querySelectorAll('.mobile-nav-item[data-page]').forEach(button=>{button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const page=button.dataset.page;if(page)setPage(page);},{capture:true});});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();const row=e.target.closest?.('.agenda-item[role="button"]');if(row&&e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();row.click()}});
window.addEventListener('hashchange',()=>{
  const route=resolveHashRoute(location.hash);
  currentPage=route.page;
  selectedCourseId=route.courseId;
  currentRecallQuestionId=route.recallQuestionId||'';
  if(location.hash&&route.page==='today'&&location.hash!=='#today')history.replaceState(null,'',location.pathname+location.search+'#today');
  if(location.hash.startsWith('#course/')&&route.page==='courses')history.replaceState(null,'',location.pathname+location.search+'#courses');
  render();
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;document.getElementById('installBtn').classList.remove('hidden')});
function profilePhotoSettingsMarkup(){const remove=data.profile.avatarData?'<button type="button" class="text-btn" data-action="remove-profile-photo">Remove photo</button>':'';const preview=data.profile.avatarData?'<img class="profile-photo-preview" src="'+safe(data.profile.avatarData)+'" alt="Current profile photo">':'';return '<div class="setting-row"><div><strong>Profile photo</strong><p>Add a photo to the profile button at the top of Eduvia.</p></div><div class="profile-photo-controls">'+preview+'<label class="secondary-btn profile-photo-picker">Choose image<input id="profilePhotoFile" type="file" accept="image/*"></label><button type="button" class="secondary-btn native-only" data-action="capture-profile-photo">Take a photo</button>'+remove+'</div></div>'}
function updateProfileAvatar(){const button=document.getElementById('profileButton');if(!button)return;if(data.profile.avatarData)button.innerHTML='<img src="'+safe(data.profile.avatarData)+'" alt="">';else{const name=String(data.profile.name||'Learner').trim();button.innerHTML='<span>'+safe(Array.from(name)[0]?.toUpperCase()||'S')+'</span>'}button.title='Open learning profile';button.setAttribute('aria-label','Open learning profile')}
function handleProfilePhoto(file){if(!file)return;if(!file.type.startsWith('image/')){toast('Choose an image file for your profile photo.');return}if(file.size>12000000){toast('Choose an image smaller than 12 MB.');return}const reader=new FileReader();reader.onerror=()=>toast('Could not read that image.');reader.onload=()=>{const image=new Image();image.onerror=()=>toast('Could not open that image.');image.onload=()=>{const scale=Math.min(1,512/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);data.profile.avatarData=canvas.toDataURL('image/jpeg',0.82);save();toast('Profile photo saved on this device')};image.src=String(reader.result)};reader.readAsDataURL(file)}
async function capturePhonePhoto(target){try{const file=await window.EduviaNative?.capturePhoto(target);if(file)routeCapturedPhoto({file,target})}catch(error){if(error?.message!=='User cancelled photos app')toast(error.message||'Eduvia could not open the camera.')}}
window.eduCapturePhonePhoto=capturePhonePhoto;
function routeCapturedPhoto({file,target}){if(!file)return;if(target==='profile'){handleProfilePhoto(file);return}if(target==='document'){if(window.eduSavePersonalDocument)window.eduSavePersonalDocument(file);else toast('The document area is still loading. Try again.');return}if(window.eduHandleStudioFile)window.eduHandleStudioFile(target,file);else toast('The study studio is still loading. Try again.')}
window.addEventListener('eduvia-camera-file',event=>routeCapturedPhoto(event.detail||{}));
window.addEventListener('eduvia-camera-error',event=>toast(event.detail?.message||'Eduvia could not read the photo.'));
document.addEventListener('change',e=>{if(e.target.id==='profilePhotoFile')handleProfilePhoto(e.target.files?.[0])});
function isIosDevice(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function isStandaloneApp(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
if(isIosDevice()&&!isStandaloneApp()){const installButton=document.getElementById('installBtn');installButton.classList.remove('hidden');installButton.addEventListener('click',()=>openModal('Add Eduvia to your Home Screen','Install Eduvia from Safari on your iPhone or iPad.','<ol><li>Open this site in Safari.</li><li>Tap the Share button.</li><li>Choose “Add to Home Screen”, then tap “Add”.</li></ol><p>After installation, enable Eduvia phone notifications in Settings.</p>','Got it',()=>closeModal()))}
document.getElementById('installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;document.getElementById('installBtn').classList.add('hidden')});
window.addEventListener('appinstalled',()=>document.getElementById('installBtn').classList.add('hidden'));
if('serviceWorker'in navigator&&location.protocol!=='file:'&&!window.EduviaNative?.isNative)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').then(()=>{if(pushIsActive())schedulePushSync()}).catch(()=>{}));
scheduleReminder();scheduleEventAlert();schedulePushSync();
