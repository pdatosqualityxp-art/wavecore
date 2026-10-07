# AGENTS.md

## 1. Stack

* React + Vite + TypeScript.
* Tailwind CSS.
* `lucide-react` para iconos.
* Supabase mediante `@supabase/supabase-js`.
* Vitest + React Testing Library para tests.

Si el proyecto no está inicializado, utilizar Vite con la plantilla `react-ts` e instalar las dependencias necesarias.

## 2. Arquitectura (Feature-Driven Architecture)

Utilizar una arquitectura modular orientada a funcionalidades:

```text
src/
├── config/              # Configuración y constantes globales
├── design/              # Tokens, paleta y estilos globales reutilizables
│   ├── tokens.css       # Variables semánticas de colores, superficies y sombras
│   └── components.css   # Clases visuales reutilizables para páginas y componentes
├── styles.css           # Tailwind, estilos base e imports del sistema de diseño
├── shared/
│   ├── components/      # Componentes reutilizables
│   ├── context/         # Contextos globales
│   └── i18n/            # Traducciones
├── features/
│   ├── home/
│   ├── info/
│   └── description/
└── assets/              # Recursos estáticos
```

Mantener la lógica específica de cada funcionalidad dentro de su correspondiente directorio en `features/`.

## 3. Sistema centralizado de diseño

Todas las páginas, pantallas y visores deben consumir los estilos y colores del sistema centralizado; no definir paletas propias dentro de una feature.

* Definir y cambiar la paleta, superficies, texto, estados, acentos, sombras y colores de interacción en `src/design/tokens.css`, mediante variables CSS semánticas.
* Definir patrones visuales reutilizables en `src/design/components.css` mediante clases `ui-*` (por ejemplo, `ui-page`, `ui-surface`, `ui-input`, `ui-button-primary`, `ui-alert`).
* Importar estos archivos desde `src/styles.css`; no importar tokens ni crear hojas de estilo de paleta en cada feature.
* En TSX, usar las clases semánticas `ui-*` para color, fondo, borde, sombra y estados. Tailwind puede usarse para layout, espaciado, tipografía y responsive.
* Si una feature necesita un patrón visual nuevo, añadir una clase semántica reutilizable a `components.css` y sus valores de color a `tokens.css`; no añadir valores hex, RGB ni utilidades de paleta Tailwind en el JSX.
* Los estilos propios de una feature se limitan a comportamiento visual específico que no sea un token de marca (por ejemplo, animaciones decorativas); sus colores deben referenciar variables de `tokens.css`.
* Los temas claro y oscuro se resuelven modificando variables semánticas en `tokens.css`, no duplicando variantes de color por pantalla.

## 4. UI y Responsive

El layout debe utilizar una navegación lateral (`Sidebar`) en desktop y una navegación tipo drawer en móvil.

### Desktop

* Sidebar desplegado con logo, tema, navegación, idioma y perfil.
* Sidebar plegado mostrando únicamente iconos.
* Botón para alternar entre ambos estados.

### Móvil

* Barra superior fija con menú, logo y selector de tema.
* Menú lateral tipo drawer al abrirse.
* Fondo traslúcido y botón de cierre.

La interfaz debe ser responsive y mantener compatibilidad con modo claro y oscuro.

## 5. Navegación

El menú principal contiene:

* Inicio → `/`
* Sección Finanzas:
  * Stack Tecnológico → `/stack`
  * Dashboard → `/dashboard`
* Sección Internet of Things:
  * IoT → `/iot`

Los elementos de navegación se muestran en una región desplazable. En escritorio, permitir plegar el menú; en móvil, utilizar una barra superior y un drawer lateral.

El logo se encuentra en `src/assets/logo.png`.

El pie del menú incluye:

* Selector de idioma.
* Nombre del usuario activo de Supabase.
* Versión de la aplicación: `Ver 1.1`.

Utilizar `lucide-react` para los iconos.

## 6. Tema

Implementar un `ThemeContext` global en:

```text
src/shared/context/ThemeContext.tsx
```

El sistema debe:

* Soportar modo claro y oscuro.
* Aplicar la clase `dark` de Tailwind al elemento raíz.
* Persistir la preferencia en `localStorage`.
* Actualizarse inmediatamente al cambiar el tema.

## 7. Internacionalización

Soportar exclusivamente:

* Català (`ca`)
* Español (`es`)
* English (`en`)

Las traducciones deben estar centralizadas en:

```text
src/shared/i18n/
```

### Regla obligatoria

No escribir textos estáticos de UI directamente en los componentes.

Incorrecto:

```tsx
<h1>Dashboard</h1>
```

Correcto:

```tsx
<h1>{t("dashboard.title")}</h1>
```

Todo texto estático debe existir en los archivos de traducción (`es.json`, `ca.json`, `en.json`).

Los datos dinámicos procedentes de Supabase no necesitan traducción.

## 8. Supabase y seguridad

* Utilizar `@supabase/supabase-js`.
* Leer la configuración desde variables de entorno:

  * `VITE_SUPABASE_URL`
  * `VITE_SUPABASE_ANON_KEY`
* Nunca exponer claves secretas (`sb_secret_...`) en el código cliente.

## 9. Testing

Utilizar Vitest + React Testing Library.

* Nombrar los tests como `[Componente].test.tsx`.
* Colocarlos junto al componente o en `/tests`.
* Mockear Supabase y servicios externos en tests unitarios.
* Añadir tests para la lógica y comportamientos relevantes.
