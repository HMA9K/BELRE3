/** Reviewed article routes are acyclic graphs. A leaf always explains the result. */
export function validateDecisionTree(tree){
  const fail=message=>{throw Error('Beslisboom '+(tree.id||'?')+': '+message);};
  if(!tree.id||!tree.title?.trim()||!tree.intro?.trim()||!tree.sectionIds?.length||!tree.nodes?.length)fail('onvolledig');
  const nodes=new Map(tree.nodes.map(node=>[node.id,node]));
  if(nodes.size!==tree.nodes.length||!nodes.has(tree.start))fail('dubbele knoop of onbekende start');
  for(const node of nodes.values()){
    if(!node.id||!node.title?.trim()||!node.text?.trim()||!['decision','step','outcome'].includes(node.type))fail('ongeldige knoop');
    const choices=node.choices||[];
    if(node.type==='decision'&&choices.length<2||node.type==='step'&&choices.length!==1||node.type==='outcome'&&choices.length)fail('verkeerd aantal takken bij '+node.id);
    if(new Set(choices.map(choice=>choice.label)).size!==choices.length)fail('dubbel antwoord bij '+node.id);
    for(const choice of choices)if(!choice.label?.trim()||!nodes.has(choice.to))fail('onbekende bestemming bij '+node.id);
  }
  const visited=new Set(),active=new Set();
  function walk(id){
    if(active.has(id))fail('cirkel bij '+id);
    if(visited.has(id))return;
    active.add(id);for(const choice of nodes.get(id).choices||[])walk(choice.to);
    active.delete(id);visited.add(id);
  }
  walk(tree.start);if(visited.size!==nodes.size)fail('onbereikbare knopen');
  return tree;
}

/** Reject stale/invalid choices instead of showing a route that the tree does not contain. */
export function decisionPath(tree,labels=[]){
  const nodes=new Map(tree.nodes.map(node=>[node.id,node]));
  let node=nodes.get(tree.start);const path=[{node,chosen:null}];
  for(const label of labels){
    const choice=node.choices?.find(choice=>choice.label===label);
    if(!choice)throw Error('Ongeldige keuze in '+tree.id+': '+label);
    path.at(-1).chosen=choice;node=nodes.get(choice.to);path.push({node,chosen:null});
  }
  return path;
}

/** Reopen a visited step and discard the choices that depended on it. */
export function decisionRewind(tree,labels,stepIndex){
  const path=decisionPath(tree,labels);
  if(!Number.isInteger(stepIndex)||stepIndex<0||stepIndex>=path.length)throw Error('Onbekende stap in '+tree.id);
  return labels.slice(0,stepIndex);
}

export const decisionText=tree=>[tree.title,tree.intro,...(tree.notes||[]),...tree.nodes.flatMap(node=>[node.title,node.text])].join(' ');
