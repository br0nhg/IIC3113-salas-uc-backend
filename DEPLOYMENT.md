# Despliegue en la VM compartida

Esta configuración mantiene la web separada de botSpear:

- proyecto Compose: `salas-uc-web`;
- volúmenes con prefijo `salas_uc_`;
- PostgreSQL sin puertos publicados;
- API publicada solamente en `127.0.0.1:3000` para que Nginx pueda acceder;
- redes Docker propias;
- límites de CPU, memoria, procesos y logs;
- Nginx del host como único servicio público en 80/443.

No ejecutar el stack hasta revisar la salida de `deploy/scripts/audit-vm.sh` y la
capacidad/cuotas de OCI. Los límites predeterminados son máximos, no reservas, y
deben ajustarse a la memoria real disponible.

## Preparación pendiente

1. Definir el host público. Puede ser un dominio o la IP pública reservada de la VM.
2. Copiar `.env.production.example` a `.env.production` en la VM y generar secretos
   nuevos. No reutilizar credenciales del bot.
3. Construir el frontend con `VITE_API_URL=/api` y publicar `dist/` bajo
   `/var/www/salas-uc/current`.
4. Instalar primero la configuración HTTP de Nginx, validar con `nginx -t` y obtener
   el certificado. Recién entonces activar la plantilla HTTPS.
5. Ejecutar migraciones y seed inicial de forma explícita antes de levantar la API.
6. Programar `deploy/scripts/backup-db.sh` y copiar los respaldos fuera de la VM.

## Comandos de Compose

Desde la carpeta del backend en la VM:

```bash
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml build api
docker compose --env-file .env.production -f compose.production.yml up -d --wait db
docker compose --env-file .env.production -f compose.production.yml run --rm api npm run db:migrate
docker compose --env-file .env.production -f compose.production.yml run --rm api npm run db:seed
docker compose --env-file .env.production -f compose.production.yml up -d --wait api
```

No usar `docker compose down -v`: `-v` elimina los volúmenes de la web. Ningún
comando de este proyecto debe ejecutarse desde la carpeta de botSpear.

## Actualizaciones posteriores

Con los repositorios clonados bajo `/opt/salas-uc`, el script de despliegue obtiene
la rama `produccion`, rechaza cambios locales, crea un backup previo, ejecuta
migraciones, actualiza la API y publica una release atómica del frontend:

```bash
/opt/salas-uc/backend/deploy/scripts/deploy-production.sh
```

El timer incluido en `deploy/systemd/` ejecuta un backup diario a las 06:30 UTC.
Los respaldos locales deben complementarse con una copia fuera de la VM.

## HTTPS usando solamente una IP pública

Let's Encrypt permite certificados para IPv4 e IPv6. Estos certificados usan el
perfil `shortlived`, duran aproximadamente seis días y requieren Certbot 5.4 o
superior para usar el modo `webroot`. Certbot actualmente obtiene el certificado,
pero no lo instala automáticamente en Nginx; la plantilla HTTPS ya contiene las
rutas esperadas bajo `/etc/letsencrypt/live/<IP>/`.

La renovación debe ejecutarse automáticamente y tener un deploy hook que recargue
Nginx. Antes de emitir el certificado real se debe probar contra staging. Los
comandos finales se completarán con la IP pública fija de la VM.
