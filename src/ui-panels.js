// Independent on desktop, mutually exclusive on phones so the 3D viewport
// remains clear and the movement joystick never sits beneath a modal panel.
export function initPanels({
 settingsPanel,mapPanel,settingsToggle,mapToggle,closeSettings,closeMap,
 compactQuery,documentRef
}){
 const panels={settings:settingsPanel,map:mapPanel};
 const toggles={settings:settingsToggle,map:mapToggle};
 const expanded={settings:!compactQuery.matches,map:!compactQuery.matches};
 const render=()=>{
  for(const key of ['settings','map']){
   panels[key].hidden=!expanded[key];
   toggles[key].setAttribute('aria-expanded',String(expanded[key]));
  }
 };
 const setOpen=(key,open)=>{
  expanded[key]=Boolean(open);
  if(compactQuery.matches&&open)expanded[key==='settings'?'map':'settings']=false;
  render();
 };
 const toggle=(key)=>setOpen(key,!expanded[key]);
 const changeMode=()=>{
  expanded.settings=!compactQuery.matches;
  expanded.map=!compactQuery.matches;
  render();
 };
 const onEsc=(e)=>{
  if(e.key!=='Escape')return;
  if(!expanded.settings&&!expanded.map)return;
  expanded.settings=false;expanded.map=false;
  render();
 };
 settingsToggle.addEventListener('click',()=>toggle('settings'));
 mapToggle.addEventListener('click',()=>toggle('map'));
 closeSettings.addEventListener('click',()=>{
  setOpen('settings',false);settingsToggle.focus();
 });
 closeMap.addEventListener('click',()=>{
  setOpen('map',false);mapToggle.focus();
 });
 documentRef.addEventListener('keydown',onEsc);
 compactQuery.addEventListener?.('change',changeMode);
 render();
 return {setOpen,toggle,getOpen:(key)=>Boolean(expanded[key])};
}
