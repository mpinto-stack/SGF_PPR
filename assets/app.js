
'use strict';
let DATA = null, FUNDS = [], ROWS = [], SUMMARY = [];
let sortState = {key:'retornoPct', dir:-1};
let LAST_POINTS = [];
const COLORS = ['#0369a1','#16a34a','#ea580c','#7c3aed','#dc2626','#ca8a04','#0d9488','#db2777','#2563eb','#65a30d','#e11d48','#9333ea','#0891b2','#d97706','#0f766e','#4f46e5','#15803d','#b91c1c','#0284c7','#059669'];
const el = id => document.getElementById(id);
function euro(x){return new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(x)}
function num(x,d=2){if(x===null||x===undefined||Number.isNaN(Number(x)))return '—';return Number(x).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d})}
function pct(x,d=2){if(x===null||x===undefined||Number.isNaN(Number(x)))return '—';return (x>=0?'+':'')+num(x,d)+'%'}
function datePT(d){ if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('pt-PT'); }
function daysBetween(a,b){ return Math.floor((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000); }

async function loadData(){
  const res = await fetch('./data/cotacoes.json', {cache:'no-store'});
  if(!res.ok) throw new Error('Não foi possível carregar data/cotacoes.json');
  DATA = await res.json();
  FUNDS = DATA.fundos || [];
  ROWS = (DATA.rows || []).map(r => [FUNDS.indexOf(r.fundo), r.data, Number(r.cotacao)]).filter(r => r[0] >= 0 && r[1] && Number.isFinite(r[2]));
  if(!ROWS.length) throw new Error('O ficheiro de dados está vazio. Corre o workflow no GitHub para descarregar o Excel da Golden SGF.');
  if(!DATA.min_date) DATA.min_date = ROWS.reduce((a,r)=>!a||r[1]<a?r[1]:a, null);
  if(!DATA.max_date) DATA.max_date = ROWS.reduce((a,r)=>!a||r[1]>a?r[1]:a, null);
  buildSummary();
}

function buildSummary(){
  SUMMARY = [];
  for(const f of FUNDS){
    const idx = FUNDS.indexOf(f);
    const arr = ROWS.filter(r => r[0] === idx).sort((a,b)=>a[1].localeCompare(b[1]));
    const pos = arr.filter(r => r[2] > 0);
    if(!arr.length) continue;
    const first = pos[0] || arr[0], last = pos[pos.length-1] || arr[arr.length-1];
    let ret=null, ann=null, vol=null, mdd=null;
    if(first[2] > 0 && last[2] > 0){
      ret=(last[2]/first[2]-1)*100;
      const days=Math.max((new Date(last[1])-new Date(first[1]))/86400000,1);
      ann=(Math.pow(last[2]/first[2],365/days)-1)*100;
      const returns=[]; for(let i=1;i<pos.length;i++) if(pos[i-1][2]>0) returns.push(pos[i][2]/pos[i-1][2]-1);
      if(returns.length>1){const mean=returns.reduce((a,b)=>a+b,0)/returns.length; const variance=returns.reduce((a,b)=>a+(b-mean)*(b-mean),0)/(returns.length-1); vol=Math.sqrt(variance)*Math.sqrt(252)*100;}
      let peak=-Infinity,minDD=0; for(const r of pos){peak=Math.max(peak,r[2]); minDD=Math.min(minDD,(r[2]/peak-1)*100)} mdd=minDD;
    }
    SUMMARY.push({f:idx,nome:f,inicio:first[1],fim:last[1],cotacaoInicial:first[2],cotacaoFinal:last[2],retornoPct:ret,anualizadoPct:ann,volPct:vol,maxDrawdownPct:mdd,n:arr.length});
  }
}

function dataStatus(){
  if(!DATA || !DATA.max_date) return {cls:'status-bad', title:'Sem dados', text:'Ainda não há cotações carregadas.'};
  const today = new Date().toISOString().slice(0,10);
  const age = Math.max(0, daysBetween(DATA.max_date, today));
  if(age <= 3) return {cls:'status-ok', title:'Dados atualizados', text:'Última cotação: '+datePT(DATA.max_date)+' · '+age+' dias'};
  if(age <= 7) return {cls:'status-warn', title:'Atenção à atualização', text:'Última cotação: '+datePT(DATA.max_date)+' · '+age+' dias'};
  return {cls:'status-bad', title:'Dados desatualizados', text:'Última cotação: '+datePT(DATA.max_date)+' · '+age+' dias'};
}
function renderStatus(){
  const s=dataStatus(), box=el('updateStatus');
  box.className='statusCard '+s.cls;
  box.innerHTML='<span class="statusDot"></span><div><b>'+s.title+'</b><small>'+s.text+'</small></div>';
  const upd = DATA.updated_at ? new Date(DATA.updated_at).toLocaleString('pt-PT') : '—';
  el('metaLine').textContent = `${ROWS.length.toLocaleString('pt-PT')} observações · ${FUNDS.length} fundos · ${DATA.min_date} a ${DATA.max_date} · workflow: ${upd}`;
}

function selectedFunds(){const a=[...el('fundSelect').selectedOptions].map(o=>Number(o.value));return a.length?a:[0]}
function filteredRows(){const fs=new Set(selectedFunds()), sd=el('startDate').value, ed=el('endDate').value, q=el('search').value.toLowerCase();return ROWS.filter(r=>fs.has(r[0])&&r[1]>=sd&&r[1]<=ed&&FUNDS[r[0]].toLowerCase().includes(q))}
function byFund(rows){const m=new Map();rows.forEach(r=>{if(!m.has(r[0]))m.set(r[0],[]);m.get(r[0]).push(r)});m.forEach(a=>a.sort((x,y)=>x[1].localeCompare(y[1])));return m}
function shiftDate(end, range){const d=new Date(end+'T00:00:00'); if(range==='1M') d.setMonth(d.getMonth()-1); if(range==='3M') d.setMonth(d.getMonth()-3); if(range==='1Y') d.setFullYear(d.getFullYear()-1); if(range==='5Y') d.setFullYear(d.getFullYear()-5); if(range==='YTD') return end.slice(0,4)+'-01-01'; return d.toISOString().slice(0,10);}
function setRange(range){let start=DATA.min_date, end=DATA.max_date; if(range!=='ALL') start=shiftDate(end,range); if(start<DATA.min_date) start=DATA.min_date; el('startDate').value=start; el('endDate').value=end; document.querySelectorAll('.quickRanges button').forEach(b=>b.classList.toggle('active',b.dataset.range===range)); update();}

function initControls(){
  renderStatus();
  for(const id of ['startDate','endDate','calcStart','calcEnd']){el(id).min=DATA.min_date;el(id).max=DATA.max_date;}
  el('startDate').value=DATA.min_date; el('endDate').value=DATA.max_date; el('calcStart').value=DATA.min_date; el('calcEnd').value=DATA.max_date;
  FUNDS.forEach((f,i)=>{const o=new Option(f,i);if(i===0)o.selected=true;el('fundSelect').add(o);el('calcFund').add(new Option(f,i))});
  ['fundSelect','startDate','endDate','metric','search','pageSize','page'].forEach(id=>el(id).addEventListener('input',update));
  document.querySelectorAll('.quickRanges button').forEach(b=>b.addEventListener('click',()=>setRange(b.dataset.range)));
  el('calcBtn').addEventListener('click',calculate); el('exportBtn').addEventListener('click',exportCSV);
  el('chart').addEventListener('mousemove',showTooltip); el('chart').addEventListener('touchmove',e=>{ if(e.touches[0]) showTooltip(e.touches[0]); }, {passive:true}); el('chart').addEventListener('mouseleave',()=>{el('tooltip').style.display='none'});
}

function update(){renderCards();drawChart();renderDataTable()}
function renderCards(){const rows=filteredRows(),m=byFund(rows),all=[];m.forEach(a=>{if(a.length>=2){const b=a.find(z=>z[2]>0)||a[0];all.push({f:a[0][0],ret:b[2]>0?(a[a.length-1][2]/b[2]-1)*100:0})}});all.sort((a,b)=>b.ret-a.ret);const best=all[0],worst=all[all.length-1];const cards=[['Fundos selecionados',m.size],['Observações',rows.length],['Melhor no período',best?FUNDS[best.f]:'—',best?pct(best.ret):''],['Pior no período',worst?FUNDS[worst.f]:'—',worst?pct(worst.ret):''],['Intervalo',datePT(el('startDate').value)+' → '+datePT(el('endDate').value)]];el('cards').innerHTML=cards.map(c=>'<div class="card"><b>'+c[0]+'</b><span>'+c[1]+'</span>'+(c[2]?'<div class="small">'+c[2]+'</div>':'')+'</div>').join('')}
function valueLabel(v){const m=el('metric').value;if(m==='quote')return num(v,6);if(m==='base100')return num(v,2);return pct(v,2)}
function drawChart(){const canvas=el('chart'),ctx=canvas.getContext('2d'),rect=canvas.getBoundingClientRect(),DPR=window.devicePixelRatio||1;canvas.width=rect.width*DPR;canvas.height=rect.height*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);const W=rect.width,H=rect.height,p={l:62,r:20,t:26,b:48};ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);LAST_POINTS=[];const rows=filteredRows(),m=byFund(rows),dates=[...new Set(rows.map(r=>r[1]))].sort();if(!dates.length){ctx.fillStyle='#64748b';ctx.font='15px system-ui';ctx.fillText('Sem dados para os filtros selecionados.',24,44);return;}let series=[],vals=[],ci=0;m.forEach((a,f)=>{const baseRow=a.find(z=>z[2]>0)||a[0],base=baseRow[2];let peak=-Infinity;const pts=a.map(r=>{let y=r[2];if(el('metric').value==='base100')y=base>0?r[2]/base*100:0;if(el('metric').value==='return')y=base>0?(r[2]/base-1)*100:0;if(el('metric').value==='drawdown'){peak=Math.max(peak,r[2]);y=peak>0?(r[2]/peak-1)*100:0}vals.push(y);return{d:r[1],raw:r[2],y:y}});series.push({f:f,pts:pts,color:COLORS[ci++%COLORS.length]})});let ymin=Math.min(...vals),ymax=Math.max(...vals);if(ymin===ymax){ymin-=1;ymax+=1}const yr=ymax-ymin;const x=d=>p.l+(dates.indexOf(d)/(Math.max(dates.length-1,1)))*(W-p.l-p.r);const y=v=>p.t+(ymax-v)/yr*(H-p.t-p.b);ctx.strokeStyle='#e5edf6';ctx.fillStyle='#64748b';ctx.font='12px system-ui';ctx.lineWidth=1;for(let i=0;i<=5;i++){const yy=p.t+i*(H-p.t-p.b)/5;ctx.beginPath();ctx.moveTo(p.l,yy);ctx.lineTo(W-p.r,yy);ctx.stroke();ctx.fillText(num(ymax-i*yr/5,el('metric').value==='quote'?3:1),8,yy+4)}for(let i=0;i<5;i++){const di=Math.round(i*(dates.length-1)/4);ctx.fillText(dates[di],p.l+i*(W-p.l-p.r)/4-30,H-17)}series.forEach(s=>{ctx.strokeStyle=s.color;ctx.lineWidth=2.4;ctx.beginPath();s.pts.forEach((pt,i)=>{const xx=x(pt.d),yy=y(pt.y);LAST_POINTS.push({x:xx,y:yy,date:pt.d,f:s.f,value:pt.y,raw:pt.raw,color:s.color});if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy)});ctx.stroke()});let lx=p.l,ly=18;series.slice(0,8).forEach(s=>{ctx.fillStyle=s.color;ctx.fillRect(lx,ly-9,10,10);ctx.fillStyle='#334155';ctx.fillText(FUNDS[s.f].slice(0,23),lx+14,ly);lx+=175;if(lx>W-180){lx=p.l;ly+=18}})}
function showTooltip(ev){if(!LAST_POINTS.length)return;const canvas=el('chart'),rect=canvas.getBoundingClientRect(),mx=ev.clientX-rect.left,my=ev.clientY-rect.top;let best=null,bd=1e9;for(const p of LAST_POINTS){const dx=p.x-mx,dy=p.y-my,d=Math.sqrt(dx*dx+dy*dy);if(d<bd){bd=d;best=p}}const tip=el('tooltip');if(!best||bd>38){tip.style.display='none';return}tip.innerHTML='<div><span class="dot" style="background:'+best.color+'"></span><b>'+FUNDS[best.f]+'</b></div><div class="muted">Data: '+datePT(best.date)+'</div><div class="value">Valor no gráfico: '+valueLabel(best.value)+'</div><div class="muted">Cotação: '+num(best.raw,6)+'</div>';tip.style.display='block';let left=best.x+14,top=best.y+14;if(left+340>rect.width)left=best.x-340;if(top+120>rect.height)top=best.y-120;tip.style.left=Math.max(8,left)+'px';tip.style.top=Math.max(8,top)+'px'}
function renderSummary(){const h=[['nome','Fundo'],['inicio','Início'],['fim','Fim'],['cotacaoInicial','Cot. inicial'],['cotacaoFinal','Cot. final'],['retornoPct','Retorno'],['anualizadoPct','Anualizado'],['volPct','Vol. anual'],['maxDrawdownPct','Max drawdown'],['n','N']];const arr=[...SUMMARY].sort((a,b)=>{const va=a[sortState.key],vb=b[sortState.key];if(typeof va==='string')return sortState.dir*va.localeCompare(vb);return sortState.dir*((va??-999999)-(vb??-999999))});el('summaryTable').innerHTML='<thead><tr>'+h.map(x=>'<th data-k="'+x[0]+'">'+x[1]+'</th>').join('')+'</tr></thead><tbody>'+arr.map(r=>'<tr>'+h.map(x=>{let v=r[x[0]];if(['inicio','fim'].includes(x[0]))v=datePT(v);if(['retornoPct','anualizadoPct','volPct','maxDrawdownPct'].includes(x[0]))v=pct(v);if(['cotacaoInicial','cotacaoFinal'].includes(x[0]))v=num(v,4);const cls=String(v).startsWith('+')?'pos':String(v).startsWith('-')?'neg':'';return '<td class="'+cls+'">'+v+'</td>'}).join('')+'</tr>').join('')+'</tbody>';el('summaryTable').querySelectorAll('th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;sortState.dir=sortState.key===k?-sortState.dir:1;sortState.key=k;renderSummary()})}
function renderDataTable(){const rows=filteredRows().sort((a,b)=>a[1].localeCompare(b[1])||FUNDS[a[0]].localeCompare(FUNDS[b[0]]));const ps=Number(el('pageSize').value),maxPage=Math.max(1,Math.ceil(rows.length/ps));if(Number(el('page').value)>maxPage)el('page').value=maxPage;const page=Math.max(1,Number(el('page').value));const sl=rows.slice((page-1)*ps,page*ps);el('tableInfo').textContent=rows.length.toLocaleString('pt-PT')+' linhas filtradas · página '+page+' / '+maxPage;el('dataTable').innerHTML='<thead><tr><th>Fundo</th><th>Data</th><th>Cotação</th></tr></thead><tbody>'+sl.map(r=>'<tr><td>'+FUNDS[r[0]]+'</td><td>'+datePT(r[1])+'</td><td>'+num(r[2],6)+'</td></tr>').join('')+'</tbody>'}
function lookup(f,date,mode){const a=ROWS.filter(r=>r[0]===f&&r[2]>0).sort((x,y)=>x[1].localeCompare(y[1]));if(!a.length)return null;if(mode==='start')return a.find(r=>r[1]>=date)||a[a.length-1];let out=a[0];for(const r of a){if(r[1]<=date)out=r;else break}return out}
function calculate(){const f=Number(el('calcFund').value),amount=Number(el('amount').value)||0,s=lookup(f,el('calcStart').value,'start'),e=lookup(f,el('calcEnd').value,'end');if(!s||!e){el('calcResult').innerHTML='<div class="card"><b>Sem dados válidos</b><span>—</span></div>';return}const units=amount/s[2],final=units*e[2],gain=final-amount,ret=(e[2]/s[2]-1)*100;el('calcResult').innerHTML='<div class="card"><b>Unidades</b><span>'+num(units,6)+'</span></div><div class="card"><b>Valor final</b><span>'+euro(final)+'</span></div><div class="card"><b>Ganho/perda</b><span class="'+(gain>=0?'pos':'neg')+'">'+euro(gain)+'</span></div><div class="card"><b>Retorno</b><span class="'+(ret>=0?'pos':'neg')+'">'+pct(ret)+'</span></div><div class="small" style="grid-column:1/-1">Cotação compra: '+num(s[2],6)+' em '+datePT(s[1])+' · cotação venda: '+num(e[2],6)+' em '+datePT(e[1])+' · Fundo: <span class="pill">'+FUNDS[f]+'</span></div>'}
function exportCSV(){const csvRows=filteredRows().map(r=>'"'+FUNDS[r[0]].replace(/"/g,'""')+'",'+r[1]+','+r[2]);const csv='Fundo,Data,Cotacao\n'+csvRows.join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dados_sgf_filtrados.csv';a.click();URL.revokeObjectURL(a.href)}
window.addEventListener('resize',drawChart);
loadData().then(()=>{initControls();renderSummary();update();calculate();}).catch(err=>{const status=el('updateStatus'); if(status){status.className='statusCard status-bad'; status.innerHTML='<span class="statusDot"></span><div><b>Erro nos dados</b><small>'+err.message+'</small></div>';} document.querySelector('main').innerHTML='<section class="panel error"><h2>Erro ao carregar dados</h2><p>'+err.message+'</p><p>Se estiveres a testar localmente, usa <code>python -m http.server 8000</code>. No GitHub, corre o workflow manualmente uma primeira vez.</p></section>'; console.error(err);});
