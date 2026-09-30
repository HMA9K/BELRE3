// PDF.js 6 uses these Map helpers; keep older supported browsers working too.
for(const [name,make] of [['getOrInsert',(key,value)=>value],['getOrInsertComputed',(key,callback)=>callback(key)]]){
 if(!Map.prototype[name])Object.defineProperty(Map.prototype,name,{configurable:true,writable:true,value:function(key,value){if(this.has(key))return this.get(key);const result=make(key,value);this.set(key,result);return result;}});
}
// PDF.js text extraction also iterates streams; older WebKit only has getReader.
if(typeof ReadableStream!=='undefined'&&!ReadableStream.prototype[Symbol.asyncIterator]){
 Object.defineProperty(ReadableStream.prototype,Symbol.asyncIterator,{configurable:true,writable:true,value:function({preventCancel=false}={}){
  const reader=this.getReader();
  return (async function*(){let completed=false;try{while(true){const result=await reader.read();if(result.done){completed=true;return;}yield result.value;}}finally{try{if(!completed&&!preventCancel)await reader.cancel();}finally{reader.releaseLock();}}})();
 }});
}
