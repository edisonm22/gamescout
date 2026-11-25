# gamescout
Plataforma web para comparar precios, ofertas y descuentos de videojuegos entre diferentes tiendas digitales.

El catálogo de PC cubre Colombia, Estados Unidos y España. Cada ficha muestra el importe y la moneda que publica la tienda, junto con la fecha de consulta. En Colombia se utiliza la TRM publicada en Datos Abiertos para ordenar los precios de GOG en USD junto a las ofertas en COP.

### Actualizar los precios

Ejecuta `node actualizar.mjs` con Node.js 22 o posterior y publica el archivo `catalogo.js` generado junto al sitio. La actualización conserva los identificadores de los juegos y sustituye los datos cuando obtiene al menos 200 comparaciones entre tiendas para cada mercado. Usa `node actualizar.mjs --descubrir` para buscar títulos adicionales.

Steam, GOG y Microsoft Store proporcionan los precios regionales. CheapShark ayuda a localizar identificadores durante el descubrimiento. GameScout contrasta el tipo de producto, el título de la edición y el año con las fichas de Steam y GOG. Los objetivos de precio se guardan por juego y mercado en el navegador.
