# @mostrador/api — Backend SaaS (NestJS + Prisma + PostgreSQL)

Backend del SaaS Mostrador. El frontend **nunca** habla directo con la base: siempre pasa por acá.

## Puesta en marcha

```bash
# 1. Variables de entorno
cp apps/api/.env.example apps/api/.env
#    Completar DATABASE_URL (Neon/Supabase/Railway/local) y JWT_SECRET.

# 2. Generar cliente Prisma
npm run prisma:generate -w @mostrador/api

# 3. Crear las tablas en la base
npm run db:migrate -w @mostrador/api      # primera vez pedirá un nombre de migración

# 4. Cargar planes base (básico / pro / premium)
npm run db:seed -w @mostrador/api

# 5. Levantar en dev
npm run dev:api        # desde la raíz  →  http://localhost:3000/api
```

## Endpoints (Fase 1)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | pública | Estado del servicio + conexión a la base |
| POST | `/api/auth/register` | pública | Alta de suscriptor: crea negocio + admin + suscripción trial (14 días) |
| POST | `/api/auth/login` | pública | Login, devuelve JWT |
| GET | `/api/auth/me` | JWT | Usuario del token |

## Arquitectura y reglas

- **Guard JWT global**: toda ruta exige token salvo las marcadas con `@Public()`.
- **Aislamiento multi-tenant**: `businessId` se toma SIEMPRE del token (`@CurrentUser()`),
  nunca de datos que mande el frontend. Cada consulta de dominio filtra por `businessId`.
- **Errores**: filtro global normaliza todo a JSON y traduce errores de Prisma.
- **Validación**: DTOs con `class-validator`; se descartan campos no declarados.

## Estado (Fase 1 completa)

Hecho: base NestJS, Prisma, config validada, errores globales, CORS, health check,
auth (register/login/me) con el flujo registro→negocio→suscripción trial, y el schema
core del SaaS (businesses, branches, users, plans, subscriptions, business_settings).

Pendiente (fases siguientes, ver `docs/HANDOFF-arquitectura-produccion.md`):
guards de tenant/suscripción/permisos aplicados, endpoints de dominio (products,
sales, cash…), venta transaccional, import Excel, suscripciones con Mercado Pago, ARCA.
