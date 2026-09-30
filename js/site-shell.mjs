import {colleges,pages} from './course-links.mjs';
export function createSiteShell(nav){
  const oldBanner=document.querySelector('#belre-main .mhdr');
  const banner=document.createElement('header');banner.className='belre-site-header';
  banner.innerHTML='<a class="belre-site-brand" href="#pagina/home" aria-label="BELRE3 hoofdpagina"><span><svg viewBox="0 0 18 20" aria-hidden="true"><path fill="#ff720c" d="M3 5h12v12H3Z"/><path fill="none" stroke="#444159" stroke-width="2.7" d="m5 10 3 3 6-7"/></svg>B</span>elre3 <small>LEER- EN OEFENOMGEVING</small></a><span class="belre-site-course">Belastingrecht 3 · 2026</span>';
  oldBanner.before(banner);oldBanner.hidden=true;
  const sidebar=document.createElement('aside');sidebar.id='belre-site-nav';sidebar.setAttribute('aria-label','Navigatie door BELRE3');
  const link=(href,label)=>'<a href="'+href+'">'+label+'</a>';
  sidebar.innerHTML='<div class="belre-nav-heading"><strong>BELRE3</strong><button type="button" data-nav-close aria-label="Navigatie sluiten">×</button></div><nav>'+link('#pagina/home','Home')+
    '<details open><summary>Leerstof</summary>'+link('#pagina/sam','Samenvatting')+colleges.map(([id,label])=>link('#pagina/sam/'+id,'College '+label)).join('')+link('#pagina/oef','Oefenbundel')+'</details>'+
    '<details open><summary>Oefenen</summary>'+link('/oefenen/#oefenen','MC-oefenvragen')+link('/oefenen/#welkom/opgaven','Open vragen per onderwerp')+link('/oefenen/#dashboard','Cirrus tentamens')+link('/oefenen/#voortgang','Mijn MC-resultaten')+'</details>'+
    '<details open><summary>Naslag</summary>'+link('#pagina/art','Wet Vpb 1969')+link('#pagina/kleur','Kleurcodering')+link('#pagina/paars','Tentamenaccenten')+link('#pagina/tent','Tentamenindeling')+link('#pagina/exam','Tentamens (oude weergave)')+link('/oefenen/#bronnen','Bronnenbibliotheek')+'</details></nav>';
  const backdrop=document.createElement('button');backdrop.id='belre-nav-backdrop';backdrop.type='button';backdrop.setAttribute('aria-label','Navigatie sluiten');backdrop.hidden=true;
  document.body.append(backdrop,sidebar);
  const toolbar=document.createElement('div');toolbar.className='belre-page-toolbar';
  toolbar.innerHTML='<button type="button" class="belre-nav-toggle" data-nav-toggle aria-label="Navigatie openen" aria-controls="belre-site-nav" aria-expanded="false">☰ <span>Navigatie</span></button><h1>Home</h1><div class="belre-page-scale" role="group" aria-label="Paginaschaal"><button type="button" data-font="-1">A−</button><button type="button" data-font="0">A</button><button type="button" data-font="1">A+</button></div>';
  document.getElementById('belre-page-content').before(toolbar);
  let drawer=false,size=14,courseDoc=null,opener=null;
  try{size=Math.max(12,Math.min(18,Number(localStorage.getItem('belre3-page-size'))||14));}catch{}
  function adjust(delta){size=delta?Math.max(12,Math.min(18,size+delta)):14;window.StudyScale?.set(size,14,12,18);try{localStorage.setItem('belre3-page-size',String(size));}catch{}refresh();window.dispatchEvent(new Event('belre:navigation'));}
  window.BelreDisplay={adjust};
  function toggle(value){if(value)opener=nav.inCourse?nav.courseWindow.document.activeElement:document.activeElement;drawer=value;document.body.classList.toggle('belre-nav-drawer',drawer);backdrop.hidden=!drawer;nav.setInert(drawer);refresh();if(drawer)sidebar.querySelector('[data-nav-close]').focus();else if(opener?.isConnected)opener.focus({preventScroll:true});}
  sidebar.addEventListener('click',e=>{if(e.target.closest('a,[data-nav-close]'))toggle(false);});
  backdrop.addEventListener('click',()=>toggle(false));
  toolbar.addEventListener('click',e=>{if(e.target.closest('[data-nav-toggle]'))toggle(!drawer);const font=e.target.closest('[data-font]');if(font)adjust(Number(font.dataset.font));});
  document.addEventListener('keydown',e=>{if(!drawer)return;if(e.key==='Escape'){e.preventDefault();toggle(false);}if(e.key==='Tab'){const items=[...sidebar.querySelectorAll('a,button,summary')].filter(n=>n.getClientRects().length),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  function preparePage(){
    const page=document.querySelector('.pg.vis');if(!page)return;
    const id=page.id.slice(3);toolbar.querySelector('h1').textContent=pages[id]||'BELRE3';
    for(const heading of page.querySelectorAll(':scope>h1,:scope>div>h1,:scope>.container>header>h1'))heading.classList.add('belre-original-page-title');
    for(const table of page.querySelectorAll(':scope>table')){const scroll=document.createElement('div');scroll.className='belre-table-scroll';table.before(scroll);scroll.append(table);}
    for(const button of page.querySelectorAll('.bbtn'))if(/sp\(['"]home['"]\)/.test(button.getAttribute('onclick')||'')){button.classList.add('belre-original-home');if(button.parentElement!==page&&button.parentElement.children.length===1)button.parentElement.classList.add('belre-original-home');}
    const grid=page.querySelector('.hgrid');if(grid&&!grid.querySelector('.belre-feature-grid')){const feature=document.createElement('div');feature.className='belre-feature-grid';grid.prepend(feature);for(const card of grid.querySelectorAll('.belre-cirrus-card'))feature.append(card);}
  }
  function refresh(){
    const exam=nav.inExam,enabled=!exam;
    document.body.classList.toggle('belre-site-nav-enabled',enabled);sidebar.hidden=!enabled;if(exam&&drawer){drawer=false;document.body.classList.remove('belre-nav-drawer');backdrop.hidden=true;}
    const reserved=enabled&&innerWidth>1100?224:0;
    document.documentElement.style.setProperty('--belre-nav-width',reserved+'px');
    const d=nav.courseWindow?.document;
    if(d?.body){
      d.body.classList.toggle('belre-site-embedded',enabled);
      if(d.documentElement.style.getPropertyValue('--belre-nav-width')!==reserved+'px')d.documentElement.style.setProperty('--belre-nav-width',reserved+'px');
      if(courseDoc!==d){courseDoc=d;d.addEventListener('click',e=>{if(e.target.closest('[data-belre-nav-toggle]'))toggle(!drawer);});}
      const strip=d.querySelector('.learning-page-head .cirrus-page-nav');
      if(strip&&!strip.querySelector('[data-belre-nav-toggle]')){const button=d.createElement('button');button.type='button';button.className='btn';button.dataset.belreNavToggle='';button.textContent='☰ Navigatie';button.setAttribute('aria-label','Navigatie door BELRE3 openen');strip.prepend(button);}
      const button=d.querySelector('[data-belre-nav-toggle]');if(button){const hidden=exam||reserved>0;if(button.hidden!==hidden)button.hidden=hidden;button.setAttribute('aria-expanded',String(drawer||reserved>0));}
      for(const button of d.querySelectorAll('[data-font]')){const original=toolbar.querySelector('[data-font="'+button.dataset.font+'"]');button.title=original.title;button.setAttribute('aria-label',original.getAttribute('aria-label')||'Paginaschaal');button.disabled=original.disabled;if(button.hidden!==original.hidden)button.hidden=original.hidden;}
    }
    preparePage();
    toolbar.querySelector('[data-nav-toggle]').setAttribute('aria-expanded',String(drawer||reserved>0));
    let current=nav.inCourse?'/oefenen/'+(nav.courseWindow?.location.hash||'#start'):location.hash||'#pagina/home';
    if(current.startsWith('/oefenen/#mc/'))current='/oefenen/#oefenen';
    if(current.startsWith('/oefenen/#resultaten/'))current='/oefenen/#voortgang';
    for(const a of sidebar.querySelectorAll('a')){if(a.getAttribute('href')===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  }
  window.addEventListener('belre:navigation',refresh);window.addEventListener('resize',refresh);
  document.getElementById('belre-main').addEventListener('click',()=>requestAnimationFrame(refresh));
  window.StudyScale?.set(size,14,12,18);
  refresh();return {refresh};
}
