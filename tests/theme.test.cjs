const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const legacy = html.match(/\(function\(\) \{\r?\n  \/\/ 3-state theme:[\s\S]*?\r?\n\}\)\(\);/)[0];
const controller = fs.readFileSync(path.join(__dirname, '../js/site-display.js'), 'utf8');
function page(savedMode, systemDark, blockedStorage = false) {
  const element = () => ({attributes:{},style:{},hidden:false,
    setAttribute(key,value){this.attributes[key]=value;},
    getAttribute(key){return this.attributes[key]??null;},
    toggleAttribute(key,value){if(value)this.attributes[key]='';else delete this.attributes[key];}
  });
  const body=element(),root=element(),button=element(),meta=element();
  const changes=[],ready=[],observers=[];
  const media={matches:systemDark,addEventListener(event,listener){if(event==='change')changes.push(listener);}};
  const storage=new Map([['br3-theme-mode',savedMode]]);
  const window={matchMedia:()=>media,addEventListener(){}};
  const document={body,documentElement:root,
    addEventListener(event,listener){if(event==='DOMContentLoaded')ready.push(listener);},
    querySelector(selector){if(selector==='.theme-toggle')return button;if(selector==='meta[name="color-scheme"]')return meta;return null;},
    querySelectorAll(){return [button];}
  };
  const context=vm.createContext({window,document,localStorage:{
    getItem(key){if(blockedStorage)throw Error('Opslag niet beschikbaar');return storage.get(key);},
    setItem(key,value){if(blockedStorage)throw Error('Opslag niet beschikbaar');storage.set(key,value);}
  },MutationObserver:class {constructor(callback){observers.push(callback);}observe(node){assert.equal(node,body);}}});
  // Production first loads the display controller, then the inherited page code.
  vm.runInContext(controller,context);vm.runInContext(legacy,context);ready.forEach(listener=>listener());
  return {toggle:()=>window.toggleTheme(),
    system(dark){media.matches=dark;changes.forEach(listener=>listener());observers.forEach(listener=>listener());},
    legacyDark(){body.setAttribute('data-theme','dark');observers.forEach(listener=>listener());},
    check(){assert.equal(body.getAttribute('data-theme'),'light');assert.equal(root.getAttribute('data-theme'),'light');
      assert.equal(root.style.colorScheme,'only light');assert.equal(meta.content,'only light');assert.equal(button.hidden,true);}
  };
}
test('de gepubliceerde lichte weergave blijft gelden bij oude themawaarden en herladen',()=>{
  for(const mode of ['auto','dark','light',null]){page(mode,true).check();page(mode,false).check();}
});
test('systeemwissels en de oude themaknop kunnen de vaste lichte weergave niet vervangen',()=>{
  const current=page('auto',true);current.check();current.system(false);current.check();
  current.system(true);current.check();current.toggle();current.check();current.legacyDark();current.check();
});
test('licht blijft bruikbaar wanneer browseropslag is geblokkeerd',()=>{
  const current=page('dark',true,true);current.check();current.toggle();current.check();current.legacyDark();current.check();
});
