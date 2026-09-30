/* BELRE3 deliberately uses a fixed light theme. Old theme choices cannot override it. */
(function(){
  function light(){
    for(const node of [document.documentElement,document.body])if(node&&node.getAttribute('data-theme')!=='light')node.setAttribute('data-theme','light');
    document.documentElement.style.colorScheme='only light';
    let meta=document.querySelector('meta[name="color-scheme"]');if(!meta){meta=document.createElement('meta');meta.name='color-scheme';document.head.append(meta);}meta.content='only light';
    try{localStorage.setItem('br3-theme-mode','light');}catch{}
    window.toggleTheme=light;
    document.querySelectorAll('.theme-toggle,.study-theme-control').forEach(node=>node.hidden=true);
  }
  light();document.addEventListener('DOMContentLoaded',()=>{light();new MutationObserver(light).observe(document.body,{attributes:true,attributeFilter:['data-theme']});},{once:true});
})();
