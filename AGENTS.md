# AGENTS.md

## 1. Stack actual del proyecto

Este proyecto usa una configuración concreta y validada en la repo actual:

* React 18 + Vite + TypeScript
* Tailwind CSS 4
* React Router
* `lucide-react` para iconos
* `@supabase/supabase-js` para autenticación y acceso a Supabase
* Vitest + React Testing Library para tests

Si se crea o recrea la base del proyecto, debe mantenerse la plantilla `react-ts` de Vite y las dependencias del stack actual.

## 2. Estructura de archivos y arquitectura

La estructura sigue un enfoque modular por funcionalidad, con algunos módulos ya presentes en la solución actual:

```text
src/
├── App.tsx                 # Rutas principales de la aplicación
├── main.tsx                # Arranque de la app
├── styles.css              # Tailwind + imports del sistema de diseño
├── assets/
│   └── logo.png            # Logo de la app
├── design/
│   ├── tokens.css          # Tokens semánticos de color, superficies, texto y estados
│   └── components.css      # Clases reutilizables del sistema visual (`ui-*`)
├── features/
│   ├── auth/
│   │   ├── Login.tsx
│   │   └── Login.test.tsx
│   ├── home/
│   │   └── Home.tsx
│   └── test_login/
│       ├── TestLogin.tsx
│       └── TestLogin.test.tsx
├── shared/
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── LanguageSelector.tsx
│   │   └── AppShell.test.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── i18n/
│   │   ├── LanguageContext.tsx
│   │   ├── ca.json
│   │   ├── es.json
│   │   └── en.json
│   └── lib/
│       └── supabase.ts
├── test/
│   └── setup.ts
└── vite-env.d.ts
```

La lógica de autenticación, tema y traducción vive en `shared/context` y `shared/i18n`, mientras que cada funcionalidad concreta debe mantenerse dentro de `features/`.

## 3. Sistema centralizado de diseño

La base visual del proyecto debe reutilizar el sistema de diseño centralizado y no definir paletas o tokens ad hoc por feature.

* `src/design/tokens.css` contiene variables semánticas para colores, fondos, texto, estados, sombras y acentos.
* `src/design/components.css` define patrones reutilizables con clases `ui-*` (por ejemplo `ui-page`, `ui-surface`, `ui-input`, `ui-nav-item`, `ui-user-card`).
* `src/styles.css` importa Tailwind y los archivos del sistema de diseño.
* En JSX se deben usar clases semánticas `ui-*` para color, superficie, borde, estado y estructura visual. Tailwind se usa principalmente para layout, spacing, tipografía y responsive.
* Si se crea un patrón visual nuevo, debe añadirse como clase reutilizable al sistema central y no como estilos aislados en cada feature.
* Las nuevas páginas deben seguir la jerarquía visual y el nivel de acabado de Inicio (`/`) y Dashboard Ventas (`/dashboard`), eligiendo como referencia el patrón más cercano a su propósito. Reutilizar los componentes compartidos y el sistema centralizado; no copiar estilos locales ni crear paletas propias.

## 4. UI y responsive

El layout principal está implementado con `AppShell` y debe seguir el patrón actual del proyecto:

### Desktop

* Sidebar lateral con logo, tema, navegación, idioma y perfil.
* Opción de colapsar/expandir el menú.
* Usuario con avatar y menú de acciones.

### Móvil

* Barra superior fija con menú, logo y selector de tema.
* Drawer lateral con la navegación.
* Fondo translúcido y cierre con botón o Escape.

La interfaz debe ser responsive y compatible con modo claro y oscuro.

## 5. Navegación y rutas

La navegación principal del proyecto es la que existe en la app actual:

* Inicio → `/`
* Sección Finanzas:
  * Stack Tecnológico → `/stack`
  * Dashboard → `/dashboard`
* Sección Internet of Things:
  * IoT → `/iot`
* Páginas de pruebas/demo adicionales:
  * `/demo-1` ... `/demo-15`

La navegación se gestiona con `react-router-dom` y el shell común en `src/shared/components/AppShell.tsx`.

El pie del menú incluye:

* Selector de idioma.
* Nombre del usuario autenticado.
* Versión de la aplicación: `Ver 1.1`.

## 6. Tema

El sistema de tema global debe implementarse en:

```text
src/shared/context/ThemeContext.tsx
```

Requisitos del proyecto actual:

* Soportar light/dark.
* Aplicar la clase `dark` al elemento raíz (`document.documentElement`).
* Persistir la preferencia en `localStorage` (`wavecore-theme`).
* Actualizar el estado inmediatamente al cambiar el tema.

## 7. Internacionalización

El proyecto soporta exclusivamente:

* Català (`ca`)
* Español (`es`)
* English (`en`)

Las traducciones están centralizadas en:

```text
src/shared/i18n/
```

El contexto de idioma está en `src/shared/i18n/LanguageContext.tsx` y usa `ca.json`, `es.json` y `en.json`.

### Regla obligatoria

No escribir textos estáticos de UI directamente en componentes.

Incorrecto:

```tsx
<h1>Dashboard</h1>
```

Correcto:

```tsx
<h1>{t('menu.dashboard')}</h1>
```

Todo texto visible de la interfaz debe existir en los archivos de traducción.

## 8. Supabase y seguridad

La integración actual usa `@supabase/supabase-js` y debe leer la configuración desde variables de entorno.

Variables requeridas:

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* `VITE_SUPABASE_TABLES`

`src/shared/lib/supabase.ts` debe validar que esas variables existan antes de crear el cliente. Nunca exponer claves secretas (`sb_secret_...`) en código del cliente.

En este proyecto, la autenticación se integra con Supabase y la carga del perfil del usuario se hace usando la tabla `z_users` cuando existe. Las políticas RLS y permisos de lectura deben respetar el modelo de invitado anónimo y la sesión activa.

## 9. Testing

Se usa Vitest + React Testing Library.

* Nombrar los tests como `[Componente].test.tsx`.
* Colocarlos junto al componente o en `src/test` cuando correspondera.
* Mockear Supabase y servicios externos en tests unitarios.
* Añadir tests para comportamientos relevantes: navegación, autenticación, tema, idioma y rendering de componentes.

## 10. Convenciones de trabajo

* Mantener la arquitectura actual del repo; no introducir patrones diferentes solo por preferencia personal.
* Preferir cambios pequeños y coherentes con el diseño central ya existente.
* Reusar `Header`, `AppShell`, `ThemeContext`, `LanguageContext` y componentes de `shared` antes de crear duplicados.
* Si se agregan nuevas rutas o features, mantenerlas alineadas con el shell principal y con el modelo de i18n.

## 11. Patrón de nuevas páginas

Usar Dashboard Ventas como referencia de calidad funcional y visual para las nuevas páginas de producto, especialmente las páginas analíticas. Consultar `src/features/dashboard_ventas/DashboardVentas.tsx`, sus estilos semánticos en `src/design/components.css` y la especificación `spec/003.dashboardVentas.md`. Adaptar los elementos al propósito de cada página; no replicar sus métricas, rankings o filtros cuando no correspondan.

* Ocupar el ancho de contenido disponible dentro de `AppShell`, como Inicio y Dashboard Ventas; no añadir límites de ancho arbitrarios que hagan que la página se vea más estrecha.
* Componer la página con una cabecera clara (icono, título y descripción), controles relevantes y secciones de contenido ordenadas. En páginas de indicadores, priorizar tarjetas KPI y paneles/gráficos con la misma jerarquía visual que el dashboard.
* Conectar métricas y visualizaciones a la fuente real de datos del producto. No usar datos simulados, muestras SQL ni cifras de ejemplo como contenido de producción. Agregar datos de forma que las relaciones descriptivas no dupliquen importes o conteos.
* Ofrecer filtros sólo cuando sean útiles; explicar su alcance en la interfaz y actualizar de forma consistente todas las métricas y visualizaciones afectadas. Mantener accesible el estado seleccionado.
* Cubrir carga, error y ausencia de datos con estados explícitos y traducidos. No representar errores como ceros ni ocultarlos mediante fallbacks que parezcan resultados válidos.
* En gráficos, mostrar los valores relevantes también como texto accesible; el color no debe ser el único medio para interpretar los datos. Animar de forma discreta y respetar `prefers-reduced-motion`.
* Diseñar primero para móvil y adaptar tarjetas, filtros, gráficos y paneles a escritorio sin desbordamiento horizontal. Mantener contraste y legibilidad en temas claro y oscuro.
* Centralizar colores y patrones nuevos en `tokens.css` y `components.css`, y traducir todo el texto estático visible y accesible a `ca`, `es` y `en`. No introducir textos fijos ni paletas de color dentro de la feature.
* Añadir pruebas con servicios externos mockeados para cálculos, filtros, estados y visualizaciones relevantes; documentar los comportamientos de aceptación propios de la página.
