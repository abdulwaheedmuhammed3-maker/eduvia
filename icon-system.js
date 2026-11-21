/* Eduvia unified outline icon system.
 * Converts existing icon glyph slots to consistent, accessible SVG line icons.
 * Uses inline SVG paths so icons work offline and do not depend on a remote icon font.
 */
(function(){
  'use strict';

  const SVG_NS='http://www.w3.org/2000/svg';
  const paths={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    book:'<path d="M4 5.5c2.8-1.2 5.6-.7 8 1.1v13c-2.4-1.8-5.2-2.3-8-1.1z"/><path d="M20 5.5c-2.8-1.2-5.6-.7-8 1.1v13c2.4-1.8 5.2-2.3 8-1.1z"/>',
    play:'<path d="M9 5.5 19 12 9 18.5z"/><path d="M4.5 8v8"/>',
    sparkles:'<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    settings:'<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    check:'<path d="m5 12 4.2 4.2L19 6.5"/>',
    edit:'<path d="m14 5 5 5"/><path d="m4 20 4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2z"/>',
    trash:'<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v3h14v-3"/>',
    upload:'<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M5 15v5h14v-5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17"/>',
    grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    chart:'<path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M16 6h4v4"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    file:'<path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4M8 12h8M8 16h8"/>',
    folder:'<path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    star:'<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    arrow:'<path d="M7 17 17 7M8 7h9v9"/>',
    arrowLeft:'<path d="m14.5 5-7 7 7 7"/>',
    arrowRight:'<path d="m9.5 5 7 7-7 7"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    refresh:'<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/>',
    graduation:'<path d="m2.5 9 9.5-5 9.5 5-9.5 5z"/><path d="M6 11v5c3.8 3 8.2 3 12 0v-5M21.5 9v6"/>',
    brain:'<path d="M12 4.2a3 3 0 0 0-5.7 1.1A3.2 3.2 0 0 0 4 10.7a3.2 3.2 0 0 0 1.7 5.5A3 3 0 0 0 12 18.8z"/><path d="M12 4.2a3 3 0 0 1 5.7 1.1 3.2 3.2 0 0 1 2.3 5.4 3.2 3.2 0 0 1-1.7 5.5 3 3 0 0 1-6.3 2.1zM8 8.5c1.6 0 2.5 1 2.5 2.5M7 14c1.4-.7 2.8-.2 3.5 1.2m5.5-6.7c-1.6 0-2.5 1-2.5 2.5m4 3c-1.4-.7-2.8-.2-3.5 1.2"/>',
    heart:'<path d="M20.5 8.8c0 5.1-8.5 10.2-8.5 10.2S3.5 13.9 3.5 8.8A4.3 4.3 0 0 1 12 6.5a4.3 4.3 0 0 1 8.5 2.3Z"/>',
    bookmark:'<path d="M6 4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1V21l-6-4-6 4z"/>',
    lightbulb:'<path d="M9 18h6m-5 3h4"/><path d="M8.2 14.5a6 6 0 1 1 7.6 0c-.9.7-1.3 1.5-1.4 2.5H9.6c-.1-1-.5-1.8-1.4-2.5Z"/>',
    shield:'<path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    user:'<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    eye:'<path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
    camera:'<path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>',
    timer:'<circle cx="12" cy="13" r="8.5"/><path d="M12 8v5l3 2M9 2h6M12 2v2"/>',
    trophy:'<path d="M8 4h8v4a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v5m-4 3h8m-7-3h6"/>',
    list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    link:'<path d="M10 13.5 8.5 15a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M14 10.5 15.5 9a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8.5 12h7"/>',
    filePlus:'<path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4M12 11v6m-3-3h6"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    circle:'<circle cx="12" cy="12" r="8.5"/>',
    checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m7.5 12.2 3 3 6-6.4"/>',
    school:'<path d="M3 21V8l9-5 9 5v13M3 10h18M8 21v-6h8v6M7 11h.01M17 11h.01"/>',
    dashboard:'<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
    library:'<path d="M4 5.5h11a3 3 0 0 1 3 3V20H7a3 3 0 0 0-3 1.5z"/><path d="M4 5.5v16M18 8.5h2a1 1 0 0 1 1 1V20h-3M8 10h6m-6 4h6"/>',
    quiz:'<rect x="4" y="3.5" width="16" height="18" rx="2"/><path d="M9 3.5V2h6v1.5M8 9h8M8 13h3m3.5 0h.5M8 17h8"/>',
    forum:'<path d="M20.5 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-3.5 2v-5A7.5 7.5 0 1 1 20.5 11.5Z"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"/>',
    explore:'<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3z"/><circle cx="12" cy="12" r="1"/>',
    article:'<path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14.5 3.5V8H19M8 12h8M8 15.5h8M8 19h5"/>',
    assignment:'<rect x="4" y="4.5" width="16" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 10h8m-8 4h3m2.5 2 1.5 1.5 3-3"/>',
    award:'<circle cx="12" cy="8" r="5"/><path d="m9 12-1 9 4-2.5 4 2.5-1-9"/>',
    insights:'<path d="M4 19.5h16"/><rect x="5.5" y="11" width="3" height="6.5" rx=".7"/><rect x="10.5" y="7.5" width="3" height="10" rx=".7"/><rect x="15.5" y="4" width="3" height="13.5" rx=".7"/>',
    event:'<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h3m-3 4h2m4-4h2"/>',
    libraryBooks:'<path d="M3.5 5.5h4v14h-4zM9.5 3.5h4v16h-4zM15.5 6.5h5v13h-5z"/><path d="M5.5 8h.01M11.5 6h.01M18 9h.01"/>',
    bolt:'<path d="M13.5 2.5 5 13h6l-.5 8.5L19 10h-6z"/>',
    puzzle:'<path d="M9 3.5h2a2 2 0 1 1 4 0h2a2 2 0 0 1 2 2v3a2 2 0 1 0 0 4v3a2 2 0 0 1-2 2h-3a2 2 0 1 0-4 0H7a2 2 0 0 1-2-2v-3a2 2 0 1 0 0-4v-3a2 2 0 0 1 2-2z"/>',
  };

  const glyphMap={
    '⌂':'dashboard','▣':'library','◇':'puzzle','✧':'sparkles','✳':'brain','✦':'award','⌕':'explore',
    '•••':'more','⚙':'settings','＋':'plus','+':'plus','✓':'check','✔':'check','✎':'edit','✏':'edit',
    '×':'close','✕':'close','↓':'download','↑':'upload','◷':'event','▦':'dashboard','↗':'arrow',
    '♧':'graduation','▤':'article','▷':'quiz','▶':'quiz','☆':'award','★':'award','♡':'heart',
    '♙':'user','●':'circle','🎓':'graduation','📚':'libraryBooks','🧠':'brain','🕒':'event','⭐':'award','🎯':'target','📅':'event','📄':'article','💡':'lightbulb','🔔':'bell',
    '♥':'heart','⌖':'target','☼':'forum','☀':'forum','⌚':'timer','↻':'refresh','☷':'list',
    '▧':'folder','▱':'file','?':'forum'
  };

  function makeSvg(name){
    if(!paths[name])name='sparkles';
    const svg=document.createElementNS(SVG_NS,'svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('class','eduvia-line-icon');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.75');
    svg.setAttribute('stroke-linecap','round');
    svg.setAttribute('stroke-linejoin','round');
    svg.innerHTML=paths[name];
    return svg;
  }

  function contextualName(element){
    const pageElement=element.closest('.nav-icon')?.closest('[data-page]');
    if(pageElement){
      const page=pageElement.dataset.page;
      const desktopMap={today:'dashboard','my-study':'library',play:'quiz',ask:'forum',discover:'explore',more:'grid',settings:'settings'};
      if(desktopMap[page])return desktopMap[page];
    }
    if(!element.matches('.exp-icon'))return null;
    const host=element.closest('.exp-tool-card,.exp-tile,.exp-discover-card,.discover-library-card,.exp-academic-grid button,.exp-my-study-grid button,.exp-inline-cta,.panel')||element.parentElement;
    const context=String(host?.innerText||host?.textContent||'').toLowerCase();
    if(/study smarter|active recall|spaced repetition|memory/.test(context))return 'brain';
    if(/academic skills|writing|research|referencing|lecture notes/.test(context))return 'article';
    if(/exam preparation|examination|mock exam|past paper/.test(context))return 'assignment';
    if(/opportunit|scholarship|internship/.test(context))return 'award';
    if(/my study|my courses|course material|course list/.test(context))return 'libraryBooks';
    if(/discover|explore by interest|learning library/.test(context))return 'explore';
    if(/play|practice|flashcard|quiz|challenge/.test(context))return 'quiz';
    if(/ask eduvia|ask without|question/.test(context))return 'forum';
    if(/schedule|timetable|calendar|lecture/.test(context))return 'event';
    if(/habit|focus|consistency|streak/.test(context))return 'insights';
    if(/deadline|planner|task/.test(context))return 'assignment';
    if(/progress|result|cgpa|performance/.test(context))return 'chart';
    return null;
  }

  function semanticName(element,text){
    const title=((element.getAttribute('aria-label')||'')+' '+(element.getAttribute('title')||'')+' '+(element.dataset.action||'')+' '+(element.dataset.feature||'')+' '+(element.dataset.examAction||'')).toLowerCase();
    if(/delete|remove|clear/.test(title))return 'trash';
    if(/edit|rename/.test(title))return 'edit';
    if(/download|export/.test(title))return 'download';
    if(/upload|import|attach/.test(title))return 'upload';
    if(/close|dismiss/.test(title))return 'close';
    if(/setting|preference/.test(title))return 'settings';
    if(/profile|account|student/.test(title))return 'user';
    if(/calendar|date|schedule|timetable/.test(title))return 'calendar';
    if(/search|find/.test(title))return 'explore';
    if(/play|practice|quiz|test/.test(title))return 'quiz';
    if(/course|book|study|lesson|material/.test(title))return 'library';
    if(/timer|focus|time/.test(title))return 'timer';
    if(/add|new|create/.test(title))return 'plus';
    const normalized=String(text||'').trim();
    return glyphMap[normalized]||null;
  }

  function iconize(element,name){
    if(!element||!name)return;
    if(element.dataset.eduIcon===name&&element.querySelector(':scope > svg.eduvia-line-icon'))return;
    element.replaceChildren(makeSvg(name));
    element.dataset.eduIcon=name;
    if(!element.hasAttribute('aria-label')&&element.matches('button.icon-btn')) {
      const label=element.getAttribute('title')||name.replace(/([A-Z])/g,' $1');
      element.setAttribute('aria-label',label);
    }
  }

  function applyElement(element){
    if(!(element instanceof Element))return;
    // Footer navigation keeps its original hand-authored SVG artwork.
    if(element.matches('.mobile-nav-icon'))return;
    if(element.matches('.nav-icon')){
      const parent=element.closest('[data-page]');
      const page=parent?.dataset.page;
      const map={today:'home','my-study':'book',play:'play',ask:'sun',discover:'search',more:'more',settings:'settings'};
      iconize(element,contextualName(element)||map[page]||semanticName(element,element.textContent));
      return;
    }
    const selector='.exp-icon,.resource-icon,.habit-badge,.empty-icon,.stat-mark,.btn-icon,.upload-symbol,.upload-icon,.student-id-icon,.icon-btn';
    if(element.matches(selector)){
      const text=element.textContent.trim();
      if(element.matches('.resource-icon')&&/^(PDF|PPT|DOC|TXT|CSV|FILE)$/.test(text))return;
      const name=contextualName(element)||semanticName(element,text);
      if(name)iconize(element,name);
    }
  }

  function scan(root){
    if(!root)return;
    if(root instanceof Element)applyElement(root);
    if(root.querySelectorAll){
      root.querySelectorAll('.nav-icon,.exp-icon,.resource-icon,.habit-badge,.empty-icon,.stat-mark,.btn-icon,.upload-symbol,.upload-icon,.student-id-icon,.icon-btn').forEach(applyElement);
    }
  }

  function start(){
    scan(document);
    const observer=new MutationObserver(records=>{
      for(const record of records){
        record.addedNodes.forEach(node=>{
          if(node.nodeType===Node.ELEMENT_NODE)scan(node);
        });
      }
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.EduviaIconSystem={version:'1.0.0',refresh:()=>scan(document)};
})();