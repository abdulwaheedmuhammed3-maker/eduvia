/* Eduvia personal learning roadmaps. Roadmaps group milestones around an outcome. */
(() => {
  const core=window.EduviaRoadmapCore;
  if(!core)throw new Error('Eduvia roadmap core is unavailable.');
  data.roadmaps=(Array.isArray(data.roadmaps)?data.roadmaps:[])
    .map((item,index)=>core.normalizeRoadmap(item,index)).filter(Boolean);
  const uid=()=> 'roadmap-'+Math.random().toString(36).slice(2,11);
  const safeText=value=>safe(String(value??''));
  const today=()=>todayISO();
  const categories=['Academic','Career','Professional skill','Personal skill','Exam preparation','Creative project','Personal interest','Other'];
  function courseOptions(selected=''){
    return '<option value="">No learning area linked</option>'+(data.courses||[]).map(course=>'<option value="'+safeText(course.id)+'" '+(String(course.id)===String(selected)?'selected':'')+'>'+safeText(course.name)+'</option>').join('');
  }
  function dateLabel(value){
    if(!core.validDate(value))return '';
    return new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value+'T00:00:00'));
  }
  function categoryOptions(selected='Personal skill'){
    const options=selected&&!categories.includes(selected)?[selected,...categories]:categories;
    return options.map(category=>'<option value="'+safeText(category)+'" '+(category===selected?'selected':'')+'>'+safeText(category)+'</option>').join('');
  }
  function openRoadmapEditor(roadmap=null){
    const editing=Boolean(roadmap);
    const item=roadmap||{title:'',description:'',category:'Personal skill',courseId:'',targetDate:''};
    const body=
      '<label class="form-field">What do you want to achieve?<input name="title" maxlength="100" required value="'+safeText(item.title)+'" placeholder="e.g. Become confident with Python"></label>'+
      '<label class="form-field">Why does this matter? <span class="roadmap-optional">Optional</span><textarea name="description" rows="3" maxlength="600" placeholder="Describe the result you want to reach">'+safeText(item.description)+'</textarea></label>'+
      '<div class="roadmap-form-grid"><label class="form-field">Goal type<select name="category">'+categoryOptions(item.category)+'</select></label>'+
      '<label class="form-field">Target date <span class="roadmap-optional">Optional</span><input name="targetDate" type="date" value="'+safeText(item.targetDate)+'"></label></div>'+
      '<label class="form-field">Connect a learning area <span class="roadmap-optional">Optional</span><select name="courseId">'+courseOptions(item.courseId)+'</select></label>'+
      '<p class="roadmap-form-note">Add clear milestones after saving. Your roadmap stays private on this device.</p>';
    openModal(editing?'Edit learning roadmap':'Create a learning roadmap',editing?'Update the outcome and target date.':'Start with one meaningful outcome. You can add milestones next.',body,editing?'Save changes':'Create roadmap',fd=>{
      const title=String(fd.get('title')||'').trim();
      if(!title){toast('Add a goal before saving.');return}
      const targetDate=String(fd.get('targetDate')||'');
      if(targetDate&&!core.validDate(targetDate)){toast('Choose a valid target date.');return}
      const values={title,description:String(fd.get('description')||'').trim(),category:String(fd.get('category')||'Personal skill'),courseId:String(fd.get('courseId')||''),targetDate};
      if(editing){
        Object.assign(roadmap,values,{updatedAt:Date.now()});
        if(roadmap.status==='completed'&&roadmap.milestones.some(m=>!m.completed))roadmap.status='active';
      }else{
        data.roadmaps.unshift(core.normalizeRoadmap({...values,id:uid(),status:'active',milestones:[],createdAt:Date.now(),updatedAt:Date.now()}));
      }
      closeModal();save();toast(editing?'Roadmap updated.':'Your roadmap is ready. Add the first milestone.');
    });
  }
  function openMilestoneEditor(roadmap){
    const body=
      '<label class="form-field">Milestone<input name="title" maxlength="100" required placeholder="e.g. Build a small practice project"></label>'+
      '<label class="form-field">Target date <span class="roadmap-optional">Optional</span><input name="dueDate" type="date"></label>'+
      '<p class="roadmap-form-note">Keep milestones specific and small enough to complete.</p>';
    openModal('Add a milestone','Break your goal into a clear next step.',body,'Add milestone',fd=>{
      const title=String(fd.get('title')||'').trim(),dueDate=String(fd.get('dueDate')||'');
      if(!title){toast('Enter a milestone name.');return}
      if(dueDate&&!core.validDate(dueDate)){toast('Choose a valid milestone date.');return}
      roadmap.milestones.push({id:uid(),title,dueDate,completed:false,completedAt:''});
      roadmap.status='active';roadmap.updatedAt=Date.now();
      closeModal();save();toast('Milestone added.');
    });
  }
  function renderMilestone(roadmap,milestone){
    const due=milestone.dueDate?'<small class="roadmap-milestone-date">'+safeText(dateLabel(milestone.dueDate))+'</small>':'';
    const cards=core.cardsForMilestone(data.flashcards,roadmap.id,milestone.id);
    const dueCards=core.dueCards(cards,today());
    const reviewAction=cards.length?'<button type="button" class="roadmap-review-btn" data-roadmap-action="review-cards" data-roadmap-id="'+safeText(roadmap.id)+'" data-milestone-id="'+safeText(milestone.id)+'">Review cards · '+dueCards.length+' due</button>':'';
    return '<li class="roadmap-milestone '+(milestone.completed?'is-complete':'')+'">'+
      '<button type="button" class="roadmap-check" data-roadmap-action="toggle-milestone" data-roadmap-id="'+safeText(roadmap.id)+'" data-milestone-id="'+safeText(milestone.id)+'" aria-label="'+(milestone.completed?'Mark milestone incomplete':'Mark milestone complete')+'" aria-pressed="'+(milestone.completed?'true':'false')+'">'+(milestone.completed?'✓':'')+'</button>'+
      '<span class="roadmap-milestone-copy"><strong>'+safeText(milestone.title)+'</strong>'+due+'</span>'+
      '<button type="button" class="roadmap-remove-milestone" data-roadmap-action="delete-milestone" data-roadmap-id="'+safeText(roadmap.id)+'" data-milestone-id="'+safeText(milestone.id)+'" aria-label="Remove milestone">×</button>'+
      '<div class="roadmap-milestone-revision"><span>'+cards.length+' revision card'+(cards.length===1?'':'s')+(dueCards.length?' · '+dueCards.length+' due':'')+'</span><div><button type="button" class="roadmap-create-cards-btn" data-roadmap-action="create-cards" data-roadmap-id="'+safeText(roadmap.id)+'" data-milestone-id="'+safeText(milestone.id)+'">＋ '+(cards.length?'Add cards':'Create revision cards')+'</button>'+reviewAction+'</div></div></li>';
  }
function renderRoadmap(roadmap){
    const counts=core.progress(roadmap);
    const course=(data.courses||[]).find(item=>String(item.id)===String(roadmap.courseId));
    const status=core.roadmapStatus(roadmap,today());
    const target=roadmap.targetDate?'<span class="roadmap-meta-item">Target · '+safeText(dateLabel(roadmap.targetDate))+'</span>':'<span class="roadmap-meta-item">No target date</span>';
    const courseLabel=course?'<span class="roadmap-meta-item">'+safeText(course.name)+'</span>':'';
    const milestones=roadmap.milestones.length?'<ul class="roadmap-milestone-list">'+roadmap.milestones.map(item=>renderMilestone(roadmap,item)).join('')+'</ul>':'<div class="roadmap-no-milestones"><strong>Your first milestone starts here.</strong><span>Break this goal into a few practical steps.</span></div>';
    const statusLabel=status==='completed'?'Completed':status==='overdue'?'Past target date':'In progress';
    return '<article class="roadmap-card '+(status==='completed'?'is-completed':'')+'">'+
      '<div class="roadmap-card-head"><div><span class="roadmap-category">'+safeText(roadmap.category)+'</span><h2>'+safeText(roadmap.title)+'</h2></div><span class="roadmap-status roadmap-status-'+status+'">'+statusLabel+'</span></div>'+
      (roadmap.description?'<p class="roadmap-description">'+safeText(roadmap.description)+'</p>':'')+
      '<div class="roadmap-meta">'+target+courseLabel+'</div>'+
      '<div class="roadmap-progress-head"><span>Milestone progress</span><strong>'+counts.completed+' / '+counts.total+' · '+counts.percent+'%</strong></div>'+
      '<div class="roadmap-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+counts.percent+'" aria-label="Roadmap progress"><i style="width:'+counts.percent+'%"></i></div>'+
      milestones+
      '<div class="roadmap-card-actions"><button type="button" class="roadmap-add-btn" data-roadmap-action="add-milestone" data-roadmap-id="'+safeText(roadmap.id)+'">＋ Add milestone</button><button type="button" class="roadmap-quiet-btn" data-roadmap-action="edit" data-roadmap-id="'+safeText(roadmap.id)+'">Edit goal</button><button type="button" class="roadmap-quiet-btn roadmap-delete-btn" data-roadmap-action="delete" data-roadmap-id="'+safeText(roadmap.id)+'">Delete</button></div>'+
      '</article>';
  }
  function renderRoadmaps(){
    const active=data.roadmaps.filter(item=>core.roadmapStatus(item,today())!=='completed');
    const completed=data.roadmaps.filter(item=>core.roadmapStatus(item,today())==='completed');
    const milestoneCount=data.roadmaps.reduce((sum,item)=>sum+item.milestones.length,0);
    const doneCount=data.roadmaps.reduce((sum,item)=>sum+core.progress(item).completed,0);
    const cards=active.concat(completed).map(renderRoadmap).join('');
    return '<header class="roadmap-page-head"><div><span class="eyebrow">YOUR DIRECTION</span><h1>Learning roadmaps</h1><p>Turn a learning ambition into clear milestones you can complete one step at a time.</p></div><button type="button" class="primary-btn" data-roadmap-action="create">＋ New roadmap</button></header>'+
      '<section class="roadmap-overview"><div><span>ACTIVE GOALS</span><strong>'+active.length+'</strong></div><div><span>MILESTONES COMPLETED</span><strong>'+doneCount+' / '+milestoneCount+'</strong></div><div><span>ROADMAPS COMPLETED</span><strong>'+completed.length+'</strong></div></section>'+
      '<div class="roadmap-section-head"><div><span class="eyebrow">YOUR PLAN</span><h2>What you’re working toward</h2></div><span class="roadmap-private-note">Private on this device</span></div>'+
      (cards?'<div class="roadmap-list">'+cards+'</div>':'<section class="roadmap-empty"><div class="roadmap-empty-mark">↗</div><h2>Start with one clear outcome.</h2><p>A roadmap could be learning a new skill, preparing for an exam, completing a project or exploring a subject deeply.</p><button type="button" class="primary-btn" data-roadmap-action="create">Create your first roadmap</button></section>')+
      '<p class="roadmap-storage-note">Roadmaps are saved with your local Eduvia data. Include them in your regular Eduvia backup when moving to another device.</p>';
  }
  function findRoadmap(id){return data.roadmaps.find(item=>String(item.id)===String(id))}
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-roadmap-action]');
    if(!button)return;
    const action=button.dataset.roadmapAction,roadmap=findRoadmap(button.dataset.roadmapId);
    if(action==='create'){openRoadmapEditor();return}
    if(action==='back-to-roadmap'){setPage('roadmaps');return}
    if(action==='clear-flashcard-context'){window.eduRoadmapFlashcardContext=null;render();return}
    if(action==='edit'){if(roadmap)openRoadmapEditor(roadmap);return}
    if(action==='add-milestone'){if(roadmap)openMilestoneEditor(roadmap);return}
    if((action==='create-cards'||action==='review-cards')&&roadmap){
      const milestone=roadmap.milestones.find(item=>String(item.id)===String(button.dataset.milestoneId));
      if(!milestone)return;
      window.eduRoadmapFlashcardContext={roadmapId:roadmap.id,milestoneId:milestone.id,roadmapTitle:roadmap.title,milestoneTitle:milestone.title,courseId:roadmap.courseId||'',intent:action==='create-cards'?'create':'review'};
      setPage('flashcards');return;
    }
    if(action==='delete'){
      if(!roadmap)return;
      if(!confirm('Delete “'+roadmap.title+'” and all its milestones?'))return;
      data.flashcards.forEach(card=>{if(String(card.roadmapId||'')===String(roadmap.id)){delete card.roadmapId;delete card.milestoneId}});
      data.roadmaps=data.roadmaps.filter(item=>item.id!==roadmap.id);save();toast('Roadmap deleted. Its flashcards were kept in your general review list.');return;
    }
    if(action==='toggle-milestone'&&roadmap){
      const milestone=roadmap.milestones.find(item=>String(item.id)===String(button.dataset.milestoneId));
      if(!milestone)return;
      milestone.completed=!milestone.completed;milestone.completedAt=milestone.completed?new Date().toISOString():'';
      const allDone=roadmap.milestones.length>0&&roadmap.milestones.every(item=>item.completed);
      roadmap.status=allDone?'completed':'active';roadmap.updatedAt=Date.now();save();
      toast(allDone?'Roadmap completed. Well done.':milestone.completed?'Milestone completed.':'Milestone reopened.');return;
    }
    if(action==='delete-milestone'&&roadmap){
      data.flashcards.forEach(card=>{if(String(card.roadmapId||'')===String(roadmap.id)&&String(card.milestoneId||'')===String(button.dataset.milestoneId)){delete card.roadmapId;delete card.milestoneId}});
      roadmap.milestones=roadmap.milestones.filter(item=>String(item.id)!==String(button.dataset.milestoneId));
      if(roadmap.status==='completed')roadmap.status='active';
      roadmap.updatedAt=Date.now();save();toast('Milestone removed.');
    }
  });
  const previousSyncNav=window.syncNav;
  if(typeof previousSyncNav==='function'){
    window.syncNav=function(){
      previousSyncNav();
      if(currentPage!=='roadmaps')return;
      document.querySelectorAll('.nav-item[data-page]').forEach(item=>item.classList.toggle('active',item.dataset.page==='more'));
      document.querySelectorAll('.mobile-nav-item[data-page]').forEach(item=>item.classList.toggle('active',item.dataset.page==='my-study'));
      const crumb=document.getElementById('crumbCurrent');if(crumb)crumb.textContent='Learning roadmaps';
    };
  }
  window.eduPageRenderers=Object.assign(window.eduPageRenderers||{},{roadmaps:renderRoadmaps});
  const previousMyStudy=window.eduPageRenderers?.['my-study'];
  if(typeof previousMyStudy==='function'){
    window.eduPageRenderers['my-study']=function(){
      return previousMyStudy()+
        '<section class="roadmap-entry-strip"><div class="roadmap-entry-symbol">↗</div><div><strong>Learning roadmaps</strong><span>Set a bigger goal and break it into milestones.</span></div><button type="button" data-page="roadmaps">Open roadmaps →</button></section>';
    };
  }

  if(typeof render==='function')render();
})();
