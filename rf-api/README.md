# rf-api

API en Next.js Route Handlers para importar y consultar instrumentos de renta fija argentina desde Neon Postgres.

```text
Apps Script -> JSON en Drive -> API privada de importacion -> Neon Postgres -> API de consulta
```

Este MVP no modifica Apps Script. Primero permite probar con archivos locales `metrics.json` y `cashflows.json`.

## Estructura

El `package.json` esta dentro de `rf-api/`:

```text
RF_DBargentina/
  render.yaml
  rf-api/
    package.json
    pnpm-lock.yaml
    src/
```

En Render, configurar:

```text
Root Directory: rf-api
```

## Requisitos

- Node.js 22
- pnpm
- Una base Neon Postgres
- `DATABASE_URL`
- `IMPORT_SECRET`

## Instalacion local

```bash
cd rf-api
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Editar `.env.local`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
IMPORT_SECRET=un_token_privado_largo
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Crear tablas en Neon

Antes de importar datos, ejecutar el SQL de `src/sql/init.sql` en la consola SQL de Neon, o con cualquier cliente Postgres conectado a `DATABASE_URL`.

El SQL crea un modelo liviano:

- `rf_assets`
- `rf_metrics_latest`
- `rf_cashflows`
- indices para filtros frecuentes

La API acepta los JSON completos de Apps Script, pero solo persiste los campos necesarios para consumir desde sistemas externos.

Si ya tenias una version anterior con columnas pesadas (`raw`, metadata completa, fx, notas, convexity, etc.), ejecutar tambien:

```sql
\i src/sql/lean_migration.sql
```

O copiar y ejecutar el contenido de `src/sql/lean_migration.sql` en la consola SQL de Neon.

## Correr localmente

```bash
pnpm run dev
```

La API queda disponible en:

```text
http://localhost:3000
```

## UI y documentacion

Abrir:

```text
http://localhost:3000/
http://localhost:3000/docs
http://localhost:3000/api/openapi.json
```

La home muestra una UI oscura tipo Data912 con grupos de endpoints. `/docs` lee `/api/openapi.json` y muestra documentacion interactiva.

## Deploy en Render

Crear un **Node Web Service**. No usar Docker. No usar Static Site.

Configuracion exacta:

```text
Language: Node
Branch: main
Root Directory: rf-api
Build Command: pnpm install --frozen-lockfile && pnpm run build
Start Command: pnpm start:render
Instance Type: Free para MVP
```

El archivo `render.yaml` en la raiz del repo contiene esta misma configuracion, incluyendo:

```yaml
rootDir: rf-api
buildCommand: pnpm install --frozen-lockfile && pnpm run build
startCommand: pnpm start:render
healthCheckPath: /api/health
```

Variables de entorno en Render:

```env
DATABASE_URL=postgresql://...neon.../neondb?sslmode=require
IMPORT_SECRET=token_privado_largo
NEXT_PUBLIC_API_BASE_URL=https://TU-APP.onrender.com
NODE_VERSION=22
```

No hardcodear secretos. `IMPORT_SECRET` se usa asi:

```text
Authorization: Bearer <IMPORT_SECRET>
```

No usar este comando en Render:

```bash
corepack enable
```

Fallo previamente con filesystem read-only:

```text
Internal Error: EROFS: read-only file system, unlink '/usr/bin/pnpm'
```

Si Render no tuviera `pnpm` disponible, usar esta alternativa de Build Command:

```bash
npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build
```

## Pruebas post-deploy

```bash
curl https://TU-APP.onrender.com/api/health
curl https://TU-APP.onrender.com/api/health/db
curl https://TU-APP.onrender.com/api/rf/stats
```

Abrir:

```text
https://TU-APP.onrender.com/
https://TU-APP.onrender.com/docs
https://TU-APP.onrender.com/api/openapi.json
```

## Health checks

Sin tocar la base:

```bash
curl "http://localhost:3000/api/health"
```

Probando conexion a Neon:

```bash
curl "http://localhost:3000/api/health/db"
```

## Importar metricas

Acepta cualquiera de estos formatos:

- array directo
- `{ "metrics": [...] }`
- `{ "data": [...] }`

```bash
curl -X POST "http://localhost:3000/api/import/rf-metrics" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $IMPORT_SECRET" \
  -d @metrics.json
```

Respuesta esperada:

```json
{
  "ok": true,
  "processed": 120,
  "errors": []
}
```

## Importar cashflows

El payload debe traer `instruments` indexado por activo. Soporta `sync_mode = "partial"` y `sync_mode = "full_by_asset"`.

```bash
curl -X POST "http://localhost:3000/api/import/rf-cashflows" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $IMPORT_SECRET" \
  -d @cashflows.json
```

Ejemplo parcial:

```json
{
  "sync_mode": "partial",
  "instruments": {
    "AL30": {
      "ticker": "AL30",
      "activo": "AL30",
      "cashflows": []
    }
  }
}
```

Respuesta esperada:

```json
{
  "ok": true,
  "assets_processed": 120,
  "cashflows_processed": 1840,
  "errors": []
}
```

## Full sync por activo

Por defecto el import de cashflows es parcial: no borra pagos existentes que no vengan en el body.

Si se envia `sync_mode = "full_by_asset"`, para cada activo incluido se borran los cashflows de ese activo cuyas fechas ya no esten en el JSON entrante. No se borran activos que no vinieron en el body.

```bash
curl -X POST "http://localhost:3000/api/import/rf-cashflows" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $IMPORT_SECRET" \
  -d '{
    "sync_mode": "full_by_asset",
    "instruments": {
      "AL30": {
        "ticker": "AL30",
        "activo": "AL30",
        "cashflows": []
      }
    }
  }'
```

## Consultas

Activos:

```bash
curl "http://localhost:3000/api/rf/assets"
curl "http://localhost:3000/api/rf/assets?tipo_data912=BONDS"
curl "http://localhost:3000/api/rf/assets?status=OK"
curl "http://localhost:3000/api/rf/assets?source=DOCTA_API"
```

Activo individual:

```bash
curl "http://localhost:3000/api/rf/assets/AL30"
```

Metricas:

```bash
curl "http://localhost:3000/api/rf/metrics"
curl "http://localhost:3000/api/rf/metrics?estado=OK"
curl "http://localhost:3000/api/rf/metrics?tickers=AL30,GD30,TZXD8"
```

Cashflows:

```bash
curl "http://localhost:3000/api/rf/cashflows?activo=AL30"
curl "http://localhost:3000/api/rf/cashflows?activo=AL30&from=2026-07-01"
curl "http://localhost:3000/api/rf/cashflows?activo=AL30&from=2026-07-01&to=2030-12-31"
curl "http://localhost:3000/api/rf/cashflows?activo=AL30&only_future=true"
```

Calendario global:

```bash
curl "http://localhost:3000/api/rf/calendar?from=2026-07-01&to=2030-12-31"
curl "http://localhost:3000/api/rf/calendar?from=2026-07-01&to=2026-12-31&tipo_data912=BONDS"
curl "http://localhost:3000/api/rf/calendar?from=2026-07-01&to=2026-12-31&tickers=AL30,GD30"
```

Calendario mensual:

```bash
curl "http://localhost:3000/api/rf/calendar/monthly?from=2026-07-01&to=2030-12-31"
```

Proximos pagos:

```bash
curl "http://localhost:3000/api/rf/upcoming-payments?limit=50"
curl "http://localhost:3000/api/rf/upcoming-payments?tickers=AL30,GD30&limit=20"
```

Stats:

```bash
curl "http://localhost:3000/api/rf/stats"
```

## Idempotencia

Todos los imports usan `insert ... on conflict ... do update`.

- `rf_assets`: key `activo`
- `rf_metrics_latest`: key `activo`
- `rf_cashflows`: key `(activo, fecha)`

Si corres dos veces el mismo JSON, no se duplican activos, metricas ni cashflows. Se actualiza `updated_at`.

## Modelo liviano

El import descarta datos auxiliares pesados y conserva solo lo necesario:

Metricas latest:

- `activo`
- `estado`
- `px`
- `tir`
- `tir_pct`
- `duration`
- `modified_duration`
- `delta_p_mas_100bps`
- `delta_p_menos_100bps`
- `subasset_class`
- `tipo_data912`
- `priority`
- `next_payment_date`
- `last_payment_date`
- `future_cashflows_count`
- `nominal_units`

Cashflows:

- `activo`
- `fecha`
- `valor_residual`
- `interes`
- `capital`
- `cupon`

No se guarda `raw jsonb` en el modelo lean para evitar duplicar informacion y mantener Neon liviano.

El orden default de `/api/rf/assets` y `/api/rf/metrics` usa `priority asc nulls last`. Esa prioridad sale del orden del JSON diario de metricas, que viene desde tu hoja ordenada por volumen operado. Asi Neon respeta tu logica de Sheets y no ordena alfabeticamente salvo desempate.

El import de cashflows ignora pagos con `fecha < current_date`. La base queda enfocada en flujos futuros para calendario de pagos de cartera.

Para limpiar Neon usando tus JSON acumulados locales:

```bash
pnpm run clean:neon -- "C:\ruta\RF_ArgentinaDatos.json" "C:\ruta\bond_cashflows.json"
```

Ese comando borra metricas/activos que ya no esten en `RF_ArgentinaDatos.json`, borra cashflows vencidos, conserva solo activos presentes en `bond_cashflows.json`, y refresca `priority` desde el orden de tu hoja.

## Runtime Node.js

Todos los Route Handlers que usan Postgres declaran:

```ts
export const runtime = "nodejs";
```

Esto evita Edge runtime para `pg`.

## Nominal base

Los cashflows se guardan por `nominal_units`, usualmente 100 VN. El MVP no calcula pagos por cliente.

Formula futura:

```text
pago_cliente = cashflow_por_nominal_base * nominal_cliente / nominal_units
```

Ejemplo:

```text
8.2678 * 10000 / 100 = 826.78
```

## Checks locales

```bash
pnpm run typecheck
pnpm run build
```
