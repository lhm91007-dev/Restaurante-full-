/* =========================================================
   CONFIGURACIÓN DE FIREBASE — sincronización + acceso seguro
   =========================================================

   PASOS PARA ACTIVAR EL MODO NUBE (multi-dispositivo, con login):

   1. Ve a https://console.firebase.google.com y crea un proyecto (es gratis).
   2. Dentro del proyecto: "Agregar app" → ícono web </> → dale un nombre.
      Firebase te mostrará un objeto de configuración: cópialo y pégalo
      reemplazando el de abajo (firebaseConfig).
   3. Build → Firestore Database → "Crear base de datos" → modo de prueba.
   4. Build → Authentication → "Comenzar" → pestaña "Sign-in method" →
      activa el proveedor "Correo electrónico/contraseña".
   5. Ve a Authentication → pestaña "Users" → "Add user" y crea una
      cuenta (correo + contraseña) para cada miembro de tu personal
      que deba acceder (caja, cocina, repartidores). No hay registro
      público: solo tú, desde la consola, das de alta cuentas.
   6. Firestore → pestaña "Reglas" → reemplaza el contenido por el
      bloque de reglas de más abajo, para que solo el personal con
      sesión iniciada pueda leer o escribir datos.
   7. Guarda este archivo junto a los demás y sube todo a tu repo de
      GitHub Pages.

   Mientras dejes los valores de ejemplo tal cual están, la app funciona
   en MODO LOCAL (un solo navegador, sin sincronizar y sin pantalla de
   acceso) automáticamente. No necesitas borrar nada para probarla.
   ========================================================= */

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

window.FIREBASE_READY = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "TU_API_KEY";

if (window.FIREBASE_READY) {
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
  window.auth = firebase.auth();
}

/* =========================================================
   REGLAS DE FIRESTORE RECOMENDADAS (aplícalas en el paso 6)
   =========================================================
   Con esto, solo alguien con una cuenta creada por ti en el
   paso 5 puede leer o escribir datos — nadie más, aunque
   conozca la URL de tu proyecto.

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }

   Sin este cambio, cualquiera con el enlace a tu base de datos
   podría leer o modificar tus pedidos y tu menú.
   ========================================================= */
