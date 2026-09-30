# Publicar la web de La Casa Nostra en tu propio hosting

La web pública es **estática**: carta, horarios, reservas por teléfono/WhatsApp,
empleo por email y páginas legales. **No** tiene pedidos online ni login, y
**no necesita backend ni base de datos**. Cualquier hosting web sirve.

## Antes de publicar (obligatorio)

1. **Datos legales** en `src/data/business.js`: razón social, NIF/CIF, registro
   mercantil (si es sociedad) y dominio. Salen en el Aviso Legal y en la
   Política de Privacidad, y la ley (LSSI) exige que sean reales.
2. **Teléfono/WhatsApp** (`phone` y `whatsapp` en el mismo archivo): confírmalos.
3. **Alérgenos** en `src/data/staticCatalog.js`: se dedujeron automáticamente de
   la carta y **deben revisarse** con el negocio (Reglamento UE 1169/2011).

## 1. Generar la web

```bash
cd frontend
npm install
npm run build
```

El resultado queda en `frontend/dist/`.

## 2. Subirla

Sube **el contenido** de `dist/` (no la carpeta en sí) a la carpeta pública del
hosting (normalmente `public_html/` o `www/`) por FTP/SFTP o con el
administrador de archivos del hosting.

- Incluye el archivo oculto **`.htaccess`**: hace que las URLs como `/carta` o
  `/reservar` funcionen al recargar la página. En FileZilla, activa
  *Servidor → Forzar mostrar archivos ocultos*.
- Si usas Netlify o Cloudflare Pages, arrastra la carpeta `dist/`; el archivo
  `_redirects` hace el mismo papel que `.htaccess`.
- En otros servidores (Nginx), configura que las rutas desconocidas sirvan
  `index.html` (`try_files $uri /index.html;`).

La web debe servirse desde la **raíz del dominio** (`https://tudominio.com/`),
no desde una subcarpeta.

## 3. HTTPS

Activa el certificado SSL gratuito (Let's Encrypt) en el panel del hosting.
Después, descomenta las dos líneas de "Forzar HTTPS" en `public/.htaccess`,
vuelve a hacer `npm run build` y sube de nuevo `.htaccess`.

## Actualizar la web

Cada cambio: `npm run build` y volver a subir el contenido de `dist/`
(sustituyendo los archivos anteriores).

## Reactivar pedidos y login (futuro)

El código de pedidos, login, reservas y candidaturas online sigue en el
proyecto, desactivado con interruptores (`src/config/features.js`). Para
activarlos hace falta **desplegar antes el backend** (Node + PostgreSQL) y luego
compilar con:

```bash
VITE_ENABLE_AUTH=true
VITE_ENABLE_ORDERS=true
VITE_ENABLE_ONLINE_FORMS=true
VITE_API_URL=https://api.tudominio.com   # si el backend va en otro dominio
VITE_GOOGLE_CLIENT_ID=...                # para el login con Google
```

(en `frontend/.env.production.local` o como variables de entorno del build).
Para desarrollo local con todo activado, pon esas variables en
`frontend/.env.local`.
