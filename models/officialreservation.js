'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OfficialReservation extends Model {}

  OfficialReservation.init({
    groupId: DataTypes.UUID,
    // Se guarda el nombre y no el id porque el scraper recrea las salas.
    roomName: DataTypes.STRING,
    date: DataTypes.DATEONLY,
    module: DataTypes.INTEGER,
    reason: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'OfficialReservation',
    tableName: 'OfficialReservations',
  });

  return OfficialReservation;
};
