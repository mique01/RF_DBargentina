# rf-api

API en Next.js Route Handlers para importar y consultar instrumentos de renta fija argentina desde Neon Postgres.

El flujo esperado es:

```text
Apps Script -> JSON en Drive -> API privada de importacion -> Neon Postgres -> API de consulta
```

Este MVP no modifica Apps Script. Primero permite probar con archivos locales `metrics.json` y `cashflows.json`.

## Requisitos

- Node.js 20 o superior
- Una base Neon Postgres
- `DATABASE_URL`
- `IMPORT_SECRET`

## Instalacion

```bash
cd rf-api
npm install
cp .env.example .env.local
```

Editar `.env.local`:

```env
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require
IMPORT_SECRET=un_token_privado_largo
```

## Crear tablas en Neon

Ejecutar el SQL de `src/sql/init.sql` en la consola SQL de Neon, o con cualquier cliente Postgres conectado a `DATABASE_URL`.

El SQL crea:

- `rf_assets`
- `rf_metrics_latest`
- `rf_cashflows`
- indices para filtros frecuentes

## Correr localmente

```bash
npm run dev
```

La API queda disponible en:

```text
http://localhost:3000
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

El payload debe traer `instruments` indexado por activo.

```bash
curl -X POST "http://localhost:3000/api/import/rf-cashflows" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $IMPORT_SECRET" \
  -d @cashflows.json
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

## Raw data

El import conserva datos originales para debug y flexibilidad:

- `rf_assets.metadata` guarda `instrument.metadata`
- `rf_metrics_latest.raw` guarda el objeto completo de metricas
- `rf_cashflows.raw` guarda `cf.raw`; si no existe, guarda el cashflow completo

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

## Despliegue

### Vercel

1. Subir el repo.
2. Configurar variables `DATABASE_URL` e `IMPORT_SECRET`.
3. Deploy.

Los route handlers que usan Postgres declaran:

```ts
export const runtime = "nodejs";
```

### Render

Tambien se puede desplegar como servicio Node:

```bash
npm install
npm run build
npm run start
```

Configurar las mismas variables de entorno.

## Checks locales

```bash
npm run typecheck
npm run build
```
