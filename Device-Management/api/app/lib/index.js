"use strict";

const fs = require("fs");
const path = require("path");
const utils = require("./utils");
const routes = require("./routes");
const redisConnect = require("./service/redis");
const socketConect = require("./service/socket");
const camundarest = require("./middlewares/camunda-rest");
const mqttVideoServer = require("./service/mqttServer");
const paasRequest = require("./service/paasRequest");
const es = require("./service/es");
const authenticator = require("./middlewares/authenticator");
const clickHouseClient = require("./service/clickHouseClient");
const kafka = require("./service/kafka");
const kafkaService = require("./service/kafkaSevice");
const schedule = require("./schedule");
const apiLog = require("./middlewares/api-log");

module.exports.entry = function (app, router, opts) {
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
  });

  app.fs.logger.log("info", "[FS-AUTH]", "Inject auth and api mv into router.");

  app.fs.api = app.fs.api || {};
  app.fs.api.fftService = opts.fftService || {};
  app.fs.api.energyManagementProjectId = opts.energyManagementProjectId || {};
  app.fs.utils = app.fs.utils || {};
  app.fs.api.authAttr = app.fs.api.authAttr || {};
  app.fs.api.logAttr = app.fs.api.logAttr || {};

  // 顺序固定 ↓
  redisConnect(app, opts);
  socketConect(app, opts);
  mqttVideoServer(app, opts);

  // 实例其他平台请求方法
  paasRequest(app, opts);

  es(app, opts);

  // kafka(app, opts)
  //kafka日志
  // kafkaService(app, opts)
  // clickHouse 数据库 client
  clickHouseClient(app, opts);

  // 工具类函数
  utils(app, opts);

  // 定时任务
  // schedule(app, opts)

  // 鉴权中间件
  router.use(authenticator(app, opts));
  //camundarest
  if (!opts.edgeAgentLocal) router.use(camundarest(app, router, opts.camundarest));
  // 日志记录
  router.use(apiLog(app, opts));

  router = routes(app, router, opts);
};

module.exports.models = function (dc) {
  // dc = { orm: Sequelize对象, ORM: Sequelize, models: {} }

  // 模型关系摘出来 初始化之后再定义关系才行
  fs.readdirSync(path.join(__dirname, "/models")).forEach((filename) => {
    require(`./models/${filename}`)(dc);
  });

  const {
    AppInspection,
    ProjectApp,
    ProjectCorrelation,
    AppAlarm,
    App,
    AlarmAppearRecord,
    AlarmConfirmLog,
    EmailSendLog,
    LatestDynamicList,
    AlarmPushConfig,
    MaintenanceRecord,
    MaintenanceRecordExecuteUser,
    MaintenancePlanExecuteUser,
    MaintenancePlan,
    EquipmentMaintenanceRecord,
    EquipmentMaintenanceRecordProject,
    EquipmentMaintenanceRecordExecuteUser,
    ServerMaintenanceRecordRepairman,
    ServerMaintenanceRecord,
    AlarmDataContinuityType,
    AlarmDataContinuity,
    AbnTypes,
    AbnReportParams,
    Resource,
    User,
    Devices,
    ProductLibrary,
    AppInstallApplication,
    AppInstallPackage,
    SensorTypeModelMapping,
    Sensors,
    ExternalUserDevice,
    Department,
    DeviceModel,
    Role,
    RoleDeviceModel,
    Project,
    ProjectDevice,
    EdgeVisualModel,
    EdgeUpgradeTaskDevice,
    EdgeRemoteSession,
    RoleProject,
    Organization,
    RoleGroup,
    UserRole,
    TypePost,
    RoleResource,
    SystemLog,
  } = dc.models;

  AppInspection.belongsTo(App, { foreignKey: "projectAppId", targetKey: "id" });
  App.hasMany(AppInspection, { foreignKey: "projectAppId", sourceKey: "id" });

  ProjectApp.belongsTo(ProjectCorrelation, {
    foreignKey: "projectId",
    targetKey: "id",
  });
  ProjectCorrelation.hasMany(ProjectApp, {
    foreignKey: "projectId",
    sourceKey: "id",
  });

  ProjectApp.belongsTo(App, { foreignKey: "appId", targetKey: "id" });
  App.hasMany(ProjectApp, { foreignKey: "appId", sourceKey: "id" });

  ProjectCorrelation.belongsToMany(App, {
    through: ProjectApp,
    foreignKey: "projectId",
    otherKey: "appId",
  });

  App.belongsToMany(ProjectCorrelation, {
    through: ProjectApp,
    foreignKey: "appId",
    otherKey: "projectId",
  });

  AppAlarm.belongsTo(App, { foreignKey: "projectAppId", targetKey: "id" });
  App.hasMany(AppAlarm, { foreignKey: "projectAppId", sourceKey: "id" });

  AlarmAppearRecord.belongsTo(ProjectCorrelation, {
    foreignKey: "projectCorrelationId",
    targetKey: "id",
  });
  ProjectCorrelation.hasMany(AlarmAppearRecord, {
    foreignKey: "projectCorrelationId",
    sourceKey: "id",
  });

  AlarmConfirmLog.belongsTo(ProjectCorrelation, {
    foreignKey: "projectCorrelationId",
    targetKey: "id",
  });
  ProjectCorrelation.hasMany(AlarmConfirmLog, {
    foreignKey: "projectCorrelationId",
    sourceKey: "id",
  });

  EmailSendLog.belongsTo(ProjectCorrelation, {
    foreignKey: "projectCorrelationId",
    targetKey: "id",
  });
  ProjectCorrelation.hasMany(EmailSendLog, {
    foreignKey: "projectCorrelationId",
    sourceKey: "id",
  });

  EmailSendLog.belongsTo(AlarmPushConfig, {
    foreignKey: "pushConfigId",
    targetKey: "id",
  });
  AlarmPushConfig.hasMany(EmailSendLog, {
    foreignKey: "pushConfigId",
    sourceKey: "id",
  });

  LatestDynamicList.belongsTo(AlarmAppearRecord, {
    foreignKey: "alarmAppearId",
    targetKey: "id",
  });
  AlarmAppearRecord.hasMany(LatestDynamicList, {
    foreignKey: "alarmAppearId",
    sourceKey: "id",
  });

  LatestDynamicList.belongsTo(EmailSendLog, {
    foreignKey: "emailSendId",
    targetKey: "id",
  });
  EmailSendLog.hasMany(LatestDynamicList, {
    foreignKey: "emailSendId",
    sourceKey: "id",
  });

  LatestDynamicList.belongsTo(AlarmConfirmLog, {
    foreignKey: "alarmConfirmId",
    targetKey: "id",
  });
  AlarmConfirmLog.hasMany(LatestDynamicList, {
    foreignKey: "alarmConfirmId",
    sourceKey: "id",
  });

  AlarmDataContinuityType.belongsTo(AlarmDataContinuity, {
    foreignKey: "typeNumber",
    targetKey: "type",
  });
  AlarmDataContinuity.hasOne(AlarmDataContinuityType, {
    foreignKey: "typeNumber",
    targetKey: "type",
  });

  LatestDynamicList.belongsTo(ProjectCorrelation, {
    foreignKey: "projectCorrelationId",
    targetKey: "id",
  });
  ProjectCorrelation.hasMany(LatestDynamicList, {
    foreignKey: "projectCorrelationId",
    sourceKey: "id",
  });

  MaintenanceRecordExecuteUser.belongsTo(MaintenanceRecord, {
    foreignKey: "maintenanceRecordId",
    targetKey: "id",
  });
  MaintenanceRecord.hasMany(MaintenanceRecordExecuteUser, {
    foreignKey: "maintenanceRecordId",
    targetKey: "id",
  });
  MaintenanceRecord.hasMany(MaintenanceRecordExecuteUser, {
    foreignKey: "maintenanceRecordId",
    targetKey: "id",
  });

  MaintenancePlanExecuteUser.belongsTo(MaintenancePlan, {
    foreignKey: "maintenancePlanId",
    targetKey: "id",
  });
  MaintenancePlan.hasMany(MaintenancePlanExecuteUser, {
    foreignKey: "maintenancePlanId",
    targetKey: "id",
  });

  EquipmentMaintenanceRecordProject.belongsTo(EquipmentMaintenanceRecord, {
    foreignKey: "equipmentMaintenanceRecordId",
    targetKey: "id",
  });
  EquipmentMaintenanceRecord.hasMany(EquipmentMaintenanceRecordProject, {
    foreignKey: "equipmentMaintenanceRecordId",
    targetKey: "id",
  });

  EquipmentMaintenanceRecordExecuteUser.belongsTo(EquipmentMaintenanceRecord, {
    foreignKey: "equipmentMaintenanceRecordId",
    targetKey: "id",
  });
  EquipmentMaintenanceRecord.hasMany(EquipmentMaintenanceRecordExecuteUser, {
    foreignKey: "equipmentMaintenanceRecordId",
    targetKey: "id",
  });

  ServerMaintenanceRecordRepairman.belongsTo(ServerMaintenanceRecord, {
    foreignKey: "serverMaintenanceRecordId",
    targetKey: "id",
  });
  ServerMaintenanceRecord.hasMany(ServerMaintenanceRecordRepairman, {
    foreignKey: "serverMaintenanceRecordId",
    targetKey: "id",
  });

  AbnReportParams.belongsTo(AbnTypes, {
    foreignKey: "abnTypeId",
    targetKey: "id",
  });
  AbnTypes.hasMany(AbnReportParams, {
    foreignKey: "abnTypeId",
    targetKey: "id",
  });

  Resource.hasMany(Resource, {
    foreignKey: "parentResource",
    sourceKey: "code",
  });

  Devices.belongsTo(ProductLibrary, {
    foreignKey: "productCode",
    targetKey: "productCode",
  });
  ProductLibrary.hasMany(Devices, {
    foreignKey: "productCode",
    sourceKey: "productCode",
  });

  Sensors.belongsTo(SensorTypeModelMapping, {
    foreignKey: "modelId",
    targetKey: "id",
  });
  SensorTypeModelMapping.hasMany(Sensors, {
    foreignKey: "modelId",
    sourceKey: "id",
  });

  SensorTypeModelMapping.belongsTo(ProductLibrary, {
    foreignKey: "collectorId",
    targetKey: "id",
  });
  ProductLibrary.hasMany(SensorTypeModelMapping, {
    foreignKey: "collectorId",
    sourceKey: "id",
  });

  AppInstallApplication.hasMany(AppInstallPackage, {
    foreignKey: "appId",
    sourceKey: "id",
  });
  AppInstallPackage.belongsTo(AppInstallApplication, {
    foreignKey: "appId",
    targetKey: "id",
  });

  Role.belongsToMany(DeviceModel, {
    through: RoleDeviceModel,
    foreignKey: "roleId",
    otherKey: "deviceModelId",
  });
  DeviceModel.belongsToMany(Role, {
    through: RoleDeviceModel,
    foreignKey: "deviceModelId",
    otherKey: "roleId",
  });

  RoleDeviceModel.belongsTo(Role, {
    foreignKey: "roleId",
    targetKey: "id",
  });
  Role.hasMany(RoleDeviceModel, {
    as: "roleDeviceModel",
    foreignKey: "roleId",
    sourceKey: "id",
  });

  RoleDeviceModel.belongsTo(DeviceModel, {
    foreignKey: "deviceModelId",
    targetKey: "id",
  });
  DeviceModel.hasMany(RoleDeviceModel, {
    as: "deviceModelRole",
    foreignKey: "deviceModelId",
    sourceKey: "id",
  });

  // 项目与设备关联
  if (Project && ProjectDevice && Devices) {
    ProjectDevice.belongsTo(Project, { foreignKey: 'projectId', targetKey: 'id' });
    Project.hasMany(ProjectDevice, { foreignKey: 'projectId', sourceKey: 'id' });

    Project.belongsToMany(Devices, {
      through: ProjectDevice,
      foreignKey: 'projectId',
      otherKey: 'deviceCode',
    });
    Devices.belongsToMany(Project, {
      through: ProjectDevice,
      foreignKey: 'deviceCode',
      otherKey: 'projectId',
    });
  }

  if (Project && EdgeUpgradeTaskDevice) {
    EdgeUpgradeTaskDevice.belongsTo(Project, { foreignKey: 'projectId', targetKey: 'id' });
    Project.hasMany(EdgeUpgradeTaskDevice, { foreignKey: 'projectId', sourceKey: 'id' });
  }
  if (User && EdgeUpgradeTaskDevice) {
    EdgeUpgradeTaskDevice.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', targetKey: 'id' });
    User.hasMany(EdgeUpgradeTaskDevice, { as: 'createdEdgeUpgradeTasks', foreignKey: 'createdBy', sourceKey: 'id' });
  }

  if (EdgeVisualModel && EdgeUpgradeTaskDevice) {
    EdgeUpgradeTaskDevice.belongsTo(EdgeVisualModel, { foreignKey: 'visualModelId', targetKey: 'id' });
    EdgeVisualModel.hasMany(EdgeUpgradeTaskDevice, { foreignKey: 'visualModelId', sourceKey: 'id' });
  }

  if (Project && EdgeRemoteSession) {
    EdgeRemoteSession.belongsTo(Project, { foreignKey: 'projectId', targetKey: 'id' });
    Project.hasMany(EdgeRemoteSession, { foreignKey: 'projectId', sourceKey: 'id' });
  }

  if (ExternalUserDevice && User) {
    ExternalUserDevice.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });
    User.hasMany(ExternalUserDevice, { foreignKey: 'userId', sourceKey: 'id' });
  }

  // 项目创建人与用户关联
  if (Project && User) {
    Project.belongsTo(User, { as: 'creator', foreignKey: 'createBy', targetKey: 'id' });
    User.hasMany(Project, { as: 'createdProjects', foreignKey: 'createBy', sourceKey: 'id' });
  }

  // 角色与项目绑定
  if (Role && Project && RoleProject) {
    Role.belongsToMany(Project, {
      through: RoleProject,
      foreignKey: 'roleId',
      otherKey: 'projectId',
    });
    Project.belongsToMany(Role, {
      through: RoleProject,
      foreignKey: 'projectId',
      otherKey: 'roleId',
    });

    RoleProject.belongsTo(Role, { foreignKey: 'roleId', targetKey: 'id' });
    Role.hasMany(RoleProject, { as: 'roleProjects', foreignKey: 'roleId', sourceKey: 'id' });

    RoleProject.belongsTo(Project, { foreignKey: 'projectId', targetKey: 'id' });
    Project.hasMany(RoleProject, { as: 'projectRoles', foreignKey: 'projectId', sourceKey: 'id' });
  }

  Department.belongsTo(Organization, {
    foreignKey: "orgId",
    targetKey: "id",
  });
  Organization.hasMany(Department, {
    foreignKey: "orgId",
    sourceKey: "id",
  });

  RoleGroup.belongsTo(Organization, {
    foreignKey: "orgId",
    targetKey: "id",
  });
  Organization.hasMany(RoleGroup, {
    foreignKey: "orgId",
    sourceKey: "id",
  });

  User.belongsTo(TypePost, {
    foreignKey: "postId",
    targetKey: "id",
  });
  TypePost.hasMany(User, {
    foreignKey: "postId",
    sourceKey: "id",
  });

  User.belongsTo(Department, {
    foreignKey: "depId",
    targetKey: "id",
  });
  Department.hasMany(User, {
    as: "members",
    foreignKey: "depId",
    sourceKey: "id",
  });

  User.belongsTo(Organization, {
    foreignKey: "orgId",
    targetKey: "id",
  });
  Organization.hasMany(User, {
    foreignKey: "orgId",
    sourceKey: "id",
  });

  User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: "userId",
    otherKey: "roleId",
  });
  Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: "roleId",
    otherKey: "userId",
  });

  UserRole.belongsTo(User, {
    foreignKey: "userId",
    targetKey: "id",
  });
  User.hasMany(UserRole, {
    as: "userHasRole",
    foreignKey: "userId",
    sourceKey: "id",
  });

  UserRole.belongsTo(Role, {
    foreignKey: "roleId",
    targetKey: "id",
  });
  Role.hasMany(UserRole, {
    as: "roleHasUser",
    foreignKey: "roleId",
    sourceKey: "id",
  });

  Role.belongsTo(RoleGroup, {
    foreignKey: "groupId",
    targetKey: "id",
  });
  RoleGroup.hasMany(Role, {
    foreignKey: "groupId",
    sourceKey: "id",
  });

  Role.belongsToMany(Resource, {
    through: RoleResource,
    foreignKey: "roleId",
    otherKey: "resourceId",
    sourceKey: "id",
    targetKey: "code",
  });
  Resource.belongsToMany(Role, {
    through: RoleResource,
    foreignKey: "resourceId",
    otherKey: "roleId",
    sourceKey: "code",
    targetKey: "id",
  });

  SystemLog.belongsTo(User, { foreignKey: "userId", targetKey: "id" });
  User.hasMany(SystemLog, { foreignKey: "userId", sourceKey: "id" });
};
