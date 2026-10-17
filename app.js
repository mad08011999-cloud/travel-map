const SJ=[37.3382,-121.8863],$=s=>document.querySelector(s);
const ls=(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let P=[],W=new Set(ls('wish',[])),V=new Set(ls('vis',[])),T=ls('trip',[]),map,cl;
const km=(a,b,c,d)=>{const r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 6371*2*Math.asin(Math.sqrt(x))};
const mi=p=>Math.round(p.km*0.621371);
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
document.documentElement.dataset.theme=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme=='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem('theme',t)};
document.querySelectorAll('nav [data-v]').forEach(b=>b.onclick=()=>show(b.dataset.v));
function show(v){document.querySelectorAll('nav [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v==v));document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==v));location.hash=v;if(v=='map')initMap();if(v=='trip')rTrip()}
function acts(i){const p=P[i];return `<button class="btn" onclick="tg(W,'wish',${i})">${W.has(p.name)?'❤️':'🤍'} Wishlist</button><button class="btn" onclick="tg(V,'vis',${i})">${V.has(p.name)?'✅':'⬜'} Visited</button><button class="btn" onclick="addT(${i})">➕ Trip</button><button class="btn" onclick="wx(${i})">🌤 Weather</button><button class="btn" onclick="fly(${i})">📍 Map</button>`}
function tg(s,k,i){const n=P[i].name;s.has(n)?s.delete(n):s.add(n);sv(k,[...s]);render();if(map)map.closePopup()}
function addT(i){if(!T.includes(P[i].name)){T.push(P[i].name);sv('trip',T)}$('#wx').textContent=`➕ Added ${P[i].name} to your trip (${T.length} stops).`}
function fly(i){show('map');setTimeout(()=>{const p=P[i];cl.zoomToShowLayer(p.mk,()=>p.mk.openPopup())},200)}
async function wx(i){const p=P[i];$('#wx').textContent=`Loading weather for ${p.name}…`;$('#wx').scrollIntoView({behavior:'smooth',block:'nearest'});
try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`);const c=(await r.json()).current;
const code={0:'☀️ Clear',1:'🌤 Mostly clear',2:'⛅ Partly cloudy',3:'☁️ Overcast',45:'🌫 Fog',48:'🌫 Fog',51:'🌦 Drizzle',53:'🌦 Drizzle',55:'🌦 Drizzle',61:'🌧 Rain',63:'🌧 Rain',65:'🌧 Heavy rain',71:'🌨 Snow',80:'🌦 Showers',81:'🌦 Showers',95:'⛈ Thunderstorm'}[c.weather_code]||'🌡';
$('#wx').innerHTML=`<b>${esc(p.name)}</b> — ${code}, ${Math.round(c.temperature_2m)}°F (feels ${Math.round(c.apparent_temperature)}°F), wind ${Math.round(c.wind_speed_10m)} mph`}catch(e){$('#wx').textContent='Weather unavailable right now.'}}
function render(){const q=$('#q').value.toLowerCase(),c=$('#cat').value,ci=$('#city').value,st=$('#st').value,so=$('#sort').value;
let L=P.map((p,i)=>[p,i]).filter(([p])=>(!q||(p.name+p.city+p.description).toLowerCase().includes(q))&&(!c||p.category==c)&&(!ci||p.city==ci)&&(!st||(st=='w'?W.has(p.name):st=='v'?V.has(p.name):!V.has(p.name))));
L.sort(so=='d'?(a,b)=>a[0].km-b[0].km:so=='a'?(a,b)=>a[0].name.localeCompare(b[0].name):(a,b)=>b[0].mentions-a[0].mentions);
$('#cnt').textContent=`${L.length} of ${P.length} places`;
$('#grid').innerHTML=L.map(([p,i])=>`<div class="card ${p.category=='sf_bay'?'sf':'ca'}"><div class="ph">${p.category=='sf_bay'?'SF BAY AREA':'CALIFORNIA'} · ${mi(p)} MI FROM SAN JOSE</div><div class="bd"><h3>${esc(p.name)}</h3><div class="m">📍 ${esc(p.city)}, ${esc(p.region)} · saved ${p.mentions}×</div><div class="d">${esc(p.description)}</div><div class="m">${p.urls.map((u,k)=>`<a href="${u}" target="_blank" rel="noopener">Post ${k+1}</a>`).join(' · ')}</div><div class="acts">${acts(i)}</div></div></div>`).join('');
$('#sTot').textContent=P.length;$('#sSf').textContent=P.filter(p=>p.category=='sf_bay').length;$('#sCa').textContent=P.filter(p=>p.category!='sf_bay').length;$('#sW').textContent=W.size;$('#sV').textContent=V.size}
function initMap(){if(map){map.invalidateSize();return}
map=L.map('map').setView(SJ,9);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
L.circleMarker(SJ,{radius:10,color:'#fff',weight:3,fillColor:'#3b6fd8',fillOpacity:1}).addTo(map).bindPopup('<b>You are here</b><br>San Jose, CA').openPopup();
cl=L.markerClusterGroup();P.forEach((p,i)=>{p.mk=L.marker([p.lat,p.lng]).bindPopup(()=>`<b>${esc(p.name)}</b><br><small>${esc(p.city)} · ${mi(p)} mi from San Jose</small><p>${esc(p.description)}</p>${p.urls[0]?`<a href="${p.urls[0]}" target="_blank">Instagram post</a><br>`:''}<div class="acts" style="margin-top:6px">${acts(i).replace(/<button class="btn" onclick="fly\(\d+\)">📍 Map<\/button>/,'')}</div>`,{maxWidth:280});cl.addLayer(p.mk)});map.addLayer(cl)}
function rTrip(){const ps=T.map(n=>P.find(p=>p.name==n)).filter(Boolean);
$('#tl').innerHTML=ps.map((p,k)=>`<li><span><b>${esc(p.name)}</b> <small class="m">${esc(p.city)}</small></span><button class="btn" onclick="mv(${k},-1)">↑</button><button class="btn" onclick="mv(${k},1)">↓</button><button class="btn" onclick="rm(${k})">✕</button></li>`).join('')||'<p class="m">No stops yet.</p>';
let d=0,pr=SJ;ps.forEach(p=>{d+=km(pr[0],pr[1],p.lat,p.lng);pr=[p.lat,p.lng]});$('#tsum').textContent=ps.length?`Route from San Jose: ~${Math.round(d*0.621371)} mi straight-line across ${ps.length} stops.`:''}
function mv(k,d){const j=k+d;if(j<0||j>=T.length)return;[T[k],T[j]]=[T[j],T[k]];sv('trip',T);rTrip()}
function rm(k){T.splice(k,1);sv('trip',T);rTrip()}
$('#tclr').onclick=()=>{T=[];sv('trip',T);rTrip()};
['q','cat','city','st','sort'].forEach(id=>$('#'+id).addEventListener('input',render));
fetch('places.json').then(r=>r.json()).then(d=>{P=d.filter(p=>p.lat!=null);P.forEach(p=>p.km=km(SJ[0],SJ[1],p.lat,p.lng));
[...new Set(P.map(p=>p.city))].sort().forEach(c=>$('#city').insertAdjacentHTML('beforeend',`<option>${esc(c)}</option>`));render();show(location.hash.slice(1)||'home')});
