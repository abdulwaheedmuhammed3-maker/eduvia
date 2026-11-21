(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.EduviaRoadmapCore=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_TITLE=100,MAX_DESCRIPTION=600,MAX_MILESTONES=80;
  function validDate(value){
    const text=String(value||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return false;
    const date=new Date(text+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===text;
  }
  function normalizeMilestone(item,index=0){
    if(typeof item==='string')item={title:item};
    if(!item||typeof item!=='object'||Array.isArray(item))return null;
    const title=String(item.title||'').trim().slice(0,MAX_TITLE);
    if(!title)return null;
    const dueDate=validDate(item.dueDate)?String(item.dueDate):'';
    return {
      id:String(item.id||('milestone-'+index)).slice(0,80),
      title,
      dueDate,
      completed:item.completed===true,
      completedAt:item.completedAt?String(item.completedAt).slice(0,40):''
    };
  }
  function normalizeRoadmap(item,index=0){
    if(!item||typeof item!=='object'||Array.isArray(item))return null;
    const title=String(item.title||'').trim().slice(0,MAX_TITLE);
    if(!title)return null;
    const milestones=(Array.isArray(item.milestones)?item.milestones:[])
      .slice(0,MAX_MILESTONES).map(normalizeMilestone).filter(Boolean);
    const done=milestones.length>0&&milestones.every(m=>m.completed);
    return {
      id:String(item.id||('roadmap-'+index)).slice(0,80),
      title,
      description:String(item.description||'').trim().slice(0,MAX_DESCRIPTION),
      category:String(item.category||'Personal goal').trim().slice(0,50)||'Personal goal',
      courseId:String(item.courseId||'').slice(0,80),
      targetDate:validDate(item.targetDate)?String(item.targetDate):'',
      status:done?'completed':(item.status==='completed'?'completed':'active'),
      milestones,
      createdAt:Number.isFinite(Number(item.createdAt))?Number(item.createdAt):Date.now(),
      updatedAt:Number.isFinite(Number(item.updatedAt))?Number(item.updatedAt):Date.now()
    };
  }
  function progress(roadmap){
    const milestones=Array.isArray(roadmap?.milestones)?roadmap.milestones:[];
    const completed=milestones.filter(item=>item&&item.completed===true).length;
    return {total:milestones.length,completed,percent:milestones.length?Math.round(completed/milestones.length*100):0};
  }
  function roadmapStatus(roadmap,today){
    if(roadmap?.status==='completed')return 'completed';
    if(roadmap?.targetDate&&validDate(roadmap.targetDate)&&validDate(today)&&roadmap.targetDate<today)return 'overdue';
    return 'active';
  }
  return {MAX_TITLE,MAX_DESCRIPTION,MAX_MILESTONES,validDate,normalizeMilestone,normalizeRoadmap,progress,roadmapStatus};
});
