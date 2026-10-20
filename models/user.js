'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Favorite, { foreignKey: 'userId', as: 'favorites' });
    }

    /** Forma pública del usuario que espera el frontend. */
    toPublic() {
      return { id: String(this.id), name: this.name, email: this.email, role: this.role };
    }
  }
  User.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    passwordHash: DataTypes.STRING,
    role: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
  });
  return User;
};
