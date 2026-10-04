'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(x,d=0)=>Number.isFinite(x)?x.toLocaleString(language==='en'?'en-US':'es-ES',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:'always'}):'—';
const usd=x=>Number.isFinite(x)?'$'+number(x,4):'—';
const families={google:'Google',anthropic:'Anthropic',openai:'OpenAI','z-ai':'Z.ai',qwen:'Qwen'};
const narratives={
 'google/gemini-3.8-flash':'La mejor nota de la muestra. Recupera casi todos los datos, pero todavía cambia algunas fechas y horas y desplaza observaciones entre vuelos.',
 'google/gemini-3.1-pro-preview':'Transcribe bien matrículas y pilotos. Su principal debilidad son las fechas: confunde días, meses y años. También desplaza comentarios entre filas.',
 'openai/gpt-6-astra':'Comete menos errores que Pro entre los valores que sí devuelve, pero deja más datos sin recuperar. Destacan las matrículas ausentes y las observaciones incorrectas.',
 'openai/gpt-6.1-sol':'Los fallos se concentran en matrículas y fechas. También confunde la aeronave en varias filas y algunos nombres de lugares.',
 'anthropic/claude-fable-5.1':'Mejora a Opus en esta muestra. Repite una matrícula mal leída en toda una página y deja matrículas y pilotos vacíos en otra. También omite observaciones.',
 'z-ai/glm-5.3-flash':'El mayor rendimiento por dólar, con un coste muy bajo. El compromiso es la fiabilidad: confunde fechas, aeronaves, matrículas y lugares, aunque deja pocos campos vacíos.',
 'anthropic/claude-opus-5.5':'Alterna errores y omisiones. Se repiten fallos en matrículas y lugares; en una página faltan los nombres de piloto. No siempre resuelve bien las repeticiones.',
 'qwen/qwen3.8-27b':'Los errores más frecuentes están en fechas y lugares. Además, atribuye datos a una línea tachada y deja sin recuperar varias funciones y observaciones.'
};
let data;
function winner(m,type){
 const best=type==='quality';
 const caption=best?`${m.counts.correct} datos correctos · ${m.counts.wrong} incorrectos · ${m.counts.omitted} omitido${m.counts.omitted===1?'':'s'}`:`${usd(m.costUSD/m.pages)} por foto · ${m.counts.wrong} datos incorrectos en la muestra`;
 return `<article class="winner ${type}"><p class="eyebrow">${best?'MEJOR CALIDAD':'MEJOR CALIDAD-PRECIO¹'}</p><h2>${esc(m.name)}</h2><div class="winner-number">${number(m.metrics.score,1)}<small>/100</small></div><p>${caption}</p></article>`;
}
let runsPromise;
let selection=0;
const loadRuns=()=>runsPromise??=fetch('./details.json').then(r=>{if(!r.ok)throw new Error('details');return r.json();}).then(d=>d.runs).catch(e=>{runsPromise=null;throw e;});
async function profile(id){
 const ticket=++selection;
 const m=data.models.find(m=>m.id===id);if(!m)return;
 $('model-profile').innerHTML=`<div class="profile-summary"><h3>${esc(m.name)}</h3><p>${esc(narratives[id])}</p></div><p role="status">Cargando detalle…</p>`;translateUI();
 try{
 const all=await loadRuns();if(ticket!==selection)return;
 const runs=all.filter(r=>r.model===id).sort((a,b)=>a.page-b.page);
 $('model-profile').innerHTML=`<div class="profile-summary"><h3>${esc(m.name)}</h3><p>${esc(narratives[id])}</p></div><div class="explore-controls"><label>Foto<select id="page-filter"><option value="all">Las tres fotos</option>${runs.map(r=>`<option value="${r.page}">Foto ${r.page} · ${r.counts.expectedFlights} vuelos</option>`).join('')}</select></label><label>Campo<select id="field-filter"><option value="all">Todos los campos</option>${Object.entries(data.fieldLabels).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label><label>Tipo de fallo<select id="kind-filter"><option value="all">Errores y omisiones</option><option value="wrong">Solo incorrectos</option><option value="omitted">Solo omitidos</option></select></label></div><div id="explore-summary"></div><div class="table-wrap"><table class="field-table"><thead><tr><th>Campo</th><th>Correctos</th><th>Incorrectos</th><th>Omitidos</th></tr></thead><tbody id="field-breakdown"></tbody></table></div><p class="table-note">Pulsa un campo para aislar sus fallos. Los vacíos correctos no suman puntos.</p><div id="page-breakdown"></div><div class="section-heading event-heading"><h3 id="event-title"></h3><span class="table-caption">Filas de la referencia validada</span></div><div id="event-list"></div><details class="method-details"><summary>Condiciones de estas ejecuciones <span>+</span></summary><div id="run-conditions"></div></details>`;
 function update(){
  const page=$('page-filter').value,field=$('field-filter').value,kind=$('kind-filter').value;
  const chosen=runs.filter(r=>page==='all'||r.page===Number(page));
  const fields=Object.keys(data.fieldLabels).filter(f=>field==='all'||f===field);
  const sums=Object.fromEntries(fields.map(f=>[f,chosen.reduce((a,r)=>{for(const k of ['correct','wrong','omitted'])a[k]+=r.byField[f][k];return a;},{correct:0,wrong:0,omitted:0})]));
  const counts=Object.values(sums).reduce((a,v)=>{for(const k in a)a[k]+=v[k];return a;},{correct:0,wrong:0,omitted:0});
  $('explore-summary').innerHTML=`<div class="explore-stats"><div><b>${counts.correct}</b><span>correctos</span></div><div><b class="wrong">${counts.wrong}</b><span>incorrectos</span></div><div><b class="omitted">${counts.omitted}</b><span>omitidos</span></div><div><b>${usd(chosen.reduce((s,r)=>s+r.costUSD,0)/chosen.length)}</b><span>USD / foto${chosen.length>1?' · media':''}</span></div></div>`;
  $('field-breakdown').innerHTML=Object.entries(sums).map(([f,v])=>`<tr><td><button class="field-button" data-field="${f}">${esc(data.fieldLabels[f])}</button></td><td>${v.correct}</td><td class="wrong">${v.wrong}</td><td class="omitted">${v.omitted}</td></tr>`).join('');
  document.querySelectorAll('[data-field]').forEach(b=>b.addEventListener('click',()=>{$('field-filter').value=b.dataset.field;update();}));
  $('page-breakdown').innerHTML=`<div class="page-cards">${chosen.map(r=>`<button class="page-card" data-page="${r.page}"><span>Foto ${r.page} · ${r.counts.expectedFlights} vuelos</span><b>${number(r.metrics.score,1)} <small>/100</small></b><span>${r.counts.wrong} incorrectos · ${r.counts.omitted} omitidos</span><span>${usd(r.costUSD)} USD</span></button>`).join('')}</div>`;
  document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{$('page-filter').value=b.dataset.page;update();}));
  const events=chosen.flatMap(r=>r.events.map(e=>({...e,page:r.page}))).filter(e=>(field==='all'||e.field===field)&&(kind==='all'||e.kind===kind));
  $('event-title').textContent=`${events.length} discrepancias${field!=='all'?' en '+data.fieldLabels[field].toLowerCase():''}`;
  $('event-list').innerHTML=events.length?events.map(e=>`<details class="event"><summary><span class="event-location">Foto ${e.page} · ${e.row===null?'fila extra':'vuelo '+e.row}</span><span>${esc(data.fieldLabels[e.field])}</span><span class="event-kind ${e.kind==='wrong'?'wrong':'omitted'}">${esc(e.category)}</span></summary><p>${esc(e.description)} ${e.row===null?'Fila '+e.outputRow+' de la salida del modelo.':''}</p></details>`).join(''):'<p class="empty-state">No hay discrepancias con estos filtros.</p>';
  $('run-conditions').innerHTML=chosen.map(r=>`<p class="condition"><b>Foto ${r.page}.</b> ${esc(r.configuration.provider)} · razonamiento: ${esc(({default:'por defecto',medium:'medio',low:'bajo',high:'alto'})[r.configuration.reasoning]??r.configuration.reasoning)} · límite de salida: ${number(r.configuration.outputTokenLimit)} tokens · ${r.configuration.schemaMode==='structured'?'formato estructurado':'formato solicitado en el prompt'} · ${number(r.latencySeconds,1)} s.</p>`).join('');
  translateUI();
 }
 ['page-filter','field-filter','kind-filter'].forEach(id=>$(id).addEventListener('change',update));update();
 }catch(e){if(ticket===selection)$('model-profile').innerHTML='<p role="alert">No se pudo cargar el detalle. Selecciona el modelo de nuevo para reintentar.</p>';translateUI();}
}
async function init(preserve=false){
 const selected=preserve?$('model-select').value:null;
 const filters=preserve?['page-filter','field-filter','kind-filter'].map(id=>[id,$(id)?.value]):[];
 try{
  if(!data){const response=await fetch('./data.json');if(!response.ok)throw new Error('data');data=await response.json();}
  const quality=data.models.find(m=>m.id===data.bestQuality),value=data.models.find(m=>m.id===data.bestValue);
  $('winners').innerHTML=winner(quality,'quality')+winner(value,'value');
  $('ranking').innerHTML=data.models.map((m,i)=>`<tr><td><div class="rank-name"><span class="rank-number">${String(i+1).padStart(2,'0')}</span><button class="model-button" data-model="${esc(m.id)}">${esc(m.name)}<span class="vendor">${esc(families[m.id.split('/')[0]])}</span></button></div></td><td class="score-cell"><span class="score-top">${number(m.metrics.score,1)}</span><span class="score-bar" aria-hidden="true"><span style="width:${m.metrics.score}%"></span></span></td><td class="wrong numeral">${m.counts.wrong}</td><td class="omitted numeral">${m.counts.omitted}</td><td class="numeral">${usd(m.costUSD/m.pages)}</td></tr>`).join('');
  $('model-select').innerHTML=data.models.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
  $('model-select').onchange=event=>profile(event.target.value);
  document.querySelectorAll('[data-model]').forEach(button=>button.addEventListener('click',()=>{$('model-select').value=button.dataset.model;profile(button.dataset.model);$('profile').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
  const astra=data.models.find(m=>m.id==='openai/gpt-6-astra'),pro=data.models.find(m=>m.id==='google/gemini-3.1-pro-preview');
  $('cost-comparison').innerHTML=`<div><p class="eyebrow">COSTE POR FOTO</p><h2>Pagar más no asegura leer mejor.</h2><p>Astra cuesta <strong>${number(astra.costUSD/pro.costUSD,1)} veces más</strong> que Gemini Pro en estas ejecuciones, con una nota de ${number(astra.metrics.score,1)} frente a ${number(pro.metrics.score,1)}.</p></div><div class="cost-pair"><div><span>Astra 6</span><b>${number(astra.costUSD/astra.pages*100,1)} ¢</b></div><div><span>Gemini 3.1 Pro</span><b>${number(pro.costUSD/pro.pages*100,1)} ¢</b></div><small>Centavos de USD / foto · coste observado</small></div>`;
  $('model-select').value=selected||data.bestQuality;
  translateUI();
  await profile(selected||data.bestQuality);
  if(preserve){for(const [id,value] of filters)if($(id)&&value)$(id).value=value; $('page-filter')?.dispatchEvent(new Event('change'));}
 }catch(error){$('winners').innerHTML='';$('error').hidden=false;$('error').textContent='No se pudieron cargar los resultados. Recarga la página para reintentar.';translateUI();}
}
$('language-select').value=language;
$('language-select').addEventListener('change',async event=>{
 language=event.target.value;
 try{localStorage.setItem('logbench-language',language);}catch{}
 translateUI();
 if(data)await init(true);
});
init();
