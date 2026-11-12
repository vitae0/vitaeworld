import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecipe,recipeFromQuery,recipeQuery} from '../src/scene-recipe.js';
import {worldStateKey,parseSavedStates,serialiseSavedStates} from '../src/world-persistence.js';
import {generateBuilding} from '../src/building.js';
import {createInteractionSystem} from '../src/interactions.js';
import {BUILDING_PROGRAM_IDS} from '../src/building-programs.js';

test('URL roundtrip preserves exact deterministic building recipe',()=>{
 const input={seed:'my-world-2026',style:'villa',program:'boutique_hotel',interior:'sleek'};
 assert.deepEqual(recipeFromQuery(recipeQuery(input)),input);
 assert.deepEqual(recipeFromQuery(recipeQuery(input,'?qaFacing=1')),input);
 assert.ok(recipeQuery(input,'?qaFacing=1').includes('qaFacing=1'));
 const a=generateBuilding(input.seed,input.style,2,input.program,input.interior);
 const parsed=recipeFromQuery(recipeQuery(input));
 const b=generateBuilding(parsed.seed,parsed.style,2,parsed.program,parsed.interior);
 assert.deepEqual(a.stories.map(s=>s.layout.props),b.stories.map(s=>s.layout.props));
 assert.deepEqual(a.stories.map(s=>s.layout.doors),b.stories.map(s=>s.layout.doors));
});
test('corrupt or malicious URL values cannot name invalid styles or programmes',()=>{
 const recipe=recipeFromQuery('?seed=x&style=../evil&program=unknown');
 assert.deepEqual(recipe,{seed:'x',style:'auto',program:'family_house',interior:'auto'});
 assert.equal(normalizeRecipe({seed:'x'.repeat(200)}).seed.length,80);
 assert.equal(BUILDING_PROGRAM_IDS.length,36);
});
test('local state ignores unknown models, malformed JSON and wrong versions',()=>{
 assert.deepEqual(parseSavedStates('invalid'),{});
 assert.deepEqual(parseSavedStates('{"version":9,"states":{"a":true}}'),{});
 assert.deepEqual(parseSavedStates('{"version":1,"states":[]}'),{});
 const raw=serialiseSavedStates({'0:door:1':true,'0:door:2':false,'x':'on'});
 assert.deepEqual(parseSavedStates(raw),{'0:door:1':true,'0:door:2':false});
 assert.notEqual(worldStateKey({seed:'one',style:'auto',program:'hotel'}),
  worldStateKey({seed:'two',style:'auto',program:'hotel'}));
});
test('restoring known interaction states does not restore forbidden poses',()=>{
 const building=generateBuilding('persist-interactions','compact',2,'family_house');
 const system=createInteractionSystem(building);
 const first=system.items.find(x=>x.kind==='door');
 assert.ok(first);
 const updates=system.importStates({
  [first.id]:true,'0:prop:not-real':true,[first.id+'x']:false,
  'none':'on'
 });
 assert.equal(updates.length,1);
 assert.equal(updates[0].item.id,first.id);
 assert.equal(system.state(first),true);
 assert.equal(system.activePose,null);
 const states=system.exportStates();
 const newSystem=createInteractionSystem(building);
 const restored=newSystem.importStates(parseSavedStates(serialiseSavedStates(states)));
 assert.equal(newSystem.state(first),true);
 assert.ok(restored.length>0);
 assert.equal(newSystem.doorClosedAt(first.level,first.x,first.z,.25),false);
});
