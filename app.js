const SJ=[37.3382,-121.8863],$=s=>document.querySelector(s);
const ls=(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let P=[],W=new Set(ls('wish',[])),V=new Set(ls('vis',[])),T=ls('trip',[]),map,cl,mcat='',SHOW=Infinity;
const km=(a,b,c,d)=>{const r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 6371*2*Math.asin(Math.sqrt(x))};
const mi=p=>Math.round(p.km*0.621371).toLocaleString('en-US');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CAT={sf_bay:['SF Bay Area','SF BAY AREA','sf',''],california:['Rest of California','CALIFORNIA','ca','ca'],usa:['Other US','USA','usa','usa'],international:['International','INTERNATIONAL','international','international']};const cat=p=>{const k=CAT[p.category]||CAT.california;return p.mine?['My pick · '+k[0],'★ MY PICK · '+k[1],'mine','mine']:k};
const inCat=(p,c)=>!c||(c=='mine'?!!p.mine:c=='world'?p.category!='sf_bay':p.category==c);
let WK={};const pid=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const big=(u,w)=>{if(!u)return u;u=u.split('?')[0];return /\/thumb\//.test(u)?u.replace(/\/(\d+)px-([^/]+)$/,(m,n,f)=>`/${Math.max(+n,w)}px-${f}`):u};
const imgTag=(wi,w,cls,alt)=>`<img class="${cls}" src="${esc(big(wi.thumb,w))}" data-fb="${esc((wi.thumb||'').split('?')[0])}" alt="${esc(alt)}" loading="lazy" onerror="if(this.dataset.fb&&this.src!==this.dataset.fb){this.src=this.dataset.fb}else{this.remove()}">`;
const dir=p=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
document.documentElement.dataset.theme=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme=='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem('theme',t)};
document.querySelectorAll('nav [data-v]').forEach(b=>b.onclick=()=>show(b.dataset.v));
function show(v){document.querySelectorAll('nav [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v==v));document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==v));history.replaceState(null,'','#'+v);if(v=='map')initMap();if(v=='trip')rTrip()}
function acts(i,noMap){const p=P[i];return `<button class="btn" onclick="tg(W,'wish',${i})" aria-label="Wishlist">${W.has(p.name)?'❤️':'🤍'} Wishlist</button><button class="btn" onclick="tg(V,'vis',${i})">${V.has(p.name)?'✅':'⬜'} Visited</button><button class="btn" onclick="addT(${i})">➕ Trip</button><button class="btn" onclick="wx(${i})">🌤 Weather</button>${noMap?'':`<button class="btn" onclick="fly(${i})">📍 Map</button>`}<a class="btn" href="${dir(p)}" target="_blank" rel="noopener">🧭 Directions</a>`}
function tg(s,k,i){const n=P[i].name;s.has(n)?s.delete(n):s.add(n);sv(k,[...s]);render();if(sel===i)panel(i);if(map)map.closePopup();if(pdI===i)rPD(i,WK[pid(P[i].name)])}
function addT(i){if(!T.includes(P[i].name)){T.push(P[i].name);sv('trip',T)}$('#wx').textContent=`➕ Added ${P[i].name} to your trip (${T.length} stops).`;if($('#pdwx'))$('#pdwx').textContent=`➕ Added to your trip (${T.length} stops).`}
function fly(i){if($('#pd').open)$('#pd').close();show('map');setTimeout(()=>{if(!cl)return;const p=P[i];if(mcat&&p.category!=mcat)setCat('');cl.zoomToShowLayer(p.mk,()=>{p.mk.openPopup();panel(i)})},250)}
async function wx(i){const p=P[i];$('#wx').textContent=`Loading weather for ${p.name}…`;$('#wx').scrollIntoView({behavior:'smooth',block:'nearest'});
try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`);const c=(await r.json()).current;
const code={0:'☀️ Clear',1:'🌤 Mostly clear',2:'⛅ Partly cloudy',3:'☁️ Overcast',45:'🌫 Fog',48:'🌫 Fog',51:'🌦 Drizzle',53:'🌦 Drizzle',55:'🌦 Drizzle',61:'🌧 Rain',63:'🌧 Rain',65:'🌧 Heavy rain',71:'🌨 Snow',80:'🌦 Showers',81:'🌦 Showers',95:'⛈ Thunderstorm'}[c.weather_code]||'🌡';
const wt=`<b>${esc(p.name)}</b> — ${code}, ${Math.round(c.temperature_2m)}°F (feels ${Math.round(c.apparent_temperature)}°F), wind ${Math.round(c.wind_speed_10m)} mph`;if($('#pdwx'))$('#pdwx').innerHTML='🌤 '+wt;$('#wx').innerHTML=`<b>${esc(p.name)}</b> — ${code}, ${Math.round(c.temperature_2m)}°F (feels ${Math.round(c.apparent_temperature)}°F), wind ${Math.round(c.wind_speed_10m)} mph`}catch(e){$('#wx').textContent='Weather unavailable right now.'}}
const card=(p,i,rank)=>{const k=cat(p);const wi=WK[pid(p.name)];const hasI=wi&&wi.thumb;const im=hasI?' img"':'"';return `<article class="card" tabindex="0" data-i="${i}" aria-label="Open details for ${esc(p.name)}"><div class="ph ${k[2]}${im}>${hasI?imgTag(wi,500,'phi','Photo of '+wi.title):''}<span>${k[1]} · ${mi(p)} MI FROM SAN JOSE</span></div><div class="bd"><div class="top"><div><span class="tag ${k[3]}">${p.mine?'★ My pick':p.category=='california'?'California':k[0]}</span><h3 style="margin-top:8px">${esc(p.name)}</h3></div>${p.mine?`<span class="rank mine" title="Added by you">★</span>`:rank?`<span class="rank" title="Rank by save count">#${rank}</span>`:''}</div><div class="m">📍 ${esc([p.city,p.region].filter(Boolean).join(', ')||p.country||'')} · ${p.mine?'added by you':`saved ${p.mentions}×`} · ${mi(p)} mi from San Jose</div><p class="d">${esc(p.description)}</p><div class="m">${(p.urls||[]).map((u,k)=>`<a href="${esc(u)}" target="_blank" rel="noopener">Post ${k+1}</a>`).join(' · ')}</div><div class="foot">${p.mine?'<span class="saved mine">My pick</span>':`<span class="saved">Saved ${p.mentions}×</span>`}${acts(i)}${p.mine?mineActs(i):''}</div></div></article>`};
function render(){const q=$('#q').value.toLowerCase().trim(),c=$('#cat').value,ci=$('#city').value,co=$('#country').value,sr=$('#src').value,st=$('#st').value,so=$('#sort').value;
let L=P.map((p,i)=>[p,i]).filter(([p])=>(!q||(p.name+' '+p.city+' '+(p.region||'')+' '+(p.country||'')+' '+p.description).toLowerCase().includes(q))&&inCat(p,c)&&(!co||p.country==co)&&(!sr||p.source==sr||(sr!='both'&&sr!='mine'&&p.source=='both'))&&(!ci||p.city==ci)&&(!st||(st=='w'?W.has(p.name):st=='v'?V.has(p.name):!V.has(p.name))));
L.sort(so=='d'?(a,b)=>a[0].km-b[0].km:so=='a'?(a,b)=>a[0].name.localeCompare(b[0].name):(a,b)=>(a[0].rank||0)-(b[0].rank||0)||(b[0].created||'').localeCompare(a[0].created||''));
$('#cnt').textContent=`${L.length} of ${P.length} places`;
$('#grid').innerHTML=L.slice(0,SHOW).map(([p,i])=>card(p,i,p.rank)).join('');$('#empty').hidden=L.length>0;$('#moreB').hidden=$('#allB').hidden=L.length<=SHOW;$('#fewB').hidden=!(SHOW>24&&L.length>24);

$('#sTot').textContent=P.length;if($('#sM'))$('#sM').textContent=P.filter(p=>p.mine).length;$('#sSf').textContent=P.filter(p=>p.category=='sf_bay').length;$('#sCa').textContent=P.filter(p=>p.category=='california').length;$('#sUs').textContent=P.filter(p=>p.category=='usa').length;$('#sIn').textContent=P.filter(p=>p.category=='international').length;$('#sW').textContent=W.size;$('#sV').textContent=V.size}
$('#moreB').onclick=()=>{SHOW+=24;render()};$('#allB').onclick=()=>{SHOW=Infinity;render()};$('#fewB').onclick=()=>{SHOW=24;render();$('#grid').scrollIntoView({block:'start'})};
['q','cat','country','src','city','st','sort'].forEach(id=>$('#'+id).addEventListener('input',render));
let sel=null;
function nearList(lat,lng,ex){return P.map((p,i)=>[i,km(lat,lng,p.lat,p.lng)]).filter(([i])=>i!==ex).sort((a,b)=>a[1]-b[1]).slice(0,5).map(([i,d])=>`<li><button onclick="fly(${i})"><span>${esc(P[i].name)}</span><span class="m">${(d*0.621371).toFixed(d<16?1:0)} mi</span></button></li>`).join('')}
function panel(i){sel=i;const p=P[i];$('#panel').innerHTML=`<span class="kicker">${cat(p)[0]} · ${p.mine?'added by you':`saved ${p.mentions}×`}</span><h3>${esc(p.name)}</h3><div class="m">📍 ${esc(p.city)} · ${mi(p)} mi from San Jose</div><p>${esc(p.description)}</p><div class="m">${(p.urls||[]).map((u,k)=>`<a href="${esc(u)}" target="_blank" rel="noopener">Instagram post ${k+1}</a>`).join(' · ')}</div><div class="foot" style="border:0;padding:0">${acts(i,1)}${p.mine?mineActs(i):''}</div><span class="kicker" style="margin-top:8px">Nearby saves</span><ul class="near">${nearList(p.lat,p.lng,i)}</ul>`}
function setCat(c){mcat=c;document.querySelectorAll('#mcat button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c==c));if(!cl)return;cl.clearLayers();cl.addLayers(P.filter(p=>inCat(p,c)).map(p=>p.mk))}
document.querySelectorAll('#mcat button').forEach(b=>b.onclick=()=>setCat(b.dataset.c));
document.querySelectorAll('#mview button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#mview button').forEach(x=>x.setAttribute('aria-pressed',x==b));if(!map)return;b.dataset.z=='sj'?map.setView(SJ,9):b.dataset.z=='all'?map.fitBounds([[32.5,-124.5],[42,-114.1]],{padding:[20,20]}):map.fitBounds(L.latLngBounds(P.map(p=>[p.lat,p.lng])),{padding:[30,30]})});
function initMap(){if(map){map.invalidateSize();return}
if(!window.L||!L.markerClusterGroup){$('#fb').style.display='block';return}
map=L.map('lmap').setView(SJ,9);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
L.circleMarker(SJ,{radius:10,color:'#fff',weight:3,fillColor:'#3b6fd8',fillOpacity:1}).addTo(map).bindPopup('<b>You are here</b><br>San Jose, CA').openPopup();
cl=L.markerClusterGroup();mkMarkers();map.addLayer(cl);map.on('click',e=>window.mapAddAt&&mapAddAt(e.latlng));}
function mkMarkers(){P.forEach((p,i)=>{p.mk=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:p.mine?'<span class="pin mine"><i>★</i></span>':`<span class="pin ${cat(p)[3]}"></span>`,iconSize:[18,18],iconAnchor:[9,18],popupAnchor:[0,-16]}),title:p.name}).bindPopup(()=>`<div class="pop"><b>${esc(p.name)}</b><br><small>${esc(p.city)} · ${mi(p)} mi from San Jose</small>${p.mine?'<b style="color:#c2255c;font-size:.8rem">★ My pick</b>':''}<p>${esc(p.description)}</p>${p.urls&&p.urls[0]?`<a href="${esc(p.urls[0])}" target="_blank" rel="noopener">Instagram post</a><br>`:''}<div style="margin-top:6px">${acts(i,1)}${p.mine?mineActs(i):''}</div></div>`,{maxWidth:280}).on('click',()=>panel(i))});setCat(mcat)}
let pdI=null;
async function wikiFor(p){const id=pid(p.name);if(WK[id])return WK[id];const ss='wk2_'+id;const c=sessionStorage.getItem(ss);if(c)return WK[id]=JSON.parse(c);
 let r={none:true};try{r=await wikiMatch(p)}catch(e){r={none:true}}
 sessionStorage.setItem(ss,JSON.stringify(r));return WK[id]=r}
// Same rules as scripts/enrich.py: close title match (location qualifiers / generic words allowed), article within 40 km (80 km for parks/regions), no settlement-for-feature mismatches.
const GENERIC=new Set('park state national museum historic historical site beach trail falls island preserve area recreation regional county city monument memorial garden gardens center'.split(' '));
const WIDE=/park|forest|national|wilderness|island|county|city|town|village|valley|coast|canyon|range|mountains|desert|lake|bay|region|monument|seashore|recreation/i;
const SETTLE=/census-designated|unincorporated community|neighbou?rhood|^(city|town|village) in|^creek|creek in/i,FEAT=/\b(park|parks|beach|preserve|trail|lakes|national|monument)\b/i;
const wnorm=s=>(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/\(.*?\)/g,' ').split(',')[0].replace(/\bmt\b\.?/g,'mount').replace(/\bst\b\.?/g,'saint').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(w=>w&&w!='the').join(' ');
function lev(a,b){const m=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=m[0];m[0]=i;for(let j=1;j<=b.length;j++){const t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,p+(a[i-1]==b[j-1]?0:1));p=t}}return 1-m[b.length]/Math.max(a.length,b.length,1)}
function wsim(a,b,ctx){a=wnorm(a);b=wnorm(b);if(!a||!b)return 0;if(a==b)return 1;const ta=new Set(a.split(' ')),tb=new Set(b.split(' '));const[s,g]=ta.size<=tb.size?[ta,tb]:[tb,ta];const extra=[...g].filter(x=>!s.has(x));
 if([...s].every(x=>g.has(x))&&extra.every(x=>GENERIC.has(x)||ctx.has(x))&&[...s].join('').length>=4)return .9;const diff=[...ta,...tb].filter(x=>!(ta.has(x)&&tb.has(x)));const r=lev(a,b);return diff.every(x=>GENERIC.has(x)||ctx.has(x))||r>=.9?r:0}
const wget=async u=>{const r=await fetch(u);return r.ok?r.json():null};
async function wikiMatch(p){const ctx=new Set(wnorm([p.city,p.region,p.country].filter(Boolean).join(' ')).split(' '));const cands=[p.name];
 const g=await wget(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${p.lat}|${p.lng}&gsradius=10000&gslimit=30&format=json&origin=*`);
 (g?.query?.geosearch||[]).map(x=>[wsim(p.name,x.title,ctx),x.title]).filter(x=>x[0]>=.82).sort((a,b)=>b[0]-a[0]).forEach(x=>cands.push(x[1]));
 const q=await wget(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent([p.name,p.city,p.region].filter(Boolean).join(' '))}&srlimit=5&format=json&origin=*`);
 (q?.query?.search||[]).filter(x=>wsim(p.name,x.title,ctx)>=.82).forEach(x=>cands.push(x.title));
 for(const t of [...new Set(cands)].slice(0,6)){const s=await wget('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(t.replace(/ /g,'_')));
  if(!s||s.type=='disambiguation'||!s.coordinates)continue;if(wsim(p.name,s.title,ctx)<.82)continue;
  if(FEAT.test(p.name)&&SETTLE.test(s.description||'')&&wnorm(s.title)!=wnorm(p.name))continue;
  const lim=WIDE.test(p.name+' '+(s.description||''))?80:40;if(km(p.lat,p.lng,s.coordinates.lat,s.coordinates.lon)>lim)continue;
  return{title:s.title,url:s.content_urls?.desktop?.page,extract:s.extract,description:s.description,thumb:s.thumbnail?.source,image:s.originalimage?.source,runtime:true}}
 return{none:true}}
async function openPD(i){pdI=i;const p=P[i];const d=$('#pd');rPD(i,WK[pid(p.name)]);if(!d.open)d.showModal();if(!WK[pid(p.name)]){const w=await wikiFor(p);if(pdI===i)rPD(i,w)}}
function rPD(i,w){const p=P[i],k=cat(p),ok=w&&w.title;const ph=ok&&(w.thumb||w.image);
 const cr=w&&w.credit;const srcs={sf_places:'SF Places to visit',traveling:'Traveling',both:'SF Places to visit + Traveling'}[p.source]||'';
 $('#pdB').innerHTML=`${ph?`<div class="pdh">${imgTag(w,1280,'pdi','Photo of '+w.title)}</div><div class="cred">Photo: ${cr?`${cr.artist&&cr.artist!='Unknown'?esc(cr.artist)+' · ':''}${cr.license?esc(cr.license)+' · ':''}<a href="${esc(cr.file)}" target="_blank" rel="noopener">Wikimedia Commons</a>`:`<a href="${esc(w.url)}" target="_blank" rel="noopener">via Wikipedia</a>`}</div>`:`<div class="pdh none"><span>🏞️</span>No photo available for this place</div>`}
 <div class="pdc"><div><span class="tag ${k[3]}">${p.mine?'★ My pick':p.category=='california'?'California':k[0]}</span> ${p.mine?'':`<span class="rank" style="font-size:1.1rem">#${p.rank}</span>`}</div><h2 id="pdT">${esc(p.name)}</h2>
 <div class="why"><b>Why it's special</b>${ok&&w.extract?`<p>${esc(w.extract)}</p><div class="src">Summary from <a href="${esc(w.url)}" target="_blank" rel="noopener">Wikipedia: ${esc(w.title)}</a> (CC BY-SA)</div>`:''}${p.description?`<p>${esc(p.description)}</p><div class="src">${p.mine?'My note':'From my saved Instagram posts'}</div>`:''}</div>
 <dl class="facts"><dt>Location</dt><dd>📍 ${esc([p.city,p.region,p.country].filter(Boolean).join(', '))}</dd>${ok&&w.description?`<dt>Type</dt><dd>${esc(w.description)}</dd>`:''}<dt>From San Jose</dt><dd>${mi(p)} mi (straight line)</dd>${p.mine?`<dt>Added</dt><dd>By you${p.created?' on '+new Date(p.created).toLocaleDateString():''}${p.address?' · '+esc(p.address):''}${p.otype?' · OSM type: '+esc(p.otype):''}</dd>`:`<dt>Saved</dt><dd>${p.mentions}× · rank #${p.rank}${srcs?' · '+srcs:''}</dd>`}${ok&&w.website?`<dt>Website</dt><dd><a href="${esc(w.website)}" target="_blank" rel="noopener">${esc(w.website.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))}</a></dd>`:''}${ok&&w.url?`<dt>Wikipedia</dt><dd><a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.title)}</a></dd>`:''}<dt>Coordinates</dt><dd>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</dd><dt>Instagram</dt><dd>${(p.urls||[]).map((u,k)=>`<a href="${esc(u)}" target="_blank" rel="noopener">Post ${k+1}</a>`).join(' · ')||'—'}</dd></dl>
 <div class="foot" style="border:0;padding:0">${acts(i)}${p.mine?mineActs(i):''}</div><div class="m" id="pdwx"></div></div>`}
$('#pdX').onclick=()=>$('#pd').close();$('#pd').addEventListener('click',e=>{if(e.target.id=='pd')$('#pd').close()});$('#pd').addEventListener('close',()=>pdI=null);
document.addEventListener('click',e=>{const c=e.target.closest('.card');if(!c||e.target.closest('button,a,select,input'))return;openPD(+c.dataset.i)});
document.addEventListener('keydown',e=>{if((e.key=='Enter'||e.key==' ')&&e.target.classList&&e.target.classList.contains('card')){e.preventDefault();openPD(+e.target.dataset.i)}});
function rTrip(){const ps=T.map(n=>P.find(p=>p.name==n)).filter(Boolean);
$('#tl').innerHTML=ps.map((p,k)=>`<li><span><b>${esc(p.name)}</b> <small class="m">${esc(p.city)}</small></span><a class="btn" href="${dir(p)}" target="_blank" rel="noopener">🧭</a><button class="btn" onclick="mv(${k},-1)">↑</button><button class="btn" onclick="mv(${k},1)">↓</button><button class="btn" onclick="rm(${k})">✕</button></li>`).join('')||'<p class="m">No stops yet.</p>';
let d=0,pr=SJ;ps.forEach(p=>{d+=km(pr[0],pr[1],p.lat,p.lng);pr=[p.lat,p.lng]});$('#tsum').textContent=ps.length?`Route from San Jose: ~${Math.round(d*0.621371).toLocaleString("en-US")} mi straight-line across ${ps.length} stops.`:''}
function mv(k,d){const j=k+d;if(j<0||j>=T.length)return;[T[k],T[j]]=[T[j],T[k]];sv('trip',T);rTrip()}
function rm(k){T.splice(k,1);sv('trip',T);rTrip()}
$('#tclr').onclick=()=>{T=[];sv('trip',T);rTrip()};
let BASE=[];
function refreshMeta(){const keep={country:$('#country').value,city:$('#city').value};
 $('#country').innerHTML='<option value="">All countries</option>'+[...new Set(P.map(p=>p.country).filter(Boolean))].sort().map(c=>`<option value="${esc(c)}">${esc(c)} (${P.filter(p=>p.country==c).length})</option>`).join('');
 $('#city').innerHTML='<option value="">All cities</option>'+[...new Set(P.map(p=>p.city).filter(Boolean))].sort().map(c=>`<option>${esc(c)}</option>`).join('');
 $('#country').value=keep.country;$('#city').value=keep.city;
 $('#cA').textContent=P.length;$('#cS').textContent=P.filter(p=>p.category=='sf_bay').length;$('#cC').textContent=P.filter(p=>p.category=='california').length;$('#cU').textContent=P.filter(p=>p.category=='usa').length;$('#cI').textContent=P.filter(p=>p.category=='international').length;if($('#cM'))$('#cM').textContent=P.filter(p=>p.mine).length;$('#lTot').textContent=BASE.length+' real places';
 $('#near').innerHTML=nearList(SJ[0],SJ[1],-1)}
function buildP(){const mine=(window.myPlaces?myPlaces():[]);P=[...mine,...BASE];P.forEach(p=>p.km=km(SJ[0],SJ[1],p.lat,p.lng));refreshMeta();render();if(cl){cl.clearLayers();mkMarkers()}if($('#trip').classList.contains('on'))rTrip()}
Promise.all([fetch('places.json').then(r=>r.json()),fetch('wiki.json').then(r=>r.ok?r.json():{}).catch(()=>({}))]).then(([d,wk])=>{WK=wk||{};BASE=d.filter(p=>p.lat!=null).sort((a,b)=>b.mentions-a.mentions||a.name.localeCompare(b.name));BASE.forEach((p,k)=>p.rank=k+1);
buildP();show(location.hash.slice(1)||'home')});
// ---- Supabase auth + sync (same project as movie site) ----
const SB_URL="https://mazrqepjgdtdraxpcptk.supabase.co",SB_KEY="sb_publishable_-2do3uyVQ4kcl7PfnBeDpw_mWEc7TXN",SITE="https://mad08011999-cloud.github.io/travel-map/";
const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY):null;let user=null,cloudOK=true;
const syncM=t=>$('#sync').textContent=t;

async function push(){if(!sb||!user||!cloudOK)return;syncM('⏳ Saving…');const now=new Date().toISOString();
  const names=new Set([...W,...V,...T]);const rows=[...names].map(n=>({user_id:user.id,place_id:pid(n),wishlist:W.has(n),visited:V.has(n),trip_order:T.includes(n)?T.indexOf(n):null,updated_at:now}));
  const keep=rows.map(r=>r.place_id);
  let r=rows.length?await sb.from('travel_status').upsert(rows,{onConflict:'user_id,place_id'}):{};if(r.error)return cloudFail(r.error);
  let q=sb.from('travel_status').delete().eq('user_id',user.id);if(keep.length)q=q.not('place_id','in',`(${keep.map(k=>'"'+k+'"').join(',')})`);r=await q;if(r.error)return cloudFail(r.error);syncM('☁️ Synced')}
function cloudFail(e){console.error(e);if(/travel_status|PGRST205|schema cache/i.test(e.message||'')){cloudOK=false;syncM('Signed in · cloud sync not set up yet, saved locally')}else syncM('⚠️ Sync failed')}
async function pull(){syncM('⏳ Loading…');const{data,error}=await sb.from('travel_status').select('*');if(error)return cloudFail(error);
  const byId=Object.fromEntries(P.map(p=>[pid(p.name),p.name]));const rt=[];
  data.forEach(r=>{const n=byId[r.place_id];if(!n)return;if(r.wishlist)W.add(n);if(r.visited)V.add(n);if(r.trip_order!=null)rt.push([r.trip_order,n])});
  rt.sort((a,b)=>a[0]-b[0]).forEach(([,n])=>{if(!T.includes(n))T.push(n)}); // merge: union, remote order first then local extras
  const rn=rt.map(x=>x[1]);T=[...rn,...T.filter(n=>!rn.includes(n))];
  sv('wish',[...W]);sv('vis',[...V]);sv('trip',T);render();if($('#trip').classList.contains('on'))rTrip();await push()}
for(const f of ['tg','addT','mv','rm']){const o=window[f];window[f]=(...a)=>{o(...a);push()}}
const _clr=$('#tclr').onclick;$('#tclr').onclick=()=>{_clr();push()};
function authUI(){const b=$('#authBox');if(!sb){b.innerHTML='';return}
  if(user){b.innerHTML=`<button class="btn" id="out" title="Sign out">👤 ${esc(user.user_metadata?.full_name||user.email)} · Sign out</button>`;$('#out').onclick=()=>sb.auth.signOut()}
  else{b.innerHTML='<button class="btn on" id="in">Sign in</button>';syncM('');$('#in').onclick=()=>$('#auth').showModal()}}
if(sb){$('#authX').onclick=()=>$('#auth').close();
  $('#gBtn').onclick=async()=>{const{error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:SITE}});if(error)$('#msg').textContent=error.message};
  $('#magic').onclick=async()=>{const em=$('#aEm').value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){$('#msg').textContent='Enter a valid email.';return}
    const{error}=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:SITE}});$('#msg').textContent=error?error.message:'Check your inbox for the sign-in link ✉️'};
  sb.auth.onAuthStateChange((ev,s)=>{const nu=s?.user||null,ch=nu?.id!==user?.id;user=nu;authUI();if(nu&&ch){$('#auth').open&&$('#auth').close();const go=()=>P.length?pull():setTimeout(go,300);setTimeout(go,0)}})}
authUI();
