/* ==========================================================================
   CANTINA RUTA — datos del menú
   Edita este archivo para cambiar el nombre del restaurante, platillos,
   precios, moneda o la ubicación del restaurante en el mapa.
   ========================================================================== */

const RESTAURANT = {
  nombre: "Cantina Ruta",
  eslogan: "Cocina de mercado, servida en movimiento",
  telefono: "+52 55 1234 5678",
  direccion: "Av. Insurgentes 742, Ciudad de México",
  // Coordenadas del restaurante (lat, lng) — usadas como punto de partida
  // en el mapa de rastreo en tiempo real. Cámbialas por tu ubicación real.
  coords: { lat: 19.4130, lng: -99.1710 },
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
      { id: "e1", nombre: "Tostadas de atún", desc: "Atún sellado, aguacate, chile serrano y limón.", precio: 145, tag: "Popular" },
      { id: "e2", nombre: "Elote callejero", desc: "Elote asado, mayo, queso cotija y chile piquín.", precio: 65 },
      { id: "e3", nombre: "Guacamole de la casa", desc: "Aguacate martajado, pico de gallo y totopos.", precio: 95, tag: "Vegano" },
      { id: "e4", nombre: "Sopa de tortilla", desc: "Caldo de jitomate, tortilla frita, queso y crema.", precio: 90 }
    ]
  },
  {
    categoria: "Plato fuerte",
    icono: "🔥",
    items: [
      { id: "f1", nombre: "Tacos al pastor (5)", desc: "Trompo de cerdo, piña asada, cebolla y cilantro.", precio: 130, tag: "Popular" },
      { id: "f2", nombre: "Costilla en salsa de tamarindo", desc: "Costilla braseada 8 horas, puré de camote.", precio: 245 },
      { id: "f3", nombre: "Enchiladas verdes", desc: "Pollo deshebrado, salsa verde, crema y queso.", precio: 155 },
      { id: "f4", nombre: "Chile relleno de queso", desc: "Chile poblano, queso oaxaca, salsa de jitomate.", precio: 135, tag: "Vegetariano" },
      { id: "f5", nombre: "Pescado a la talla", desc: "Filete de pescado, adobo rojo, arroz y ensalada.", precio: 210 }
    ]
  },
  {
    categoria: "Para el final",
    icono: "🍮",
    items: [
      { id: "p1", nombre: "Flan de café", desc: "Flan clásico infusionado con café de olla.", precio: 75 },
      { id: "p2", nombre: "Churros con cajeta", desc: "Churros crujientes, cajeta y canela.", precio: 80, tag: "Popular" },
      { id: "p3", nombre: "Pastel de elote", desc: "Pastel húmedo de elote con crema batida.", precio: 85 }
    ]
  },
  {
    categoria: "Para acompañar",
    icono: "🥤",
    items: [
      { id: "b1", nombre: "Agua de jamaica", desc: "Preparada en casa, sin conservadores.", precio: 40 },
      { id: "b2", nombre: "Michelada Cantina", desc: "Cerveza clara, salsas y limón.", precio: 95, tag: "21+" },
      { id: "b3", nombre: "Limonada mineral", desc: "Limón recién exprimido y agua mineral.", precio: 45 },
      { id: "b4", nombre: "Café de olla", desc: "Piloncillo, canela y clavo.", precio: 40 }
    ]
  }
];
