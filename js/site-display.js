/* BELRE3 deliberately uses a fixed light theme. Old theme choices cannot override it. */
(function(){
  const introKey='belre3-assistant-intro-dismissed';
  function restoreIntro(){
    try{document.documentElement.toggleAttribute('data-assistant-intro-dismissed',localStorage.getItem(introKey)==='1');}catch{}
  }
  function prepareIntro(){
    const intro=document.querySelector('.belre-assistant-info');if(!intro)return;
    const close=document.createElement('button');close.type='button';close.className='belre-assistant-info-close';close.textContent='×';close.setAttribute('aria-label','Melding over de BELRE3 Assistent sluiten');close.title='Deze melding niet meer tonen';
    close.addEventListener('click',()=>{
      document.documentElement.setAttribute('data-assistant-intro-dismissed','');
      try{localStorage.setItem(introKey,'1');}catch{}
      document.querySelector('.study-assistant-launch:not([hidden])')?.focus({preventScroll:true});
    });
    intro.prepend(close);
  }
  restoreIntro();
  window.addEventListener('storage',event=>{if(event.key===introKey||event.key===null)restoreIntro();});
  function light(){
    for(const node of [document.documentElement,document.body])if(node&&node.getAttribute('data-theme')!=='light')node.setAttribute('data-theme','light');
    document.documentElement.style.colorScheme='only light';
    let meta=document.querySelector('meta[name="color-scheme"]');if(!meta){meta=document.createElement('meta');meta.name='color-scheme';document.head.append(meta);}meta.content='only light';
    try{localStorage.setItem('br3-theme-mode','light');}catch{}
    window.toggleTheme=light;
    document.querySelectorAll('.theme-toggle,.study-theme-control').forEach(node=>node.hidden=true);
  }
  light();document.addEventListener('DOMContentLoaded',()=>{light();prepareIntro();new MutationObserver(light).observe(document.body,{attributes:true,attributeFilter:['data-theme']});},{once:true});
})();
