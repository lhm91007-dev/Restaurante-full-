/* ==========================================================================
   CANTINA RUTA — app.js
   Router simple por hash + estado en localStorage (carrito y pedidos).
   No requiere backend: todo vive en el navegador del usuario, por eso
   funciona tal cual al subirlo a GitHub Pages (sitio 100% estático).
   ========================================================================== */

const STORAGE_KEYS = { cart: "cr_cart_v1", orders: "cr_orders_v1" };

const ALL_ITEMS = MENU.flatMap(cat => cat.items.map(it => ({ ...it, categoria: cat.categoria })));

/* ---------------------------- estado / storage --------------------------- */

function getCart(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEYS.cart)) || []; }
  catch{ return []; }
}
function setCart(cart){
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  renderCartDrawer();
}
function getOrders(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEYS.orders)) || []; }
  catch{ return []; }
}
function saveOrders(orders){
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}
function getOrder(id){
  return getOrders().find(o => o.id === id);
}
function upsertOrder(order){
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if(idx >= 0) orders[idx] = order; else orders.unshift(order);
  saveOrders(orders);
}

function money(n){ return `${RESTAURANT.moneda}${Math.round(n).toLocaleString("es-MX")}`; }

/* ------------------------------- toast ----------------------------------- */
let toastTimer;
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* ------------------------------- carrito ---------------------------------- */

function addToCart(id, delta = 1){
  const cart = getCart();
  const line = cart.find(c => c.id === id);
  if(line){
    line.qty = Math.max(0, line.qty + delta);
    if(line.qty === 0){
      setCart(cart.filter(c => c.id !== id));
      return;
    }
  } else if(delta > 0){
    cart.push({ id, qty: delta });
  }
  setCart(cart);
  renderMenuView(); // refresca contadores +/- si el menú está visible
}

function cartQty(id){
  const line = getCart().find(c => c.id === id);
  return line ? line.qty : 0;
}

function cartTotals(){
  const cart = getCart();
  const subtotal = cart.reduce((sum, c) => {
    const item = ALL_ITEMS.find(i => i.id === c.id);
    return sum + (item ? item.precio * c.qty : 0);
  }, 0);
  const envio = subtotal === 0 ? 0 : (subtotal >= RESTAURANT.envioGratisDesde ? 0 : RESTAURANT.costoEnvio);
  return { subtotal, envio, total: subtotal + envio };
}

function renderCartDrawer(){
  const cart = getCart();
  const itemsEl = document.getElementById("cart-items");
  const countEl = document.getElementById("cart-count");
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  countEl.textContent = totalQty;
  countEl.style.display = totalQty ? "inline-block" : "none";

  if(cart.length === 0){
    itemsEl.innerHTML = `<div class="cart-empty">Tu carrito está vacío.<br>Ve al menú y agrega algo rico.</div>`;
  } else {
    itemsEl.innerHTML = cart.map(c => {
      const item = ALL_ITEMS.find(i => i.id === c.id);
      if(!item) return "";
      return `
        <div class="cart-item">
          <div class="cart-item__info">
            <strong>${item.nombre}</strong>
            <span>${c.qty} × ${money(item.precio)}</span>
          </div>
          <div class="qty-add" data-id="${item.id}">
            <button class="qty-minus" aria-label="Quitar uno">−</button>
            <span>${c.qty}</span>
            <button class="qty-plus" aria-label="Agregar uno">+</button>
          </div>
        </div>`;
    }).join("");
  }

  const { subtotal, envio, total } = cartTotals();
  document.getElementById("cart-subtotal").textContent = money(subtotal);
  document.getElementById("cart-envio").textContent = envio === 0 ? "Gratis" : money(envio);
  document.getElementById("cart-total").textContent = money(total);
  document.getElementById("btn-checkout").disabled = cart.length === 0;
}

function openCart(open){
  document.getElementById("cart-drawer").classList.toggle("open", open);
  document.getElementById("scrim").classList.toggle("show", open);
}

/* -------------------------------- router ---------------------------------- */

const routes = ["inicio", "menu", "pedidos", "checkout", "tracking", "cocina", "404"];

function currentRoute(){
  const hash = location.hash.replace(/^#\//, "");
  const [name, param] = hash.split("/");
  return { name: routes.includes(name) ? name : (name ? "404" : "inicio"), param };
}

function navigate(){
  const { name, param } = currentRoute();
  document.querySelectorAll(".mainnav a").forEach(a => {
    a.classList.toggle("active", a.dataset.route === name);
  });

  if(typeof window.stopTracking === "function") window.stopTracking();

  const tpl = document.getElementById(`tpl-${name}`);
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(tpl.content.cloneNode(true));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  if(name === "inicio") renderInicio();
  if(name === "menu") renderMenuView();
  if(name === "pedidos") renderPedidosView();
  if(name === "checkout") renderCheckoutView();
  if(name === "tracking") initTracking(param);
  if(name === "cocina") renderCocinaView();

  openCart(false);
  document.getElementById("mainnav").classList.remove("open");
}

window.addEventListener("hashchange", navigate);

/* -------------------------------- vistas ----------------------------------- */

function dishCardHTML(item, opts = {}){
  const qty = cartQty(item.id);
  return `
    <article class="dish-card">
      ${item.tag ? `<span class="dish-card__tag">${item.tag}</span>` : ""}
      <h3>${item.nombre}</h3>
      <p>${item.desc}</p>
      <div class="dish-card__foot">
        <span class="dish-card__price">${money(item.precio)}</span>
        ${qty > 0
          ? `<div class="qty-add" data-id="${item.id}">
               <button class="qty-minus" aria-label="Quitar uno">−</button>
               <span>${qty}</span>
               <button class="qty-plus" aria-label="Agregar uno">+</button>
             </div>`
          : `<button class="add-btn" data-id="${item.id}">Agregar</button>`
        }
      </div>
    </article>`;
}

function renderInicio(){
  document.getElementById("stat-tiempo").textContent = RESTAURANT.tiempoPromedioMin;
  document.getElementById("stat-envio").textContent = money(RESTAURANT.costoEnvio);
  const destacados = ALL_ITEMS.filter(i => i.tag === "Popular").slice(0, 4);
  document.getElementById("destacados").innerHTML = destacados.map(i => dishCardHTML(i)).join("");
  bindQtyControls(document.getElementById("destacados"));
}

let activeFilter = "todos";
let searchTerm = "";

function renderMenuView(){
  const container = document.getElementById("menu-categories");
  if(!container) return; // no estamos en la vista de menú

  const filtersEl = document.getElementById("menu-filters");
  const cats = ["todos", ...MENU.map(c => c.categoria)];
  filtersEl.innerHTML = cats.map(c =>
    `<button class="chip ${c === activeFilter ? "active" : ""}" data-filter="${c}">${c}</button>`
  ).join("");
  filtersEl.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => { activeFilter = chip.dataset.filter; renderMenuView(); });
  });

  const term = searchTerm.trim().toLowerCase();
  let html = "";
  MENU.forEach((cat, catIndex) => {
    if(activeFilter !== "todos" && activeFilter !== cat.categoria) return;
    const items = cat.items.filter(i =>
      !term || i.nombre.toLowerCase().includes(term) || i.desc.toLowerCase().includes(term)
    );
    if(items.length === 0) return;
    html += `
      <div class="menu-category">
        <div class="menu-category__head">
          <span class="menu-category__num">Parada ${String(catIndex + 1).padStart(2, "0")}</span>
          <h2>${cat.icono} ${cat.categoria}</h2>
        </div>
        <div class="menu-grid">${items.map(i => dishCardHTML(i)).join("")}</div>
      </div>`;
  });
  container.innerHTML = html || `<p class="no-results">No encontramos platillos con ese criterio.</p>`;
  bindQtyControls(container);
}

function bindQtyControls(scope){
  scope.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", () => { addToCart(btn.dataset.id, 1); toast("Agregado al carrito"); });
  });
  scope.querySelectorAll(".qty-add").forEach(box => {
    const id = box.dataset.id;
    box.querySelector(".qty-plus").addEventListener("click", () => addToCart(id, 1));
    box.querySelector(".qty-minus").addEventListener("click", () => addToCart(id, -1));
  });
}

function renderPedidosView(){
  const orders = getOrders();
  const list = document.getElementById("lista-pedidos");
  if(orders.length === 0){
    list.innerHTML = `<div class="empty-state">Aún no tienes pedidos. <a href="#/menu">Ve al menú</a> para hacer el primero.</div>`;
    return;
  }
  list.innerHTML = orders.map(o => `
    <a class="order-card" href="#/tracking/${o.id}" style="text-decoration:none;">
      <div>
        <div class="order-card__id">Pedido ${o.id}</div>
        <div class="order-card__meta">${new Date(o.createdAt).toLocaleString("es-MX")} · ${money(o.total)}</div>
      </div>
      <span class="status-pill ${o.status}">${statusLabel(o.status)}</span>
    </a>
  `).join("");
}

function statusLabel(status){
  return { recibido: "Recibido", preparando: "En preparación", camino: "En camino", entregado: "Entregado" }[status] || status;
}

/* ------------------------------- checkout ---------------------------------- */

let pendingCoords = null; // coords capturadas por geolocalización para el mapa

function renderCheckoutView(){
  pendingCoords = null;
  const cart = getCart();
  if(cart.length === 0){
    location.hash = "#/menu";
    return;
  }
  const { subtotal, envio, total } = cartTotals();
  const summary = document.getElementById("checkout-summary");
  summary.innerHTML = `
    <h3>Tu pedido</h3>
    <ul>
      ${cart.map(c => {
        const item = ALL_ITEMS.find(i => i.id === c.id);
        return `<li><span>${c.qty} × ${item.nombre}</span><span>${money(item.precio * c.qty)}</span></li>`;
      }).join("")}
    </ul>
    <div class="cart-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
    <div class="cart-line"><span>Envío</span><strong>${envio === 0 ? "Gratis" : money(envio)}</strong></div>
    <div class="cart-line cart-line--total"><span>Total</span><strong>${money(total)}</strong></div>
  `;

  document.getElementById("btn-geoloc").addEventListener("click", () => {
    const status = document.getElementById("geoloc-status");
    if(!navigator.geolocation){
      status.textContent = "Tu navegador no permite compartir ubicación; usaremos una ubicación aproximada.";
      return;
    }
    status.textContent = "Obteniendo tu ubicación…";
    navigator.geolocation.getCurrentPosition(
      pos => {
        pendingCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        status.textContent = "Ubicación capturada ✅ — se usará para tu mapa de entrega.";
      },
      () => { status.textContent = "No se pudo obtener tu ubicación; usaremos una ubicación aproximada."; },
      { timeout: 8000 }
    );
  });

  document.getElementById("form-checkout").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const order = buildOrder({
      nombre: fd.get("nombre"),
      telefono: fd.get("telefono"),
      direccion: fd.get("direccion"),
      pago: fd.get("pago"),
      notas: fd.get("notas")
    });
    upsertOrder(order);
    setCart([]);
    toast("¡Pedido confirmado!");
    location.hash = `#/tracking/${order.id}`;
  });
}

function buildOrder(customer){
  const cart = getCart();
  const { subtotal, envio, total } = cartTotals();
  const id = "CR-" + Math.random().toString(36).slice(2, 7).toUpperCase();

  // Si no tenemos geolocalización real, generamos un punto de entrega
  // cercano al restaurante para que el mapa de la demo siempre sea coherente.
  const destino = pendingCoords || jitterCoords(RESTAURANT.coords, 0.02);

  const now = Date.now();
  return {
    id,
    createdAt: now,
    customer,
    items: cart.map(c => {
      const item = ALL_ITEMS.find(i => i.id === c.id);
      return { id: c.id, nombre: item.nombre, precio: item.precio, qty: c.qty };
    }),
    subtotal, envio, total,
    restaurantCoords: RESTAURANT.coords,
    destino,
    status: "recibido",
    statusHistory: { recibido: now },
    etaMinutes: RESTAURANT.tiempoPromedioMin,
    progress: 0 // 0..1 avance del repartidor entre restaurante y destino
  };
}

function jitterCoords(base, spread){
  return {
    lat: base.lat + (Math.random() - 0.5) * spread,
    lng: base.lng + (Math.random() - 0.5) * spread
  };
}

/* ------------------------------ panel cocina -------------------------------- */

function renderCocinaView(){
  const orders = getOrders().filter(o => o.status !== "entregado");
  const list = document.getElementById("cocina-lista");
  if(orders.length === 0){
    list.innerHTML = `<div class="empty-state">No hay pedidos activos por ahora.</div>`;
    return;
  }
  list.innerHTML = orders.map(o => `
    <div class="kitchen-card">
      <div>
        <div class="order-card__id">Pedido ${o.id} — ${o.customer.nombre}</div>
        <div class="kitchen-card__items">${o.items.map(i => `${i.qty}× ${i.nombre}`).join(", ")}</div>
      </div>
      <select data-id="${o.id}">
        <option value="recibido" ${o.status === "recibido" ? "selected" : ""}>Recibido</option>
        <option value="preparando" ${o.status === "preparando" ? "selected" : ""}>En preparación</option>
        <option value="camino" ${o.status === "camino" ? "selected" : ""}>En camino</option>
        <option value="entregado" ${o.status === "entregado" ? "selected" : ""}>Entregado</option>
      </select>
    </div>
  `).join("");

  list.querySelectorAll("select").forEach(sel => {
    sel.addEventListener("change", () => {
      const order = getOrder(sel.dataset.id);
      if(!order) return;
      order.status = sel.value;
      order.statusHistory[sel.value] = Date.now();
      if(sel.value === "camino") order.progress = 0.05;
      if(sel.value === "entregado") order.progress = 1;
      upsertOrder(order);
      toast(`Pedido ${order.id} actualizado`);
      renderCocinaView();
    });
  });
}

/* -------------------------------- eventos globales --------------------------- */

document.getElementById("btn-cart").addEventListener("click", () => openCart(true));
document.getElementById("btn-cart-close").addEventListener("click", () => openCart(false));
document.getElementById("scrim").addEventListener("click", () => openCart(false));
document.getElementById("btn-menu-toggle").addEventListener("click", () => {
  document.getElementById("mainnav").classList.toggle("open");
});
document.getElementById("btn-checkout").addEventListener("click", () => {
  if(getCart().length === 0) return;
  location.hash = "#/checkout";
});

// delegación para +/- dentro del carrito lateral (se re-renderiza seguido)
document.getElementById("cart-items").addEventListener("click", (e) => {
  const box = e.target.closest(".qty-add");
  if(!box) return;
  const id = box.dataset.id;
  if(e.target.classList.contains("qty-plus")) addToCart(id, 1);
  if(e.target.classList.contains("qty-minus")) addToCart(id, -1);
});

document.addEventListener("input", (e) => {
  if(e.target.id === "menu-search"){
    searchTerm = e.target.value;
    renderMenuView();
  }
});

document.getElementById("foot-nombre") && (document.getElementById("foot-nombre").textContent = RESTAURANT.nombre);
document.getElementById("foot-direccion") && (document.getElementById("foot-direccion").textContent = RESTAURANT.direccion);

/* -------------------------------- arranque ------------------------------------ */

if(!location.hash) location.hash = "#/inicio";
renderCartDrawer();
navigate();
