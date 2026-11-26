/* eslint-disable*/
'use strict';

module.exports = dc => {
  const DataTypes = dc.ORM;
  const sequelize = dc.orm;
  const ProjectDevice = sequelize.define('projectDevice', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'project_id',
      comment: '项目ID',
    },
    deviceCode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'device_code',
      comment: '设备ID',
    },
    sourceSystem: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'legacy',
      field: 'source_system',
      comment: '设备关系来源：legacy-现有设备，edge_cloud-边缘设备（历史来源值，现由 Node 管理）',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updated_at'
    }
  }, {
    tableName: 'project_devices',
    comment: '项目-设备关联关系',
  });
  dc.models.ProjectDevice = ProjectDevice;
  return ProjectDevice;
};
