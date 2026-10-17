const SJ=[37.3382,-121.8863],$=s=>document.querySelector(s);
const ls=(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let P=[],W=new Set(ls('wish',[])),V=new Set(ls('vis',[])),T=ls('trip',[]),map,cl,mcat='',SHOW=Infinity;
const km=(a,b,c,d)=>{const r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 6371*2*Math.asin(Math.sqrt(x))};
const mi=p=>Math.round(p.km*0.621371);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dir=p=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
document.documentElement.dataset.theme=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme=='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem('theme',t)};
document.querySelectorAll('nav [data-v]').forEach(b=>b.onclick=()=>show(b.dataset.v));
function show(v){document.querySelectorAll('nav [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v==v));document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==v));history.replaceState(null,'','#'+v);if(v=='map')initMap();if(v=='trip')rTrip()}
function acts(i,noMap){const p=P[i];return `<button class="btn" onclick="tg(W,'wish',${i})" aria-label="Wishlist">${W.has(p.name)?'❤️':'🤍'} Wishlist</button><button class="btn" onclick="tg(V,'vis',${i})">${V.has(p.name)?'✅':'⬜'} Visited</button><button class="btn" onclick="addT(${i})">➕ Trip</button><button class="btn" onclick="wx(${i})">🌤 Weather</button>${noMap?'':`<button class="btn" onclick="fly(${i})">📍 Map</button>`}<a class="btn" href="${dir(p)}" target="_blank" rel="noopener">🧭 Directions</a>`}
function tg(s,k,i){const n=P[i].name;s.has(n)?s.delete(n):s.add(n);sv(k,[...s]);render();if(sel===i)panel(i);if(map)map.closePopup()}
function addT(i){if(!T.includes(P[i].name)){T.push(P[i].name);sv('trip',T)}$('#wx').textContent=`➕ Added ${P[i].name} to your trip (${T.length} stops).`}
function fly(i){show('map');setTimeout(()=>{if(!cl)return;const p=P[i];if(mcat&&p.category!=mcat)setCat('');cl.zoomToShowLayer(p.mk,()=>{p.mk.openPopup();panel(i)})},250)}
async function wx(i){const p=P[i];$('#wx').textContent=`Loading weather for ${p.name}…`;$('#wx').scrollIntoView({behavior:'smooth',block:'nearest'});
try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`);const c=(await r.json()).current;
const code={0:'☀️ Clear',1:'🌤 Mostly clear',2:'⛅ Partly cloudy',3:'☁️ Overcast',45:'🌫 Fog',48:'🌫 Fog',51:'🌦 Drizzle',53:'🌦 Drizzle',55:'🌦 Drizzle',61:'🌧 Rain',63:'🌧 Rain',65:'🌧 Heavy rain',71:'🌨 Snow',80:'🌦 Showers',81:'🌦 Showers',95:'⛈ Thunderstorm'}[c.weather_code]||'🌡';
$('#wx').innerHTML=`<b>${esc(p.name)}</b> — ${code}, ${Math.round(c.temperature_2m)}°F (feels ${Math.round(c.apparent_temperature)}°F), wind ${Math.round(c.wind_speed_10m)} mph`}catch(e){$('#wx').textContent='Weather unavailable right now.'}}
const card=(p,i,rank)=>{const ca=p.category!='sf_bay';return `<article class="card"><div class="ph ${ca?'ca':'sf'}">${ca?'CALIFORNIA':'SF BAY AREA'} · ${mi(p)} MI FROM SAN JOSE</div><div class="bd"><div class="top"><div><span class="tag ${ca?'ca':''}">${ca?'California':'SF Bay Area'}</span><h3 style="margin-top:8px">${esc(p.name)}</h3></div>${rank?`<span class="rank">${rank}</span>`:''}</div><div class="m">📍 ${esc(p.city)}, ${esc(p.region)} · saved ${p.mentions}× · ${mi(p)} mi from San Jose</div><p class="d">${esc(p.description)}</p><div class="m">${(p.urls||[]).map((u,k)=>`<a href="${esc(u)}" target="_blank" rel="noopener">Post ${k+1}</a>`).join(' · ')}</div><div class="foot"><span class="saved">Saved ${p.mentions}×</span>${acts(i)}</div></div></article>`};
function render(){const q=$('#q').value.toLowerCase().trim(),c=$('#cat').value,ci=$('#city').value,st=$('#st').value,so=$('#sort').value;
let L=P.map((p,i)=>[p,i]).filter(([p])=>(!q||(p.name+' '+p.city+' '+p.description).toLowerCase().includes(q))&&(!c||p.category==c)&&(!ci||p.city==ci)&&(!st||(st=='w'?W.has(p.name):st=='v'?V.has(p.name):!V.has(p.name))));
L.sort(so=='d'?(a,b)=>a[0].km-b[0].km:so=='a'?(a,b)=>a[0].name.localeCompare(b[0].name):(a,b)=>b[0].mentions-a[0].mentions);
$('#cnt').textContent=`${L.length} of ${P.length} places`;
$('#grid').innerHTML=L.slice(0,SHOW).map(([p,i])=>card(p,i)).join('');$('#empty').hidden=L.length>0;$('#moreB').hidden=$('#allB').hidden=L.length<=SHOW;$('#fewB').hidden=!(SHOW>24&&L.length>24);
$('#top').innerHTML=P.slice(0,8).map((p,i)=>card(p,i,i+1)).join('');
$('#sTot').textContent=P.length;$('#sSf').textContent=P.filter(p=>p.category=='sf_bay').length;$('#sCa').textContent=P.filter(p=>p.category!='sf_bay').length;$('#sW').textContent=W.size;$('#sV').textContent=V.size}
$('#moreB').onclick=()=>{SHOW+=24;render()};$('#allB').onclick=()=>{SHOW=Infinity;render()};$('#fewB').onclick=()=>{SHOW=24;render();$('#grid').scrollIntoView({block:'start'})};
['q','cat','city','st','sort'].forEach(id=>$('#'+id).addEventListener('input',render));
let sel=null;
function nearList(lat,lng,ex){return P.map((p,i)=>[i,km(lat,lng,p.lat,p.lng)]).filter(([i])=>i!==ex).sort((a,b)=>a[1]-b[1]).slice(0,5).map(([i,d])=>`<li><button onclick="fly(${i})"><span>${esc(P[i].name)}</span><span class="m">${(d*0.621371).toFixed(d<16?1:0)} mi</span></button></li>`).join('')}
function panel(i){sel=i;const p=P[i],ca=p.category!='sf_bay';$('#panel').innerHTML=`<span class="kicker">${ca?'Rest of California':'SF Bay Area'} · saved ${p.mentions}×</span><h3>${esc(p.name)}</h3><div class="m">📍 ${esc(p.city)} · ${mi(p)} mi from San Jose</div><p>${esc(p.description)}</p><div class="m">${(p.urls||[]).map((u,k)=>`<a href="${esc(u)}" target="_blank" rel="noopener">Instagram post ${k+1}</a>`).join(' · ')}</div><div class="foot" style="border:0;padding:0">${acts(i,1)}</div><span class="kicker" style="margin-top:8px">Nearby saves</span><ul class="near">${nearList(p.lat,p.lng,i)}</ul>`}
function setCat(c){mcat=c;document.querySelectorAll('#mcat button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c==c));if(!cl)return;cl.clearLayers();cl.addLayers(P.filter(p=>!c||p.category==c).map(p=>p.mk))}
document.querySelectorAll('#mcat button').forEach(b=>b.onclick=()=>setCat(b.dataset.c));
document.querySelectorAll('#mview button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#mview button').forEach(x=>x.setAttribute('aria-pressed',x==b));if(!map)return;b.dataset.z=='sj'?map.setView(SJ,9):map.fitBounds(L.latLngBounds(P.map(p=>[p.lat,p.lng])),{padding:[30,30]})});
function initMap(){if(map){map.invalidateSize();return}
if(!window.L||!L.markerClusterGroup){$('#fb').style.display='block';return}
map=L.map('lmap').setView(SJ,9);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
L.circleMarker(SJ,{radius:10,color:'#fff',weight:3,fillColor:'#3b6fd8',fillOpacity:1}).addTo(map).bindPopup('<b>You are here</b><br>San Jose, CA').openPopup();
cl=L.markerClusterGroup();P.forEach((p,i)=>{p.mk=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',html:`<span class="pin ${p.category!='sf_bay'?'ca':''}"></span>`,iconSize:[18,18],iconAnchor:[9,18],popupAnchor:[0,-16]}),title:p.name}).bindPopup(()=>`<div class="pop"><b>${esc(p.name)}</b><br><small>${esc(p.city)} · ${mi(p)} mi from San Jose</small><p>${esc(p.description)}</p>${p.urls&&p.urls[0]?`<a href="${esc(p.urls[0])}" target="_blank" rel="noopener">Instagram post</a><br>`:''}<div style="margin-top:6px">${acts(i,1)}</div></div>`,{maxWidth:280}).on('click',()=>panel(i))});setCat(mcat);map.addLayer(cl)}
function rTrip(){const ps=T.map(n=>P.find(p=>p.name==n)).filter(Boolean);
$('#tl').innerHTML=ps.map((p,k)=>`<li><span><b>${esc(p.name)}</b> <small class="m">${esc(p.city)}</small></span><a class="btn" href="${dir(p)}" target="_blank" rel="noopener">🧭</a><button class="btn" onclick="mv(${k},-1)">↑</button><button class="btn" onclick="mv(${k},1)">↓</button><button class="btn" onclick="rm(${k})">✕</button></li>`).join('')||'<p class="m">No stops yet.</p>';
let d=0,pr=SJ;ps.forEach(p=>{d+=km(pr[0],pr[1],p.lat,p.lng);pr=[p.lat,p.lng]});$('#tsum').textContent=ps.length?`Route from San Jose: ~${Math.round(d*0.621371)} mi straight-line across ${ps.length} stops.`:''}
function mv(k,d){const j=k+d;if(j<0||j>=T.length)return;[T[k],T[j]]=[T[j],T[k]];sv('trip',T);rTrip()}
function rm(k){T.splice(k,1);sv('trip',T);rTrip()}
$('#tclr').onclick=()=>{T=[];sv('trip',T);rTrip()};
fetch('places.json').then(r=>r.json()).then(d=>{P=d.filter(p=>p.lat!=null).sort((a,b)=>b.mentions-a.mentions);P.forEach(p=>p.km=km(SJ[0],SJ[1],p.lat,p.lng));
[...new Set(P.map(p=>p.city))].sort().forEach(c=>$('#city').insertAdjacentHTML('beforeend',`<option>${esc(c)}</option>`));
$('#cA').textContent=P.length;$('#cS').textContent=P.filter(p=>p.category=='sf_bay').length;$('#cC').textContent=P.filter(p=>p.category!='sf_bay').length;$('#lTot').textContent=P.length+' real places';
$('#near').innerHTML=nearList(SJ[0],SJ[1],-1);render();show(location.hash.slice(1)||'home')});
// ---- Supabase auth + sync (same project as movie site) ----
const SB_URL="https://mazrqepjgdtdraxpcptk.supabase.co",SB_KEY="sb_publishable_-2do3uyVQ4kcl7PfnBeDpw_mWEc7TXN",SITE="https://mad08011999-cloud.github.io/travel-map/";
const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY):null;let user=null,cloudOK=true;
const syncM=t=>$('#sync').textContent=t;
const pid=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
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
