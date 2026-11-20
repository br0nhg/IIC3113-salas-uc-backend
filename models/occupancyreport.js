'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Aviso de un usuario: una sala que aparece libre está ocupada en un día y módulo. */
  class OccupancyReport extends Model {
    static associate(models) {
      OccupancyReport.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  OccupancyReport.init({
    userId: DataTypes.INTEGER,
    // Se guarda el nombre y no el id porque el scraper recrea las salas.
    roomName: DataTypes.STRING,
    date: DataTypes.DATEONLY,
    module: DataTypes.INTEGER,
    reason: DataTypes.STRING,
    detail: DataTypes.STRING,
    status: DataTypes.STRING,
    blockedUntilDate: DataTypes.DATEONLY,
    blockedUntilModule: DataTypes.INTEGER,
    reviewedBy: DataTypes.INTEGER,
    reviewedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'OccupancyReport',
    tableName: 'OccupancyReports',
  });

  return OccupancyReport;
};
