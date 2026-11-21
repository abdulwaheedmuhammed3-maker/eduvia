(function(){
let askResult=null,askCourse='',discoverSearchQuery='';
const ic=(s,t='purple')=>'<span class="exp-icon exp-icon-'+t+'">'+s+'</span>';
const hd=(k,t,d)=>'<header class="exp-heading"><div><div class="eyebrow">'+k+'</div><h1>'+t+'</h1><p>'+d+'</p></div></header>';
const tile=(p,t,s,n,d,m='')=>'<button class="exp-tile exp-tile-'+t+'" data-page="'+p+'"><span class="exp-tile-top">'+ic(s,t)+'<b>↗</b></span><strong>'+n+'</strong><span>'+d+'</span>'+(m?'<small>'+m+'</small>':'')+'</button>';
const search=q=>{const w=window.open('https://www.google.com/search?q='+encodeURIComponent(q),'_blank');if(w)w.opener=null;else toast('Allow pop-ups for Eduvia to open this search.')};
function home(){
 const p=data.profile||{},h=new Date().getHours(),w=getWeekStats(),g=Math.max(1,+p.weeklyGoal||5),pct=Math.min(100,Math.round(w.total/g*100)),day=todayISO(),events=dayEvents(day),cs=data.courses.slice(0,3),sal=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
 return '<div class="exp-home"><header class="exp-home-heading"><div><div class="eyebrow">YOUR LEARNING SPACE</div><h1>'+sal+', '+safe(p.name||'Student')+' 👋</h1><p>Ready to make a little progress today?</p></div><button class="exp-profile" data-page="profile">'+safe((p.name||'S').trim()[0].toUpperCase())+'</button></header>'+
 '<section class="exp-hero"><div><span class="exp-hero-kicker">PLAN · LEARN · PRACTISE · EXCEL</span><h2>Your semester.<br><em>Your pace.</em></h2><p>One calm space for your courses, schedule, study habits and academic progress.</p><div class="exp-hero-actions"><button class="exp-hero-primary" data-page="my-study">Open My Study ↗</button><button class="exp-hero-secondary" data-page="play">Try a quick challenge</button></div></div><div class="exp-hero-art">✦<b>STUDY<br>YOUR WAY</b><i>✳</i></div></section>'+
 '<section class="exp-section"><div class="exp-section-heading"><div><div class="eyebrow">PICK YOUR NEXT MOVE</div><h2>Jump right in.</h2></div></div><div class="exp-tile-grid">'+tile('my-study','pink','▣','My Study','Courses, classes and academic records',data.courses.length+' courses')+tile('discover','blue','⌕','Discover','Study ideas, resources and opportunities','Explore your learning')+tile('play','lime','◇','Play & learn','Practise with questions and flashcards','Learn by doing')+tile('ask','purple','✧','Ask Eduvia','Find relevant passages in your saved notes','Local study helper')+'</div></section>'+
 '<section class="exp-week-card"><div><div class="eyebrow">YOUR WEEKLY RHYTHM</div><h2>'+w.total+' of '+g+' study sessions</h2><p>'+(pct>=100?'You reached your weekly goal.':(g-w.total)+' more sessions to reach your goal.')+'</p></div><strong>'+pct+'%</strong><div class="exp-progress"><i style="width:'+pct+'%"></i></div><div class="exp-week-foot"><span>🔥 '+streakCount()+' day streak</span><span>'+studyCompletionsForDate(day).length+' sessions today</span><button class="text-btn" data-page="habit">View habit ↗</button></div></section>'+
 '<div class="exp-two-column"><section class="panel exp-panel"><div class="panel-head"><div><h3>Today’s plan</h3><p>'+formatDate(parseISO(day),{weekday:'long',month:'long',day:'numeric'})+'</p></div><button class="panel-link" data-page="timetable">Full schedule ↗</button></div>'+(events.length?'<div class="agenda-list">'+events.slice(0,4).map(e=>agendaMarkup(e,day)).join('')+'</div>':'<div class="exp-empty"><b>Your day is open.</b><p>Add a class or plan a study session.</p><button class="secondary-btn" data-action="add-session">＋ Plan a session</button></div>')+'</section>'+
 '<section class="panel exp-panel"><div class="panel-head"><div><h3>Continue learning</h3><p>Your courses at a glance</p></div><button class="panel-link" data-page="courses">All courses ↗</button></div>'+(cs.length?'<div class="exp-course-list">'+cs.map(c=>'<a class="exp-course-row" href="#course/'+encodeURIComponent(c.id)+'"><i style="--course-color:'+safe(c.color||'#655ee0')+'"></i><span><b>'+safe(c.name)+'</b><small>'+safe(c.code||'COURSE')+'</small></span><strong>↗</strong></a>').join('')+'</div>':'<div class="exp-empty"><b>Your courses start here.</b><p>Add your subjects in My Study.</p><button class="secondary-btn" data-page="courses">View courses</button></div>')+'</section></div></div>';
}
const discoverLibrary=[
 {cat:'Study smarter',color:'pink',icon:'✳',title:'Active recall: test yourself, don’t just reread',keywords:'memory recall quiz self test retrieval',body:['Active recall means trying to bring an idea back from memory before looking at the answer. It is more effortful than rereading, and that effort helps reveal what you actually know.','After studying a section, close the material and write or say the key ideas. Then reopen it, check what you missed and correct your understanding.','Try it: turn each heading in your notes into a question. Answer without looking, then check your notes.']},
 {cat:'Study smarter',color:'pink',icon:'✳',title:'Spaced repetition: revisit topics over time',keywords:'memory revision review schedule spaced repetition',body:['Spacing means reviewing information across several sessions rather than cramming it all at once.','A simple schedule is to review soon after learning, then again a day later, several days later and the following week. Adjust the intervals when material is difficult.','Try it: use Eduvia Study Habit to plan short review sessions and Play to test yourself.']},
 {cat:'Study smarter',color:'pink',icon:'✳',title:'How to take useful lecture notes',keywords:'notes note taking lecture organise',body:['Notes are most useful when they help you reconstruct an idea, not when they copy every sentence.','During class, capture concepts, examples, questions and connections. After class, rewrite confusing points as questions and add a short summary in your own words.','Try it: leave space beside your notes for questions and a few lines at the bottom for a summary.']},
 {cat:'Study smarter',color:'pink',icon:'✳',title:'Build a focused 25-minute study session',keywords:'focus concentration pomodoro time distractions',body:['Choose one clearly defined task. A task such as “understand linked lists and answer five questions” is more actionable than “study computer science.”','Put distractions away, work for 25 minutes, then take a short break. If 25 minutes is not suitable, adjust the duration.','Try it: finish the session by writing the next small step so restarting is easier.']},
 {cat:'Academic skills',color:'blue',icon:'▤',title:'Structure a strong academic paragraph',keywords:'writing essay paragraph thesis argument',body:['A focused paragraph usually makes one main claim, supports it with evidence, explains the evidence and links it back to the argument.','Use a topic sentence to state the point. Provide a source, example or data. Explain why that evidence supports your point instead of leaving the reader to infer the connection.','Try it: highlight the claim, evidence and explanation in three different colours while revising.']},
 {cat:'Academic skills',color:'blue',icon:'▤',title:'How to research a topic responsibly',keywords:'research source evidence search credibility',body:['Start by narrowing your question. Broad topics often produce scattered reading and weak arguments.','Prefer sources that identify their author, publication date, evidence and references. Compare important claims across more than one credible source.','Try it: keep a source log with the title, author, date, key claim and why you trust the source.']},
 {cat:'Academic skills',color:'blue',icon:'▤',title:'Avoid plagiarism and cite your sources',keywords:'citation referencing plagiarism paraphrase academic integrity',body:['Citing acknowledges the source of ideas, facts, quotations or methods you use. Requirements differ by institution and citation style.','Take notes in your own words and keep quotation marks around exact wording. Record bibliographic details when you first use a source so you do not have to reconstruct them later.','Try it: check your department’s preferred citation style and apply it consistently.']},
 {cat:'Academic skills',color:'blue',icon:'▤',title:'Make presentations clearer and more confident',keywords:'presentation speaking slides public',body:['A good presentation has one clear purpose, an understandable structure and slides that support rather than replace the speaker.','Organise the talk around a few main points. Use readable text and visuals that clarify your explanation. Practise aloud and time yourself.','Try it: rehearse without reading your slides word-for-word.']},
 {cat:'Exam preparation',color:'orange',icon:'✦',title:'Create a realistic exam revision plan',keywords:'exam schedule timetable revision planning',body:['Start by listing exam dates, topics and how confident you feel about each topic. Give more time to topics that are important and difficult.','Break revision into small tasks, alternate subjects when possible and leave room for practice and rest.','Try it: schedule specific tasks such as “solve three past questions on arrays” instead of vague revision blocks.']},
 {cat:'Exam preparation',color:'orange',icon:'✦',title:'Use past questions effectively',keywords:'past paper practice exam test questions',body:['Past questions help you practise the format, identify gaps and learn to apply knowledge under time constraints.','Attempt questions before checking solutions. Mark errors by type: misunderstanding, recall gap, calculation, interpretation or time management.','Try it: revisit the questions you missed after a few days and attempt them again from scratch.']},
 {cat:'Exam preparation',color:'orange',icon:'✦',title:'Manage exam time and answer strategically',keywords:'time management examination exam strategy',body:['Read the instructions and scan the paper to understand the sections and point values.','Allocate time proportionately to marks. If stuck, make a note and move on rather than spending too long on one question. Reserve time to review your work.','Try it: practise using the same time allocation you expect on exam day.']},
 {cat:'Exam preparation',color:'orange',icon:'✦',title:'Prepare calmly the day before an exam',keywords:'stress sleep anxiety preparation exam day',body:['The day before an exam is better used for light review, organising materials and protecting sleep than for an all-night cram.','Review your summary sheets, check logistics and plan when to leave. Take breaks and avoid comparing your preparation with others.','Try it: pack what you need and set a realistic bedtime.']},
 {cat:'Opportunities',color:'purple',icon:'♧',title:'Prepare a scholarship application checklist',keywords:'scholarship funding application documents',body:['Scholarship requirements vary. Read the official eligibility and application instructions carefully before preparing documents.','Common requirements can include academic records, identification, essays, references and proof of eligibility, but not every programme asks for all of these.','Try it: create a deadline list and prepare reusable documents early. Verify details on the official scholarship website.']},
 {cat:'Opportunities',color:'purple',icon:'♧',title:'Build a student CV for internships',keywords:'internship cv resume student experience',body:['A student CV can highlight education, projects, skills, volunteering, leadership and relevant experience even when formal employment history is limited.','Use concise bullet points that describe what you did and the result. Tailor the CV to the role and be truthful about your skills.','Try it: add one academic or personal project with the problem, tools used and outcome.']},
 {cat:'Opportunities',color:'purple',icon:'♧',title:'Find and evaluate student programmes',keywords:'competition fellowship programme opportunity student',body:['Student programmes may include competitions, fellowships, workshops, internships or community initiatives. Eligibility, costs and deadlines vary.','Check the organiser, official application site, requirements, deadline, expected commitment and whether any fee is legitimate. Be cautious of requests for sensitive information or guaranteed selection.','Try it: maintain a shortlist with the official link, eligibility, deadline and documents required.']},
 {cat:'Opportunities',color:'purple',icon:'♧',title:'Write a strong motivation statement',keywords:'motivation letter application scholarship personal statement',body:['A motivation statement should explain why you are applying, what experience or perspective you bring and how the opportunity fits your goals.','Use specific examples rather than general claims. Keep the statement focused on the criteria and proofread it before submission.','Try it: draft a paragraph for each question—why this programme, why you and what you hope to contribute.']}
];
let discoverCategory='',discoverArticle=null;
function discover(){
 const cats=[['pink','✳','Study smarter','Active recall, spaced repetition, note-taking and focus.'],['blue','▤','Academic skills','Writing, research, referencing and presentations.'],['orange','✦','Exam preparation','Revision plans, past questions and exam strategies.'],['purple','♧','Opportunities','Scholarships, internships and student programmes.']];
 const categoryHtml=(cat)=>discoverLibrary.filter(a=>a.cat===cat).map(a=>'<button class="discover-library-card exp-discover-'+a.color+'" data-discover-article="'+safe(a.title)+'"><span class="exp-icon exp-icon-'+a.color+'">'+a.icon+'</span><b>'+safe(a.title)+'</b><span>'+safe(a.body[0])+'</span><small>Read guide →</small></button>').join('');
 const article=discoverArticle&&discoverLibrary.find(a=>a.title===discoverArticle);
 if(article)return hd('EDUVIA LEARNING LIBRARY',article.cat,article.title)+
 '<button class="secondary-btn" data-discover-back="category">← Back to '+safe(article.cat)+'</button><article class="discover-article"><h2>'+safe(article.title)+'</h2>'+article.body.map(p=>'<p>'+safe(p)+'</p>').join('')+'</article><section class="exp-inline-cta"><div><b>Ready to practise?</b><span>Apply this idea to your own courses and materials.</span></div><button class="primary-btn" data-page="play">Open Play ↗</button></section>';
 if(discoverCategory)return hd('EDUVIA LEARNING LIBRARY',discoverCategory,'Practical guides and learning resources, right inside Eduvia.')+
 '<button class="secondary-btn" data-discover-back="all">← All Discover topics</button><section class="exp-section"><div class="exp-discover-grid">'+categoryHtml(discoverCategory)+'</div></section>';
 const query=discoverSearchQuery.trim().toLowerCase(),results=query?discoverLibrary.filter(a=>(a.title+' '+a.cat+' '+a.keywords+' '+a.body.join(' ')).toLowerCase().includes(query)):[];
 return hd('STAY CURIOUS','Discover','Explore practical learning guides and student resources without leaving Eduvia.')+
 '<section class="exp-discover-hero"><div class="eyebrow">A LITTLE MORE CURIOUS</div><h2>Explore.<br><em>Learn. Grow.</em></h2><p>Useful study methods, academic skills, exam guidance and student opportunities in one built-in learning library.</p><div class="exp-chips"><span>Study smarter</span><span>Learn independently</span><span>Grow academically</span></div></section>'+
 '<section class="exp-section"><div class="exp-section-heading"><div><div class="eyebrow">EXPLORE BY INTEREST</div><h2>What would you like to learn?</h2></div></div><div class="exp-discover-grid">'+cats.map(c=>'<button class="exp-discover-card exp-discover-'+c[0]+'" data-discover-category="'+safe(c[2])+'">'+ic(c[1],c[0])+'<b>'+safe(c[2])+'</b><span>'+safe(c[3])+'</span><small>Open learning guides →</small></button>').join('')+'</div></section>'+
 '<section class="panel exp-panel" id="discoverResourceSearch"><div class="panel-head"><div><h3>Search the Eduvia library</h3><p>Find guides by topic, skill or keyword — results stay inside Eduvia.</p></div></div><form id="discoverSearchForm" class="exp-search-form"><input id="discoverQuery" type="search" maxlength="180" value="'+safe(discoverSearchQuery)+'" placeholder="e.g. active recall, citations, past questions"><button class="primary-btn">Search library</button></form>'+(query?'<button class="text-btn" data-discover-clear="1">Clear search</button><div class="exp-discover-grid">'+(results.length?results.map(a=>'<button class="discover-library-card exp-discover-'+a.color+'" data-discover-article="'+safe(a.title)+'"><span class="exp-icon exp-icon-'+a.color+'">'+a.icon+'</span><b>'+safe(a.title)+'</b><span>'+safe(a.cat)+'</span><small>Read guide →</small></button>').join(''):'<div class="exp-empty"><b>No matching guide yet.</b><p>Try a different keyword.</p></div>')+'</div>':'')+'</section>'+
 '<section class="exp-section"><div class="exp-section-heading"><div><div class="eyebrow">EDUVIA STUDY LIBRARY</div><h2>Start with a guide.</h2></div></div><div class="exp-discover-grid">'+discoverLibrary.slice(0,6).map(a=>'<button class="discover-library-card exp-discover-'+a.color+'" data-discover-article="'+safe(a.title)+'"><span class="exp-icon exp-icon-'+a.color+'">'+a.icon+'</span><b>'+safe(a.title)+'</b><span>'+safe(a.cat)+'</span><small>Read guide →</small></button>').join('')+'</div></section>'+
 '<section class="exp-inline-cta"><div><b>Learn with your own course material.</b><span>Study guides are a starting point. Bring your notes into Eduvia for personal practice.</span></div><button class="primary-btn" data-page="study">Open Study Studio ↗</button></section>';
}
function play(){
 const due=(data.flashcards||[]).filter(c=>!c.nextReview||c.nextReview<=todayISO()).length;
 return hd('NO GRADES. NO PRESSURE.','Play & learn','Short challenges, practice sets and recall tools to help you learn actively.')+
 '<section class="exp-play-hero"><div><div class="eyebrow">LEARN BY DOING</div><h2>Play a little.<br><em>Know a lot.</em></h2><p>Turn your course topics and saved materials into questions you can practise.</p><button class="exp-play-cta" data-page="practice">Start practising ↗</button></div><div class="exp-play-art">◇<i>✳</i><b>?</b></div></section>'+
 '<section class="exp-tool-grid">'+
 '<button class="exp-tool-card exp-tool-pink" data-page="practice">'+ic('✓','pink')+'<b>Practice & tests</b><span>Generate questions from courses and notes.</span><small>Open practice ↗</small></button>'+
 '<button class="exp-tool-card exp-tool-lime" data-page="flashcards">'+ic('▤','lime')+'<b>Flashcards</b><span>Review key ideas and schedule recall.</span><small>'+(data.flashcards||[]).length+' saved · '+due+' due ↗</small></button>'+
 '<button class="exp-tool-card exp-tool-purple" data-page="mastery">'+ic('◎','purple')+'<b>Topic mastery</b><span>Track topics you are learning and know confidently.</span><small>Check progress ↗</small></button>'+
 '<button class="exp-tool-card exp-tool-blue" data-page="planner">'+ic('◷','blue')+'<b>Deadlines & planner</b><span>Keep assignments, tests and revision milestones visible.</span><small>Open planner ↗</small></button>'+
 '<button class="exp-tool-card exp-tool-orange" data-page="more">'+ic('🎓','orange')+'<b>Exam centre</b><span>Exam dates, revision plans and mock examinations.</span><small>'+(data.exams||[]).length+' exams saved ↗</small></button></section>'+
 '<section class="exp-inline-cta"><div><b>Practise with your own course material.</b><span>Upload notes or slides in Study Studio first.</span></div><button class="primary-btn" data-page="study">Open Study Studio ↗</button></section>';
}
function myStudy(){
 const p=data.profile||{},w=getWeekStats();
 return hd('YOUR ACADEMIC HEADQUARTERS','My Study','Your courses, classes, study routine and academic records — all in one organised space.')+
 '<section class="exp-my-study-hero"><div class="eyebrow">YOUR ACADEMIC SPACE</div><h2>Everything about<br><em>your education.</em></h2><p>'+safe([p.institution,p.programme,p.level?p.level+' level':'',p.semester].filter(Boolean).join(' · ')||'Your learning profile and academic tools in one place.')+'</p><span>✦</span></section>'+
 '<section class="exp-section"><div class="exp-section-heading"><div><div class="eyebrow">YOUR DAILY TOOLS</div><h2>Organise your learning.</h2></div></div><div class="exp-tile-grid exp-my-study-grid">'+
 tile('courses','pink','▣','My Courses','Subjects, topics, credits and course materials',data.courses.length+' courses')+
 tile('timetable','blue','◷','My Schedule','Lectures, classes and study sessions',data.events.length+' scheduled items')+
 tile('habit','lime','◎','Study Habit','Focus sessions, weekly goals and consistency',w.total+' sessions this week')+
 tile('study','purple','✧','Study Studio','Import course forms, notes and timetables','Build a personal study plan')+'</div></section>'+
 '<section class="exp-section"><div class="exp-section-heading"><div><div class="eyebrow">YOUR ACADEMIC RECORD</div><h2>Track your progress.</h2></div></div><div class="exp-academic-grid">'+
 '<button data-page="progress">'+ic('↗')+'<b>Academic progress</b><small>Study sessions, focus time and weekly growth</small></button>'+
 '<button data-page="education">'+ic('▤','pink')+'<b>Results & CGPA</b><small>Semester results and academic history</small></button>'+
 '<button data-page="records">'+ic('▣','blue')+'<b>Session records</b><small>'+(data.studyRecords||[]).length+' saved class and study records</small></button>'+
 '<button data-page="more">'+ic('🎓','orange')+'<b>Examination centre</b><small>Exam dates, revision plans and mock examinations</small></button>'+
 '<button data-page="vault">'+ic('▧','lime')+'<b>Personal documents</b><small>Keep transcripts and useful files together</small></button>'+
 '<button data-page="profile">'+ic('♙')+'<b>Student profile</b><small>Update institution and academic details</small></button>'+
 '<button data-page="settings">'+ic('⚙','purple')+'<b>Settings & appearance</b><small>System, light or dark mode; reminders and backups</small></button></div></section>'+
 '<section class="exp-inline-cta"><div><b>Keep your academic journey together.</b><span>Your results, semester history and carryover rules remain in your existing records.</span></div><button class="primary-btn" data-page="education">Open academic history ↗</button></section>';
}
function askResultHtml(){
 if(!askResult)return '';
 if(askResult.missing)return '<section class="exp-ask-result"><div class="eyebrow">SOURCE NEEDED</div><h3>Add course notes to get started.</h3><p>'+askResult.message+'</p><button class="secondary-btn" data-page="study">Add material in Study Studio</button></section>';
 if(askResult.noMatch)return '<section class="exp-ask-result"><div class="eyebrow">NO MATCHING PASSAGE</div><h3>Nothing relevant was found in the selected material.</h3><p>'+safe(askResult.message)+'</p><button class="secondary-btn" data-page="study">Review uploaded materials</button></section>';
 return '<section class="exp-ask-result"><div class="eyebrow">'+(askResult.mode==='summary'?'EXTRACTIVE OVERVIEW · SOURCE PASSAGES':'RETRIEVED SOURCE PASSAGES')+'</div><h3>'+(askResult.mode==='summary'?'Relevant passages for your overview':'What your saved notes say')+'</h3><p>'+safe(askResult.course)+' · '+askResult.rows.length+' passages retrieved</p>'+askResult.rows.map((p,i)=>'<article class="exp-passage"><span>0'+(i+1)+'</span><div><p>'+safe(p.text)+'</p><small>'+safe(p.citation||p.source||'Saved course material')+'</small></div></article>').join('')+'<p class="exp-source-note">These are retrieved excerpts, not a generated AI answer. Use the source name and page, slide or section reference to check the original material. Eduvia currently processes and searches these files on this device; no online AI model is connected.</p><button class="secondary-btn" data-ask-clear="1">Ask another question</button></section>';
}
function ask(){
 const cs=data.courses||[],selected=askCourse||cs[0]?.id||'',mats=(data.materials||[]).filter(m=>String(m.courseId||'')===String(selected)||!m.courseId);
 return hd('QUESTIONS ARE WELCOME HERE','Ask Eduvia','Retrieve cited passages from your uploaded course material, or collect relevant excerpts for an extractive overview.')+
 '<section class="exp-ask-hero"><div class="eyebrow">YOUR PERSONAL STUDY HELPER</div><h2>Ask without<br><em>the awkward.</em></h2><p>Choose a course and search its indexed notes. Eduvia returns matching excerpts with page, slide or section references. This is source retrieval, not a live AI-generated answer.</p></section>'+
 '<section class="panel exp-panel"><div class="panel-head"><div><h3>What are you working on?</h3><p>Choose a course to search its saved learning materials.</p></div></div>'+
 (cs.length?'<form id="askEduviaForm" class="exp-ask-form"><label class="form-field">Course<select name="courseId">'+cs.map(c=>'<option value="'+safe(c.id)+'" '+(String(c.id)===String(selected)?'selected':'')+'>'+safe((c.code?c.code+' · ':'')+c.name)+'</option>').join('')+'</select></label><label class="form-field">What do you want help with?<textarea name="question" rows="3" maxlength="500" required placeholder="e.g. Where do my notes explain normalisation?"></textarea></label><div class="exp-ask-actions"><label class="form-field">Study helper<select name="mode"><option value="question">Find relevant passages</option><option value="summary">Collect passages for an overview</option></select></label><button class="primary-btn">Search my notes ↗</button></div><p class="exp-local-status">'+mats.length+' saved materials available, including unlinked files.</p></form>':'<div class="exp-empty"><b>Add a course to get started.</b><p>Upload learning materials after setting up a course.</p><button class="primary-btn" data-page="courses">Add a course</button></div>')+'</section>'+askResultHtml()+
 '<section class="exp-inline-cta"><div><b>Need a study guide or practice questions?</b><span>Use your saved materials with the existing study tools.</span></div><button class="secondary-btn" data-page="play">Explore Play & learn ↗</button></section>';
}
const stop=new Set('about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves'.split(' '));
function sentenceList(txt){return String(txt||'').replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>35&&s.length<700)}
document.addEventListener('submit',async e=>{
 if(e.target.id==='discoverSearchForm'){e.preventDefault();discoverSearchQuery=document.getElementById('discoverQuery')?.value.trim()||'';discoverCategory='';discoverArticle=null;render();return}
 if(e.target.id!=='askEduviaForm')return;e.preventDefault();
 const fd=new FormData(e.target),id=String(fd.get('courseId')||''),course=data.courses.find(c=>String(c.id)===id),question=String(fd.get('question')||'').trim(),mode=String(fd.get('mode')||'question');
 if(!course||!question){toast('Choose a course and enter a question or topic.');return}
 askCourse=course.id;let sources=[];
 try{if(typeof loadCourseText==='function')sources=await loadCourseText(course.id)}catch{toast('Could not open saved course materials.');return}
 if(!sources.length){askResult={missing:true,message:'No course materials are linked to this course yet. Upload lecture notes, slides or a textbook in Study Studio first.'};render();return}
 const rows=window.eduCourseIntelligence?.search(sources,question,mode==='summary'?6:4)||[];
 askResult=rows.length?{course:course.name,mode,rows}:{course:course.name,mode,noMatch:true,message:'Try the exact topic name, a key term from the lecture or a different wording. Eduvia only shows passages that match the uploaded material; it will not invent an answer.'};
 render();
});
/* Handle mobile navigation and Discover cards in the capture phase.
   This keeps taps from being swallowed by other delegated page handlers. */
document.addEventListener('click',e=>{
 const target=e.target instanceof Element?e.target:e.target?.parentElement;
 if(!target)return;

 const nav=target.closest('.mobile-nav-item[data-page]');
 if(nav){
  const page=String(nav.dataset.page||'');
  if(page){
   e.preventDefault();
   e.stopPropagation();
   if(page!==currentPage)setPage(page);
  }
  return;
 }

 const cat=target.closest('[data-discover-category]');
 if(cat){
  e.preventDefault();
  e.stopPropagation();
  discoverCategory=cat.dataset.discoverCategory||'';
  discoverArticle=null;
  discoverSearchQuery='';
  render();
  return;
 }

 const art=target.closest('[data-discover-article]');
 if(art){
  const title=String(art.dataset.discoverArticle||'');
  if(discoverLibrary.some(item=>item.title===title)){
   e.preventDefault();
   e.stopPropagation();
   discoverArticle=title;
   render();
  }
  return;
 }

 const back=target.closest('[data-discover-back]');
 if(back){
  e.preventDefault();
  e.stopPropagation();
  discoverArticle=null;
  if(back.dataset.discoverBack==='all')discoverCategory='';
  render();
  return;
 }

 if(target.closest('[data-discover-clear]')){
  e.preventDefault();
  e.stopPropagation();
  discoverSearchQuery='';
  render();
  return;
 }

 if(target.closest('[data-ask-clear]')){
  e.preventDefault();
  e.stopPropagation();
  askResult=null;
  render();
 }
},true);
window.eduPageRenderers=Object.assign(window.eduPageRenderers||{},{today:home,discover,play,ask,'my-study':myStudy});
if(typeof window.render==='function')window.render();
})();