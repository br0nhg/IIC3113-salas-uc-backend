const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT;
const HOST = process.env.HOST;

function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'PORT',
    'HOST',
    'JWT_SECRET',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de producción: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.');
  }
}

async function start() {
  validateProductionEnvironment();
  await sequelize.authenticate()
  const server = app.listen(PORT, HOST, () => console.log(`API en puerto ${PORT}`))

  async function shutdown(signal) {
    console.log(`${signal}: cerrando API`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('No se pudo iniciar la API:', error);
  process.exit(1);
});
