'use strict';

const baseConfig = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'salas_uc',
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  logging: false,
}

module.exports = {
  development: baseConfig,
  test: {
    ...baseConfig,
    database: process.env.DB_TEST_NAME || 'salas_uc_test',
  },
  production: {
    ...baseConfig,
    host: process.env.DB_HOST || 'db',
    logging: false,
  },
}