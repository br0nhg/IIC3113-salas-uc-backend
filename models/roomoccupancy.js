'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RoomOccupancy extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      RoomOccupancy.belongsTo(models.Room, { foreignKey: 'roomId', as: 'room' });
      RoomOccupancy.belongsTo(models.Building, { foreignKey: 'buildingId', as: 'building' });
      RoomOccupancy.belongsTo(models.Day, { foreignKey: 'dayId', as: 'day' });
      RoomOccupancy.belongsTo(models.TimeModule, { foreignKey: 'moduleId', as: 'module' });
      RoomOccupancy.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
    }
  }
  RoomOccupancy.init({
    roomId: DataTypes.INTEGER,
    buildingId: DataTypes.INTEGER,
    dayId: DataTypes.INTEGER,
    moduleId: DataTypes.INTEGER,
    courseId: DataTypes.INTEGER,
    isFree: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'RoomOccupancy',
    tableName: 'RoomOccupancies',
  });
  return RoomOccupancy;
};