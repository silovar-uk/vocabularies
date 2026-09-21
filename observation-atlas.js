(()=>{
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function openTerm(id){const el=document.querySelector('[data-open-term="'+CSS.escape(id)+'"]');if(el){el.click();return} location.hash=id}
function initAtlas(){
 const items=window.vocabularyStudyItems||[]; if(!items.length)return;
 const recentIds=["epistemic-injustice","modifiable-areal-unit-problem","dot-gain","cardinality-estimation","creep","metalepsis","referential-transparency","ecological-succession"];
 const featured=recentIds.map(id=>items.find(x=>x.id===id)).filter(Boolean).slice(0,6);
 const today=featured[0]||items[items.length-1];
 const t=document.querySelector("#atlasToday");
 if(t&&today)t.innerHTML='<button type="button" data-atlas-open="'+esc(today.id)+'"><span><p class="atlas-today-axis">'+esc(today.observation_axis||today.one_liner)+'</p><p class="atlas-today-name">'+esc(today.ja||today.term)+' <span lang="en">/ '+esc(today.term)+'</span></p></span><span class="atlas-arrow">↗</span></button>';
 const g=document.querySelector("#atlasGrid");
 if(g)g.innerHTML=featured.map((x,i)=>'<button class="atlas-card" type="button" data-atlas-open="'+esc(x.id)+'"><span class="atlas-card-index">0'+(i+1)+' · OBSERVE</span><span class="atlas-card-axis">'+esc(x.observation_axis||x.one_liner)+'</span><span class="atlas-card-name">'+esc(x.ja||x.term)+' / '+esc(x.term)+'</span>'+(x.id==="dot-gain"?'<span class="atlas-visual"><span class="atlas-visual-dot"></span><span>→</span><span class="atlas-visual-dot after"></span></span>':'')+'</button>').join("");
 const counts=new Map();items.forEach(x=>(x.fields||[]).forEach(f=>counts.set(f,(counts.get(f)||0)+1)));
 const rare=[...counts].sort((a,b)=>a[1]-b[1]).slice(0,12).map(x=>x[0]);
 const labels=document.querySelectorAll(".frontier-label");labels.forEach((n,i)=>n.textContent=rare[i]||["地質","法","印刷","物語"][i]);
 const candidates=items.filter(x=>(x.fields||[]).some(f=>rare.includes(f)));
 const unexplored=candidates[Math.floor(Math.random()*Math.max(1,candidates.length))]||items[Math.floor(Math.random()*items.length)];
 const btn=document.querySelector("#frontierGo");if(btn){btn.dataset.atlasOpen=unexplored.id;btn.textContent="未踏地へ行く →";}
 document.addEventListener("click",e=>{const b=e.target.closest("[data-atlas-open]");if(b)openTerm(b.dataset.atlasOpen)});
}
window.addEventListener("vocabulary-items-ready",initAtlas,{once:true});
if(window.vocabularyStudyItems?.length)initAtlas();
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();document.querySelector("#searchInput")?.focus();}});
})();