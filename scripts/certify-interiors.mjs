// Release-gate all 36 functional building programmes with 2 full stories.
// Headless structural validation, not a substitute for browser screenshots.
import {BUILDING_PROGRAM_IDS} from '../src/building-programs.js';
import {generateBuilding} from '../src/building.js';
import {auditBuildingInteriors} from '../src/interior-audit.js';

const selected=process.argv.includes('--quick')?
 BUILDING_PROGRAM_IDS.filter((_,i)=>i%3===0):BUILDING_PROGRAM_IDS;
const start=Date.now(),results=[],failures=[];
for(const id of selected){
 try{
  const building=generateBuilding('certify-'+id,'auto',2,id,'auto');
  const report=auditBuildingInteriors(building);
  const missing=report.floors.flatMap(f=>f.issues.map(issue=>({
   floor:f.floor,...issue
  })));
  const result={programme:id,style:building.interiorStyle,
   architecture:building.buildingType,
   score:report.score,rooms:building.rooms.length,
   finishParts:report.finishParts,passed:report.passed,
   issueCount:missing.length};
  results.push(result);
  if(!report.passed)failures.push({programme:id,issues:missing});
 }catch(error){
  failures.push({programme:id,error:String(error?.stack||error)});
 }
}
const summary={
 programmes:selected.length,
 good:selected.length-failures.length,
 failed:failures.length,
 totalFinishParts:results.reduce((sum,r)=>sum+r.finishParts,0),
 minScore:results.length?Math.min(...results.map(r=>r.score)):0,
 meanScore:results.length?+
  (results.reduce((sum,r)=>sum+r.score,0)/results.length).toFixed(2):0,
 elapsedMs:Date.now()-start,
 failures:failures.slice(0,12)
};
console.log(JSON.stringify(summary,null,2));
if(process.argv.includes('--strict')&&failures.length)
 process.exitCode=1;
