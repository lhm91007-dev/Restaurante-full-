/* ==========================================================================
   CANTINA RUTA — tracking.js
   Simula el movimiento en vivo del repartidor sobre un mapa real (Leaflet +
   OpenStreetMap, sin necesidad de API key). Como GitHub Pages es hosting
   estático (sin servidor ni base de datos compartida), la posición del
   pedido se calcula en el propio navegador y se guarda en localStorage.
   Para ubicación GPS real de un repartidor visible en varios dispositivos
   a la vez, hay que conectar un backend (ver README → "Llevarlo a producción").

   Lo que SÍ es real aquí:
   - El mapa, las coordenadas y la geolocalización del cliente (navigator.geolocation).
   - La sincronización en vivo entre pestañas del mismo navegador vía el
     evento "storage": si cambias el estatus en Panel de cocina, el cliente
     lo ve moverse al instante en Rastreo, sin recargar.
   ========================================================================== */

const SIM_SPEED = 6; // 1 minuto real ≈ SIM_SPEED minutos simulados. Pon 1 para ritmo real.

let trackingMap = null;
let trackingMarkers = {};
let trackingInterval = null;
let trackingOrderId = null;

function initTracking(orderId){
  trackingOrderId = orderId;
  const order = getOrder(orderId);
  const root = document.querySelector(".section--tracking");

  if(!order){
    root.innerHTML = `<div class="empty-state">No encontramos ese pedido en este navegador.<br><a href="#/menu">Hacer un pedido nuevo</a></div>`;
    return;
  }

  document.getElementById("tk-id").textContent = order.id;
  document.getElementById("tk-address").textContent = order.customer.direccion;
  document.getElementById("tk-total").textContent = money(order.total);
  document.getElementById("tk-items").innerHTML = order.items
    .map(i => `<li><span>${i.qty} × ${i.nombre}</span><span>${money(i.precio * i.qty)}</span></li>`).join("");

  buildMap(order);
  tickOrder();          // primer render inmediato
  trackingInterval = setInterval(tickOrder, 1000);

  window.addEventListener("storage", onStorageSync);
}

window.stopTracking = function(){
  if(trackingInterval){ clearInterval(trackingInterval); trackingInterval = null; }
  window.removeEventListener("storage", onStorageSync);
  if(trackingMap){ trackingMap.remove(); trackingMap = null; }
  trackingMarkers = {};
  trackingOrderId = null;
};

function onStorageSync(e){
  if(e.key === STORAGE_KEYS.orders && trackingOrderId){
    tickOrder(); // otro tab (ej. Panel de cocina) cambió el pedido: reflejarlo ya
  }
}

/* ------------------------------- mapa -------------------------------- */

function emojiIcon(emoji, size = 30){
  return L.divIcon({
    className: "leaflet-div-icon",
    html: `<span class="marker-emoji" style="font-size:${size}px">${emoji}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

// Punto sobre una curva de Bézier cuadrática (para que la ruta no sea una
// línea recta perfecta, como una calle real).
function bezierPoint(p0, p1, ctrl, t){
  const x = (1 - t) ** 2 * p0.lng + 2 * (1 - t) * t * ctrl.lng + t ** 2 * p1.lng;
  const y = (1 - t) ** 2 * p0.lat + 2 * (1 - t) * t * ctrl.lat + t ** 2 * p1.lat;
  return { lat: y, lng: x };
}

function controlPoint(p0, p1){
  const mid = { lat: (p0.lat + p1.lat) / 2, lng: (p0.lng + p1.lng) / 2 };
  const dx = p1.lng - p0.lng, dy = p1.lat - p0.lat;
  // desplazamiento perpendicular proporcional a la distancia
  return { lat: mid.lat + dx * 0.35, lng: mid.lng - dy * 0.35 };
}

function buildMap(order){
  const origin = order.restaurantCoords;
  const dest = order.destino;
  const ctrl = controlPoint(origin, dest);

  trackingMap = L.map("tracking-map", { zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(trackingMap);

  const curvePoints = [];
  for(let i = 0; i <= 40; i++) curvePoints.push(bezierPoint(origin, dest, ctrl, i / 40));
  const routeLine = L.polyline(curvePoints.map(p => [p.lat, p.lng]), {
    color: "#C1432E", weight: 4, opacity: 0.85, dashArray: "1,10", lineCap: "round"
  }).addTo(trackingMap);

  trackingMarkers.restaurant = L.marker([origin.lat, origin.lng], { icon: emojiIcon("🍳") })
    .addTo(trackingMap).bindPopup(RESTAURANT.nombre);
  trackingMarkers.destino = L.marker([dest.lat, dest.lng], { icon: emojiIcon("🏠") })
    .addTo(trackingMap).bindPopup("Tu dirección");
  trackingMarkers.repartidor = L.marker([origin.lat, origin.lng], { icon: emojiIcon("🛵", 26) })
    .addTo(trackingMap).bindPopup("Tu repartidor");

  trackingMap.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
  trackingMarkers._curve = curvePoints;
}

function moveDeliveryMarker(progress){
  if(!trackingMap || !trackingMarkers._curve) return;
  const curve = trackingMarkers._curve;
  const idx = Math.min(curve.length - 1, Math.floor(progress * (curve.length - 1)));
  const p = curve[idx];
  trackingMarkers.repartidor.setLatLng([p.lat, p.lng]);
}

/* ------------------------------ simulación ------------------------------ */

// Avanza el pedido de forma automática (simula cocina + repartidor) cuando
// nadie lo ha movido manualmente desde el Panel de cocina.
function tickOrder(){
  const order = getOrder(trackingOrderId);
  if(!order) return;

  const now = Date.now();
  const secondsSince = (key) => (now - (order.statusHistory[key] || order.createdAt)) / 1000;

  if(order.status === "recibido" && secondsSince("recibido") > 12){
    order.status = "preparando";
    order.statusHistory.preparando = now;
    upsertOrder(order);
  } else if(order.status === "preparando" && secondsSince("preparando") > 18){
    order.status = "camino";
    order.statusHistory.camino = now;
    order.progress = 0.03;
    upsertOrder(order);
  } else if(order.status === "camino"){
    const totalSimSeconds = (order.etaMinutes * 60) / SIM_SPEED;
    const elapsed = secondsSince("camino");
    const progress = Math.min(1, elapsed / totalSimSeconds);
    if(progress !== order.progress){
      order.progress = progress;
      if(progress >= 1){
        order.status = "entregado";
        order.statusHistory.entregado = now;
      }
      upsertOrder(order);
    }
  }

  renderTrackingUI(order);
}

function renderTrackingUI(order){
  // línea de tiempo
  const timeline = document.getElementById("tk-timeline");
  if(timeline){
    const order_steps = ["recibido", "preparando", "camino", "entregado"];
    const currentIdx = order_steps.indexOf(order.status);
    timeline.querySelectorAll("li").forEach(li => {
      const step = li.dataset.status;
      const stepIdx = order_steps.indexOf(step);
      li.classList.toggle("done", stepIdx < currentIdx);
      li.classList.toggle("active", stepIdx === currentIdx);
      const t = order.statusHistory[step];
      li.querySelector("time").textContent = t ? new Date(t).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
    });
  }

  // ETA
  const etaEl = document.getElementById("tk-eta");
  if(etaEl){
    if(order.status === "entregado"){
      etaEl.textContent = "¡Entregado!";
    } else if(order.status === "camino"){
      const restante = Math.max(1, Math.ceil(order.etaMinutes * (1 - order.progress)));
      etaEl.textContent = `${restante} min`;
    } else {
      etaEl.textContent = `${order.etaMinutes} min`;
    }
  }

  moveDeliveryMarker(order.status === "entregado" ? 1 : (order.progress || 0));

  if(order.status === "entregado" && trackingInterval){
    clearInterval(trackingInterval);
    trackingInterval = null;
    toast("Tu pedido fue entregado 🎉");
  }
}
