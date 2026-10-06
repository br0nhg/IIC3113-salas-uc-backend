const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT;
const HOST = process.env.HOST;

async function start() {
  await sequelize.authenticate()
  app.listen(PORT, HOST, () => console.log(`API en puerto ${PORT}`))
}

start()