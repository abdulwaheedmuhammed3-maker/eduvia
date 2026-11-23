/* Eduvia learning expansions: Play, Ask, Discover, Wellness and Learning Performance Insights. */
(function(){
  const oldPlay=window.eduPageRenderers?.play;
  const oldMyStudy=window.eduPageRenderers?.['my-study'];
  const oldMore=window.eduPageRenderers?.more;
  const esc=value=>safe(String(value??''));
  const localDate=value=>value instanceof Date?value.getFullYear()+'-'+String(value.getMonth()+1).padStart(2,'0')+'-'+String(value.getDate()).padStart(2,'0'):String(value||'');
  const dateOffset=(date,days)=>localDate(addDays(parseISO(date),days));
  const panel=(title,body,description='')=>'<section class="panel" style="margin:0 0 15px"><div class="panel-head"><div><h3>'+esc(title)+'</h3>'+(description?'<p>'+esc(description)+'</p>':'')+'</div></div>'+body+'</section>';
  const icon=(glyph,tone)=>'<span class="exp-icon exp-icon-'+tone+'">'+glyph+'</span>';
  const dateLabel=value=>formatDate(parseISO(value),{weekday:'short',month:'short',day:'numeric'});
  let playSprint=null;
  let askResult=null;
  let discoverView={category:'',article:'',query:'',savedOnly:false};

  function dueFlashcards(){
    const cards=Array.isArray(data.flashcards)?data.flashcards:[];
    const today=todayISO();
    return cards.filter(card=>card&&String(card.front||'').trim()&&String(card.back||'').trim()&&(!card.nextReview||String(card.nextReview)<=today));
  }
  function updateFlashcardSchedule(card,remembered){
    const steps=[1,3,7,14,30];
    const level=remembered?Math.min(4,(Number(card.level)||0)+1):0;
    card.level=level;
    card.nextReview=dateOffset(todayISO(),remembered?steps[Math.max(0,level-1)]:1);
    card.lastReviewed=Date.now();
  }
  function recallSprintMarkup(){
    const cards=Array.isArray(data.flashcards)?data.flashcards:[];
    const due=dueFlashcards();
    const attempts=Array.isArray(data.playChallengeAttempts)?data.playChallengeAttempts:[];
    const best=attempts.reduce((v,item)=>Math.max(v,Number(item.scorePercent)||0),0);
    let body='';
    if(playSprint){
      const card=playSprint.cards[playSprint.index];
      if(!card){body='<p>Challenge complete.</p>'}
      else{
        body='<div class="exp-play-challenge-head"><span class="eyebrow">CARD '+(playSprint.index+1)+' OF '+playSprint.cards.length+'</span><strong>'+playSprint.answers.filter(item=>item.remembered).length+' remembered</strong></div>'+
          '<div class="exp-play-question">'+esc(card.front)+'</div>'+
          (playSprint.revealed?'<div class="exp-play-answer"><strong>Answer</strong><p>'+esc(card.back)+'</p></div>':'<p class="privacy-note-inline">Think of the answer before revealing it. Be honest with your self-rating.</p>')+
          '<div class="exp-play-actions">'+(playSprint.revealed?'<button class="primary-btn" data-play-rate="remembered">I remembered it</button><button class="secondary-btn" data-play-rate="review">I need to review</button>':'<button class="primary-btn" data-play-reveal="1">Reveal answer</button><button class="secondary-btn" data-play-end="1">End challenge</button>')+'</div>';
      }
    }else{
      body='<p class="exam-intro">A short active-recall game using your own saved flashcards. Rate each answer honestly; cards are rescheduled using the existing spaced-review intervals.</p>'+
        '<div class="stats-row"><div class="stat-card"><div class="stat-label">DUE NOW</div><div class="stat-value">'+due.length+'</div></div><div class="stat-card"><div class="stat-label">ALL CARDS</div><div class="stat-value">'+cards.length+'</div></div><div class="stat-card"><div class="stat-label">BEST SPRINT</div><div class="stat-value">'+best+'%</div></div></div>'+
        (cards.length?'<button class="primary-btn" data-play-start="1">Start 5-card recall sprint ↗</button><p class="privacy-note-inline">'+(due.length?due.length+' due cards will be prioritised.':'No cards are due, so the sprint will use your saved cards.')+' · '+attempts.length+' completed sprint'+(attempts.length===1?'':'s')+'</p>':'<div class="exp-empty exp-empty-action-bottom"><b>Your first challenge starts with a flashcard.</b><p>Create cards from a topic or your saved course notes, then return here for a recall sprint.</p><button class="primary-btn" data-page="flashcards">Create flashcards</button></div>');
    }
    return '<section class="exp-play-challenge"><div class="exp-play-challenge-head"><div><div class="eyebrow">PLAY MODE 01</div><h3>Recall Sprint</h3></div><span class="habit-badge">✦ Active recall</span></div>'+body+'</section>';
  }
  function renderPlay(){
    const base=typeof oldPlay==='function'?oldPlay():'';
    const attempts=Array.isArray(data.playChallengeAttempts)?data.playChallengeAttempts:[];
    const totalRemembered=attempts.reduce((n,item)=>n+Number(item.remembered||0),0);
    const totalRated=attempts.reduce((n,item)=>n+Number(item.total||0),0);
    const cards=Array.isArray(data.flashcards)?data.flashcards:[];
    const due=dueFlashcards().length;
    const tools='<section class="exp-section exp-play-tools"><div class="exp-section-heading"><div><div class="eyebrow">YOUR PLAY TOOLKIT</div><h2>Choose how you want to practise.</h2><p>Each tool connects to your courses, saved materials and revision activity.</p></div></div>'+
      '<div class="learning-expansion-grid">'+
      '<button class="learning-expansion-card" data-page="practice">'+icon('✓','pink')+'<strong>Practice & tests</strong><span>Generate questions from your saved notes and topics.</span><small>Open practice →</small></button>'+
      '<button class="learning-expansion-card" data-page="flashcards">'+icon('▤','blue')+'<strong>Flashcards</strong><span>Review key ideas and schedule spaced recall.</span><small>'+cards.length+' saved · '+due+' due →</small></button>'+
      '<button class="learning-expansion-card" data-page="mastery">'+icon('◎','purple')+'<strong>Topic mastery</strong><span>Track confidence and identify topics to revisit.</span><small>Review your topics →</small></button>'+
      '<button class="learning-expansion-card" data-page="planner">'+icon('◷','orange')+'<strong>Assignments & planner</strong><span>Keep coursework, tests and deadlines visible.</span><small>Open planner →</small></button>'+
      '<button class="learning-expansion-card" data-page="exams">'+icon('🎓','lime')+'<strong>Exam & revision centre</strong><span>Manage exam dates, revision plans and timed mock papers.</span><small>'+(data.exams||[]).length+' exams saved →</small></button>'+
      '</div></section>';
    return base+tools+recallSprintMarkup()+
      panel('Your play record','<div class="stats-row"><div class="stat-card"><div class="stat-label">SPRINTS PLAYED</div><div class="stat-value">'+attempts.length+'</div></div><div class="stat-card"><div class="stat-label">REMEMBERED</div><div class="stat-value">'+totalRemembered+'</div></div><div class="stat-card"><div class="stat-label">CARDS RATED</div><div class="stat-value">'+totalRated+'</div></div></div>'+(attempts.length?'<div class="exp-expansion-list">'+attempts.slice(0,5).map(item=>'<div class="exp-expansion-item"><div><strong>'+Number(item.scorePercent||0)+'% · '+Number(item.remembered||0)+' of '+Number(item.total||0)+' remembered</strong><small>'+esc(new Date(item.completedAt).toLocaleString())+'</small></div></div>').join('')+'</div>':'<p class="privacy-note-inline">Completed recall sprints will appear here.</p>'))+
      '<section class="exp-inline-cta"><div><b>Practise with your own course material.</b><span>Upload notes or slides in Study Studio to create more relevant questions and flashcards.</span></div><button class="primary-btn" data-page="study">Open Study Studio ↗</button></section>';
  }
  function startRecallSprint(){
    const all=Array.isArray(data.flashcards)?data.flashcards.filter(card=>card&&String(card.front||'').trim()&&String(card.back||'').trim()):[];
    const pool=dueFlashcards().length?dueFlashcards():all;
    if(!pool.length){toast('Create at least one flashcard before starting a recall sprint.');return}
    const shuffled=pool.slice().sort(()=>Math.random()-.5);
    playSprint={cards:shuffled.slice(0,Math.min(5,shuffled.length)),index:0,revealed:false,answers:[],startedAt:Date.now()};
    render();
  }
  function rateSprintCard(remembered){
    if(!playSprint)return;
    const card=playSprint.cards[playSprint.index];
    if(!card)return;
    updateFlashcardSchedule(card,remembered);
    playSprint.answers.push({cardId:card.id,remembered:!!remembered});
    playSprint.index++;
    playSprint.revealed=false;
    if(playSprint.index>=playSprint.cards.length){
      const rememberedCount=playSprint.answers.filter(item=>item.remembered).length;
      data.playChallengeAttempts=Array.isArray(data.playChallengeAttempts)?data.playChallengeAttempts:[];
      data.playChallengeAttempts.unshift({id:'play-'+Math.random().toString(36).slice(2,10),remembered:rememberedCount,total:playSprint.cards.length,scorePercent:Math.round(rememberedCount/playSprint.cards.length*100),completedAt:Date.now(),durationSeconds:Math.max(1,Math.round((Date.now()-playSprint.startedAt)/1000)),cardIds:playSprint.answers.map(item=>item.cardId)});
      data.playChallengeAttempts=data.playChallengeAttempts.slice(0,100);
      playSprint=null;
      save();
      toast('Recall sprint completed. Your card review dates have been updated.');
      return;
    }
    save();
  }

  function recentAskHistory(){
    return (Array.isArray(data.askHistory)?data.askHistory:[]).slice(0,6);
  }
  function renderAskResult(){
    if(!askResult)return '';
    if(askResult.missing)return '<section class="exp-ask-result"><div class="eyebrow">MATERIALS NEEDED</div><h3>Add learning materials to get started.</h3><p>'+esc(askResult.message)+'</p><button class="secondary-btn" data-page="study">Add materials in Learning Studio</button></section>';
    if(askResult.noMatch)return '<section class="exp-ask-result"><div class="eyebrow">NO MATCHING PASSAGE</div><h3>Nothing relevant was found.</h3><p>'+esc(askResult.message)+'</p></section>';
    return '<section class="exp-ask-result"><div class="eyebrow">'+(askResult.mode==='summary'?'EXTRACTIVE OVERVIEW':'RETRIEVED SOURCE PASSAGES')+'</div><h3>'+(askResult.mode==='summary'?'Relevant source excerpts':'What your saved materials say')+'</h3><p>'+askResult.rows.length+' matching passages found for: '+esc(askResult.question)+'</p>'+
      askResult.rows.map((row,index)=>'<article class="exp-passage"><span>0'+(index+1)+'</span><div><p>'+esc(row.text||'')+'</p><small>'+esc(row.courseName||'Learning area')+' · '+esc(row.citation||row.source||'Saved course material')+'</small></div></article>').join('')+
      '<p class="exp-source-note">These are retrieved excerpts, not an AI-generated answer. Check the cited page, slide or section in the original material. Search runs on this device; no online AI model is connected.</p><button class="secondary-btn" data-ask-reset="1">Ask another question</button></section>';
  }
  function renderExpandedAsk(){
    const courses=Array.isArray(data.courses)?data.courses:[];
    const history=recentAskHistory();
    const options='<option value="all">All learning areas</option>'+courses.map(course=>'<option value="'+esc(course.id)+'">'+esc((course.code?course.code+' · ':'')+course.name)+'</option>').join('');
    const form=courses.length?
      '<form id="expandedAskForm" class="exp-ask-form"><label class="form-field">Search in<select name="courseId">'+options+'</select></label>'+
      '<label class="form-field">What do you want to understand?<textarea name="question" rows="3" maxlength="500" required placeholder="e.g. Explain the difference between a stack and a queue"></textarea></label>'+
      '<div class="exp-ask-actions"><label class="form-field">Search mode<select name="mode"><option value="question">Find relevant passages</option><option value="summary">Collect passages for an overview</option></select></label><button class="primary-btn">Search my materials ↗</button></div>'+
      '<p class="exp-local-status">Searches uploaded course material stored on this device.</p></form>':
      '<div class="exp-empty"><b>Add a learning area to get started.</b><p>Upload notes or course materials in Learning Studio so Ask Eduvia can search them.</p><button class="primary-btn" data-page="study">Open Learning Studio</button></div>';
    return '<header class="exp-heading"><div><div class="eyebrow">SOURCE-BASED STUDY COMPANION</div><h1>Ask Eduvia</h1><p>Search one learning area or all your saved materials. Every result links back to its source.</p></div></header>'+
      '<section class="exp-ask-hero"><div class="eyebrow">ASK. SEARCH. VERIFY.</div><h2>Find the part<br><em>you need.</em></h2><p>Eduvia retrieves passages from your own materials. It does not invent explanations or present source retrieval as live AI.</p></section>'+
      panel('Ask a question',form,'Choose a scope and search mode.')+
      '<div class="exp-inline-cta exp-ask-prompt-panel"><div class="exp-ask-prompt-intro"><b>Try a useful prompt</b><span>Start with a topic, definition or idea you want to locate.</span></div><div class="exp-ask-prompt-grid">'+['Define a key term','Compare two concepts','Find examples','Collect a topic overview'].map(q=>'<button class="secondary-btn" type="button" data-ask-prompt="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div></div>'+
      renderAskResult()+
      panel('Recent searches',history.length?'<div class="exp-ask-history">'+history.map(item=>'<button type="button" data-ask-repeat="'+esc(item.id)+'"><strong>'+esc(item.question)+'</strong><br><small>'+esc(item.scopeLabel||'Learning areas')+' · '+Number(item.matchCount||0)+' passages · '+esc(new Date(item.completedAt).toLocaleDateString())+'</small></button>').join('')+'</div>':'<p class="privacy-note-inline">Your recent source searches will appear here on this device.</p>');
  }
  async function runExpandedAsk(form){
    const fd=new FormData(form),scope=String(fd.get('courseId')||'all'),question=String(fd.get('question')||'').trim(),mode=String(fd.get('mode')||'question');
    if(!question){toast('Enter a question or topic first.');return}
    const courses=scope==='all'?(data.courses||[]):(data.courses||[]).filter(course=>String(course.id)===scope);
    if(!courses.length){askResult={missing:true,message:'No learning area is available for this search. Add one in Learning Studio.'};render();return}
    const matches=[];
    let searched=0;
    for(const course of courses){
      try{
        const sources=typeof loadCourseText==='function'?await loadCourseText(course.id):[];
        if(!sources.length)continue;
        searched++;
        const rows=window.eduCourseIntelligence?.search(sources,question,mode==='summary'?6:4)||[];
        rows.forEach(row=>matches.push({...row,courseName:course.name}));
      }catch(error){}
    }
    matches.sort((a,b)=>Number(b.score||b.relevance||0)-Number(a.score||a.relevance||0));
    const selected=matches.slice(0,mode==='summary'?8:6);
    askResult=selected.length?{question,mode,rows:selected}:{missing:searched===0,noMatch:searched>0,message:searched===0?'No saved course materials were found in this search scope. Add files in Learning Studio first.':'Try a phrase from your notes, a key term or a different wording. Eduvia only displays matching excerpts.'};
    if(!askResult.missing&&!askResult.noMatch)askResult.question=question;
    data.askHistory=Array.isArray(data.askHistory)?data.askHistory:[];
    data.askHistory.unshift({id:'ask-'+Math.random().toString(36).slice(2,10),question,scope,scopeLabel:scope==='all'?'All learning areas':courses[0].name,mode,matchCount:selected.length,completedAt:Date.now()});
    data.askHistory=data.askHistory.slice(0,20);
    save();
  }

  function expandedDiscoverGuides(){
    const library=Array.isArray(window.eduDiscoverLibrary)?window.eduDiscoverLibrary:[];
    const additions=[
      {cat:'Digital skills',color:'blue',icon:'⌘',title:'Check AI-generated information before using it',keywords:'AI artificial intelligence hallucination fact checking verify output digital literacy',body:['AI tools can produce fluent responses that still contain errors, missing context or invented references. Treat their output as a starting point rather than proof.','Check important claims against original textbooks, official documents or credible publications. Open cited links, confirm dates and compare the claim with its surrounding context.','Try it: choose three claims from an AI response and record the independent source that verifies each one.']},
      {cat:'Digital skills',color:'blue',icon:'⌘',title:'Protect your learning accounts and files',keywords:'password privacy phishing backup cybersecurity account security digital skills',body:['Use unique passwords for important accounts and turn on multi-factor authentication when it is available. Avoid sharing one-time codes or opening unexpected attachments.','Keep a current backup of important notes and learning documents. Before restoring a backup, confirm that it came from a source you trust.','Try it: review the recovery email, security settings and backup location for your most important learning account.']},
      {cat:'Career readiness',color:'purple',icon:'♧',title:'Build a portfolio around real projects',keywords:'portfolio career project evidence skills internship work samples',body:['A useful portfolio shows what you can make, explain or improve. A small completed project with clear evidence is often more convincing than a long list of tools.','For each project, explain the problem, your contribution, the methods or tools you used and what changed as a result. Remove private information before sharing.','Try it: write a short case study for one assignment, personal project or volunteer contribution.']},
      {cat:'Career readiness',color:'purple',icon:'♧',title:'Turn feedback into a practical improvement plan',keywords:'feedback career growth improve reflection application interview',body:['Feedback becomes useful when it is specific and connected to a next action. Separate the observation from your interpretation and ask for an example when something is unclear.','Choose one improvement you can test in your next assignment, project or application. Keep a short note about what changed and what still needs work.','Try it: turn one recent piece of feedback into a small action, a date to review it and evidence that would show progress.']}
    ];
    for(const guide of additions)if(!library.some(item=>item.title===guide.title))library.push(guide);
    return library;
  }
  function discoverReadingMinutes(article){return Math.max(2,Math.ceil(article.body.join(' ').split(/\s+/).filter(Boolean).length/180))}
  function renderDiscoverCard(article){
    const saved=(data.discoverSavedGuides||[]).includes(article.title);
    const read=(data.discoverReadHistory||[]).some(item=>item.title===article.title);
    return '<button class="discover-library-card exp-discover-'+esc(article.color||'blue')+'" data-expand-discover-article="'+esc(article.title)+'"><span class="exp-icon exp-icon-'+esc(article.color||'blue')+'">'+esc(article.icon||'▤')+'</span><b>'+esc(article.title)+'</b><span>'+esc(article.body[0])+'</span><small>'+discoverReadingMinutes(article)+' min read · '+(read?'Read before':'Not read yet')+' →</small></button>'+(saved?'':'');
  }
  function renderExpandedDiscover(){
    const library=expandedDiscoverGuides(),saved=data.discoverSavedGuides||[],read=data.discoverReadHistory||[];
    const cats=[['Learn smarter','pink','Active recall and understanding how you learn.'],['Study smarter','pink','Memory, focus, spaced review and effective study habits.'],['Academic skills','blue','Writing, research and clear communication.'],['Exam preparation','orange','Revision methods and exam readiness.'],['Opportunities','purple','Scholarships, programmes and applications.'],['Digital skills','blue','Digital literacy, AI and safer learning online.'],['Career readiness','purple','Projects, portfolios and professional growth.']];
    const article=discoverView.article?library.find(item=>item.title===discoverView.article):null;
    if(article){
      const isSaved=saved.includes(article.title),isRead=read.some(item=>item.title===article.title);
      const related=library.filter(item=>item.cat===article.cat&&item.title!==article.title).slice(0,3);
      return '<header class="exp-heading"><div><div class="eyebrow">DISCOVER LIBRARY · '+esc(article.cat.toUpperCase())+'</div><h1>'+esc(article.title)+'</h1><p>'+discoverReadingMinutes(article)+' minute guide</p></div></header>'+
        '<button type="button" class="secondary-btn" data-expand-discover-back="1">← Back to Discover</button>'+
        '<article class="exp-discover-article">'+article.body.map(paragraph=>'<p>'+esc(paragraph)+'</p>').join('')+'</article>'+
        '<div class="exp-discover-actions"><button type="button" class="'+(isSaved?'secondary-btn':'primary-btn')+'" data-expand-discover-save="'+esc(article.title)+'">'+(isSaved?'✓ Saved for later':'＋ Save guide')+'</button><button type="button" class="secondary-btn" data-expand-discover-read="'+esc(article.title)+'">'+(isRead?'✓ Marked as read':'Mark as read')+'</button><button type="button" class="secondary-btn" data-page="play">Practise this idea ↗</button></div>'+
        (related.length?panel('Related guides','<div class="exp-discover-grid">'+related.map(renderDiscoverCard).join('')+'</div>'):'');
    }
    let matches=library;
    if(discoverView.category)matches=matches.filter(item=>item.cat===discoverView.category);
    if(discoverView.savedOnly)matches=matches.filter(item=>saved.includes(item.title));
    const query=String(discoverView.query||'').trim().toLowerCase();
    if(query)matches=matches.filter(item=>(item.title+' '+item.cat+' '+item.keywords+' '+item.body.join(' ')).toLowerCase().includes(query));
    const cardList=matches.length?'<div class="exp-discover-grid">'+matches.map(renderDiscoverCard).join('')+'</div>':'<div class="exp-empty"><b>No guides found.</b><p>Try a different keyword or choose another topic.</p></div>';
    const categoryButtons=cats.map(item=>'<button type="button" class="exp-discover-card exp-discover-'+item[1]+'" data-expand-discover-category="'+esc(item[0])+'"><span class="exp-icon">'+(item[0]==='Digital skills'?'⌘':item[0]==='Career readiness'?'♧':'✦')+'</span><b>'+esc(item[0])+'</b><span>'+esc(item[2])+'</span><small>Explore guides →</small></button>').join('');
    return '<header class="exp-heading"><div><div class="eyebrow">STAY CURIOUS</div><h1>Discover</h1><p>Explore useful learning guides, digital skills, exam support and career readiness resources — all inside Eduvia.</p></div></header>'+
      '<section class="exp-discover-hero"><div class="eyebrow">A LIBRARY THAT GROWS WITH YOU</div><h2>Explore.<br><em>Learn. Grow.</em></h2><p>Save guides for later, track what you have read and connect ideas to practice.</p><div class="exp-chips"><span>'+library.length+' guides</span><span>'+saved.length+' saved</span><span>'+read.length+' read</span></div></section>'+
      panel('Explore by interest','<div class="exp-discover-grid">'+categoryButtons+'</div>')+
      '<section class="panel exp-panel"><div class="panel-head"><div><h3>Search the library</h3><p>Filter guides by topic, skill or keyword.</p></div></div><form id="expandedDiscoverSearch" class="exp-search-form"><input type="search" name="query" maxlength="160" value="'+esc(discoverView.query)+'" placeholder="e.g. AI fact-checking, active recall, portfolio"><button class="primary-btn">Search guides</button></form><div class="exp-discover-actions"><button class="secondary-btn" type="button" data-expand-discover-all="1">All guides</button><button class="secondary-btn" type="button" data-expand-discover-saved="1">Saved guides ('+saved.length+')</button>'+(discoverView.category?'<button class="secondary-btn" type="button" data-expand-discover-clear="1">Clear category: '+esc(discoverView.category)+'</button>':'')+'</div></section>'+
      (discoverView.category?'<div class="section-title-row"><h3>'+esc(discoverView.category)+'</h3></div>':'')+
      panel(discoverView.savedOnly?'Saved guides':query?'Search results': 'Recommended guides',cardList);
  }

  function renderWellness(){
    const checkins=Array.isArray(data.wellnessCheckins)?data.wellnessCheckins:[];
    const today=todayISO(),current=checkins.find(item=>item.date===today)||{};
    const days=Array.from({length:7},(_,index)=>dateOffset(today,index-6));
    const minutesByDay=days.map(date=>(studyCompletionsForDate(date)||[]).reduce((sum,item)=>sum+Number(item.minutes||data.profile.sessionMinutes||25),0));
    const max=Math.max(30,...minutesByDay),minutesTotal=minutesByDay.reduce((a,b)=>a+b,0),sessions=minutesByDay.reduce((n,m)=>n+(m>0?1:0),0);
    let guidance='Keep your usual rhythm manageable. Short, focused sessions and planned breaks can make the week easier to sustain.';
    if(current.workload==='heavy')guidance='You marked today as a heavy workload. Choose one priority for your next session and leave room for a proper break.';
    else if(current.energy==='low')guidance='You marked your energy as low. Consider a shorter session, a simpler task or taking a break before continuing.';
    else if(current.mood==='low')guidance='You marked today as a difficult day. Keep expectations realistic and consider reaching out to someone you trust if you need support.';
    const form='<form id="wellnessCheckinForm"><div class="exp-wellness-checkin">'+
      '<label class="form-field">How is your mood today?<select name="mood"><option value="low" '+(current.mood==='low'?'selected':'')+'>Low</option><option value="steady" '+(!current.mood||current.mood==='steady'?'selected':'')+'>Steady</option><option value="good" '+(current.mood==='good'?'selected':'')+'>Good</option><option value="great" '+(current.mood==='great'?'selected':'')+'>Great</option></select></label>'+
      '<label class="form-field">How is your energy?<select name="energy"><option value="low" '+(current.energy==='low'?'selected':'')+'>Low</option><option value="steady" '+(!current.energy||current.energy==='steady'?'selected':'')+'>Steady</option><option value="high" '+(current.energy==='high'?'selected':'')+'>High</option></select></label>'+
      '<label class="form-field">How does your study workload feel?<select name="workload"><option value="light" '+(current.workload==='light'?'selected':'')+'>Light</option><option value="balanced" '+(!current.workload||current.workload==='balanced'?'selected':'')+'>Balanced</option><option value="heavy" '+(current.workload==='heavy'?'selected':'')+'>Heavy</option></select></label>'+
      '<label class="form-field">Optional note<input name="note" maxlength="240" value="'+esc(current.note||'')+'" placeholder="What would make studying easier today?"></label></div>'+
      '<p class="privacy-note-inline">This is a personal study-balance check-in, not a medical or mental-health assessment. Your entry stays in Eduvia on this device.</p><button class="primary-btn">'+(current.date?'Update today’s check-in':'Save today’s check-in')+'</button></form>';
    return pageHead('LEARN AT A SUSTAINABLE PACE','Study Wellness','Notice your study rhythm, workload and energy. Use the check-in to plan a balanced learning week.')+
      '<div class="stats-row"><div class="stat-card"><div class="stat-label">FOCUS TIME · 7 DAYS</div><div class="stat-value">'+Math.floor(minutesTotal/60)+'h '+minutesTotal%60+'m</div></div><div class="stat-card"><div class="stat-label">ACTIVE STUDY DAYS</div><div class="stat-value">'+sessions+'/7</div></div><div class="stat-card"><div class="stat-label">CHECK-INS SAVED</div><div class="stat-value">'+checkins.length+'</div></div></div>'+
      panel('Daily check-in',form)+
      panel('Your study balance this week','<div class="exp-wellness-bars">'+days.map((date,index)=>'<div class="exp-wellness-bar"><span>'+esc(dateLabel(date))+'</span><div class="exp-wellness-bar-track"><i style="width:'+Math.round(minutesByDay[index]/max*100)+'%"></i></div><strong>'+minutesByDay[index]+'m</strong></div>').join('')+'</div>','Focus time recorded from completed study sessions.')+
      '<div class="exp-insight-note"><strong>A gentle next step</strong><br>'+esc(guidance)+'</div>'+
      panel('Recent check-ins',checkins.length?'<div class="exp-expansion-list">'+checkins.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).map(item=>'<div class="exp-expansion-item"><div><strong>'+esc(dateLabel(item.date))+' · '+esc(item.mood||'Not recorded')+' mood · '+esc(item.energy||'')+' energy</strong><small>Workload: '+esc(item.workload||'Not recorded')+(item.note?' · '+esc(item.note):'')+'</small></div></div>').join('')+'</div>':'<p class="privacy-note-inline">Your saved daily check-ins will appear here.</p>');
  }
  function renderInsights(){
    const records=Array.isArray(data.studyRecords)?data.studyRecords:[];
    const quizzes=records.flatMap(record=>(record.quizAttempts||[]).map(attempt=>({...attempt,courseId:record.courseId,courseName:record.courseName||data.courses.find(course=>String(course.id)===String(record.courseId))?.name||'Personal learning',recordTitle:record.title||'Study session'}))).filter(item=>Number(item.total)>0).sort((a,b)=>Number(a.completedAt||0)-Number(b.completedAt||0));
    const percentages=quizzes.map(item=>Math.round(Number(item.score)/Number(item.total)*100));
    const average=percentages.length?Math.round(percentages.reduce((a,b)=>a+b,0)/percentages.length):null;
    const recent=percentages.slice(-5),prior=percentages.slice(-10,-5);
    const recentMean=recent.length?Math.round(recent.reduce((a,b)=>a+b,0)/recent.length):null;
    const priorMean=prior.length?Math.round(prior.reduce((a,b)=>a+b,0)/prior.length):null;
    const mastery=data.topicMastery&&typeof data.topicMastery==='object'?Object.values(data.topicMastery):[];
    const confident=mastery.filter(item=>item.status==='confident').length,learning=mastery.filter(item=>item.status==='learning').length,notStarted=mastery.filter(item=>item.status==='not-started').length;
    const mocks=Array.isArray(data.mockExamAttempts)?data.mockExamAttempts:[];
    const reviewed=mocks.filter(item=>Number.isFinite(Number(item.readinessPercent)));
    const resultRecords=(data.academicHistory||[]).reduce((sum,item)=>sum+Number(item.resultCount||0),0);
    const courseStats=(data.courses||[]).map(course=>{
      const courseRecords=records.filter(record=>String(record.courseId)===String(course.id));
      const courseQuizzes=courseRecords.flatMap(record=>record.quizAttempts||[]).filter(item=>Number(item.total)>0);
      const sessionCount=(data.completed||[]).filter(item=>String(item.courseId||'')===String(course.id)&&(!item.type||item.type==='study')).length;
      const score=courseQuizzes.length?Math.round(courseQuizzes.reduce((sum,item)=>sum+(Number(item.score)/Number(item.total)*100),0)/courseQuizzes.length):null;
      return {name:course.name,sessions:sessionCount,score,quizCount:courseQuizzes.length};
    }).sort((a,b)=>b.sessions-a.sessions||Number(b.score||-1)-Number(a.score||-1));
    const trend=recentMean===null?'Not enough quiz attempts yet':priorMean===null?'More attempts are needed to compare periods':(recentMean>priorMean?'Recent quiz average is up by ':recentMean<priorMean?'Recent quiz average is down by ':'Recent quiz average is unchanged across the two groups of attempts')+(recentMean===priorMean?'':Math.abs(recentMean-priorMean)+' percentage points')+'.';
    const recentRows=quizzes.slice(-6).reverse().map(item=>'<div class="exp-expansion-item"><div><strong>'+esc(item.courseName)+' · '+Math.round(Number(item.score)/Number(item.total)*100)+'%</strong><small>'+Number(item.score)+'/'+Number(item.total)+' · '+esc(new Date(item.completedAt).toLocaleString())+'</small></div></div>').join('');
    return pageHead('YOUR LEARNING DATA','Performance Insights','Understand recorded quiz results, topic confidence and study activity. These insights describe saved activity; they do not predict grades.')+
      '<div class="stats-row"><div class="stat-card"><div class="stat-label">QUIZ AVERAGE</div><div class="stat-value">'+(average===null?'—':average+'%')+'</div><div class="stat-note">'+quizzes.length+' recorded attempts</div></div><div class="stat-card"><div class="stat-label">TOPICS CONFIDENT</div><div class="stat-value">'+confident+'</div><div class="stat-note">'+learning+' still learning</div></div><div class="stat-card"><div class="stat-label">MOCK REVIEWS</div><div class="stat-value">'+reviewed.length+'</div><div class="stat-note">'+mocks.length+' mock papers completed</div></div></div>'+
      '<div class="exp-insight-note"><strong>Recent quiz pattern</strong><br>'+esc(trend)+(recentMean!==null?' Recent five-attempt average: '+recentMean+'%.':'')+'</div>'+
      panel('Topic mastery snapshot','<div class="stats-row"><div class="stat-card"><div class="stat-label">CONFIDENT</div><div class="stat-value">'+confident+'</div></div><div class="stat-card"><div class="stat-label">LEARNING</div><div class="stat-value">'+learning+'</div></div><div class="stat-card"><div class="stat-label">NOT STARTED</div><div class="stat-value">'+notStarted+'</div></div></div><button class="secondary-btn" data-page="mastery">Open topic mastery →</button>')+
      panel('Learning-area activity',courseStats.length?'<div class="exp-insight-bars">'+courseStats.map(item=>'<div class="exp-insight-bar"><span>'+esc(item.name)+'</span><div class="exp-insight-bar-track"><i style="width:'+Math.min(100,item.sessions/Math.max(1,...courseStats.map(x=>x.sessions))*100)+'%"></i></div><strong>'+item.sessions+' sessions</strong></div><div class="privacy-note-inline">'+(item.score===null?'No quiz score recorded':item.score+'% quiz average · '+item.quizCount+' attempts')+'</div>').join('')+'</div>':'<p class="privacy-note-inline">Add learning areas and complete study sessions to build an activity picture.</p>')+
      panel('Recent quiz attempts',recentRows||'<p class="privacy-note-inline">Your study-completion quizzes and retakes will appear here after you complete a personal study session.</p>')+
      panel('Recorded academic results','<p class="privacy-note-inline">'+resultRecords+' subject results are referenced in saved education-history records. Open Education History to review official marks, grades and CGPA records. This dashboard does not estimate or invent grades.</p><button class="secondary-btn" data-page="education">Open Education History →</button>')+
      '<div class="exp-insight-note">Mock-exam readiness uses the self-assessments you recorded after reviewing each paper. Written mock answers are not automatically graded.</div>';
  }

  function saveWellnessCheckin(form){
    const fd=new FormData(form),date=todayISO();
    const record={date,mood:String(fd.get('mood')||'steady'),energy:String(fd.get('energy')||'steady'),workload:String(fd.get('workload')||'balanced'),note:String(fd.get('note')||'').trim(),updatedAt:Date.now()};
    data.wellnessCheckins=Array.isArray(data.wellnessCheckins)?data.wellnessCheckins:[];
    const existing=data.wellnessCheckins.find(item=>item.date===date);
    if(existing)Object.assign(existing,record);else data.wellnessCheckins.unshift(record);
    data.wellnessCheckins.sort((a,b)=>b.date.localeCompare(a.date));
    data.wellnessCheckins=data.wellnessCheckins.slice(0,90);
    save();
    toast('Study wellness check-in saved on this device.');
  }

  function updateMyStudyLinks(){
    const buttons='<section class="exp-section"><div class="exp-section-heading"><div><div class="eyebrow">BALANCE AND INSIGHT</div><h2>Learn well. See your progress.</h2></div></div><div class="learning-expansion-grid">'+
      '<button class="learning-expansion-card" data-page="wellness">'+icon('♡','lime')+'<strong>Study Wellness</strong><span>Check in with your mood, energy and workload. Review your weekly study balance.</span><small>Open wellness →</small></button>'+
      '<button class="learning-expansion-card" data-page="insights">'+icon('↗','purple')+'<strong>Performance Insights</strong><span>Review quiz patterns, topic confidence and activity across learning areas.</span><small>View insights →</small></button></div></section>';
    return typeof oldMyStudy==='function'?oldMyStudy()+buttons:buttons;
  }
  function updateMoreLinks(){
    return typeof oldMore==='function'?oldMore():'';
  }

  document.addEventListener('submit',async event=>{
    if(event.target.id==='expandedAskForm'){event.preventDefault();await runExpandedAsk(event.target);return}
    if(event.target.id==='expandedDiscoverSearch'){event.preventDefault();discoverView.query=String(new FormData(event.target).get('query')||'').trim();discoverView.category='';discoverView.savedOnly=false;render();return}
    if(event.target.id==='wellnessCheckinForm'){event.preventDefault();saveWellnessCheckin(event.target)}
  });
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:event.target?.parentElement;
    if(!target)return;
    if(target.closest('[data-play-start]')){startRecallSprint();return}
    if(target.closest('[data-play-reveal]')){if(playSprint){playSprint.revealed=true;render()}return}
    const rating=target.closest('[data-play-rate]');
    if(rating){rateSprintCard(rating.dataset.playRate==='remembered');return}
    if(target.closest('[data-play-end]')){playSprint=null;render();return}
    const prompt=target.closest('[data-ask-prompt]');
    if(prompt){const field=document.querySelector('#expandedAskForm textarea[name="question"]');if(field){field.value=prompt.dataset.askPrompt==='Define a key term'?'Find the definition of a key term in my notes.':prompt.dataset.askPrompt==='Compare two concepts'?'Compare two concepts from my materials.':prompt.dataset.askPrompt==='Find examples'?'Find examples of this topic in my materials.':'Collect an overview of this topic from my notes.';field.focus()}return}
    const repeat=target.closest('[data-ask-repeat]');
    if(repeat){const item=(data.askHistory||[]).find(row=>row.id===repeat.dataset.askRepeat);const form=document.getElementById('expandedAskForm');if(item&&form){form.elements.courseId.value=item.scope||'all';form.elements.mode.value=item.mode||'question';form.elements.question.value=item.question;form.requestSubmit()}return}
    if(target.closest('[data-ask-reset]')){askResult=null;render();return}
    const category=target.closest('[data-expand-discover-category]');
    if(category){discoverView.category=category.dataset.expandDiscoverCategory;discoverView.article='';discoverView.savedOnly=false;discoverView.query='';render();return}
    const article=target.closest('[data-expand-discover-article]');
    if(article){discoverView.article=article.dataset.expandDiscoverArticle;render();return}
    if(target.closest('[data-expand-discover-back]')){discoverView.article='';render();return}
    if(target.closest('[data-expand-discover-all]')){discoverView={category:'',article:'',query:'',savedOnly:false};render();return}
    if(target.closest('[data-expand-discover-saved]')){discoverView={category:'',article:'',query:'',savedOnly:true};render();return}
    if(target.closest('[data-expand-discover-clear]')){discoverView.category='';render();return}
    const saveGuide=target.closest('[data-expand-discover-save]');
    if(saveGuide){const title=saveGuide.dataset.expandDiscoverSave;data.discoverSavedGuides=Array.isArray(data.discoverSavedGuides)?data.discoverSavedGuides:[];data.discoverSavedGuides=data.discoverSavedGuides.includes(title)?data.discoverSavedGuides.filter(item=>item!==title):[title].concat(data.discoverSavedGuides);save();return}
    const readGuide=target.closest('[data-expand-discover-read]');
    if(readGuide){const title=readGuide.dataset.expandDiscoverRead;data.discoverReadHistory=Array.isArray(data.discoverReadHistory)?data.discoverReadHistory:[];const old=data.discoverReadHistory.find(item=>item.title===title);if(old)old.readAt=Date.now();else data.discoverReadHistory.unshift({title,readAt:Date.now()});save();toast('Guide marked as read.');return}
  });
  const previousSyncNav=window.syncNav;
  if(typeof previousSyncNav==='function'){
    window.syncNav=function(){
      previousSyncNav();
      if(currentPage==='wellness'||currentPage==='insights'){
        document.querySelectorAll('[data-nav-key="my-study"]').forEach(item=>item.classList.add('active'));
        document.querySelectorAll('[data-utility-nav]').forEach(item=>item.classList.remove('active'));
        const crumb=document.getElementById('crumbCurrent');
        if(crumb)crumb.textContent=currentPage==='wellness'?'Study Wellness':'Performance Insights';
      }
    };
  }
  window.eduPageRenderers=Object.assign(window.eduPageRenderers||{},{
    play:renderPlay,
    ask:renderExpandedAsk,
    discover:renderExpandedDiscover,
    wellness:renderWellness,
    insights:renderInsights,
    'my-study':updateMyStudyLinks,
    more:updateMoreLinks
  });
  if(typeof render==='function')render();
})();