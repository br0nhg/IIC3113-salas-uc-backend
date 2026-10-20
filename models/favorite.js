'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Favorite extends Model {
    static associate(models) {
      Favorite.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  Favorite.init({
    userId: DataTypes.INTEGER,
    roomName: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Favorite',
    tableName: 'Favorites',
  });
  return Favorite;
};
