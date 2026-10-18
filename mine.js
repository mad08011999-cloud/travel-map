// ---- "My picks": user-added places (search via Photon, reverse geocode via Nominatim) ----
const MK='myplaces',MDEL='myplaces_del';
let MINE=ls(MK,[]),MDELS=ls(MDEL,[]);
const BAY=new Set(['Alameda County','Contra Costa County','Marin County','Napa County','San Francisco','San Francisco County','City and County of San Francisco','San Mateo County','Santa Clara County','Solano County','Sonoma County','Santa Cruz County']);
function myPlaces(){return MINE.map(m=>Object.assign({},m,{mine:true,source:'mine',mentions:0,urls:[],rank:0}))}
function saveMine(){sv(MK,MINE);sv(MDEL,MDELS)}
function guessCat(r){if((r.countrycode||'').toUpperCase()!='US'&&r.country!='United States')return 'international';if(r.state!='California')return 'usa';
 if(BAY.has(r.county))return 'sf_bay';return km(37.6,-122.2,r.lat,r.lng)<75&&!r.county?'sf_bay':'california'}
const otypeLabel=r=>(r.otype||r.osm_value||r.type||'place').replace(/_/g,' ');
const addrOf=r=>r.address||[r.housenumber&&r.street?r.housenumber+' '+r.street:r.street,r.city||r.town||r.village||r.district,r.county,r.state,r.country].filter(Boolean).filter((x,i,a)=>a.indexOf(x)==i).join(', ');
// Photon result -> normalized
const fromPhoton=f=>{const p=f.properties||{},[lng,lat]=f.geometry.coordinates;return{name:p.name||[p.housenumber,p.street].filter(Boolean).join(' ')||p.city||p.state||'Unnamed place',lat,lng,city:p.city||p.town||p.village||p.district||p.locality||'',county:p.county||'',state:p.state||'',country:p.country||'',countrycode:p.countrycode||'',street:p.street,housenumber:p.housenumber,osm_value:p.osm_value,osm_key:p.osm_key,osm:p.osm_type&&p.osm_id?p.osm_type+p.osm_id:''}};
const fromNomi=d=>{const a=d.address||{};return{name:d.name||a.tourism||a.amenity||a.leisure||a.road||a.city||a.town||a.village||d.display_name.split(',')[0],lat:+d.lat,lng:+d.lon,city:a.city||a.town||a.village||a.hamlet||a.suburb||'',county:a.county||(a.city=='San Francisco'?'San Francisco':''),state:a.state||'',country:a.country||'',countrycode:a.country_code||'',street:a.road,housenumber:a.house_number,osm_value:d.type,osm_key:d.category,osm:d.osm_type&&d.osm_id?d.osm_type[0].toUpperCase()+d.osm_id:''}};
let RES=[],CUR=null,EDIT=null,amap=null,alayer=null,qT=null,qN=0;
function aMap(){if(amap||!window.L)return;amap=L.map('adMap',{zoomControl:true,attributionControl:true}).setView(SJ,8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(amap);alayer=L.layerGroup().addTo(amap)}
function drawPreview(sel){if(!amap)return;alayer.clearLayers();const pts=[];
 RES.forEach((r,k)=>{const on=k===sel;L.marker([r.lat,r.lng],{icon:L.divIcon({className:'',html:`<span class="pin mine" style="${on?'':'opacity:.55;transform:rotate(-45deg) scale(.8)'}"><i>${k+1}</i></span>`,iconSize:[24,24],iconAnchor:[12,24]}),zIndexOffset:on?1000:0}).on('click',()=>pick(k)).addTo(alayer);pts.push([r.lat,r.lng])});
 setTimeout(()=>{amap.invalidateSize();if(sel!=null&&RES[sel])amap.setView([RES[sel].lat,RES[sel].lng],14);else if(pts.length>1)amap.fitBounds(pts,{padding:[20,20],maxZoom:13});else if(pts.length)amap.setView(pts[0],13)},50)}
function rRes(info){const ul=$('#adRes');if(info){ul.innerHTML=`<li class="info">${info}</li>`;return}
 ul.innerHTML=RES.map((r,k)=>`<li role="option" tabindex="0" data-k="${k}" aria-selected="false"><span class="num">${k+1}</span><div><div class="typ">${esc(otypeLabel(r))}</div><div class="n">${esc(r.name)}</div><div class="m">${esc(addrOf(r))}</div><div class="m">${mi({km:km(SJ[0],SJ[1],r.lat,r.lng)})} mi from San Jose</div></div></li>`).join('');
 ul.querySelectorAll('li[data-k]').forEach(li=>{li.onclick=()=>pick(+li.dataset.k);li.onmouseenter=()=>drawPreview(+li.dataset.k);li.onkeydown=e=>{if(e.key=='Enter')pick(+li.dataset.k)}});drawPreview(null)}
async function search(q){const n=++qN;if(q.length<3){RES=[];rRes(q?'Keep typing…':'');drawPreview(null);return}rRes('Searching…');
 try{const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12&lang=en&lat=${SJ[0]}&lon=${SJ[1]}`);const d=await r.json();if(n!==qN)return;
  const pen=r=>(/^(highway|building|landuse)$/.test(r.osm_key)||r.osm_value=='house'?2:0)+(r.osm_key=='place'&&/house|postcode/.test(r.osm_value)?1:0);RES=(d.features||[]).map(fromPhoton).map((r,k)=>[r,pen(r)*100+k]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]).slice(0,8);const seen=new Set();RES=RES.filter(x=>{const k=x.name+'|'+x.lat.toFixed(3)+x.lng.toFixed(3);if(seen.has(k))return false;seen.add(k);return true});
  RES.length?rRes():rRes('No matches. Try a different spelling, add a city, or click on the map to drop a pin.')}catch(e){if(n===qN)rRes('Search is unavailable right now. Try again in a moment.')}}
function pick(k){CUR=RES[k];showForm()}
function showForm(){const r=CUR,e=EDIT;$('#adSearch').hidden=true;$('#adForm').hidden=false;$('#adT').textContent=e?'Edit my pick':'Add a place';
 $('#adSel').innerHTML=`<b>${esc(r.name)}</b> <span class="typ" style="color:var(--gold);font-size:.72rem;text-transform:uppercase;font-weight:700">${esc(otypeLabel(r))}</span><div class="m">📍 ${esc(r.address||addrOf(r))}</div><div class="m">${r.lat.toFixed(5)}, ${r.lng.toFixed(5)} · ${mi({km:km(SJ[0],SJ[1],r.lat,r.lng)})} mi from San Jose</div>`;
 $('#adName').value=e?e.name:r.name;$('#adNote').value=e?e.description||'':'';$('#adCat').value=e?e.category:guessCat(r);
 const n=e?e.name:null;$('#adW').checked=e?W.has(n):true;$('#adV').checked=e?V.has(n):false;$('#adT2').checked=e?T.includes(n):false;
 $('#adDel').hidden=!e;$('#adBack').hidden=!!e;$('#adGo').textContent=e?'💾 Save changes':'➕ Add place';$('#adMsg').textContent='';setTimeout(()=>$('#adName').focus(),30)}
function openAdd(prefill){EDIT=null;CUR=null;const d=$('#addD');$('#adSearch').hidden=false;$('#adForm').hidden=true;$('#adT').textContent='Add a place';if(!d.open)d.showModal();aMap();
 if(prefill){RES=[prefill];rRes();pick(0)}else{RES=[];rRes();$('#adQ').value='';drawPreview(null);setTimeout(()=>$('#adQ').focus(),30)}}
function editMine(i){const p=P[i];const m=MINE.find(x=>x.id==p.id);if(!m)return;if($('#pd').open)$('#pd').close();EDIT=m;CUR=m;const d=$('#addD');if(!d.open)d.showModal();aMap();showForm()}
function renameRefs(o,nn){if(o==nn)return;[W,V].forEach(s=>{if(s.has(o)){s.delete(o);s.add(nn)}});T=T.map(x=>x==o?nn:x);if(WK[pid(o)]){delete WK[pid(o)]}}
function setLists(n,w,v,t){w?W.add(n):W.delete(n);v?V.add(n):V.delete(n);if(t&&!T.includes(n))T.push(n);if(!t)T=T.filter(x=>x!=n);sv('wish',[...W]);sv('vis',[...V]);sv('trip',T)}
$('#adForm').onsubmit=e=>{e.preventDefault();const name=$('#adName').value.trim();if(!name){$('#adMsg').textContent='Give it a name.';return}
 const clash=P.find(p=>p.name.toLowerCase()==name.toLowerCase()&&(!EDIT||p.id!=EDIT.id));
 if(clash){$('#adMsg').innerHTML=`“${esc(clash.name)}” is already on your map${clash.mine?' as a pick':''}. <button type="button" class="btn" id="adOpen">Open it</button> or rename this one.`;$('#adOpen').onclick=()=>{$('#addD').close();openPD(P.indexOf(clash))};return}
 const now=new Date().toISOString();let m;
 if(EDIT){m=EDIT;const old=m.name;Object.assign(m,{name,description:$('#adNote').value.trim(),category:$('#adCat').value,updated:now});renameRefs(old,name)}
 else{const r=CUR;m={id:'u-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)),name,description:$('#adNote').value.trim(),category:$('#adCat').value,lat:+r.lat.toFixed(6),lng:+r.lng.toFixed(6),city:r.city||'',region:r.state||'',country:r.country||'',address:addrOf(r),otype:otypeLabel(r),osm:r.osm||'',created:now,updated:now};MINE.unshift(m)}
 setLists(name,$('#adW').checked,$('#adV').checked,$('#adT2').checked);saveMine();buildP();$('#addD').close();
 const i=P.findIndex(p=>p.id==m.id);$('#wx').textContent=`★ ${EDIT?'Updated':'Added'} “${name}” to My picks.`;EDIT=null;cloudMine(m);push();enrichMine();
 if(i>=0){if($('#map').classList.contains('on')&&cl)fly(i);else openPD(i)}};
$('#adDel').onclick=()=>{const m=EDIT;if(!m||!confirm(`Delete “${m.name}” from My picks? This removes its pin, card and list entries.`))return;delMine(m.id);$('#addD').close()};
function delMine(id){const m=MINE.find(x=>x.id==id);if(!m)return;MINE=MINE.filter(x=>x.id!=id);MDELS.push({id,at:new Date().toISOString()});setLists(m.name,false,false,false);saveMine();if($('#pd').open)$('#pd').close();buildP();$('#wx').textContent=`🗑 Deleted “${m.name}” from My picks.`;cloudMine({id,deleted:true});push()}
function deleteMine(i){const p=P[i];if(p&&p.mine&&confirm(`Delete “${p.name}” from My picks? This removes its pin, card and list entries.`))delMine(p.id)}
function mineActs(i){return `<button class="btn" onclick="editMine(${i})">✏️ Edit</button><button class="btn danger" onclick="deleteMine(${i})">🗑 Delete</button>`}
$('#adX').onclick=()=>$('#addD').close();$('#addD').addEventListener('click',e=>{if(e.target.id=='addD')$('#addD').close()});$('#addD').addEventListener('close',()=>{EDIT=null});
$('#adBack').onclick=()=>{$('#adForm').hidden=true;$('#adSearch').hidden=false;$('#adT').textContent='Add a place';drawPreview(null)};
$('#adQ').addEventListener('input',e=>{clearTimeout(qT);const q=e.target.value.trim();qT=setTimeout(()=>search(q),450)});
document.querySelectorAll('#addD .chip').forEach(c=>c.onclick=()=>{$('#adQ').value=c.dataset.q;search(c.dataset.q)});
$('#addB').onclick=()=>openAdd();
// Map: add by clicking (reverse geocode, one request per click)
let addMode=false,lastRev=0;$('#mapAdd').onclick=()=>{addMode=!addMode;$('#mapAdd').setAttribute('aria-pressed',addMode);$('#map').classList.toggle('addmode',addMode);$('#wx').textContent=addMode?'📍 Click anywhere on the map to add a place there.':'☀️ Click “Weather” on any place to see current conditions (Open-Meteo).'};
async function mapAddAt(ll){if(!addMode)return;const now=Date.now();if(now-lastRev<1100)return;lastRev=now;
 const pop=L.popup({maxWidth:260}).setLatLng(ll).setContent('<div class="mpop">Looking up this spot…</div>').openOn(map);
 try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${ll.lat}&lon=${ll.lng}&zoom=18&addressdetails=1&accept-language=en`);const d=await r.json();
  const x=d&&!d.error?fromNomi(d):{name:'Dropped pin',lat:ll.lat,lng:ll.lng,city:'',county:'',state:'',country:'',osm_value:'pin'};x.lat=ll.lat;x.lng=ll.lng;window._rev=x;
  pop.setContent(`<div class="mpop"><b>${esc(x.name)}</b><br><small>${esc(addrOf(x))}</small><br><small>${mi({km:km(SJ[0],SJ[1],x.lat,x.lng)})} mi from San Jose</small><br><button class="btn on" onclick="map.closePopup();openAdd(window._rev)">➕ Add this place</button><div class="src" style="margin-top:4px">Nominatim · © OpenStreetMap</div></div>`)}
 catch(e){pop.setContent('<div class="mpop">Couldn\'t look up this spot right now.</div>')}}
// ---- Cloud sync for My picks (Supabase table user_places; degrades gracefully) ----
let mineCloud=true;
function mineFail(e){console.warn('user_places',e);if(/user_places|PGRST205|schema cache|does not exist/i.test(e.message||'')){mineCloud=false;const s=$('#sync');if(s&&user)s.textContent=(s.textContent||'')+' · My picks saved on this device (cloud table not set up yet)'}}
async function cloudMine(m){if(!sb||!user||!mineCloud)return;const row=m.deleted?{user_id:user.id,id:m.id,data:{},deleted:true,updated_at:new Date().toISOString()}:{user_id:user.id,id:m.id,data:m,deleted:false,updated_at:m.updated||new Date().toISOString()};
 const{error}=await sb.from('user_places').upsert(row,{onConflict:'user_id,id'});if(error)mineFail(error)}
async function pullMine(){if(!sb||!user||!mineCloud)return;const{data,error}=await sb.from('user_places').select('id,data,deleted,updated_at');if(error)return mineFail(error);
 const loc=Object.fromEntries(MINE.map(m=>[m.id,m])),dels=Object.fromEntries(MDELS.map(d=>[d.id,d.at]));const remote=new Set();let ch=false;
 for(const r of data){remote.add(r.id);const l=loc[r.id];
  if(r.deleted){if(l&&(l.updated||'')<=r.updated_at){MINE=MINE.filter(x=>x.id!=r.id);ch=true}continue}
  if(dels[r.id]&&dels[r.id]>=r.updated_at){cloudMine({id:r.id,deleted:true});continue}
  if(!l){if(!P.find(p=>p.name.toLowerCase()==r.data.name.toLowerCase())){MINE.push(r.data);ch=true}}else if((l.updated||'')<r.updated_at){Object.assign(l,r.data);ch=true}else if((l.updated||'')>r.updated_at)cloudMine(l)}
 for(const m of MINE)if(!remote.has(m.id))cloudMine(m);
 for(const d of MDELS)if(!remote.has(d.id))cloudMine({id:d.id,deleted:true});
 if(ch){saveMine();buildP();enrichMine();if(typeof pull=='function')pull()}}
if(sb)sb.auth.onAuthStateChange((ev,s)=>{if(s?.user){user=s.user;setTimeout(pullMine,500)}});
let enriching=false;
async function enrichMine(){if(enriching)return;enriching=true;try{for(const m of [...MINE]){if(WK[pid(m.name)])continue;await wikiFor(Object.assign({},m));render();if(pdI!=null&&P[pdI]&&P[pdI].name==m.name)rPD(pdI,WK[pid(m.name)])}}finally{enriching=false}}
(function wait(){if(BASE.length){buildP();enrichMine()}else setTimeout(wait,200)})();
