# WaveCore

Aplicación React + Vite con autenticación de Supabase, acceso de invitado anónimo, modo claro/oscuro y traducciones en español, catalán e inglés.

Después de iniciar sesión se abre `/test_login`, un explorador de diagnóstico que muestra hasta 50 filas de las tablas indicadas en `VITE_SUPABASE_TABLES`. Indica nombres separados por comas, por ejemplo `customers,products`; las consultas usan la sesión activa y respetan permisos y políticas RLS. La lista explícita evita depender de la introspección OpenAPI de PostgREST, que puede requerir una clave secreta y no se debe exponer en el navegador.

## Configuración local

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env` y configura `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` con la URL del proyecto y su clave pública (anon/publishable), y `VITE_SUPABASE_TABLES` con una lista separada por comas de tablas del esquema `public` que quieras mostrar. No uses una `service_role` ni una clave secreta en el cliente.
3. En Supabase, habilita el proveedor de acceso anónimo y el proveedor Email en los ajustes de Authentication.
4. Inicia la aplicación con `npm run dev`.

## Ejecutar y depurar en VS Code

1. Abre la carpeta del proyecto en VS Code e instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env` y configura las variables de Supabase, incluyendo la lista `VITE_SUPABASE_TABLES`.
3. Abre **Run and Debug** (`Ctrl+Shift+D`), selecciona **WaveCore: Chrome** y pulsa `F5`. VS Code iniciará Vite y abrirá Chrome conectado al depurador. Puedes poner breakpoints en los archivos TypeScript/TSX.

## Permisos de lectura para invitados

Los inicios de sesión anónimos reciben el rol `authenticated` y el claim `is_anonymous: true`. Habilita RLS en cada tabla expuesta y crea una política de lectura limitada a ese claim. Sustituye `mi_tabla` por cada tabla que el invitado deba consultar:

```sql
-- 1. Borramos la política restrictiva anterior
DROP POLICY IF EXISTS "Guests can read z_test" ON public.z_test;

-- 2. Creamos una política que permita leer a los anónimos O a los usuarios autenticados normales
create policy "Authenticated users and guests can read z_test"
on public.z_test
for select
to authenticated
using (
  (select auth.jwt() ->> 'is_anonymous') = 'true' 
  OR 
  (select auth.jwt() ->> 'is_anonymous') IS NOT DISTINCT FROM 'false'
  -- O simplemente permitiendo a todo el rol 'authenticated' como vimos al principio:
  -- true
);
```

No crees políticas de `insert`, `update` o `delete` para invitados. Las políticas RLS que ya existan para `authenticated` también pueden aplicarse a usuarios anónimos: revisa las políticas de escritura y añade una condición que excluya `is_anonymous = 'true'` si deben seguir disponibles para usuarios autenticados normales, por ejemplo:

```sql
-- Añade estas condiciones a las políticas de escritura existentes:
using ((select auth.jwt() ->> 'is_anonymous') is distinct from 'true')
with check ((select auth.jwt() ->> 'is_anonymous') is distinct from 'true')
```

Conserva en cada política las demás condiciones que ya tenga; las políticas permisivas de RLS se combinan con `OR`. Aplica la política de lectura únicamente a las tablas y filas necesarias. Revisa también permisos de tablas relacionadas, vistas, funciones RPC y Storage; RLS de una tabla no concede ni restringe automáticamente el acceso a esos otros recursos.

## Verificación

- `npm test`: ejecuta las pruebas con Vitest.
- `npm run build`: comprueba los tipos de TypeScript y genera el build de producción.
