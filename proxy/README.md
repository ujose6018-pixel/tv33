# Proxy de datos completos (football-data.org) — TOP FUT

Con este proxy el panel trae **rondas/jornadas COMPLETAS** (los 8 octavos, la jornada
entera de una liga, etc.), no solo el tope de ~15 que da TheSportsDB gratis.

**No lo necesitas para operar.** Sin proxy, el panel sigue usando TheSportsDB gratis.
El proxy es opcional y solo mejora la importación automática.

## Qué cubre el plan GRATIS de football-data.org
✅ **Mundial (WC)**, Champions League, Premier League, La Liga, Serie A, Bundesliga, Ligue 1.
❌ No cubre Liga MX, MLS ni Europa League → para esas, el panel usa TheSportsDB automáticamente.
Límite: 10 peticiones/minuto (de sobra para agendar partidos).

## Pasos (una sola vez, ~10 minutos)

### 1) Clave gratis de football-data.org
1. Entra a https://www.football-data.org/client/register
2. Regístrate (email). Te llega una **API token** (una cadena larga). Cópiala.

### 2) Crear el Worker en Cloudflare (gratis)
1. Crea cuenta en https://dash.cloudflare.com (gratis).
2. Menú **Workers & Pages** → **Create** → **Create Worker**.
3. Ponle un nombre (ej. `topfut-proxy`) → **Deploy**.
4. **Edit code**: borra lo que trae y **pega TODO el contenido de `proxy/worker.js`**.
   → **Deploy** (arriba a la derecha).

### 3) Guardar tu clave como secreto del Worker
1. En el Worker → **Settings** → **Variables and Secrets** → **Add**.
2. Type: **Secret** · Name: **`FD_TOKEN`** · Value: *(pega tu token de football-data.org)*.
3. **Deploy / Save**.

### 4) Conectar el proxy al panel
1. Copia la **URL del Worker** (algo como `https://topfut-proxy.tuusuario.workers.dev`).
2. En el panel → **📅 Importar partidos** → **⚙️ Fuente de datos** → pega la URL → **💾 Guardar proxy**.
3. Listo. Debe decir **“Proxy activo (football-data.org)”**.

## Probar
Panel → Importar → liga **Copa Mundial de la FIFA** → Ronda **Octavos de final** →
**🎯 Buscar ronda / temporada**. Deben salir TODOS los octavos disponibles.

## Cómo funciona (para el próximo que toque esto)
- El panel llama `https://TU-WORKER/v4/competitions/{code}/matches?...`.
- El Worker le añade `X-Auth-Token: FD_TOKEN` y reenvía a `api.football-data.org`, luego
  responde con CORS. La clave nunca viaja al navegador ni queda en el repo.
- Códigos de competición usados: WC, CL, PL, PD, SA, BL1, FL1 (ver `KNOWN_LEAGUES` en panel.html, campo `fd`).
- Filtros: cups por `?stage=LAST_16|QUARTER_FINALS|SEMI_FINALS|THIRD_PLACE|FINAL|GROUP_STAGE`;
  ligas por `?matchday=N`. Season por `?season=<añoInicio>` (ej. 2026).
- La URL del proxy se guarda en Firestore `config/importer` = `{ workerUrl }`.

## Seguridad
- La clave está SOLO en el Worker (secreto), no en GitHub ni en el navegador.
- El Worker solo deja pasar rutas `/v4/competitions/**` y `/yt/search` (no cualquier cosa).
- Opcional: en `worker.js` cambia `Access-Control-Allow-Origin: '*'` por tu dominio
  `https://ujose6018-pixel.github.io` para que solo tu sitio use tu cuota.

---

# (OPCIONAL) Resúmenes automáticos de YouTube

El mismo Worker puede **buscar el resumen/highlights** de cada partido en YouTube y
dejarlo listo para reproducirse en la pantalla de despedida. **Es opcional**: sin esto,
el panel ofrece un botón para buscar en YouTube y pegar el enlace a mano, y el reproductor
muestra un botón “🎬 Ver resumen en YouTube”. Nada se rompe si no lo configuras.

## Pasos (una sola vez)
### 1) Clave gratis de YouTube Data API v3
1. Entra a https://console.cloud.google.com/ → crea un proyecto (gratis).
2. **APIs y servicios** → **Biblioteca** → busca **YouTube Data API v3** → **Habilitar**.
3. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **Clave de API**. Cópiala.
   *(Recomendado: en la clave, “Restricción de API” → solo YouTube Data API v3.)*

### 2) Añadir la clave al Worker
1. En tu Worker → **Settings** → **Variables and Secrets** → **Add**.
2. Type: **Secret** · Name: **`YT_KEY`** · Value: *(tu clave de YouTube)*.
3. Asegúrate de que el Worker tenga el `worker.js` de este repo (ya incluye la ruta `/yt/search`).
   Si actualizaste el código, **Deploy** de nuevo.
4. Listo. No hay que tocar el panel: al **🏁 Finalizar** un partido, busca y guarda el
   resumen solo. También puedes usar el botón **🎬** de cada partido para buscar/pegar.

## Cómo funciona
- El panel llama `GET https://TU-WORKER/yt/search?q=<home> vs <away> resumen highlights <liga>`.
- El Worker añade `key=YT_KEY` y consulta la YouTube Data API; devuelve el JSON con CORS.
- El panel toma `items[0].id.videoId`, arma `https://www.youtube.com/watch?v=...` y lo guarda
  en el partido como `highlightsUrl`. El reproductor (que lee el agregado `public/schedule`)
  lo embebe en la despedida. La clave nunca llega al navegador.

## Cuota
- Cada búsqueda cuesta **100 unidades**; la cuota gratis diaria es **10 000** (≈100 búsquedas/día).
  De sobra para ir guardando resúmenes de los partidos que finalizas.

---

# (OPCIONAL) Estadísticas de la plataforma
No necesitan proxy ni configuración. El sitio escribe contadores en Firestore
`public/stats` (visitas por día y vistas por partido/señal, con `increment()`), y el panel
los lee y grafica en la pestaña **📊 Estadísticas**. El cliente solo escribe (no lee), así
la web sigue ligera para Smart TV.
