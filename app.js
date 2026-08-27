/* =========================================================
   COMANDA — lógica de la aplicación
   Capa de datos dual:
   - Si firebase-config.js detecta credenciales reales -> usa
     Firestore con listeners en vivo (onSnapshot): todos los
     dispositivos ven los mismos datos al instante.
   - Si no hay Firebase configurado -> usa localStorage como
     respaldo (modo un solo dispositivo) para que la app
     siempre funcione, incluso sin configurar nada.
   ========================================================= */
const memoryStore = {};
const storage = {
  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (memoryStore[key] ?? fallback);
    }catch(e){ return memoryStore[key] ?? fallback; }
  },
  set(key, value){
    memoryStore[key] = value;
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ /* modo memoria */ }
  }
};

const FIREBASE_READY = window.FIREBASE_READY === true;

/* ---------------- AUTENTICACIÓN ---------------- */
// En modo nube, la app no arranca hasta que haya sesión iniciada.
// En modo local no hay pantalla de acceso: no hay datos en la nube que proteger.
const authGate = document.getElementById('authGate');
const appRoot = document.getElementById('appRoot');
let appStarted = false;

if(FIREBASE_READY){
  firebase.auth().onAuthStateChanged(user => {
    if(user){
      authGate.classList.add('is-hidden');
      document.getElementById('logoutBtn').style.display = '';
      if(!appStarted){ appStarted = true; startApp(); }
    } else {
      authGate.classList.remove('is-hidden');
      document.getElementById('logoutBtn').style.display = 'none';
    }
  });

  document.getElementById('loginForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    firebase.auth().signInWithEmailAndPassword(email, pass)
      .catch(err => { errEl.textContent = 'No se pudo ingresar: revisa correo y contraseña.'; });
  });

  document.getElementById('logoutBtn').addEventListener('click', ()=> firebase.auth().signOut());
} else {
  authGate.classList.add('is-hidden');
  startApp();
}

/* ---------------- ARRANQUE DE LA APP (tras login, o directo en modo local) ---------------- */
function startApp(){

/* ---------------- STORES ---------------- */
class LocalStore {
  constructor(key, seed){ this.key = key; this.items = storage.get(key, seed); this.listeners = []; }
  onChange(cb){ this.listeners.push(cb); cb(this.items); }
  _emit(){ storage.set(this.key, this.items); this.listeners.forEach(cb => cb(this.items)); }
  add(item){ item.id = 'l' + Date.now() + Math.random().toString(36).slice(2,6); this.items.unshift(item); this._emit(); return item.id; }
  update(id, patch){ const it = this.items.find(i => i.id === id); if(it) Object.assign(it, patch); this._emit(); }
  remove(id){ this.items = this.items.filter(i => i.id !== id); this._emit(); }
}

class FirestoreStore {
  constructor(collectionName){ this.col = window.db.collection(collectionName); this.items = []; this.listeners = []; }
  onChange(cb){
    this.listeners.push(cb);
    this.col.onSnapshot(snap => {
      this.items = snap.docs.map(d => ({id: d.id, ...d.data()}));
      this.listeners.forEach(fn => fn(this.items));
    }, err => console.error('Firestore error:', err));
  }
  add(item){ return this.col.add(item); }
  update(id, patch){ return this.col.doc(id).update(patch); }
  remove(id){ return this.col.doc(id).delete(); }
}

const seedMenu = [
  {name:'Ceviche clásico', category:'Entradas', price:12.5, desc:'Pescado blanco, limón, cebolla morada', available:true},
  {name:'Lomo saltado', category:'Fondos', price:16.0, desc:'Res, papas fritas, arroz', available:true},
  {name:'Ají de gallina', category:'Fondos', price:14.0, desc:'Crema de ají amarillo, pollo deshilachado', available:true},
  {name:'Chicha morada', category:'Bebidas', price:4.5, desc:'Maíz morado, piña, canela', available:true},
  {name:'Suspiro limeño', category:'Postres', price:6.0, desc:'Manjar blanco, merengue', available:false},
];
const seedInv = [
  {name:'Pescado blanco', unit:'kg', stock:8, min:5},
  {name:'Limón', unit:'kg', stock:2, min:4},
  {name:'Papa', unit:'kg', stock:20, min:8},
  {name:'Pollo', unit:'kg', stock:3, min:6},
];

const menuStore = FIREBASE_READY ? new FirestoreStore('menu') : new LocalStore('comanda_menu', seedMenu.map(m=>({...m})));
const orderStore = FIREBASE_READY ? new FirestoreStore('orders') : new LocalStore('comanda_orders', []);
const invStore = FIREBASE_READY ? new FirestoreStore('inventory') : new LocalStore('comanda_inventory', seedInv.map(i=>({...i})));

// si es la primera vez en la nube y la colección de menú/inventario está vacía, la sembramos
if(FIREBASE_READY){
  menuStore.col.get().then(snap => { if(snap.empty) seedMenu.forEach(m => menuStore.add(m)); });
  invStore.col.get().then(snap => { if(snap.empty) seedInv.forEach(i => invStore.add(i)); });
}

let menuItems = [];
let orders = [];
let inventory = [];
let cart = {}; // {menuId: qty} para el pedido en construcción

const STATUSES = ['Pendiente','Preparando','En camino','Entregado'];
const DEST = {lat:-12.1091, lng:-77.0281}; // punto fijo del restaurante (referencia demo)

menuStore.onChange(items => { menuItems = items; renderMenuPicker(); renderMenuGrid(); renderDashboard(); });
orderStore.onChange(items => { orders = items; renderBoard(); renderDashboard(); renderDeliveries(); renderPagos(); renderRepartidorOptions(); });
invStore.onChange(items => { inventory = items; renderInventario(); renderDashboard(); });

/* ---------------- BADGE DE SINCRONIZACIÓN ---------------- */
(function initSyncBadge(){
  const el = document.getElementById('syncBadge');
  if(FIREBASE_READY){
    el.classList.add('cloud');
    el.innerHTML = '<span class="dot dot-live"></span> sincronizado en la nube';
  } else {
    el.classList.add('local');
    el.innerHTML = '<span class="dot dot-live"></span> modo local · configura firebase-config.js';
  }
})();

/* ---------------- NAVEGACIÓN ---------------- */
document.getElementById('nav').addEventListener('click', (e)=>{
  const btn = e.target.closest('.rail-item');
  if(!btn) return;
  document.querySelectorAll('.rail-item').forEach(b=>b.classList.remove('is-active'));
  btn.classList.add('is-active');
  const view = btn.dataset.view;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('is-active'));
  document.getElementById('view-'+view).classList.add('is-active');
  if(view === 'entregas') initMapIfNeeded();
});

/* ---------------- UTILS ---------------- */
function ticketLabel(o){ return '#' + o.id.slice(-4).toUpperCase(); }
function haversine(a, b){
  const R = 6371000, toRad = d => d*Math.PI/180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

/* ---------------- RENDER: DASHBOARD ---------------- */
function renderDashboard(){
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const ventasHoy = todayOrders.reduce((s,o)=> s + o.total, 0);
  const activos = orders.filter(o => o.status !== 'Entregado').length;
  const enCamino = orders.filter(o => o.status === 'En camino').length;
  const stockBajo = inventory.filter(i => i.stock <= i.min).length;

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card"><div class="label">Ventas hoy</div><div class="value herb">$${ventasHoy.toFixed(2)}</div></div>
    <div class="stat-card"><div class="label">Pedidos activos</div><div class="value amber">${activos}</div></div>
    <div class="stat-card"><div class="label">En camino</div><div class="value steel">${enCamino}</div></div>
    <div class="stat-card"><div class="label">Insumos bajo mínimo</div><div class="value fire">${stockBajo}</div></div>
  `;

  const recent = [...orders].sort((a,b)=> b.createdAt - a.createdAt).slice(0,4);
  document.getElementById('recentOrders').innerHTML = recent.length
    ? recent.map(o => ticketHTML(o, false)).join('')
    : `<p class="empty-note">Aún no hay pedidos. Créalos desde la pestaña Pedidos.</p>`;

  const low = inventory.filter(i => i.stock <= i.min);
  document.getElementById('lowStockList').innerHTML = low.length
    ? low.map(i => `<div class="simple-row"><span>${i.name}</span><span class="badge">${i.stock}${i.unit} / mín ${i.min}${i.unit}</span></div>`).join('')
    : `<p class="empty-note">Todo el inventario está en niveles saludables.</p>`;
}

/* ---------------- RENDER: MENU PICKER (en Pedidos) ---------------- */
function renderMenuPicker(){
  const avail = menuItems.filter(m => m.available);
  document.getElementById('menuPicker').innerHTML = avail.length ? avail.map(m => `
    <div class="picker-row">
      <span class="name">${m.name}</span>
      <span class="price">$${m.price.toFixed(2)}</span>
      <div class="qty-controls">
        <button type="button" data-act="dec" data-id="${m.id}">–</button>
        <span id="qty-${m.id}">${cart[m.id] || 0}</span>
        <button type="button" data-act="inc" data-id="${m.id}">+</button>
      </div>
    </div>
  `).join('') : `<p class="empty-note">No hay platos disponibles. Actívalos en la pestaña Menú.</p>`;
  updateOrderTotal();
}

document.getElementById('menuPicker').addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  const cur = cart[id] || 0;
  if(btn.dataset.act === 'inc') cart[id] = cur + 1;
  else cart[id] = Math.max(0, cur - 1);
  document.getElementById('qty-'+id).textContent = cart[id];
  updateOrderTotal();
});

function updateOrderTotal(){
  let total = 0;
  Object.entries(cart).forEach(([id, qty])=>{
    const item = menuItems.find(m => m.id === id);
    if(item) total += item.price * qty;
  });
  document.getElementById('ofTotal').textContent = '$' + total.toFixed(2);
}

/* ---------------- CREAR PEDIDO ---------------- */
document.getElementById('orderForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const items = Object.entries(cart).filter(([,qty]) => qty > 0).map(([id, qty])=>{
    const m = menuItems.find(x => x.id === id);
    return {name:m.name, qty, price:m.price};
  });
  if(items.length === 0){ alert('Agrega al menos un plato al pedido.'); return; }

  const total = items.reduce((s,i)=> s + i.price*i.qty, 0);
  const order = {
    customer: document.getElementById('ofCustomer').value,
    channel: document.getElementById('ofChannel').value,
    items,
    total,
    status: 'Pendiente',
    paymentMethod: document.getElementById('ofPayment').value,
    createdAt: Date.now(),
    deliveryProgress: 0,
    startPos: randomNearby(),
    livePos: null,
  };
  orderStore.add(order);
  cart = {};
  e.target.reset();
  renderMenuPicker();
});

function randomNearby(){
  return { lat: DEST.lat + (Math.random()-0.5)*0.03, lng: DEST.lng + (Math.random()-0.5)*0.03 };
}

/* ---------------- TICKET HTML ---------------- */
function ticketHTML(o, withActions=true){
  const time = new Date(o.createdAt).toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'});
  const itemsHTML = o.items.map(i => `<div><span>${i.qty}× ${i.name}</span><span>$${(i.qty*i.price).toFixed(2)}</span></div>`).join('');
  const nextStatus = STATUSES[STATUSES.indexOf(o.status)+1];
  const actions = withActions ? `
    <div class="ticket-actions">
      ${nextStatus ? `<button data-act="advance" data-id="${o.id}">→ ${nextStatus}</button>` : `<button class="secondary" disabled>Completado</button>`}
      ${o.status !== 'Entregado' ? `<button class="secondary" data-act="cancel" data-id="${o.id}">Cancelar</button>` : ''}
    </div>` : '';
  return `
    <div class="ticket" data-id="${o.id}">
      <div class="ticket-top"><span class="ticket-no">${ticketLabel(o)}</span><span class="ticket-time">${time}</span></div>
      <div class="ticket-customer">${o.customer || 'Cliente'}</div>
      <div class="ticket-channel">${o.channel} · ${o.paymentMethod}</div>
      <div class="ticket-items">${itemsHTML}</div>
      <div class="ticket-foot"><span>Total</span><span class="ticket-total">$${o.total.toFixed(2)}</span></div>
      ${actions}
    </div>
  `;
}

/* ---------------- RENDER: TABLERO DE PEDIDOS ---------------- */
function renderBoard(){
  STATUSES.forEach(status => {
    const list = orders.filter(o => o.status === status).sort((a,b)=> b.createdAt - a.createdAt);
    document.getElementById('col-'+status).innerHTML = list.length
      ? list.map(o => ticketHTML(o)).join('')
      : `<p class="empty-note">Sin pedidos</p>`;
    document.getElementById('cnt-'+status).textContent = list.length;
  });
}

document.querySelector('.board').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const id = btn.dataset.id;
  const order = orders.find(o => o.id === id);
  if(!order) return;
  if(btn.dataset.act === 'advance'){
    const idx = STATUSES.indexOf(order.status);
    const patch = {status: STATUSES[idx+1]};
    if(patch.status === 'En camino') patch.deliveryProgress = 0;
    orderStore.update(id, patch);
  } else if(btn.dataset.act === 'cancel'){
    orderStore.remove(id);
  }
});

/* ---------------- RENDER: MENU ---------------- */
document.getElementById('menuForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  menuStore.add({
    name: document.getElementById('mfName').value,
    category: document.getElementById('mfCategory').value,
    price: parseFloat(document.getElementById('mfPrice').value),
    desc: document.getElementById('mfDesc').value,
    available: true,
  });
  e.target.reset();
});

function renderMenuGrid(){
  document.getElementById('menuGrid').innerHTML = menuItems.map(m => `
    <div class="menu-card">
      <div class="cat">${m.category}</div>
      <h3>${m.name}</h3>
      <div class="desc">${m.desc || ''}</div>
      <div class="row">
        <span class="price">$${m.price.toFixed(2)}</span>
        <button class="avail-toggle ${m.available ? 'on':'off'}" data-id="${m.id}" data-act="toggle">${m.available ? 'Disponible':'Agotado'}</button>
      </div>
      <button class="del" data-id="${m.id}" data-act="delete">Eliminar plato</button>
    </div>
  `).join('');
}

document.getElementById('menuGrid').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const id = btn.dataset.id;
  if(btn.dataset.act === 'toggle'){
    const item = menuItems.find(m => m.id === id);
    menuStore.update(id, {available: !item.available});
  } else if(btn.dataset.act === 'delete'){
    menuStore.remove(id);
  }
});

/* ---------------- ENTREGAS (mapa + GPS real / simulación de respaldo) ---------------- */
let map, destMarker;
let deliveryMarkers = {};

function initMapIfNeeded(){
  if(map){ map.invalidateSize(); return; }
  map = L.map('map', {zoomControl:true}).setView([DEST.lat, DEST.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap contributors', maxZoom:19
  }).addTo(map);
  destMarker = L.circleMarker([DEST.lat, DEST.lng], {radius:9, color:'#E14B2A', fillColor:'#E14B2A', fillOpacity:1})
    .addTo(map).bindPopup('Restaurante (base)');
}

function renderDeliveries(){
  const activeOrders = orders.filter(o => o.status === 'En camino');

  Object.keys(deliveryMarkers).forEach(id => {
    if(!activeOrders.find(o => o.id === id)){
      map && map.removeLayer(deliveryMarkers[id]);
      delete deliveryMarkers[id];
    }
  });

  document.getElementById('activeDeliveries').innerHTML = activeOrders.length
    ? activeOrders.map(o => {
        const live = !!o.livePos;
        let pct, etaLabel;
        if(live){
          const dist = haversine(o.livePos, DEST);
          pct = Math.max(0, Math.min(100, Math.round(100 - (dist/3000)*100)));
          etaLabel = dist < 60 ? 'Llegando' : Math.max(1, Math.round(dist/250)) + ' min';
        } else {
          pct = Math.round((o.deliveryProgress||0) * 100);
          etaLabel = Math.max(1, Math.round((1 - (o.deliveryProgress||0)) * 18)) + ' min';
        }
        return `
        <div class="delivery-card">
          <div class="top"><span>${ticketLabel(o)} · ${o.customer||'Cliente'}</span><span class="tag tag-steel">ETA ${etaLabel}</span></div>
          <div class="meta">${o.channel} · ${live ? 'GPS en vivo del repartidor' : 'ruta simulada'} · ${pct}%</div>
          <div class="progress-bar"><div style="width:${pct}%"></div></div>
        </div>`;
      }).join('')
    : `<p class="empty-note">No hay entregas en curso en este momento.</p>`;

  if(!map) return;
  activeOrders.forEach(o => {
    let lat, lng;
    if(o.livePos){ lat = o.livePos.lat; lng = o.livePos.lng; }
    else {
      const t = o.deliveryProgress || 0;
      lat = o.startPos.lat + (DEST.lat - o.startPos.lat) * t;
      lng = o.startPos.lng + (DEST.lng - o.startPos.lng) * t;
    }
    const color = o.livePos ? '#6E9B5C' : '#5C8494';
    if(!deliveryMarkers[o.id]){
      deliveryMarkers[o.id] = L.circleMarker([lat,lng], {radius:7, color, fillColor:color, fillOpacity:1})
        .addTo(map).bindPopup(`Pedido ${ticketLabel(o)}`);
    } else {
      deliveryMarkers[o.id].setLatLng([lat,lng]);
      deliveryMarkers[o.id].setStyle({color, fillColor:color});
    }
  });
}

// motor de avance simulado: SOLO para pedidos sin GPS real (livePos), como respaldo de demo
setInterval(()=>{
  orders.forEach(o => {
    if(o.status === 'En camino' && !o.livePos){
      const next = Math.min(1, (o.deliveryProgress||0) + 0.02 + Math.random()*0.02);
      orderStore.update(o.id, {deliveryProgress: next, status: next >= 1 ? 'Entregado' : 'En camino'});
    }
    if(o.status === 'En camino' && o.livePos && haversine(o.livePos, DEST) < 60){
      orderStore.update(o.id, {status:'Entregado'});
    }
  });
}, 1500);

/* ---------------- PAGOS ---------------- */
function renderPagos(){
  const total = orders.reduce((s,o)=> s+o.total, 0);
  const byMethod = {};
  orders.forEach(o => { byMethod[o.paymentMethod] = (byMethod[o.paymentMethod]||0) + o.total; });

  document.getElementById('paymentStats').innerHTML = `
    <div class="stat-card"><div class="label">Total cobrado</div><div class="value herb">$${total.toFixed(2)}</div></div>
    ${Object.entries(byMethod).map(([method,amt]) => `
      <div class="stat-card"><div class="label">${method}</div><div class="value">$${amt.toFixed(2)}</div></div>
    `).join('')}
  `;

  const tbody = document.querySelector('#paymentsTable tbody');
  tbody.innerHTML = orders.length ? [...orders].sort((a,b)=>b.createdAt-a.createdAt).map(o => `
    <tr>
      <td>${ticketLabel(o)}</td>
      <td>${o.customer||'—'}</td>
      <td>${o.channel}</td>
      <td>${o.paymentMethod}</td>
      <td>$${o.total.toFixed(2)}</td>
      <td>${o.status}</td>
    </tr>
  `).join('') : `<tr><td colspan="6" class="empty-note">Sin transacciones todavía</td></tr>`;
}

/* ---------------- INVENTARIO ---------------- */
document.getElementById('invForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  invStore.add({
    name: document.getElementById('ivName').value,
    unit: document.getElementById('ivUnit').value,
    stock: parseFloat(document.getElementById('ivStock').value),
    min: parseFloat(document.getElementById('ivMin').value),
  });
  e.target.reset();
});

function renderInventario(){
  document.getElementById('invGrid').innerHTML = inventory.map(i => {
    const pct = Math.min(100, Math.round((i.stock / (i.min*2 || 1)) * 100));
    const low = i.stock <= i.min;
    const barColor = low ? '#E14B2A' : '#6E9B5C';
    return `
    <div class="inv-card ${low?'low':''}">
      <h3>${i.name}</h3>
      <div 
