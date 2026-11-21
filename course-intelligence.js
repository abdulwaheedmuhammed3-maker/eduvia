/* Eduvia Course Intelligence v1
 * Browser-local document indexing and source-grounded retrieval.
 * This does not call an online AI model. It indexes extracted material and returns cited passages.
 */
(function(){
  const VERSION=1;
  const CHUNK_SIZE=1150;
  const CHUNK_OVERLAP=160;
  const STOP=new Set(('a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves the').split(/\s+/));
  const TOKEN_RE=/[\p{L}\p{N}]{2,}/gu;

  function tokens(value){
    return (String(value||'').toLocaleLowerCase().match(TOKEN_RE)||[])
      .filter(token=>!STOP.has(token)&&token.length>1);
  }
  function splitLongBlock(block,baseOffset,meta,out){
    const text=String(block||'');
    if(!text.trim())return;
    let cursor=0;
    while(cursor<text.length){
      let end=Math.min(text.length,cursor+CHUNK_SIZE);
      if(end<text.length){
        const boundary=text.lastIndexOf(' ',end);
        if(boundary>cursor+CHUNK_SIZE*.62)end=boundary;
      }
      const raw=text.slice(cursor,end).trim();
      if(raw.length>35){
        const left=text.slice(cursor,end).search(/\S/);
        const start=baseOffset+cursor+Math.max(0,left);
        const finish=baseOffset+end;
        out.push({
          ordinal:out.length+1,start,end:finish,
          page:meta.page,slide:meta.slide,section:meta.section||'',
          terms:[...new Set(tokens(raw))],
          tokenCount:tokens(raw).length
        });
      }
      if(end>=text.length)break;
      cursor=Math.max(cursor+1,end-CHUNK_OVERLAP);
      while(cursor<text.length&&/\s/.test(text[cursor]))cursor++;
    }
  }

  function buildIndex(text){
    const source=String(text||'');
    const chunks=[];
    let page=null,slide=null,section='';
    let paragraph=[],paragraphStart=0,paragraphEnd=0;
    const flush=()=>{
      if(!paragraph.length)return;
      const block=paragraph.join('');
      splitLongBlock(block,paragraphStart,{page,slide,section},chunks);
      paragraph=[];paragraphStart=0;paragraphEnd=0;
    };
    const lines=source.split(/(?<=\n)/);
    let offset=0;
    for(const fullLine of lines){
      const line=fullLine.replace(/\r?\n$/,'');
      const trimmed=line.trim();
      const marker=trimmed.match(/^\[(PAGE|SLIDE|SECTION)\s*:?\s*([^\]]+)\]$/i);
      if(marker){
        flush();
        const kind=marker[1].toLowerCase(),value=marker[2].trim();
        if(kind==='page')page=Number(value)||value;
        if(kind==='slide')slide=Number(value)||value;
        if(kind==='section')section=value;
        offset+=fullLine.length;continue;
      }
      const heading=trimmed.match(/^#{1,4}\s+(.+)$/)||trimmed.match(/^([A-Z][A-Z0-9 &:/(),.'’_-]{4,90})$/);
      if(heading){
        flush();section=String(heading[1]||heading[0]).trim();
        offset+=fullLine.length;continue;
      }
      if(!trimmed){flush();offset+=fullLine.length;continue}
      if(!paragraph.length)paragraphStart=offset;
      paragraph.push(fullLine);
      paragraphEnd=offset+line.length;
      offset+=fullLine.length;
      if(paragraph.join('\n').length>=CHUNK_SIZE)flush();
    }
    flush();
    const pages=[...new Set(chunks.map(chunk=>chunk.page).filter(value=>value!==null))];
    const slides=[...new Set(chunks.map(chunk=>chunk.slide).filter(value=>value!==null))];
    return {
      version:VERSION,indexedAt:Date.now(),characterCount:source.length,
      chunkCount:chunks.length,pageCount:pages.length,slideCount:slides.length,
      chunks
    };
  }

  function sourceChunks(sources){
    const output=[];
    for(const source of Array.isArray(sources)?sources:[]){
      const text=String(source?.text||'');
      if(!text.trim())continue;
      const index=source.index?.version===VERSION&&Array.isArray(source.index.chunks)
        ?source.index:buildIndex(text);
      for(const chunk of index.chunks){
        const excerpt=text.slice(chunk.start,chunk.end).trim();
        if(!excerpt)continue;
        output.push({
          materialId:source.id||source.materialId||'',
          name:source.name||'Course material',
          courseId:source.courseId||'',
          text:excerpt,
          page:chunk.page??null,slide:chunk.slide??null,
          section:chunk.section||'',
          ordinal:chunk.ordinal||output.length+1,
          terms:chunk.terms||tokens(excerpt),
          score:0
        });
      }
    }
    return output;
  }

  function locationLabel(item){
    const parts=[];
    if(item.page!==null&&item.page!==undefined)parts.push('Page '+item.page);
    if(item.slide!==null&&item.slide!==undefined)parts.push('Slide '+item.slide);
    if(item.section)parts.push(item.section);
    if(!parts.length)parts.push('Passage '+item.ordinal);
    return parts.join(' · ');
  }

  function search(sources,query,limit=5){
    const queryText=String(query||'').trim();
    const queryTokens=[...new Set(tokens(queryText))];
    if(!queryTokens.length)return [];
    const docs=sourceChunks(sources);
    if(!docs.length)return [];
    const docFreq=new Map();
    for(const doc of docs){
      for(const term of new Set(doc.terms))docFreq.set(term,(docFreq.get(term)||0)+1);
    }
    const total=docs.length;
    const phrase=queryText.toLocaleLowerCase().replace(/\s+/g,' ').trim();
    const scored=docs.map(doc=>{
      const lower=doc.text.toLocaleLowerCase();
      const termCounts=new Map();
      for(const term of doc.terms)termCounts.set(term,(termCounts.get(term)||0)+1);
      let score=0,matched=0;
      for(const term of queryTokens){
        const tf=termCounts.get(term)||0;
        if(!tf)continue;
        matched++;
        const df=docFreq.get(term)||1;
        const idf=Math.log(1+(total-df+0.5)/(df+0.5));
        score+=idf*(tf*2.2)/(tf+1.2);
        if(doc.section&&doc.section.toLocaleLowerCase().includes(term))score+=0.8;
      }
      if(phrase.length>4&&lower.includes(phrase))score+=3;
      score+=matched/queryTokens.length*1.4;
      return {...doc,score,matchedTerms:matched,matchRatio:matched/queryTokens.length};
    }).filter(doc=>doc.score>0&&doc.matchedTerms>0);
    scored.sort((a,b)=>b.score-a.score||a.ordinal-b.ordinal);
    const selected=scored.slice(0,Math.max(1,Math.min(20,Number(limit)||5)));
    return selected.map(item=>({
      ...item,
      location:locationLabel(item),
      citation:item.name+' · '+locationLabel(item),
      matchLabel:item.matchRatio>=.8?'Strong keyword match':item.matchRatio>=.45?'Related passages':'Partial keyword match'
    }));
  }

  function getStats(sources){
    const items=(Array.isArray(sources)?sources:[]).filter(source=>String(source?.text||'').trim());
    const chunks=items.reduce((count,source)=>{
      const index=source.index?.version===VERSION?source.index:buildIndex(source.text);
      return count+index.chunkCount;
    },0);
    return {materialCount:items.length,chunkCount:chunks,characterCount:items.reduce((sum,item)=>sum+String(item.text||'').length,0)};
  }

  function excerptWithCitation(item){
    return {text:item.text,source:item.name,location:item.location||locationLabel(item),citation:item.citation||item.name+' · '+locationLabel(item),materialId:item.materialId||'',score:item.score||0};
  }

  window.eduCourseIntelligence={
    version:VERSION,
    buildIndex,
    search,
    getStats,
    excerptWithCitation,
    locationLabel,
    tokenize:tokens
  };
})();