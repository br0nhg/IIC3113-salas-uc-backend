'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TimeModule extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TimeModule.hasMany(models.RoomOccupancy, { foreignKey: 'moduleId', as: 'occupancies' });
    }
  }
  TimeModule.init({
    number: DataTypes.INTEGER,
    start: DataTypes.TIME,
    end: DataTypes.TIME
  }, {
    sequelize,
    modelName: 'TimeModule',
    tableName: 'TimeModules',
  });
  return TimeModule;
};