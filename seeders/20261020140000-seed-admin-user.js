'use strict';

const bcrypt = require('bcryptjs');

// Cuenta de administrador inicial, definida por ADMIN_EMAIL y ADMIN_PASSWORD.
const email = (process.env.ADMIN_EMAIL || 'admin@uc.cl').toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'admin1234';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('Users', [{
      name: 'Administración SalasUC',
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', { email });
  },
};
