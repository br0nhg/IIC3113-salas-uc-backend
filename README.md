# Salas UC Backend

API para consultar disponibilidad de salas de los edificios `A`, `B`, `BC`, `C`
y `K` del campus San Joaquín. El proyecto incluye PostgreSQL, un scraper de
BuscaCursos UC y un seed generado con datos del semestre `2026-2`.

## Requisitos

- Docker y Docker Compose.
- Puertos `3000` y `5432` disponibles.

No es necesario instalar Node.js, Python ni sus dependencias en el host.

## Configuración

Crea el archivo local de variables de entorno:

```bash
cp .env.example .env
```

Para ejecutar todo mediante Compose, `DB_HOST` debe ser `db` y `DB_PORT` debe
coincidir con el puerto interno de PostgreSQL (`5432` por defecto). `.env.example`
es solamente una plantilla; Docker y la aplicación cargan `.env`.

## Primera ejecución con el seed

Construye las imágenes y levanta PostgreSQL:

```bash
docker compose build
docker compose up -d db
```

Ejecuta las migraciones y carga la fotografía scrapeada incluida en el repositorio:

```bash
docker compose run --rm api npm run db:migrate
docker compose run --rm api npm run db:seed
```

Finalmente, levanta la API:

```bash
docker compose up -d api
```

Comprueba el estado:

```bash
docker compose ps
curl http://localhost:3000/health
```

En las siguientes ejecuciones basta con:

```bash
docker compose up -d
```

Para revisar logs o detener el proyecto:

```bash
docker compose logs -f api
docker compose down
```

`docker compose down` conserva el volumen de PostgreSQL. Para eliminar también
la base se debe usar `docker compose down -v`; esta operación borra los datos.

## Actualizar datos con el scraper

### Desde la API

Inicia una descarga completa en segundo plano:

```bash
curl -X POST http://localhost:3000/scraper
```

La ruta responde `202` inmediatamente. Consulta el estado y las últimas líneas
del log con:

```bash
curl http://localhost:3000/scraper
```

Mientras exista una ejecución activa, otro `POST` responde `409`. El proceso
corre dentro del contenedor de la API; detener la API también puede interrumpirlo.

### Manualmente en un contenedor temporal

El scraper también puede ejecutarse de forma independiente:

```bash
docker compose run --rm --build scraper --start-letter A
```

El servicio `scraper` pertenece al perfil `tools`, por lo que no se inicia con
`docker compose up`. El comando anterior crea el contenedor, ejecuta el proceso y
lo elimina al terminar.

Ambas alternativas:

- descargan todos los cursos desde BuscaCursos;
- conservan únicamente las salas de los edificios permitidos;
- reintentan solicitudes que fallen temporalmente;
- no modifican PostgreSQL si la extracción queda incompleta;
- reemplazan cursos, salas y disponibilidades anteriores dentro de una
  transacción cuando la descarga finaliza correctamente.

## Seed de datos scrapeados

El seed actual está compuesto por:

- `seeders/20261020130000-seed-scraped-data.js`: carga transaccional;
- `seeders/data/scraped-2026-2.json`: fotografía versionada de los datos.

Para cargarlo en una base migrada que todavía no tenga el seed aplicado:

```bash
docker compose run --rm api npm run db:seed
```

Para reconstruir completamente una base existente desde migraciones y seed:

```bash
docker compose run --rm api npm run db:reset
```

`db:reset` elimina las tablas y sus datos antes de reconstruirlas.

Después de ejecutar un scraping nuevo, puedes reemplazar el JSON del seed con la
fotografía actual de PostgreSQL. El volumen explícito hace que el archivo generado
quede guardado en el repositorio y no solamente dentro del contenedor temporal:

```bash
docker compose run --rm --no-deps \
  -v "$PWD:/app" \
  api npm run db:export-seed
```

Revisa y versiona el JSON generado antes de utilizarlo como seed oficial.

## Rutas principales

- `GET /health`: estado de la API.
- `GET /buildings`: edificios disponibles.
- `GET /rooms`: salas.
- `GET /days`: días.
- `GET /modules`: módulos horarios.
- `GET /availability`: disponibilidad y ocupaciones.
- `POST /scraper`: inicia el scraper.
- `GET /scraper`: estado de la ejecución del scraper.

La ruta que inicia el scraper es una operación costosa. Si la API se publica en
internet, se recomienda protegerla con autenticación y límites de solicitudes.
