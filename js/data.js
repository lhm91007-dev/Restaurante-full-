/* ==========================================================================
   CANTINA RUTA — datos del menú
   Edita este archivo para cambiar el nombre del restaurante, platillos,
   precios, moneda o la ubicación del restaurante en el mapa.
   ========================================================================== */

const RESTAURANT = {
  nombre: "Cantina Ruta",
  eslogan: "Cocina de mercado, servida en movimiento",
  telefono: "+506 2222 3344",
  direccion: "Avenida Central, San José, Costa Rica",
  // Coordenadas del restaurante (lat, lng) — usadas como punto de partida
  // en el mapa de rastreo en tiempo real. Cámbialas por tu ubicación real.
  coords: { lat: 9.9281, lng: -84.0907 },
  moneda: "$",
  horario: "Todos los días · 12:00 – 23:00",
  tiempoPromedioMin: 28,
  costoEnvio: 35,
  envioGratisDesde: 450
};

// Cada platillo pertenece a una categoría. El número de "parada" (stop)
// dentro de cada categoría se usa como motivo visual de "ruta" del menú.
const MENU = [
  {
    categoria: "Para arrancar",
    icono: "🌱",
    items: [
      { id: "e1", nombre: "Patacones con frijoles", desc: "Plátano verde frito, frijoles molidos y queso fresco.", precio: 65, tag: "Popular" },
      { id: "e2", nombre: "Ceviche de corvina", desc: "Pescado fresco curado en limón, cilantro y culantro coyote.", precio: 145 },
      { id: "e3", nombre: "Chorreadas con natilla", desc: "Tortitas de elote tierno con natilla casera.", precio: 75, tag: "Vegetariano" },
      { id: "e4", nombre: "Sopa negra", desc: "Frijoles negros, huevo escalfado y culantro.", precio: 90 }
    ]
  },
  {
    categoria: "Plato fuerte",
    icono: "🔥",
    items: [
      { id: "f1", nombre: "Casado con pollo en salsa", desc: "Arroz, frijoles, plátano maduro, ensalada y pollo en salsa criolla.", precio: 130, tag: "Popular" },
      { id: "f2", nombre: "Olla de carne", desc: "Res, yuca, camote, elote, ayote y chayote en caldo.", precio: 195 },
      { id: "f3", nombre: "Arroz con pollo tico", desc: "Arroz jugoso con pollo deshebrado, chile dulce y culantro.", precio: 140 },
      { id: "f4", nombre: "Chifrijo", desc: "Frijoles, chicharrón, arroz, pico de gallo y tortillas.", precio: 120, tag: "Popular" },
      { id: "f5", nombre: "Pescado entero frito", desc: "Pescado del día frito, arroz, patacones y ensalada.", precio: 210 }
    ]
  },
  {
    categoria: "Para el final",
    icono: "🍮",
    items: [
      { id: "p1", nombre: "Tres leches", desc: "Bizcocho húmedo bañado en tres leches y canela.", precio: 80, tag: "Popular" },
      { id: "p2", nombre: "Flan de coco", desc: "Flan cremoso con coco rallado y caramelo.", precio: 75 },
      { id: "p3", nombre: "Arroz con leche", desc: "Cremoso, con canela y pasas.", precio: 65 }
    ]
  },
  {
    categoria: "Para acompañar",
    icono: "🥤",
    items: [
      { id: "b1", nombre: "Refresco de cas", desc: "Fruta tica natural, endulzada al gusto.", precio: 40 },
      { id: "b2", nombre: "Agua dulce con limón", desc: "Tapa de dulce disuelta, servida fría con limón.", precio: 35 },
      { id: "b3", nombre: "Horchata", desc: "Arroz, canela y un toque de vainilla.", precio: 45 },
      { id: "b4", nombre: "Café Tarrazú", desc: "Café de altura de la zona de Los Santos.", precio: 40, tag: "Popular" }
    ]
  }
];
