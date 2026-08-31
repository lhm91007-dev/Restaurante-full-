# Cantina Ruta 🌮 — pedidos con rastreo en vivo

App web completa (sin backend) para pedir a domicilio con:

- Menú con búsqueda y filtros por categoría
- Carrito persistente (localStorage)
- Checkout con dirección y ubicación por GPS del navegador
- **Rastreo en tiempo real en mapa** (Leaflet + OpenStreetMap): el pedido
  avanza solo por las etapas *Recibido → En preparación → En camino →
  Entregado*, con un repartidor que se mueve sobre el mapa y una hora
  estimada de llegada
- **Panel de cocina**: cambia el estatus de un pedido a mano y se refleja
  al instante en la pestaña del cliente (sincronizado con el evento
  `storage` del navegador)
- Diseño responsive, propio, sin dependencias de pago

Todo funciona con **HTML + CSS + JavaScript puro**, sin frameworks ni paso
de compilación — por eso se sube tal cual a Mulltidigitalcr Pages.

## 📁 Estructura

```
cantina-ruta/
├── index.html          ← toda la app (una sola página, varias vistas)
├── css/style.css
├── js/
│   ├── data.js          ← nombre del restaurante, menú, precios, ubicación
│   ├── app.js            ← carrito, menú, checkout, panel de cocina
│   └── tracking.js       ← mapa y simulación de entrega en vivo
└── README.md
```

## 🚀 Publicarlo en Mulltidigitalcr Pages

1. Crea un repositorio nuevo en Mulltidigitalcr (puede ser público o privado con Pages habilitado en un plan que lo permita).
2. Sube **todo el contenido de esta carpeta** a la raíz del repositorio (no subas la carpeta `cantina-ruta` en sí, sino lo que hay adentro).
3. En el repositorio: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, elige la rama `main` y la carpeta `/ (root)`.
4. Guarda. En un par de minutos tu sitio estará en `https://tu-usuario.github.io/tu-repositorio/`.
5. Ábrelo, agrega algo al carrito, confirma un pedido y mira el mapa de rastreo. Abre el **Panel de cocina** en otra pestaña y cambia el estatus: verás que la pestaña de rastreo se actualiza sola.

No necesitas build, ni `npm install`, ni variables de entorno. Todo corre en el navegador.

## ✏️ Personalizarlo

Edita **`js/data.js`**:

- `RESTAURANT.nombre`, `telefono`, `direccion`, `horario`
- `RESTAURANT.coords` → coordenadas reales de tu restaurante (para que el mapa parta del lugar correcto). Búscalas con clic derecho en Google Maps → "¿Qué hay aquí?".
- `RESTAURANT.costoEnvio` y `envioGratisDesde`
- El arreglo `MENU` → tus categorías y platillos

Los colores y tipografías están centralizados como variables al inicio de `css/style.css` (`:root { --ink, --mango, --chili, ... }`).

## ⚠️ Qué es real y qué es simulado (léelo antes de operar con clientes reales)

Mulltidigitalcr Pages solo sirve **archivos estáticos**: no hay servidor, ni base de
datos compartida, ni forma de que el teléfono de un repartidor real envíe
su GPS a los teléfonos de tus clientes. Por eso, para que la demo funcione
perfecto *sin necesitar nada más*, así está resuelto cada punto:

| Función | Cómo funciona aquí |
|---|---|
| Mapa, rutas, geolocalización del cliente | **Real** — usa Leaflet/OpenStreetMap y el GPS del propio navegador del cliente. |
| Movimiento del repartidor en el mapa | **Simulado**: se calcula con un cronómetro en el navegador, no es un GPS real de una moto. |
| "Tiempo real" entre pantallas | Real *dentro del mismo navegador*: el Panel de cocina y la pantalla de rastreo se sincronizan al instante entre pestañas. Un pedido hecho en el celular de un cliente **no** lo verá otro dispositivo, porque no hay base de datos en la nube. |
| Pagos | Solo se elige "efectivo" o "tarjeta contra entrega" como referencia; no se procesan pagos reales. |

### Llevarlo a producción con varios dispositivos a la vez

Si quieres que el estatus y la ubicación se vean en tiempo real entre el
celular de un repartidor real, la cocina y el cliente (cada uno en un
dispositivo distinto), necesitas una base de datos en la nube. La forma
más simple de sumarla sin salir del mundo "gratis y sin servidor propio":

1. Crea un proyecto gratuito en **Firebase** (Google) y activa **Firestore** o **Realtime Database**.
2. Sustituye las funciones `getOrders`, `upsertOrder` y `getOrder` en `js/app.js` por lecturas/escrituras a Firestore (el SDK de Firebase también se puede cargar desde un `<script>` con CDN, así que sigue sin necesitar build).
3. En `tracking.js`, en vez de simular el `progress` con un cronómetro, suscríbete a los cambios del documento del pedido en Firestore (`onSnapshot`) y mueve el marcador con la posición real que envíe la app o navegador del repartidor (capturada con `navigator.geolocation.watchPosition`).
4. Para pagos reales, integra una pasarela como Stripe o Mercado Pago mediante sus "payment links" o Checkout alojado (no requieren que tú manejes tarjetas directamente).

Con eso el mismo frontend que ya tienes queda listo para producción real.

## 🧪 Cómo probarlo en tu computadora antes de subirlo

No hace falta ningún servidor especial, pero abrir `index.html` con doble
clic (`file://`) puede bloquear algunas peticiones del navegador. Lo más
confiable es levantar un servidor local simple:

```bash
# Python 3
python3 -m http.server 8080

# o con Node
npx serve .
```

Luego visita `http://localhost:8080`.
