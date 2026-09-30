import test from 'node:test';
import assert from 'node:assert/strict';
import {panelPreference,panelMetrics} from '../oefenen/js/document-panel.mjs';

test('Source reader preferences are distinct from the exam column range',()=>{
  assert.equal(panelPreference(null),100/3);
  assert.equal(panelPreference({width:42}),42);
  assert.equal(panelPreference({width:75}),100/3);
  assert.equal(panelPreference(null,true),75);
  assert.equal(panelPreference({width:42},true),75);
  assert.equal(panelPreference({width:55},true),55);
  assert.equal(panelPreference({width:85},true),85);
  for(const width of [NaN,Infinity,'75',54,86])assert.equal(panelPreference({width},true),75);
});

test('Sources receive most of the available width while the list remains usable',()=>{
  assert.deepEqual(panelMetrics(1600,undefined,false,true),{stacked:false,width:1200});
  assert.deepEqual(panelMetrics(1200,75,false,true),{stacked:false,width:900});
  for(const available of [720,800,1000,1600,2400])for(const preference of [55,75,85]){
    const result=panelMetrics(available,preference,false,true);
    assert.equal(result.stacked,false);
    assert.ok(result.width>=360);
    assert.ok(available-result.width-14>=240);
  }
  assert.deepEqual(panelMetrics(800,85,false,true),{stacked:false,width:546});
});

test('Narrow source pages stack the full-width PDF instead of squeezing columns',()=>{
  for(const available of [0,320,393,614,719])assert.deepEqual(panelMetrics(available,75,false,true),{stacked:true,width:available});
  assert.equal(panelMetrics(720,75,false,true).stacked,false);
});

test('Exam and question column metrics retain their existing dimensions',()=>{
  assert.deepEqual(panelMetrics(1200),{stacked:false,width:400});
  assert.deepEqual(panelMetrics(1200,50),{stacked:false,width:600});
  assert.deepEqual(panelMetrics(1200,20),{stacked:false,width:320});
  assert.deepEqual(panelMetrics(859,40),{stacked:true,width:859});
  assert.deepEqual(panelMetrics(900,50,true),{stacked:false,width:326});
  assert.deepEqual(panelMetrics(900,50,.6),{stacked:true,width:900});
  assert.deepEqual(panelMetrics(1600,85,true),{stacked:false,width:800});
});
