(() => {
  const ROUTES_KEY = 'vocabularies:concept-routes:v1';
  const ANNOTATIONS_KEY = 'vocabularies:route-annotations:v1';
  const page = document.querySelector('#routeCompare');
  if (!page) return;

  const escapeHtml = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))??fallback}catch{return fallback}}
  const routes = readJson(ROUTES_KEY,[]);
  const annotations = readJson(ANNOTATIONS_KEY,{});
  const params = new URLSearchParams(location.search);
  const a = Array.isArray(routes) ? routes.find(r=>r.id===params.get('a')) : null;
  const b = Array.isArray(routes) ? routes.find(r=>r.id===params.get('b')) : null;
  const label = item => item?.label || item?.id || '';
  const href = item => './concept-map.html?term=' + encodeURIComponent(item.id);
  const note = (route,index) => String(annotations?.[route.id]?.[index] ?? '').trim();

  function error(title,text){page.innerHTML='<section class="compare-error"><h1>'+escapeHtml(title)+'</h1><p>'+escapeHtml(text)+'</p><p><a href="./">語彙集へ戻る</a></p></section>'}
  if(!a||!b||!Array.isArray(a.items)||!Array.isArray(b.items)){error('比較するルートを見つけられませんでした。','Saved Routesから2本を選び直してください。');return}
  if(a.id===b.id){error('同じルートが選ばれています。','異なる2本を選んで比較してください。');return}

  const idsA=a.items.map(x=>x.id), idsB=b.items.map(x=>x.id);
  const commonSet=new Set(idsA.filter(id=>idsB.includes(id)));
  let prefix=0;
  while(prefix<Math.min(idsA.length,idsB.length)&&idsA[prefix]===idsB[prefix]) prefix++;
  const divergence = prefix < Math.max(idsA.length,idsB.length);
  const uniqueA = idsA.filter(id=>!idsB.includes(id)).length;
  const uniqueB = idsB.filter(id=>!idsA.includes(id)).length;

  function path(items){return items.map((item,index)=>(index?'<i>→</i>':'')+'<a href="'+href(item)+'">'+escapeHtml(label(item))+'</a>').join('')}
  function column(route,otherIds){
    return '<article class="route-column"><div class="route-column-head"><h3>'+escapeHtml(route.name)+'</h3><a href="./route-essay.html?route='+encodeURIComponent(route.id)+'">論考で読む →</a></div>'+
      route.items.map((item,index)=>{
        const shared=otherIds.includes(item.id); const memo=note(route,index);
        return '<section class="compare-step"><span class="compare-step-number">'+(index+1)+'</span><h4><a href="'+href(item)+'">'+escapeHtml(label(item))+'</a></h4>'+
          (shared?'<span class="compare-badge">共通概念</span>':'')+'<p class="compare-note'+(memo?'':' is-empty')+'">'+escapeHtml(memo||'注釈なし')+'</p></section>';
      }).join('')+'</article>';
  }

  function annotationContrast(items){
    if(!items.length) return '<p class="compare-loading">共通概念がないため、注釈の直接比較はありません。</p>';
    return '<div class="annotation-contrast-list">'+items.map(item=>{
      const indexA=idsA.indexOf(item.id), indexB=idsB.indexOf(item.id);
      const noteA=note(a,indexA), noteB=note(b,indexB);
      let state='両方とも注釈なし';
      if(noteA&&noteB) state=noteA===noteB?'同じ注釈':'注釈が異なる';
      else if(noteA||noteB) state='片方のみ注釈あり';
      return '<article class="annotation-contrast-card"><div class="annotation-contrast-head"><a href="'+href(item)+'">'+escapeHtml(label(item))+'</a><span>'+escapeHtml(state)+'</span></div><div class="annotation-pair">'+
        '<div><b>'+escapeHtml(a.name)+'</b><p class="'+(noteA?'':'is-empty')+'">'+escapeHtml(noteA||'注釈なし')+'</p></div>'+
        '<div><b>'+escapeHtml(b.name)+'</b><p class="'+(noteB?'':'is-empty')+'">'+escapeHtml(noteB||'注釈なし')+'</p></div>'+
      '</div></article>';
    }).join('')+'</div>';
  }

  const commonOrdered = a.items.filter(item=>commonSet.has(item.id));
  const divergenceLabel = divergence
    ? (prefix===0 ? '起点から異なる' : (prefix < a.items.length && prefix < b.items.length ? label(a.items[prefix-1])+'の次で分岐' : '一方のルートが先に終わる'))
    : '同じ順序';

  document.title=a.name+' × '+b.name+' — Route Compare — Vocabularies';
  page.innerHTML='<header><p class="compare-kicker">ROUTE COMPARE</p><h1 class="compare-title">'+escapeHtml(a.name)+'<br>× '+escapeHtml(b.name)+'</h1><p class="compare-lead">同じ概念を使っていても、順番や注釈が変われば思考の形は変わる。2本のルートを「何が同じか」ではなく「どこから違っていくか」で読む。</p>'+
    '<div class="compare-summary"><div class="compare-stat"><span>COMMON</span><strong>'+commonSet.size+'</strong></div><div class="compare-stat"><span>FIRST DIVERGENCE</span><strong style="font-size:15px">'+escapeHtml(divergenceLabel)+'</strong></div><div class="compare-stat"><span>UNIQUE</span><strong>'+uniqueA+' / '+uniqueB+'</strong></div></div></header>'+
    '<section class="compare-common"><p class="compare-kicker">SHARED CONCEPTS</p><h2>共通して通った言葉</h2>'+(commonOrdered.length?'<div class="common-path">'+path(commonOrdered)+'</div>':'<p class="compare-loading">共通する概念はありません。</p>')+'</section>'+
    '<section class="compare-annotations"><p class="compare-kicker">ANNOTATION CONTRAST</p><h2>同じ言葉を、どう違って読んだか</h2>'+annotationContrast(commonOrdered)+'</section>'+
    '<section class="compare-split"><p class="compare-kicker">SIDE BY SIDE</p><h2>二つの道筋を並べる</h2><div class="split-grid">'+column(a,idsB)+column(b,idsA)+'</div></section>';
})();
