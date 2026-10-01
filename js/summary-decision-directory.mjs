const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function decisionDirectory(colleges){
  return colleges.map(college=>({id:college.id,label:college.label,trees:college.topics.flatMap(topic=>(topic.decisionTrees||[]).map(tree=>({
    id:tree.id,title:tree.title,intro:tree.intro,topic:topic.title,topicId:topic.id,
    href:'#pagina/sam/'+topic.id+'/beslisboom/'+tree.id
  })))})).filter(college=>college.trees.length);
}

export function decisionDirectoryHtml(colleges){
  const groups=decisionDirectory(colleges),count=groups.reduce((sum,group)=>sum+group.trees.length,0);
  return '<p class="decision-directory-count">'+count+' beslisbomen · '+groups.length+' hoorcolleges</p><nav class="decision-directory-colleges" aria-label="Hoorcolleges met beslisbomen">'+groups.map(group=>'<a href="#decision-college-'+esc(group.id)+'" data-decision-college="'+esc(group.id)+'">'+esc(group.label)+'</a>').join('')+'</nav>'+groups.map(group=>'<section class="decision-directory-group" aria-labelledby="decision-college-'+esc(group.id)+'"><h2 id="decision-college-'+esc(group.id)+'" tabindex="-1">'+esc(group.label)+'</h2><div class="decision-directory-grid">'+group.trees.map(tree=>'<article class="decision-directory-card"><p class="decision-directory-topic">'+esc(tree.topic)+'</p><h3><a href="'+esc(tree.href)+'">'+esc(tree.title)+'</a></h3><p>'+esc(tree.intro)+'</p><a class="decision-directory-open" href="'+esc(tree.href)+'">Open beslisboom <span aria-hidden="true">→</span></a></article>').join('')+'</div></section>').join('');
}

export function decisionRoute(hash){
  const match=hash.match(/^#pagina\/sam\/([a-z0-9-]+)\/beslisboom\/([a-z0-9-]+)$/);
  return match?{topicId:match[1],treeId:match[2]}:null;
}

export function mountDecisionDirectory(colleges){
  const app=document.querySelector('[data-summary-decision-directory]');if(!app)return;
  app.innerHTML=decisionDirectoryHtml(colleges);
  app.addEventListener('click',event=>{
    const link=event.target.closest('[data-decision-college]');if(!link)return;
    event.preventDefault();const heading=app.querySelector('#decision-college-'+link.dataset.decisionCollege);
    heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start',behavior:'instant'});
  });
}
