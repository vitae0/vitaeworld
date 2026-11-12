import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initPanels} from '../src/ui-panels.js';

function mockNode(){
 const handlers=new Map(),attributes=new Map();
 return {
  hidden:false,focused:false,attributes,
  addEventListener(name,fn){handlers.set(name,fn);},
  setAttribute(name,value){attributes.set(name,value);},
  focus(){this.focused=true;},
  fire(name,event={}){handlers.get(name)?.(event);}
 };
}
function setup(compact){
 const settingsPanel=mockNode(),mapPanel=mockNode();
 const settingsToggle=mockNode(),mapToggle=mockNode();
 const closeSettings=mockNode(),closeMap=mockNode(),documentRef=mockNode();
 const compactQuery=mockNode();
 compactQuery.matches=compact;
 const api=initPanels({settingsPanel,mapPanel,settingsToggle,mapToggle,
  closeSettings,closeMap,documentRef,compactQuery});
 return {api,settingsPanel,mapPanel,settingsToggle,mapToggle,
  closeSettings,closeMap,documentRef,compactQuery};
}
test('desktop sidebars start expanded and can collapse independently',()=>{
 const ui=setup(false);
 assert.equal(ui.settingsPanel.hidden,false);
 assert.equal(ui.mapPanel.hidden,false);
 assert.equal(ui.settingsToggle.attributes.get('aria-expanded'),'true');
 ui.settingsToggle.fire('click');
 assert.equal(ui.settingsPanel.hidden,true);
 assert.equal(ui.mapPanel.hidden,false);
 ui.mapToggle.fire('click');
 assert.equal(ui.mapPanel.hidden,true);
 ui.mapToggle.fire('click');
 assert.equal(ui.mapPanel.hidden,false);
 ui.closeMap.fire('click');
 assert.equal(ui.mapPanel.hidden,true);
 assert.equal(ui.mapToggle.focused,true);
});
test('phone starts unobstructed, switching panels is mutually exclusive',()=>{
 const ui=setup(true);
 assert.equal(ui.settingsPanel.hidden,true);
 assert.equal(ui.mapPanel.hidden,true);
 ui.settingsToggle.fire('click');
 assert.equal(ui.settingsPanel.hidden,false);
 assert.equal(ui.mapPanel.hidden,true);
 ui.mapToggle.fire('click');
 assert.equal(ui.settingsPanel.hidden,true);
 assert.equal(ui.mapPanel.hidden,false);
 assert.equal(ui.settingsToggle.attributes.get('aria-expanded'),'false');
 assert.equal(ui.mapToggle.attributes.get('aria-expanded'),'true');
 ui.documentRef.fire('keydown',{key:'Escape'});
 assert.equal(ui.settingsPanel.hidden,true);
 assert.equal(ui.mapPanel.hidden,true);
 ui.settingsToggle.fire('click');
 ui.closeSettings.fire('click');
 assert.equal(ui.settingsToggle.focused,true);
 assert.equal(ui.settingsPanel.hidden,true);
});
test('switching between desktop and mobile resets sensible default visibility',()=>{
 const ui=setup(false);
 ui.compactQuery.matches=true;
 ui.compactQuery.fire('change');
 assert.equal(ui.mapPanel.hidden,true);
 assert.equal(ui.settingsPanel.hidden,true);
 ui.compactQuery.matches=false;
 ui.compactQuery.fire('change');
 assert.equal(ui.mapPanel.hidden,false);
 assert.equal(ui.settingsPanel.hidden,false);
});
