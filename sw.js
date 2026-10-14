// Service Worker base. Aquí añadiremos luego el caché y las notificaciones Push
self.addEventListener('install', (event) => {
    console.log('Service Worker: Instalado');
});

self.addEventListener('fetch', (event) => {
    // Intercepción de peticiones para modo offline (se implementará después)
});