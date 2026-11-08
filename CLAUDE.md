# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

API de SalasUC: informa qué salas de Ingeniería UC (campus San Joaquín) están libres por día y módulo horario. Una sala está **libre** si BuscaCursos UC no le asigna un curso en ese bloque. Los datos se obtienen con un scraper de BuscaCursos (semestre `2026-2`). La app no hace reservas, solo consultas. El frontend (React, repo `IIC3113-salas-uc-frontend`) consume esta API. Los mensajes de error y los comentarios están en español.

## Comandos

Todo corre con Docker Compose; no se necesita Node ni Python en el host. Para Compose, `.env` (copiado de `.env.example`) debe tener `DB_HOST=db`.

```bash
docker compose up -d                              # PostgreSQL 16 (db) + API (api, puerto 3000)
docker compose build api                          # reconstruir: la imagen copia el código (no hay volumen ni hot reload)
docker compose run --rm api npm run db:migrate    # migraciones (sequelize-cli)
docker compose run --rm api npm run db:seed       # seed scrapeado + usuario admin
docker compose run --rm api npm run db:reset      # BORRA todo y reconstruye (migraciones + seeds)
docker compose logs -f api
curl localhost:3000/health                        # {"ok":true}

# Scraper manual (perfil "tools", contenedor temporal)
docker compose run --rm --build scraper --start-letter A
docker compose run --rm scraper --import-file CursosUC/cursos_uc_2026-2.txt --dry-run   # valida sin tocar la base

# Regenerar el seed JSON desde la base actual
docker compose run --rm --no-deps -v "$PWD:/app" api npm run db:export-seed
```

No hay tests (`npm test` es un placeholder). Para verificar un cambio en una ruta, reconstruir la imagen (`docker compose build api && docker compose up -d api`) y probar con `curl`.

## Arquitectura

- **Express 5 + Sequelize 6 (PostgreSQL), CommonJS.** `index.js` autentica la conexión y escucha en `PORT`. `app.js` monta `cors()`, `express.json()` y un router por recurso en `routes/`. La configuración de la base está en `config/config.js` (variables `DB_*`). Los modelos se cargan automáticamente en `models/index.js`.
- **Modelo de datos** (`models/`, `migrations/`): `Building` (code, name, description), `Room` (name, buildingId, capacity, floor), `Day` (code `L M W J V S`, con `W` = miércoles; name, shortName), `TimeModule` (number 1–9, start, end; horario oficial UC de M1 08:20–09:30 a M9 20:10–21:20), `Course` (code, name), `RoomOccupancy` (roomId, buildingId, dayId, moduleId, courseId, isFree), `User` (name, email, passwordHash, role `student | admin`) y `Favorite` (userId, roomName).
  - `RoomOccupancy` tiene **una fila por sala × día × módulo**. Si el bloque está libre, la fila lleva `isFree: true` y `courseId: null`. Si está ocupado, hay **una fila por cada curso** (`isFree: false`), por eso una sala puede tener más de 54 filas.
  - Las migraciones no definen claves foráneas, salvo `Favorites.userId`. Las asociaciones con alias (`room`, `building`, `day`, `module`, `course`) se declaran en los modelos.
- **Snapshot del semestre:** el scraper y el seed **borran y recrean** `RoomOccupancies`, `Courses`, `Rooms` y `Buildings`, así que los ids cambian en cada carga. Consecuencias:
  - `Favorite` guarda `roomName` (por ejemplo, `"B12"`) **sin FK**.
  - El frontend identifica las salas por su nombre (`roomId` = `Room.name`).
  - `capacity` y `floor` no vienen de BuscaCursos: los ingresa el admin, y el scraper los conserva al recrear la tabla.
  - `GET /sync/status` usa `max(Room.createdAt)` como fecha de la última carga.
- **Scraper** (`scraping.py`, Python con curl_cffi + BeautifulSoup + psycopg):
  - Consulta BuscaCursos por prefijos de sigla y profundiza el prefijo cuando una búsqueda devuelve 500 resultados o más.
  - Consolida el resultado en `CursosUC/cursos_uc_2026-2.txt` (ignorado por git).
  - Interpreta horarios como `L-W:3,4` y se queda con las salas de `A`, `B`, `BC`, `C` y `K`.
  - Carga todo en **una sola transacción**: si la descarga queda incompleta, no toca la base.
  - Se puede lanzar desde la API (`POST /scraper`, que solo admin puede llamar; hace spawn de `python3` dentro del contenedor y su estado queda en memoria) o con el servicio `scraper` de Compose.
- **Seed:** `seeders/20261020130000-seed-scraped-data.js` carga `seeders/data/scraped-2026-2.json` (75 salas, 595 cursos, 4.146 ocupaciones). `seeders/20261020140000-seed-admin-user.js` crea el admin a partir de `ADMIN_EMAIL` y `ADMIN_PASSWORD`. `scripts/export-scraped-seed.js` regenera el JSON.
- **Autenticación** (`routes/auth.js`, `middleware/auth.js`):
  - Usa JWT (`JWT_SECRET`, expira en 7 días, payload `{ sub, role }`) y bcryptjs.
  - El registro solo acepta correos `@uc.cl` o `@estudiante.uc.cl` y contraseñas de 8 caracteres o más, con las mismas reglas que `src/utils/validation.ts` del frontend. Siempre crea el rol `student`.
  - `requireAuth` deja el usuario en `req.user`; `requireAdmin` exige además el rol `admin`.
  - El logout es un 204: el token solo se descarta en el cliente.
- **Endpoints:**

  | Ruta | Acceso | Notas |
  |---|---|---|
  | `GET /buildings`, `/rooms`, `/days`, `/modules` | público | devuelven las filas de Sequelize tal cual |
  | `GET /availability?building&room&day&module&onlyFree=true` | público | filtra en SQL con `include` + `where`; respuesta `[{ roomId, buildingCode, day, module, isFree, course: { code, section: null, name } \| null }]` |
  | `GET /sync/status` | público | `{ lastSyncAt }` |
  | `POST /auth/register`, `/auth/login` | público | `{ user: { id (string), name, email, role }, token }` (`User.toPublic()`) |
  | `POST /auth/logout` | público | 204 |
  | `GET/POST /me/favorites`, `DELETE /me/favorites/:roomId` | sesión | `{ roomId, createdAt }`, más recientes primero |
  | `PATCH /admin/rooms/:name` | admin | `{ capacity?, floor? }`, entero ≥ 0 o `null` |
  | `POST /scraper` / `GET /scraper` | admin / público | 202 al iniciar, 409 si ya corre; el GET devuelve el estado y las últimas 100 líneas del log |

## Convenciones

- **El contrato con el frontend manda.** El frontend adapta las respuestas en `src/services/*` y sus tipos están en `src/types/index.ts`. Si cambia la forma de una respuesta, hay que coordinarlo con el frontend. Al optimizar, mantener la respuesta idéntica y compararla antes y después con `curl … | jq`.
- **Errores:** cada handler va en `try/catch`. Los errores del cliente responden `res.status(4xx).json({ error: '<mensaje en español para el usuario>' })`, porque el frontend muestra `body.error`. Los inesperados hacen `console.error` y responden `500 { error: 'Internal server error' }`.
- **Cambios de esquema** siempre con una migración nueva en `migrations/` (sequelize-cli; nombre con timestamp `YYYYMMDDHHMMSS-…`) y su modelo en `models/`. Nunca se edita una migración ya aplicada.
- **Alcance:** el backend también guarda el edificio `C`; el MVP muestra solo `A`, `B`, `BC` y `K`, y el frontend filtra el resto.
- **Secretos:** `.env` no se versiona; las variables nuevas se agregan a `.env.example`.
- **Flujo de trabajo:** ramas + pull requests en GitHub; no se trabaja directamente en `main`.
