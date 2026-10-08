# 📁 Estructura del Proyecto - GameScout

## Organización de Carpetas

```
gamescout/
├── src/
│   ├── components/          # Componentes reutilizables de React
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── ProductCard/
│   │   ├── SearchBar/
│   │   └── ...
│   │
│   ├── pages/               # Páginas principales de la aplicación
│   │   ├── Home/
│   │   ├── GameDetails/
│   │   ├── Comparison/
│   │   ├── Deals/
│   │   └── Profile/
│   │
│   ├── services/            # Llamadas a APIs y lógica de backend
│   │   ├── gameService.js
│   │   ├── storeService.js
│   │   ├── priceService.js
│   │   └── authService.js
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useFetchGames.js
│   │   ├── usePriceComparison.js
│   │   └── useAuth.js
│   │
│   ├── context/             # React Context para estado global
│   │   ├── AuthContext.js
│   │   ├── GameContext.js
│   │   └── NotificationContext.js
│   │
│   ├── utils/               # Funciones utilitarias
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   ├── constants.js
│   │   └── helpers.js
│   │
│   ├── types/               # Definiciones TypeScript/tipos
│   │   ├── game.types.ts
│   │   ├── user.types.ts
│   │   └── store.types.ts
│   │
│   ├── styles/              # Estilos globales y temas
│   │   ├── global.css
│   │   ├── variables.css
│   │   ├── themes.css
│   │   └── responsive.css
│   │
│   ├── constants/           # Constantes de la aplicación
│   │   ├── apiEndpoints.js
│   │   ├── storeNames.js
│   │   └── appConfig.js
│   │
│   ├── App.jsx              # Componente principal
│   └── index.js             # Punto de entrada
│
├── public/                  # Archivos estáticos
│   ├── index.html
│   ├── favicon.ico
│   ├── images/
│   └── icons/
│
├── docs/                    # Documentación del proyecto
│   ├── API.md
│   ├── SETUP.md
│   ├── CONTRIBUTING.md
│   └── ARCHITECTURE.md
│
├── .env.example             # Variables de entorno de ejemplo
├── .gitignore               # Configuración de Git
├── package.json             # Dependencias del proyecto
├── package-lock.json
└── README.md                # Documentación principal
```

## 📋 Descripción de Directorios

### `/src/components`
- Componentes reutilizables de React
- Cada componente en su propia carpeta con su CSS/Styles
- Preferiblemente componentes funcionales

### `/src/pages`
- Páginas principales de la aplicación
- Rutas principales del sitio
- Lógica específica de página

### `/src/services`
- Comunicación con APIs
- Lógica de negocio separada de componentes
- Manejo de llamadas HTTP

### `/src/hooks`
- Custom hooks personalizados
- Lógica reutilizable entre componentes
- Manejo de efectos secundarios

### `/src/context`
- Gestión de estado global con Context API
- Providers de la aplicación
- Estados compartidos entre componentes

### `/src/utils`
- Funciones auxiliares
- Formateo de datos
- Validaciones comunes

### `/src/types`
- Tipos y interfaces TypeScript
- Definiciones de estructuras de datos

### `/src/styles`
- Estilos globales
- Variables CSS
- Temas de la aplicación

### `/src/constants`
- Valores constantes
- URLs de APIs
- Configuración inmutable

### `/public`
- Archivos servidos estáticamente
- Imágenes, fuentes, iconos
- HTML principal

### `/docs`
- Documentación técnica
- Guías de desarrollo
- Arquitectura del proyecto

## 🎯 Mejores Prácticas

1. **Nombres**: Usar camelCase para archivos y PascalCase para componentes
2. **Componentes**: Crear componentes pequeños y reutilizables
3. **Estilos**: Usar CSS modules o styled-components
4. **Testing**: Crear archivos `.test.js` junto a los componentes
5. **Imports**: Usar rutas relativas dentro de carpetas, absolutas para src/
6. **Documentación**: Añadir JSDoc a funciones importantes

## 🚀 Próximos Pasos

1. Instalar dependencias: `npm install`
2. Configurar variables de entorno: Copiar `.env.example` a `.env.local`
3. Iniciar servidor de desarrollo: `npm start`
4. Crear ramas para cada feature/bug: `git checkout -b feature/nombre-feature`
