# Estructura de GameScout

GitHub Pages publica la aplicación desde la raíz del repositorio. Para probarla en tu equipo, sirve esta carpeta con un servidor HTTP estático y abre `index.html`. Las rutas internas usan fragmentos, por ejemplo `#/catalogo` y `#/juego/minecraft?mercado=CO`.

| Archivo | Función |
| --- | --- |
| `index.html` | Documento principal, navegación del pie de página y recursos de marca. |
| `app.js` | Navegación, búsqueda, filtros, fichas, alertas y formularios. |
| `style.css` | Diseño adaptable y distintivos de las tiendas. |
| `data.js` | Presentación de importes, conversión regional y orden de las ofertas. |
| `catalogo.js` | Última consulta publicada con juegos, vendedores, monedas, enlaces y fecha. |
| `actualizar.mjs` | Consulta las fuentes, valida la cobertura y reemplaza el catálogo. |
| `tiendas.mjs` | Incorpora ofertas adicionales de CheapShark, Nuuvem y Microsoft Store. |

El visitante puede comparar como invitado. El alias, el mercado y las alertas se guardan en el navegador. Los enlaces comerciales abren la tienda o el distribuidor correspondiente. El formulario para tiendas prepara un mensaje que su autor puede revisar y enviar desde su aplicación de correo.

Consulta el [README](./README.md) para actualizar los precios.
