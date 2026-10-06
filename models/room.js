'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Room.belongsTo(models.Building, { foreignKey: 'buildingId', as: 'building' });
      Room.hasMany(models.RoomOccupancy, { foreignKey: 'roomId', as: 'occupancies' });
    }
  }
  Room.init({
    name: DataTypes.STRING,
    buildingId: DataTypes.INTEGER,
    capacity: DataTypes.INTEGER,
    floor: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Room',
    tableName: 'Rooms',
  });
  return Room;
};