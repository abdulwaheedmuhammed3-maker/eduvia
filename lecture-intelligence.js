/* Eduvia Recorded Lecture Intelligence
 * Extracts key statements from user-supplied transcripts and OCR-readable lecture materials.
 * Processing is local to the learner's browser. This module does not claim to transcribe audio/video
 * or retrieve private Google Drive files without an authorised Google integration.
 */
(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const STOP=new Set(('a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves lecture class today topic topics important also like get got make made use used using used this that these those there their them have has had were was are can could may might must shall should would etc'.split(/\s+/));
  const TERM_RE=/[\p{L}\p{N}]{2,}/gu;

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function cleanTranscript(value){
    return String(value||'').replace(/\r/g,'').split('\n').filter(line=>{
      const trimmed=line.trim();
      if(!trimmed)return true;
      if(/^WEBVTT(?:\s|$)/i.test(trimmed))return false;
      if(/^\d{1,5}$/.test(trimmed))return false;
      if(/^\d{2}:\d{2}(?::\d{2})?[.,]\d{3}\s+-->\s+\d{2}:\d{2}(?::\d{2})?[.,]\d{3}/.test(trimmed))return false;
      if(/^(NOTE|STYLE|REGION)(?:\s|$)/.test(trimmed))return false;
      return true;
    }).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }
  function markersFromLine(line,current){
    const page=line.match(/^\s*\[PAGE\s*:?\s*([^\]]+)\]\s*$/i);
    const slide=line.match(/^\s*\[SLIDE\s*:?\s*([^\]]+)\]\s*$/i);
    const source=line.match(/^\s*\[SOURCE\s*:?\s*([^\]]+)\]\s*$/i);
    const section=line.match(/^\s*\[SECTION\s*:?\s*([^\]]+)\]\s*$/i);
    if(page)return {...current,page:page[1].trim(),slide:''};
    if(slide)return {...current,slide:slide[1].trim(),page:''};
    if(source)return {...current,source:source[1].trim(),page:'',slide:''};
    if(section)return {...current,section:section[1].trim()};
    return null;
  }
  function tokens(value){
    return (String(value||'').toLocaleLowerCase().match(TERM_RE)||[]).filter(token=>!STOP.has(token)&&token.length>2&&!/^\d+$/.test(token));
  }
  function sentencesFromTranscript(value){
    const text=cleanTranscript(value);
    const output=[];
    let location={page:'',slide:'',source:'',section:''};
    for(const rawLine of text.split('\n')){
      const line=rawLine.trim();
      if(!line)continue;
      const marker=markersFromLine(line,location);
      if(marker){location=marker;continue}
      const split=line.match(/[^.!?]+[.!?]?/g)||[line];
      for(const piece of split){
        const sentence=piece.replace(/\s+/g,' ').trim();
        const words=tokens(sentence);
        if(words.length<7||sentence.length<42)continue;
        if(/^(speaker|unknown speaker|participant)\s*\d*\s*:/i.test(sentence))continue;
        output.push({text:sentence,words,position:output.length,page:location.page||'',slide:location.slide||'',source:location.source||'',section:location.section||''});
      }
    }
    return output;
  }
  function sentenceSimilarity(a,b){
    const left=new Set(a.words),right=new Set(b.words);
    let overlap=0;
    for(const word of left)if(right.has(word))overlap++;
    return overlap/Math.max(1,Math.min(left.size,right.size));
  }
  function locationLabel(item){
    const parts=[];
    if(item.page)parts.push('Page '+item.page);
    if(item.slide)parts.push('Slide '+item.slide);
    if(item.section)parts.push(item.section);
    if(item.source)parts.push(item.source);
    return parts.join(' · ')||'Lecture transcript';
  }
  function summarizeLecture(value,limit=6){
    const sentences=sentencesFromTranscript(value);
    if(!sentences.length)return {keyPoints:[],topics:[],sentenceCount:0,characterCount:String(value||'').length};
    const frequencies=new Map();
    sentences.forEach(item=>item.words.forEach(word=>frequencies.set(word,(frequencies.get(word)||0)+1)));
    const candidates=sentences.map(item=>{
      const unique=[...new Set(item.words)];
      const salience=unique.reduce((sum,word)=>sum+Math.log1p(frequencies.get(word)||1),0)/Math.sqrt(Math.max(1,item.words.length));
      const lengthBonus=item.words.length>=10&&item.words.length<=28?0.35:0;
      const sectionBonus=item.section?0.25:0;
      return {...item,score:salience+lengthBonus+sectionBonus};
    }).sort((a,b)=>b.score-a.score||a.position-b.position);
    const chosen=[];
    const max=Math.max(1,Math.min(8,Math.floor(Number(limit)||6)));
    for(const candidate of candidates){
      if(chosen.some(item=>sentenceSimilarity(item,candidate)>.72))continue;
      chosen.push(candidate);
      if(chosen.length>=max)break;
    }
    chosen.sort((a,b)=>a.position-b.position);
    const topics=[...frequencies.entries()].filter(([,count])=>count>=2).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([term])=>term);
    return {
      keyPoints:chosen.map((item,index)=>({id:index+1,text:item.text,location:locationLabel(item),page:item.page||null,slide:item.slide||null,source:item.source||'',section:item.section||''})),
      topics,sentenceCount:sentences.length,characterCount:String(value||'').length
    };
  }
  function validateGoogleSource(value){
    const raw=String(value||'').trim();
    if(!raw)return '';
    let url;
    try{url=new URL(raw)}catch{throw new Error('Enter a complete Google Drive, Docs or Meet link beginning with https://.')}
    const host=url.hostname.toLowerCase();
    const allowed=['drive.google.com','docs.google.com','meet.google.com','calendar.google.com'];
    if(url.protocol!=='https:'||!allowed.some(domain=>host===domain||host.endsWith('.'+domain))){
      throw new Error('For now, the source-reference field accepts Google Drive, Docs, Meet or Calendar links only.');
    }
    return url.href;
  }

  root.eduLectureIntelligenceCore={cleanTranscript,sentencesFromTranscript,summarizeLecture,validateGoogleSource,locationLabel};

  if(typeof document==='undefined')return;

  function toast(message){if(typeof root.toast==='function')root.toast(message);else console.info(message)}
  function openModal(title,subtitle,body,submitText,onSubmit){
    if(typeof root.openModal==='function'){root.openModal(title,subtitle,body,submitText,onSubmit);return}
    toast('Eduvia could not open the lecture window. Refresh and try again.');
  }
  function newId(){
    try{return crypto.randomUUID()}catch{return 'lecture-'+Date.now()+'-'+Math.random().toString(36).slice(2,10)}
  }
  function todayIso(){return new Date().toLocaleDateString('en-CA')}
  function formatDate(value){
    if(!value)return 'Date not set';
    const date=new Date(value+'T12:00:00');
    return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric'}).format(date);
  }
  function sourceLinkMarkup(value){
    if(!value)return '';
    const safe=escapeHtml(value);
    return '<a class="lecture-source-link" href="'+safe+'" target="_blank" rel="noopener noreferrer">Open saved Google source ↗</a>';
  }
  function renderCourseSection(courseId,providedRecords){
    const records=Array.isArray(providedRecords)?providedRecords:(root.eduLectureMaterials?.list(courseId)||[]);
    const cards=records.map(record=>{
      const count=Array.isArray(record.keyPoints)?record.keyPoints.length:0;
      const attachments=Array.isArray(record.attachments)?record.attachments.length:0;
      return '<article class="lecture-record-card"><div class="lecture-record-mark" aria-hidden="true">▤</div><div class="lecture-record-copy"><strong>'+escapeHtml(record.name||'Recorded lecture')+'</strong><span>'+escapeHtml(formatDate(record.lectureDate))+' · '+count+' key points · '+attachments+' source file'+(attachments===1?'':'s')+'</span>'+(record.sourceUrl?sourceLinkMarkup(record.sourceUrl):'')+'</div><div class="lecture-record-actions"><button type="button" class="secondary-btn" data-lecture-action="open" data-id="'+escapeHtml(record.id)+'">View notes</button><button type="button" class="icon-btn" title="Remove lecture" aria-label="Remove '+escapeHtml(record.name||'lecture')+'" data-lecture-action="delete" data-id="'+escapeHtml(record.id)+'">×</button></div></article>';
    }).join('');
    return '<div class="lecture-intelligence"><div class="lecture-intelligence-intro"><div><strong>Lecture-to-notes workspace</strong><p>Import a transcript, slides, scanned pages or screenshots. Eduvia reads the text and pulls out major statements with page or slide references.</p></div><button type="button" class="primary-btn" data-lecture-action="import" data-course-id="'+escapeHtml(courseId)+'">＋ Import lecture</button></div>'+(records.length?'<div class="lecture-record-list">'+cards+'</div>':'<p class="privacy-note-inline">No recorded lectures saved for this course yet.</p>')+'<p class="lecture-local-note">Files are processed and saved on this device. Images and scanned PDFs use the existing OCR reader. Google links are saved as references only; direct Drive import and automatic audio/video transcription need authorised services that are not configured yet.</p></div>';
  }
  function importDialog(courseId){
    const body='<div class="form-field full"><label for="lectureTitle">Lecture title</label><input id="lectureTitle" name="lectureTitle" maxlength="120" required placeholder="e.g. CSC 301 — Database Normalisation"></div>'+
      '<div class="form-grid"><div class="form-field"><label for="lectureDate">Class date</label><input id="lectureDate" name="lectureDate" type="date" value="'+todayIso()+'"></div><div class="form-field"><label for="lectureSource">Google Drive / Meet link (optional)</label><input id="lectureSource" name="lectureSource" type="url" placeholder="https://drive.google.com/..."></div></div>'+
      '<div class="form-field full"><label for="lectureFiles">Transcript, lecture slides or images</label><input id="lectureFiles" name="lectureFiles" type="file" multiple required accept=".txt,.md,.vtt,.srt,.pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp,text/plain,application/pdf,image/*"><small>Choose a Meet transcript (.docx, .txt, .vtt or .srt), PDF, PowerPoint, screenshots or photos. Up to 12 files; 40 MB per file.</small></div>'+
      '<div class="lecture-import-explainer"><strong>What Eduvia can process now</strong><p>Transcripts are read directly. PDF pages, PowerPoint slides, scanned pages and uploaded images are scanned for text. The key points are selected from the source text and linked to their page, slide or file.</p><p><strong>Google link limitation:</strong> the link is kept as a reference; Eduvia cannot yet download a private recording directly. Do not enter your Google account password here. For now, upload the transcript or slides from that recording.</p><p>Audio/video transcription and deeper AI rewriting will be enabled after the secure Google and AI services are configured.</p></div>'+
      '<p id="lectureImportProgress" class="lecture-import-progress" role="status" aria-live="polite"></p>';
    openModal('Import a recorded lecture','Create course notes from a transcript, slides and scanned images',body,'Read and create notes',async formData=>{
      const title=String(formData.get('lectureTitle')||'').trim();
      const lectureDate=String(formData.get('lectureDate')||'');
      let sourceUrl='';
      const rawSource=String(formData.get('lectureSource')||'').trim();
      try{sourceUrl=validateGoogleSource(rawSource)}catch(error){toast(error.message);return}
      const files=Array.from(formData.getAll('lectureFiles')||[]).filter(file=>file&&file.name&&Number(file.size)>0);
      if(!files.length){toast('Choose a transcript, PDF, PowerPoint or image file.');return}
      if(files.length>12){toast('Choose no more than 12 files for one lecture.');return}
      const total=files.reduce((sum,file)=>sum+(Number(file.size)||0),0);
      if(total>100*1024*1024){toast('The selected files exceed 100 MB in total. Split the lecture into smaller parts.');return}
      if(!title){toast('Enter a title for this lecture.');return}
      const submit=document.querySelector('#activeForm button[type="submit"]');
      if(submit)submit.disabled=true;
      const progress=document.getElementById('lectureImportProgress');
      const texts=[],attachments=[];
      try{
        for(let index=0;index<files.length;index++){
          const file=files[index];
          if(progress)progress.textContent='Reading '+file.name+' ('+(index+1)+' of '+files.length+')…';
          if(typeof root.eduExtractLectureAsset!=='function')throw new Error('The document reader is not ready. Refresh Eduvia and try again.');
          const extracted=await root.eduExtractLectureAsset(file);
          const cleaned=cleanTranscript(extracted);
          if(!cleaned)throw new Error('No readable text was found in '+file.name+'. Try a clearer image or a transcript export.');
          texts.push('[SOURCE: '+file.name.replace(/[\r\n\]]/g,' ').slice(0,180)+']\n'+cleaned);
          attachments.push({name:file.name,type:file.type||file.name.split('.').pop().toLowerCase(),size:Number(file.size)||0,characters:cleaned.length});
        }
        const text=texts.join('\n\n');
        const result=summarizeLecture(text,6);
        if(!result.keyPoints.length)throw new Error('Eduvia could read the files but did not find enough complete statements to select reliable key points. Try a fuller transcript or clearer slide images.');
        if(progress)progress.textContent='Saving lecture notes on this device…';
        const record={
          id:newId(),name:title,courseId:String(courseId||''),lectureDate,sourceUrl,
          text,keyPoints:result.keyPoints,topics:result.topics,attachments,
          createdAt:Date.now(),sentenceCount:result.sentenceCount,
          method:'extractive-local-v1'
        };
        if(!root.eduLectureMaterials?.save)throw new Error('The local lecture storage is not ready. Refresh Eduvia and try again.');
        await root.eduLectureMaterials.save(record);
        if(typeof root.render==='function')root.render();
        openLecture(record);
        toast('Lecture notes saved on this device.');
      }catch(error){
        toast(error?.message||'Could not process this lecture.');
        if(submit)submit.disabled=false;
        if(progress)progress.textContent='';
      }
    });
  }
  function notesMarkdown(record){
    const lines=['# '+String(record.name||'Recorded lecture'),'','**Class date:** '+formatDate(record.lectureDate),'**Saved:** '+new Date(record.createdAt||Date.now()).toLocaleString(),''];
    if(record.sourceUrl)lines.push('**Google source:** '+record.sourceUrl,'');
    lines.push('## Major points');
    (record.keyPoints||[]).forEach((point,index)=>lines.push((index+1)+'. '+point.text+' — *'+(point.location||'Lecture transcript')+'*'));
    if(record.topics?.length)lines.push('','## Repeated topics','',record.topics.join(' · '));
    lines.push('','## Source files','',...(record.attachments||[]).map(file=>'- '+file.name));
    lines.push('','## Extracted lecture text','','> The following text was extracted from the files you selected. Image and scanned-page text may contain OCR errors.','',String(record.text||''));
    lines.push('','---','Eduvia selected these statements from the uploaded source text. This is an extractive study aid, not an AI-verified interpretation.');
    return lines.join('\n');
  }
  function downloadNotes(record){
    const blob=new Blob([notesMarkdown(record)],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=(String(record.name||'lecture-notes').replace(/[\\/:*?"<>|]+/g,'-').trim()||'lecture-notes')+'.md';
    document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function openLecture(record){
    const points=(record.keyPoints||[]).map((point,index)=>'<article class="lecture-key-point"><span>'+String(index+1)+'</span><div><p>'+escapeHtml(point.text)+'</p><small>'+escapeHtml(point.location||'Lecture transcript')+'</small></div></article>').join('');
    const topics=(record.topics||[]).map(topic=>'<span class="lecture-topic">'+escapeHtml(topic)+'</span>').join('');
    const sources=(record.attachments||[]).map(file=>'<li>'+escapeHtml(file.name)+' · '+Number(file.characters||0).toLocaleString()+' characters extracted</li>').join('');
    const text=String(record.text||'');
    const preview=text.length>50000?text.slice(0,50000)+'\n\n[Preview shortened. Download the notes to read the complete extracted text.]':text;
    const body='<div class="lecture-summary-head"><span class="course-code">'+escapeHtml(formatDate(record.lectureDate))+'</span><p>Major statements selected from '+Number(record.sentenceCount||0)+' readable sentences across '+(record.attachments||[]).length+' source files.</p></div><div class="lecture-key-points">'+points+'</div>'+(topics?'<div class="lecture-topic-list">'+topics+'</div>':'')+'<div class="lecture-import-explainer"><strong>How to read this summary</strong><p>These points are sentences selected from the transcript or OCR text, not newly written AI claims. Check the original context, especially where a slide contains equations, diagrams or handwriting.</p></div><h3 class="lecture-subheading">Source files</h3><ul class="lecture-source-files">'+sources+'</ul>'+ (record.sourceUrl?'<p>'+sourceLinkMarkup(record.sourceUrl)+'</p>':'')+'<details class="lecture-transcript"><summary>Show extracted transcript and image text</summary><pre>'+escapeHtml(preview)+'</pre></details>';
    openModal('Lecture notes',String(record.name||'Recorded lecture'),body,'Download notes',()=>{downloadNotes(record);root.closeModal?.()});
  }
  async function openSavedLecture(id){
    try{
      const record=await root.eduLectureMaterials?.read(id);
      if(!record){toast('This lecture is not available in this device storage.');return}
      openLecture(record);
    }catch(error){toast(error?.message||'Could not open this lecture.')}
  }
  async function deleteLecture(id){
    if(typeof root.confirm==='function'&&!root.confirm('Remove this recorded lecture and its extracted text from this device?'))return;
    try{
      const removed=await root.eduLectureMaterials?.remove(id);
      if(removed){if(typeof root.render==='function')root.render();toast('Recorded lecture removed.')}
      else toast('This lecture could not be removed.');
    }catch(error){toast(error?.message||'Could not remove this lecture.')}
  }
  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('[data-lecture-action]'):null;
    if(!button)return;
    event.preventDefault();
    const action=button.dataset.lectureAction;
    if(action==='import')importDialog(button.dataset.courseId||'');
    if(action==='open')openSavedLecture(button.dataset.id||'');
    if(action==='delete')deleteLecture(button.dataset.id||'');
  });

  root.eduLectureIntelligence={renderCourseSection,importDialog,openSavedLecture};
})();