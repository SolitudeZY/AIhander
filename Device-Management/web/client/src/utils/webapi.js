"use strict";
import { ProxyRequest, customWebUtils } from "@peace/utils";

const userKey = "user";

export const AxyRequest = new ProxyRequest("_axy", userKey);
export const EmisRequest = new ProxyRequest("_emis", userKey);

export const webUtils = new customWebUtils({
  userKey: userKey,
  timeout: 720000, //超时时间
});
const { basicAction, RouteRequest } = webUtils;
export { basicAction, RouteRequest };

export const ApiTable = {
  login: "auth/login",
  logout: "auth/logout",
  register: "auth/register",

  // 天气
  weatherRealtime: "weather/realtime",

  //设置-鉴权管理
  getOrganizationDeps: "organization/deps", //获取项企(PEP)全部部门及其下用户
  getOrganizationUser: "organization/user", //获取成员列表
  putOrganizationUser: "organization/user/{pomsUserId}", //更新成员状态
  postOrganizationUser: "organization/user", //添加/编辑成员
  deteleOrganizationAdmin: "organization/admin/{pomsUserId}", //删除管理员

  //设置-关系映射
  getProjectPoms: "project/poms", //获取已绑定项目列表
  getProjectAnxincloud: "project/anxincloud", //获取安心云项目
  getProjectPmanage: "project/pmanage", //获取PEP项目管理项目
  postProjectBind: "project/bind", //绑定安心云、项目管理项目
  getProjectAppList: "project/app_list", //获取应用列表
  deleteProjectBind: "project/bind/{bindId}", //删除安心云、项目管理项目绑定关系
  getStructureStation: "structure/station", //获取对应结构物和重点测点
  AbnormalPointList: "project/anomalePoint", //获取异常点位信息列表

  //项目分组
  projectGroup: "project/group",
  groupStatistic: "project/group/statistic",
  groupStatisticOnline: "project/group/statistic/online",
  groupStatisticAlarm: "project/group/statistic/alarm",
  groupProject: "project/group/list",
  groupProjectDetail: "project/group/:groupId/detail",
  projectWordOrders: "project/workOrders",
  wordOrdersRepairRank: "project/workOrders/repairRank",

  //告警
  getProjectPoms: "project/poms", //获取已绑定项目
  getAlarmLnspection: "alarm/application/inspection", //查询应用巡检信息
  putAlarmApplicationNoted: "alarm/application/noted", //预览状态
  getAlarmLnspectionApi: "alarm/application/api", //查询应用接口/元素错误信息
  postApiConfirm: "alarm/application/api_confirm", //确认应用接口/元素错误信息
  getAlarmDataGroup: "alarm/data/group", //获取数据告警分类
  getAlarmDataList: "alarm/data/list", //查询数据告警列表
  getAlarmDataDetailAgg: "alarm/data/detail_agg", //查询数据告警详情聚集数据
  getAlarmDataDetail: "alarm/data/detail", //查询数据告警详情
  putAlarmdataConfirm: "alarm/data/confirm", //确认数据告警
  getAlarmVideoList: "alarm/video/list", //查询视频告警列表
  getAlarmVideoDeviceKind: "alarm/video/device_kind", //查询视频设备类型
  putAlarmVideoConfirm: "alarm/video/confirm", //确认视频告警信息
  getVcmpAuth: "vcmp/auth", // 获取视频平台应用鉴权token
  getAlarmVideoExceptionType: "alarm/video/exceptionType", //查询视频设备类型
  exceptionTypeCheck: "exception/type/check",

  // 漏液告警
  leackageList: "alarm/leakage/list",
  leackagestatus: "alarm/leakage/status",
  leackageGroup: "alarm/leakage/group",

  // 监测报表
  getDataContinuityType: "data/continuity/type_list",
  getDataContinuity: "data/continuity",
  getDataContinuityDetail: "data/continuity/{continuityId}/detail",

  //服务-信鸽服务
  getPush: "push", //获取推送配置列表
  postPush: "push", //新增/编辑推送配置
  getOrganizationUsers: "organization/users", //获取全部用户
  getProjectStructure: "project/structure", //获取绑定项目下结构物
  getProjectStatus: "project/status", //获取项目状态列表
  putPushPushId: "push/{pushId}", //更改推送配置状态（禁用或删除）

  // 报表服务
  reportFile: "report/file", //报表上传
  delReportFile: "report/file/{id}", //报表删除
  factorList: "factor/list", //获取监测因素数据
  automaticReport: "automatic/report", //自动化报表
  delAutomaticReport: "automatic/report/{id}", //删除报表规则
  generateReport: "generate/report", //报表生成

  //控制台
  consoleToollink: "console/toollink", //常用工具
  deleteConsoleToollink: "console/toollink/{linkId}", //删除常用工具
  getConsoleCount: "console/count", //工作台数量查询
  getConsoleUser: "analysis/userlist", //查询关联人员,web应用
  getConsoleAbnormal: "analysis/problem", //项目概览异常查询
  getDataAlarmsAggDay: "data/alarms/agg/day", //查询BI分析数据-数据
  getVideoAlarmsAggDay: "video/alarms/agg/day", //查询BI分析数据-视频异常
  getAppAlarmsAggDay: "app/alarms/agg/day", //查询BI分析数据-应用
  getAlarmsHandleStatistics: "/alarms/handle/statistics", //查询BI分析数据-问题处理效率分析
  getLatestDynamic: "latest/dynamic", // 查询最新动态
  getAlarmData: "alarm/data", //查询数据告警
  getAlarmUse: "alarm/use", //查询应用告警
  getStatisticOnline: "statisticOnline", //查询在线率
  getStrucSeries: "strucSeries", //查询连续率

  //资料库
  addEditFile: "file/addEdit", //添加、编辑文件夹
  fileList: "file/list", //获取问文件夹列表
  delFile: "file/del/{id}", //删除文件夹
  file: "file",
  delfolderFile: "file/{id}", //删除文件

  //工单
  getEnabledWorkflowProcess: "workflow/process/enabled", //获取工作流可用表单
  getPomsProjectBasicAll: "basic-data/workflow/single/allProject",

  //服务记录
  getRecord: "record",
  //编辑和新增
  addRecord: "record",
  //删除
  delRecord: "record/{id}",
  //获取维护计划
  getMaintenancePlan: "maintenancePlan",
  //删除维护计划
  delMaintenancePlan: "maintenancePlan",
  //编辑维护计划
  editMaintenancePlan: "maintenancePlan",
  //计算系统可用性
  calculability: "calculability",
  //设备维护记录
  getEquipment: "equipment",
  //编辑或者新增设备维护记录
  editEquipment: "equipment",
  //删除设备维护记录
  delEquipment: "equipment/{id}",
  //查询服务器信息维护记录
  getServerInfoMaintenanceRecord: "serverInfoMaintenanceRecord",
  //编辑服务器信息维护记录（编辑和新增）
  editServerInfoMaintenanceRecord: "serverInfoMaintenanceRecord",
  //删除服务器信息维护记录
  delServerInfoMaintenanceRecord: "serverInfoMaintenanceRecord/{id}",

  //分析
  getFailureTime: "failureTime", //故障发生时间分析
  getSystemAvailability: "systemAvailability", //系统可用性分析
  getProblemType: "problemType", //故障类型
  getOperationsPersonnel: "operationsPersonnel", //y运维人员
  getMaintenceRecordRank: "maintenceRecordRank", //维修记录排名
  getMaintenceTotal: "maintenceTotal", //维修数统计
  getEquipmentCategory: "equipmentCategory", //维修数统计
  getMaintenanceStatus: "maintenanceStatus", //获取状态数据

  //分析-一图统揽
  organizationsStruc: "organizations/{pepProjectId}/struc", //获取项目下的结构物信息
  thingsDeploy: "things/{iotaThingId}/deploy", //获取设备部署信息-组网数据
  deviceMetaDeployed: "meta/things/{iotaThingId}/devices", //获取部署设备原型
  getIotaThingsLlinkStatus: "metrics/things/{iotaThingId}/devices/link_status", //获取设备在线状态/以结构物id集体获取
  thingsDeploy: "things/{iotaThingId}/deploy", //获取设备部署信息-组网数据
  findSensorLastData: "sensors/last/data", //原始数据查询
  findDeviceMetaDeployed: "meta/things/{iotaThingId}/devices", //按找thingId查询数据
  getDevicesAlarms: "devices/alarms", //告警数据
  findDevicesCardStatus: "devices/cardStatus", //查询物联网卡状态
  getDevicesLlinkStatus: "metrics/devices/{deviceId}/link_status", //设备在线状态获取
  getDeviceAlarms: "device/{deviceId}/alarms", //获取设备告警信息

  respondRecord: "respond-record",

  //待办工单
  workOrders: "unfinished",
  //获取设备型号
  getDeviceType: "deviceType",
  //结构物和对应设备类型
  getStruc: "structure",
  //知物云结构物和对应设备类型
  getZwyStruc: "zwy/structure",
  //获取固件包列表
  getFirmware: "firmware",
  getFirmwareCapabilities: "firmware/capabilities",
  //获取固件包列表
  getDeviceMetaNameDict: "firmware/deviceMetaNameDict",
  //获取版本号列表
  getVersionDict: "firmware/versionDict",
  // 设备管理 - APP安装包管理
  appInstallApplications: "firmware-upgrade/app-install-applications",
  appInstallApplicationById: "firmware-upgrade/app-install-applications/{id}",
  appInstallPackages: "firmware-upgrade/app-install-packages",
  appInstallPackageById: "firmware-upgrade/app-install-packages/{id}",
  //增加/覆盖固件包
  upgradeFirmware: "upgradeFirmware",
  //删除固件包
  deleteFirmware: "deleteFirmware",
  //新增设备型号下拉数据源
  addDeviceModels: "add/deviceMeta/models",
  //分页查询设备型号列表
  getDeviceMetaModels: "deviceMeta/models",
  //获取设备信息
  getThingMessages: "getThingMessages",
  //下发配置(批量单个)
  distributeConfiguration: "distributeConfiguration",
  //监测数据相关接口
  getProjectAllStructures: "project/allStructures", //获取绑定项目下结构物
  getFactors: "structure/factors", //结构物下的监测因素
  getSensors: "structure/factors/sensors", //检测因素下的设备数据
  getMonitorData: "structure/factors/sensors/data/detail", //获取监测数据(表格数据)
  getMonitorDataServer: "structure/factors/sensors/data", //获取监测数据（图）
  getVibRaws: "structure/stations/vibration/raws", //获取振动数据
  getVibFfts: "structure/stations/vibration/ffts", //获取频谱数据
  //异常数据配置相关接口
  getAbnMethods: "abnormal/methods", //获取计算方式
  getAbnParamList: "struct/abnormal/params", //获取异常参数配置
  addAbnParamList: "struct/abnormal/params", //新增异常参数配置
  batchSwitch: "batch/switch/{ids}", //批量启用or禁用
  deleteAbnParams: "delete/abnormal/params/{id}", //删除配置
  editAbnParams: "edit/abnormal/params/{id}", //修改配置
  getAbnTaskResult: "struct/{structId}/abnTask/result/{start}/{end}", //
  getWorkOrdersAvgTimes: "project/workOrders/avgTime",

  getMapData: "energy/management", //能源管理地图数据
  getEchartsData: "energy/30daysOr7days",
  //运维分析-网卡管理
  getClassifiedData: "iota/card/management",
  getCardList: "iota/card",
  addOrUpdateCard: "iota/card",
  deleteCard: "iota/deleteCard/{id}",
  getStructureList: "iota/card/structure",
  findAllCardNumber: "all/card/number",
  batchImport: "cardBatchImport",

  // 工单统计
  getWorkOrdersCount: "stats/work-orders/count", // 统计工单数
  getWorkOrdersCountByProject: "stats/work-orders/count/by-project", // 按项目统计工单数
  getWorkOrdersElapseDeviationByProject:
    "stats/work-orders/elapse-deviation/by-project", // 按项目统计工单耗时偏差
  getWorkOrdersUnresolved: "work-orders/unresolved", // 获取未解决工单
  workOrdersResolved: "work-orders/resolved", // 标记工单已解决
  getWorkOrdersOvertime: "work-orders/overtime", // 获取超时工单
  getWorkOrdersDetails: "work-orders/:procInstId/details", // 获取工单详情
  getWorkOrdersElapseByProject: "stats/work-orders/elapse/by-project", // 按项目统计工单耗时

  // 用户权限
  getResource: "resource",
  getUserResource: "user/resource",
  postUserRes: "user/resource",
  getAuthorList: "org/{orgId}/resources",
  getAuthorByRoleId: "role/{id}/resources",
  getDepartmentResources: "orgs/{orgId}/department/resources?platform=true",
  getStructsList: "organizations/{organizationId}/structures",
  getStructsListWithoutIOTA:
    "organizations/{organizationId}/withoutiota/structures",

  // 证书维护
  cert: "cert",
  certNotice: "cert/notice",

  // 企业管理
  // getEnterprisesDetails: "users/{userId}/enterprises/details", // 获取企业详情
  getEnterprisesMembers: "enterprises/{id}/members", // 获取企业成员
  modifyEnterprise: "enterprises/{id}", // 修改企业信息
  getEnterprisesRoles: "enterprises/{id}/roles",

  // 系统管理 - 组织管理
  getOrganizations: "system/organizations", // 获取组织列表
  getOrganizationTree: "system/organizations/tree", // 获取组织树
  getOrganization: "system/organizations/{id}", // 获取组织详情
  createOrganization: "system/organizations", // 创建组织
  updateOrganization: "system/organizations/{id}", // 更新组织
  deleteOrganization: "system/organizations/{id}", // 删除组织

  // 系统管理 - 部门管理
  getDepartments: "system/departments", // 获取部门列表
  getDepartmentTree: "system/departments/tree", // 获取部门树
  getDepartment: "system/departments/{id}", // 获取部门详情
  addDepartment: "system/departments", // 创建部门
  modifyDepartment: "system/departments/{id}", // 更新部门
  deleteDepartment: "system/departments/{id}", // 删除部门
  updateDepartmentUsers: "system/departments/:depId/users", // 批量修改部门关联用户

  // 系统管理 - 用户管理
  getUsers: "system/list/users", // 获取用户列表
  getUser: "system/users/{id}", // 获取用户详情
  addMember: "system/add/users", // 创建用户
  modifyMember: "system/users/{id}", // 更新用户
  deleteMember: "system/users/{id}", // 删除用户
  deleteMembers: "system/users/batch", // 批量删除用户
  resetPassword: "system/users/{id}/reset-password", // 重置用户密码
  enableMember: "system/users/{id}/status", // 启用用户
  disableMember: "system/users/{id}/status", // 禁用用户
  sortDepartment: "system/departments/sort", // 部门排序
  sortDepartmentUsers: "system/users/sort", // 用户排序
  modifyDepartmentUsers: "system/departments/{depId}/users", // 修改部门用户
  getPostsUrl: "system/users/postitions", // 获取职位列表
  getAllUsers: "system/users/all", // 获取所有用户列表

  // 项目管理
  getProjects: "project-management/projects", // 获取项目列表（支持模糊查询）
  getProject: "project-management/projects/{id}", // 获取项目详情
  createProject: "project-management/projects", // 新建项目
  updateProject: "project-management/projects/{id}", // 编辑项目
  deleteProject: "project-management/projects/{id}", // 删除项目
  getProjectOptions: "project-management/projects/options", // 项目下拉选项
  bindProjectDevices: "project-management/projects/devices/bind", // 绑定项目设备（focusDeviceCodes）
  unbindProjectDevice: "project-management/projects/{id}/devices", // 解绑项目设备
  bindRolesProject: "project-management/projects/roles/bind", // 批量绑定角色-项目
  getProjectRoles: "project-management/roles/{roleId}/projects", // 获取角色绑定项目

  // 系统管理 - 角色管理
  getRolesList: "system/rolesList", // 获取角色列表
  getRole: "system/roles/{id}", // 获取角色详情
  addRoleUrl: "system/roles", // 创建角色
  roleUrlById: "system/roles/{id}", // 更新/删除角色
  getRoleUsers: "system/roles/{id}/users", // 获取角色用户列表

  // 系统管理 - 角色组管理
  getRoleGroups: "system/role-groups", // 获取角色组列表
  getRoleGroup: "system/role-groups/{id}", // 获取角色组详情
  addGroupRoleUrl: "system/role-groups", // 创建角色组
  groupRoleUrlById: "system/role-groups/{id}", // 更新/删除角色组
  getRoleGroupRolesUrl: "system/role-groups/{id}/roles", // 获取角色组角色列表
  getRoleGroupUserStats: "system/role-groups/{id}/user-stats", // 获取角色组用户统计

  // 系统管理 - 权限资源管理
  getResources: "system/resources", // 获取权限列表
  getResourceTree: "system/resources/tree", // 获取权限树
  getResource: "system/resources/{id}", // 获取权限详情
  createResource: "system/resources", // 创建权限
  updateResource: "system/resources/{id}", // 更新权限
  deleteResource: "system/resources/{id}", // 删除权限
  batchDeleteResources: "system/resources/batch", // 批量删除权限
  getResourceRoles: "system/resources/{id}/roles", // 获取角色权限列表

  // 系统管理 - 权限管理
  modifyAuthor: "system/roles/{roleId}/permissions", // 修改角色权限
  modifyRoleUsers: "system/roles/{roleId}/users", // 修改角色关联用户
  deleteRoleUsers: "system/role/{roleId}/users/remove", // 删除角色关联用户
  modifyRoleStructures: "system/roles/{id}/structures", // 修改角色结构权限

  // 系统管理 - 系统日志
  getSystemLog: "system/logLists", // 获取系统日志
  createSystemLog: "system/create/logs", // 创建系统日志

  // 固件升级-产品库
  productLibrary: "firmware-upgrade/product-library",
  putDelProductLibrary: "firmware-upgrade/{id}/product-library",
  delProductLibrary: "delFirmware-upgrade/{id}/product-library",
  getAllProductLibrary: "firmware-upgrade/product-library/all",

  // 设备管理平台
  getDevicesList: "device-manage-platform/get-devices", // 设备列表
  getDevicesSlim: "device-manage-platform/get-devices-slim", // 设备简表（仅id、deviceCode、name）
  modifyDevice: "device-manage-platform/{deviceCodes}/devices", // 修改设备信息
  subDevices: "device-manage-platform/sub-devices", // 新增/获取子设备
  modifyDelDevices: "device-manage-platform/{id}/sub-devices", // 修改/删除子设备
  getCommandHistories: "device-manage-platform/command-histories", // 下发历史
  getDiagnosticHistories: "device-manage-platform/diagnostic-histories", // 诊断数据
  getSensorTypeModelMapping: "device-manage-platform/sensor-type-model-mapping", // 获取传感器型号对应表
  getDevicesCodeModelMapping:
    "device-manage-platform/devices-code-model-mapping", // 获取设备型号编码对应表
  issueCommand: "device-manage-platform/issue/batch", // 下发指令
  issueSubCommand: "device-manage-platform/issue_sensor/{deviceCode}", // 下发子设备指令
  otaDevice: "device-manage-platform/ota/batch", // 下发固件
  importSubDevices: "device-manage-platform/sub-devices/import", // 导入子设备
  clearAll: "issue/clear_all_channels", //清除全部通道
  // 外部用户添加设备
  externalUserAddDevices: "device-manage-platform/external-user/devices",
  removeExternalUserDevices:
    "device-manage-platform/external-user/devices/unbind", // 外部用户解绑设备

  getSensor: "firmware-upgrade/sensor-list",
  addOrEditSensor: "firmware-upgrade/add-or-edit-sensor",
  delSensor: "firmware-upgrade/delete-sensor",
  getSensorTypes: "firmware-upgrade/sensor-types",
  distributeConf: "issue/overall",
  getSubDevicesData: "device-manage-platform/ota/sub-device-data",
  getFormulaData: "device-manage-platform/ota/sub-device-config-formula", // 获取公式数据
  getFormulaParamNames: "firmware-upgrade/formula-calc-params",
  addFormulaParamNames: "firmware-upgrade/formula-calc-params",
  updateFormulaParamNames: "firmware-upgrade/formula-calc-params/{formulaId}",
  //访问第三方平台的登录验证码
  getcode: "get/login/verify/code",
  loginDz: "login/dz",
  findAllRecord: "find/all/records/temperature",
  delTemperatureRecord: "del/record/temperature",

  // 参数模板
  paramTemplates: "firmware-upgrade/param-templates",
  paramTemplateById: "firmware-upgrade/param-templates/{id}",
  paramTemplateHistories: "firmware-upgrade/param-template-histories",
  paramTemplateHistoryById:
    "firmware-upgrade/param-template-histories/{id}",
  paramTemplatesResolve: "firmware-upgrade/param-templates/resolve",
};

// 项企的接口
export const EmisApiTable = {
  //通过流程名称查找指定流程
  getProcessByName: "workflow/process/name",

  processInstancemMyApplyList: "process-instance/my-apply-list", //待办工单
  processInstancemMyAuditList: "process-instance/my-audit-list", //由我发起
  processInstancemMyDoneList: "process-instance/my-done-list/optimization", //已办工单
  processInstancemMyDoneCount: "process-instance/my-done-count/optimization", //已办工单数量
  processInstancemMyNoticeList: "process-instance/my-notice-list/optimization", //抄送我
  processInstancemMyNoticeCount:
    "process-instance/my-notice-count/optimization", //抄送我 数量
  processInstancemMyDraftList: "process-instance/my-draft-list", //保存待发
  processInstancemMyExternallyList:
    "process-instance/my-externallyReissue-list", // 驳回重发

  getApprovalActionUrl: "process-instance/audit/{type}", // 审批、撤销操作
  //删除草稿
  delDraftUrl: "process/drafts/{draftId}",
  delResendRejected: "process/launched/del/{processInstId}/{type}", //驳回重发--删除旧流程

  // 边缘设备 - Agent 管理
  edgeProjects: "edgeAgent/projects", // 项目列表（含未分配）
  edgeDevices: "edgeAgent/devices", // 边缘设备列表
  edgeDeviceDetail: "edgeAgent/devices/{deviceId}", // 设备详情
  edgeDeviceChannels: "edgeAgent/devices/{deviceId}/video-channels", // 视频通道
  edgeDeviceExceptions: "edgeAgent/devices/{deviceId}/exceptions", // 异常记录
  edgeExceptionAcknowledge: "edgeAgent/devices/{deviceId}/exceptions/{exceptionId}/acknowledge",
  edgeDeviceSessions: "edgeAgent/devices/{deviceId}/remote-sessions", // 远程会话历史
  edgeSessionDetail: "edgeAgent/remote-sessions/{sessionId}", // 远程会话详情
  edgeDeviceAudits: "edgeAgent/devices/{deviceId}/audits", // 设备操作审计
  edgeAssignProject: "edgeAgent/devices/{deviceId}/project", // 分配/调整项目
  edgeReboot: "edgeAgent/devices/{deviceId}/reboot", // 重启设备
  edgeModels: "edgeAgent/models", // 视觉模型列表
  edgeUploadModel: "edgeAgent/models", // 上传模型
  edgeEvents: "edgeAgent/events", // 事件与告警列表
  edgeEventReview: "edgeAgent/events/{deviceId}/{rowId}/review", // 人工确认告警
  edgeEventAIPreview: "edgeAgent/events/{deviceId}/{rowId}/ai-review", // 触发/重试 AI 复核
  edgeEventPush: "edgeAgent/events/{deviceId}/{rowId}/push", // 重新推送告警
  edgeEventStatistics: "edgeAgent/events/statistics", // 事件与告警统计
  edgeChannelTest: "edgeAgent/devices/{deviceId}/video-channels/test", // RTSP 只读测试
  edgeDeviceOperation: "edgeAgent/devices/{deviceId}/operations/{operationId}", // 设备操作结果（重启轮询）
  edgeAgentFileUpload: "edgeAgent/files", // 上传文件到管理平台
  edgeDeviceFileDeliver: "edgeAgent/devices/{deviceId}/files", // 投递文件到设备
  edgeUpgradeTasks: "edgeAgent/deployments", // 升级任务列表（一台设备一条）
  edgeUpgradeTaskDetail: "edgeAgent/deployments/{deploymentId}", // 升级任务详情
  edgeRedispatch: "edgeAgent/deployments/{deploymentId}/redispatch", // 重新下发
  edgeClearDeploymentHistory: "edgeAgent/deployments", // 清理已结束发布历史

  // 平台对接
  platformConfigs: "platformIntegrations/configs", // 平台对接配置列表
  platformConfigDetail: "platformIntegrations/configs/{configId}", // 平台对接配置详情
  platformConfigTest: "platformIntegrations/configs/{configId}/test", // 接收平台连通性测试
  platformStructures: "platformIntegrations/configs/{configId}/structures", // 按项目查询结构物列表
  platformMappings: "platformIntegrations/mappings", // 对象关联列表
  platformMappingDetail: "platformIntegrations/mappings/{mappingId}", // 对象关联详情
  platformSubscriptions: "platformIntegrations/subscriptions", // 推送订阅列表
  platformSubscriptionDetail: "platformIntegrations/subscriptions/{subscriptionId}", // 推送订阅详情
  platformPushRecords: "platformIntegrations/pushRecords", // 推送记录
};

export const RouteTable = {
  apiRoot: "/api/root",
  fileUpload: "/_upload/new",
  cleanUpUploadTrash: "/_upload/cleanup",
};
