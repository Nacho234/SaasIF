# Prueba de fuego (load test) — `loadtest.mjs`

Simula **N negocios concurrentes** operando random contra el Supabase de **producción**
(abrir caja, vender, devolver, cobrar deudas, gastos). Crea negocios etiquetados
`LOADTEST-...`, los hace laburar, verifica aislamiento (RLS) y **los borra al final**.

Usa solo la anon/publishable key (pública). No necesita secretos.

## Requisitos
- Node 18+ (trae `fetch` incorporado). Verificá con `node -v`.

## Cómo correrlo
Desde la carpeta del repo:
```bash
node tools/loadtest.mjs <numNegocios> <duracionSegundos>
```

### 1) Soak test (estabilidad sostenida)
Poca carga, mucho tiempo. Sirve para ver si se degrada con el correr de los minutos
(fugas de memoria, conexiones que no se liberan, latencia que sube).
```bash
node tools/loadtest.mjs 6 600      # 6 negocios, 10 minutos
```
**Qué mirar:** que `errores` quede en 0 todo el tiempo y que la latencia p95 NO suba
a lo largo de los 10 min. Al final, `Limpieza: 6/6`.

### 2) Test de techo (cuánto aguanta)
Subí los negocios de a poco, 60s cada uno, hasta que empiece a sufrir:
```bash
node tools/loadtest.mjs 50 60
node tools/loadtest.mjs 75 60
node tools/loadtest.mjs 100 60
node tools/loadtest.mjs 150 60
```
**Qué mirar:** en qué N empiezan a aparecer **errores**, o la **p95 se dispara**
(>1000ms), o fallan los signups (aparecen `x` al crear). Ese es el techo del plan free.

## Dónde ver en tiempo real (NO es a ciegas)
1. **La terminal**: mientras opera, imprime cada 2s → `⏱ 12s | ops 340 | 28/s | errores 0`.
2. **Supabase Dashboard** (proyecto `Nacho234's Project`):
   - **Reports → API / Database**: requests por segundo, latencia y errores en vivo.
   - **Logs → API / Postgres**: stream de logs en tiempo real.
   - **Table Editor**: ves aparecer/borrarse filas (products, sales, businesses).
   - **Authentication → Users**: aparecen los usuarios `loadtest.*`.
   - **Database → Roles/health**: conexiones activas.

## Notas
- Corre contra **producción**: durante el test hay carga real en el sitio live (poca en soak, más en techo). Elegí un horario tranquilo.
- Los **negocios** se borran solos (cascade). Quedan usuarios `auth` huérfanos con email
  `loadtest.*` (no se pueden borrar sin la service_role) — inofensivos; se limpian a mano
  en Authentication → Users si molestan.
- **No mergear** cambios ni tocar datos reales: el script solo crea/borra lo suyo (`LOADTEST-...`).
