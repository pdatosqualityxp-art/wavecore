# WaveCore

Plataforma full stack con IA generativa para analítica empresarial y RAG documental.

## Descripción general

WaveCore es una aplicación web que combina cuatro capacidades sobre los datos de la empresa:

- **Dashboards:** indicadores y gráficos de ventas, compras, servicios e intervenciones, alimentados por Supabase.
- **Asistente virtual:** chat que consulta la base de datos en tiempo real (modo analítico en caliente).
- **Repositorio documental:** carga e ingesta de documentos internos para su uso en RAG.
- **Agente de IA:** consulta la documentación interna y la base de datos y responde en modo razonamiento.

La interfaz es responsive, admite modo claro y oscuro y está disponible en español, catalán e inglés. El acceso es mediante Supabase Auth, con inicio de sesión por email o como invitado anónimo.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Estilos | Tailwind CSS 4 y sistema de diseño propio (`ui-*`) |
| Navegación | React Router |
| Iconos | lucide-react |
| Autenticación y datos | Supabase (`@supabase/supabase-js`) |
| Pruebas | Vitest y React Testing Library |
| Despliegue del frontend | Vercel |

### Backends externos

El frontend se conecta a dos servicios externos:

- **API Company**, desplegada en Vercel: asistente virtual (`/api/chat`).
- **API CFO**, desplegada en Render: repositorio documental y agente de IA.

## Instalación

Requisitos: Node.js y npm.

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y completa las variables:

   | Variable | Descripción |
   |---|---|
   | `VITE_SUPABASE_URL` | URL del proyecto de Supabase. |
   | `VITE_SUPABASE_ANON_KEY` | Clave pública (anon/publishable). |
   | `VITE_SUPABASE_TABLES` | Tablas del esquema `public` separadas por comas. |
   | `VITE_AGENT_COMPANY_API_URL` | Destino del proxy local de la API Company. |
   | `VITE_API_BASE_URL` | URL de la API CFO. |

   No uses claves `service_role` ni secretas en el cliente.

3. En Supabase (Authentication), habilita los proveedores de acceso anónimo y de email.

## Ejecución

- Desarrollo: `npm run dev`. La aplicación queda en `http://localhost:5173`. El puerto es fijo: si está ocupado, Vite no arrancará.
- Pruebas: `npm test`.
- Build de producción: `npm run build`.

También puedes depurar desde VS Code: abre **Run and Debug**, selecciona **WaveCore: Chrome** y pulsa `F5`.

En desarrollo, las peticiones a `/api` se reenvían mediante el proxy de Vite a la API Company; en producción lo hace Vercel. `VITE_API_BASE_URL` se incorpora al bundle en la compilación, por lo que debe apuntar a la API CFO correcta antes de compilar o desplegar.

## Estructura del proyecto

```text
src/
├── App.tsx                  # Rutas principales
├── main.tsx                 # Arranque de la aplicación
├── styles.css               # Tailwind y sistema de diseño
├── assets/                  # Logo e imágenes de modelos
├── design/
│   ├── tokens.css           # Tokens semánticos de color y estado
│   └── components.css       # Clases reutilizables `ui-*`
├── features/                # Módulos por funcionalidad
│   ├── auth/                # Inicio de sesión
│   ├── home/                # Inicio
│   ├── dashboard_ventas/    # Dashboard de ventas
│   ├── analisis_compras/    # Análisis de compras
│   ├── control_servicios/   # Control de servicios
│   ├── intervenciones/      # Intervenciones
│   ├── clientes/, ventas/, productos/, compras/,
│   │   componentes/, proveedores_compo/   # Datos
│   ├── modelos/             # Catálogo de modelos
│   ├── agent_company/       # Asistente virtual
│   ├── agent_cfo/           # Repositorio documental
│   ├── agent_cfo_chat/      # Agente de IA
│   ├── stack_info/          # Información del stack
│   └── test_login/          # Explorador de diagnóstico
├── shared/
│   ├── components/          # AppShell, selector de idioma, tablas
│   ├── context/             # Auth y tema
│   ├── i18n/                # Traducciones ca, es y en
│   └── lib/                 # Cliente Supabase y utilidades
└── test/                    # Configuración de pruebas
spec/                        # Especificaciones funcionales
```

## Funcionalidades especiales

### Dashboards

Tarjetas KPI y gráficos sobre datos reales de Supabase, con filtros, y estados de carga, error y sin datos. Los valores se muestran también como texto accesible y se respeta `prefers-reduced-motion`.

- Rutas: `/dashboard`, `/analisis-compras`, `/control-servicios`, `/intervenciones`.

### Asistente virtual

Chat que consulta la base de datos en tiempo real (modo analítico en caliente) a través de la API Company.

- Ruta: `/agent-company`.

### Repositorio documental

Carga e ingesta de documentos internos mediante la API CFO, con visor de documentos.

- Ruta: `/agent-cfo`.

### Agente de IA

Chat en modo razonamiento que combina la documentación interna del repositorio y la base de datos para responder.

- Ruta: `/agent-cfo-chat`.

## URL's del proyecto


Repositorios Gitub
- Frontend: https://github.com/pdatosqualityxp-art/wavecore
- Backend 1 (Asistente Virtual): https://github.com/pdatosqualityxp-art/wavecore-api-company
- Backend 2(Agente IA): https://github.com/pdatosqualityxp-art/wavecore-api-cfo

Proyecto web
- https://wavecore-nu.vercel.app/

Video Presentación
- https://youtu.be/e3hetOQ9dTs

Slides
- https://drive.google.com/file/d/1PPOlemVgnnDC3nPDB5zsyOqKlYcmbNxe/view?usp=sharing
