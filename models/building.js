'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Building extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Building.hasMany(models.Room, { foreignKey: 'buildingId', as: 'rooms' });
      Building.hasMany(models.RoomOccupancy, { foreignKey: 'buildingId', as: 'occupancies' });
    }
  }
  Building.init({
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Building',
    tableName: 'Buildings',
  });
  return Building;
};