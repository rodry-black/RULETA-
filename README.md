# Ruleta de Premios · Tucumanas Tafi

App web para la promo de feria/evento: ruleta con premios y probabilidades
configurables, generación de código de canje por giro, sección de canje
con login, y paleta de colores general editable.

## ⚠️ Paso obligatorio antes de usar esta versión: correr las migraciones

Si ya habías corrido el `schema.sql` original en Supabase, esta versión
necesita 2 migraciones nuevas (mensaje de celebración + tema de colores).

1. Ve a tu proyecto en Supabase → **SQL Editor**
2. Corre, en orden, el contenido completo de:
   - `../migraciones/001_mensaje_celebracion.sql`
   - `../migraciones/002_tema_configurable.sql`

Si estás empezando de cero (nunca corriste ningún SQL), no hace falta
correr las migraciones por separado — usa directamente `schema.sql`
más las migraciones en orden (001, luego 002), ya que el `schema.sql`
base todavía no incluye estos dos módulos.

## Ya está conectada a tu Supabase

Las credenciales (URL + anon key) ya están puestas en `src/App.jsx`. La
anon key es segura de tener en el código del frontend — así funciona
Supabase — así que no hay nada más que configurar ahí.

## 3 secciones

- **Ruleta**: pantalla pública. Cualquiera puede verla y girar (no necesita
  login). Es la que la encargada le muestra al cliente.
- **Configuración**: crear/editar premios, cantidades, probabilidades y
  mensajes de celebración (pestaña "Premios"); y la paleta general de
  colores de toda la app (pestaña "Apariencia"). Requiere iniciar sesión.
- **Canje**: para validar y marcar como canjeado un código. Requiere
  iniciar sesión.

El login es el mismo para ambas secciones — el usuario que creaste en
Supabase (Authentication → Users).

## Probar en tu compu antes de publicar

```bash
npm install
npm run dev
```

Abre la URL que te muestra en la terminal (usualmente `http://localhost:5173`).

## Publicar para usar en la feria (recomendado: Vercel)

Vercel es gratis, no pide tarjeta, y te da una URL pública en minutos.

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta (puedes usar tu
   cuenta de GitHub para entrar más rápido).
2. Click en **Add New → Project**.
3. Sube esta carpeta a un repositorio de GitHub (o usa el botón de subir
   carpeta directo si Vercel te lo ofrece — "Deploy without Git").
4. Framework preset: Vercel detecta **Vite** automáticamente. No cambies
   nada, dale a **Deploy**.
5. En 1-2 minutos te da una URL tipo `https://tu-proyecto.vercel.app`.
   Esa es la que abres en el celular de la encargada el día de la feria.

### Alternativa sin GitHub: Netlify Drop

Si no quieres usar GitHub:

1. Corre `npm run build` en esta carpeta (genera la carpeta `dist/`).
2. Ve a [app.netlify.com/drop](https://app.netlify.com/drop).
3. Arrastra la carpeta `dist/` completa a la página.
4. Te da una URL pública al instante.

Con esta opción, si luego cambias algo en el código, tienes que repetir
`npm run build` y volver a arrastrar la carpeta `dist/` — no se actualiza
sola. Vercel con GitHub sí se actualiza sola cada vez que subes cambios.

## Antes de la feria: cargar los premios reales y ajustar el look

1. Abre la app publicada, ve a **Configuración**, inicia sesión.
2. En la pestaña **Premios**: ahí están los 5 premios de ejemplo que
   vinieron con el SQL — edítalos o bórralos (el botón ✕ los desactiva,
   no los borra del todo, para no perder el historial si ya hay códigos
   generados).
3. Pon los premios reales, su cantidad, y guarda. La probabilidad se
   calcula sola en base a la cantidad — si quieres forzar una probabilidad
   distinta a mano, edítala directo y queda "congelada" (aparece un link
   "auto" para volver a que se calcule sola).
4. En "Mensaje al ganar" escribe lo que se le muestra al cliente al
   detenerse la ruleta, ej. "GANASTE UNA PEPSI CHIQUI". Si lo dejas vacío,
   se arma uno automático a partir del nombre del premio.
5. En la pestaña **Apariencia**: si quieres cambiar los colores generales
   de la app (fondo, botón, dorado, etc. — no el color de cada gajo, ese
   se edita en Premios), ajústalos ahí y dale "Guardar colores". Se aplica
   al instante para todos los que abran la app después.

## El día de la feria

1. Celular de la encargada, pestaña **Ruleta**, pantalla completa.
2. El cliente toca "Toca para girar".
3. Sale el código (tipo `TAFI-8X4K2Q`) — el cliente lo anota o le saca foto.
4. Cuando el cliente va a cobrar el premio (al momento o después), la
   encargada va a la pestaña **Canje**, escribe el código, y confirma.
   El sistema le dice si es válido, si ya fue canjeado, o si no existe.

## Si algo no carga / da error de conexión

Revisa que el proyecto de Supabase no esté pausado (los proyectos free
de Supabase se pausan solos tras 1 semana sin uso — solo hay que entrar
al dashboard y reactivarlo, tarda un minuto).
