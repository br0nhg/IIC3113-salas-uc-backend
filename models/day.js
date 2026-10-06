'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Day extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Day.hasMany(models.RoomOccupancy, { foreignKey: 'dayId', as: 'occupancies' });
    }
  }
  Day.init({
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    shortName: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Day',
    tableName: 'Days',
  });
  return Day;
};