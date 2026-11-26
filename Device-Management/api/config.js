"use strict";
/*jslint node:true*/
const path = require("path");
const os = require("os");
const moment = require("moment");
const args = require("args");

const dev = process.env.NODE_ENV == "development";
const edgeAgentLocal = dev && process.env.EDGE_AGENT_LOCAL === "true";
const agentFileStorage = process.env.EDGE_AGENT_FILE_STORAGE || "qiniu";
if (!["qiniu", "local"].includes(agentFileStorage)) throw new Error("EDGE_AGENT_FILE_STORAGE必须为qiniu或local");

// 启动参数
args.option(["p", "port"], "启动端口");
args.option(["g", "pg"], "postgre 服务 URL");
args.option(
  ["f", "fileHost"],
  "文件中心本地化存储: WebApi 服务器地址(必填), 该服务器提供文件上传Web服务"
);
// args.option(["k", "kafka"], "kafka 服务 URL");
// args.option(["l", "kafkas"], "kafka 日志服务 URL");
args.option(["e", "es"], "es 服务 URL");
args.option(["c", "camundaHost"], "camunda rest host");
args.option(["r", "camundaRoot"], "camunda rest root");
// args.option('iotaProxy', '以太代理')

args.option("redisHost", "redisHost");
args.option("redisPort", "redisPort");
args.option("redisPswd", "redisPassword");

// args.option('apMergeDeVeAnxinProjectId', '告警推送自定义の合并数据异常（De）视频异常（Ve）的指定的结构物id');

args.option("axyApiUrl", "安心云 api");
args.option("apiEmisUrl", "企业管理 api");
// args.option('apiVcmpUrl', '视频平台 api');
// args.option('apiIotAuth', 'IOT 鉴权平台')

args.option("godUrl", "高德地图API请求地址");
args.option("godKey", "高德地图API key");

// args.option('mqttVideoServer', '视频后台 mqtt 服务 URL');

// 七牛云存储参数
args.option("qnak", "qiniuAccessKey");
args.option("qnsk", "qiniuSecretKey");
args.option("qnbkt", "qiniuBucket");
args.option("qndmn", "qiniuDomain");

//温补api地址
// args.option('tempApi', '温补api地址');
// clickHouse
args.option("clickHouseUrl", "clickHouse Url");
args.option("clickHousePort", "clickHouse Port");
args.option("clickHouseUser", "clickHouse user");
args.option("clickHousePassword", "clickHouse password");
args.option("clickHouseDefault", "clickHouse 设备管理平台数据库名称");
args.option("clickHouseAnxincloud", "clickHouse 安心云数据库名称");
args.option("clickHousePepEmis", "clickHouse 项企数据库名称");
args.option("clickHouseProjectManage", "clickHouse 项目管理数据库名称");
// args.option('clickHousePoms', 'clickHouse 运维中台数据库名称');
// args.option('clickHouseVcmp', 'clickHouse 视频平台数据库名称');
// args.option('clickHouseDataAlarm', 'clickHouse 视频平台数据告警库名称');
// args.option('clickHouseDataAlarmLocal', 'clickHouse 本地化告警相关数据');
args.option("clickHouseIot", "clickHouse IOT平台设备信息库名称");
args.option("clickHouseCamworkflow", "clickHouse 工作流数据库名称");
// args.option('clickHouseDataCenter', 'clickHouse 数据中台数据库名称');
// args.option('clickHouseDataAnalysis', 'ClickHouse 数据分析中台数据库名称');
// args.option('clickHouseSavoir', 'clickHouse 知物云数据库名称');

// args.option('autoDispatchOrderUserId', '自动派单用户id');
// args.option('confirmAlarmAnxinUserId', '确认告警时保存到 ES 的安心云的用户的 id');

// args.option('caiyunApi', '彩云天气 api');
// args.option('caiyunKey', '彩云天气 apiKey');

// 视频应用秘钥
// args.option('vcmpAppId', '视频平台 应用 id')
// args.option('vcmpAppSecret', '视频平台 应用秘钥')

//设备升级
args.option("apiCrawUrl", "设备升级");
args.option("types", "上传文件格式");

args.option("deviceManageUrl", "设备管理-下发指令/升级接口");
//东江日报相关
// args.option('dongJiangServer', '东江服务器地址')
// args.option('dongJiangToken', '东江固定token')
// args.option('dongJiangEmailReceiver', '东江巡查日报接收邮箱')
const flags = args.parse(process.argv);

// args.option('energyManagementProjectId', '能源管理项目id')

// args.option('zombieDays', '僵尸卡的判断天数')//根据此参数来判断多少天没有数据为僵尸卡

//日志
// args.option(["k", "kafka"], "kafka 服务 URL");

const POMS_DB = process.env.POMS_DB || flags.pg;
const LOCAL_SVR_ORIGIN = process.env.LOCAL_SVR_ORIGIN || flags.fileHost;
//项企
const FS_CAMUNDA_HOST = process.env.CAMUNDA_HOST || flags.camundaHost;
const FS_CAMUNDA_ROOT = process.env.CAMUNDA_ROOT || flags.camundaRoot;

// kafka
// const ANXINCLOUD_KAFKA_BROKERS =
//   process.env.ANXINCLOUD_KAFKA_BROKERS || flags.kafka;
//数据详情服务端渲染的api地址
// const DATA_DETAIL_SERVER_URL = process.env.DATA_DETAIL_SERVER_URL || 'https://dana.anxinyun.cn'
// 以太代理
// const IOT_PROXY = process.env.IOT_PROXY || flags.iotaProxy;
//企业微信相关配置
// const WXCHAT_REQURL = process.env.WXCHAT_REQURL || 'https://qyapi.weixin.qq.com/cgi-bin';
// const WXCHAT_AGENTID = process.env.WXCHAT_AGENTID || 1000012;
// const WXCHAT_APPID = process.env.WXCHAT_APPID || 'REPLACE_WITH_WECHAT_APPID';//绑定的小程序id（只能绑定商用）
// const WXCHAT_CORPID = process.env.WXCHAT_CORPID || 'wwb729be4a7f781f75';
// const WXCHAT_CORPSECRET = process.env.WXCHAT_CORPSECRET || "REPLACE_WITH_WECHAT_CORPSECRET";
// const WXCHAT_ADDRESS_CORPSECRET = process.env.WXCHAT_ADDRESS_CORPSECRET || "REPLACE_WITH_WECHAT_ADDRESS_CORPSECRET";//企业微信通讯录同步secret
// const WXCHAT_REDIRECT_URL = process.env.WXCHAT_REDIRECT_URL || `https://open.weixin.qq.com/connect/oauth2/authorize?appid={corpid}&redirect_uri={redirectUrl}&response_type=code&scope=snsapi_base&state=STATE#wechat_redirect`;
// const PHONE = process.env.PHONE || '15083558812'//运维工单部门主管人的电话号码
// Redis 参数
const IOTA_REDIS_SERVER_HOST =
  process.env.IOTA_REDIS_SERVER_HOST || flags.redisHost || "localhost"; //redis IP
const IOTA_REDIS_SERVER_PORT =
  process.env.IOTA_REDIS_SERVER_PORT || flags.redisPort || "6379"; //redis 端口
const IOTA_REDIS_SERVER_PWD =
  process.env.IOTA_REDIS_SERVER_PWD || flags.redisPswd || ""; //redis 密码

// const AP_MERGE_DEVE_ANXINPROJECT_ID = process.env.AP_MERGE_DEVE_ANXINPROJECT_ID || flags.apMergeDeVeAnxinProjectId || "";
// const ZOMBIE_DAYS = process.env.ZOMBIE_DAYS || flags.zombieDays || 2;
// 安心云api
const API_ANXINYUN_URL = process.env.API_ANXINYUN_URL || flags.axyApiUrl;
// 企业管理 api
const API_EMIS_URL = process.env.API_EMIS_URL || flags.apiEmisUrl;
//报表生成 api
// const API_REPOR_GENERATE_URL = process.env.API_REPOR_GENERATE_URL || 'http://10.8.30.183:8080' || 'http://222.186.227.196:30567';
//关系映射项目查询统计异常点位数据
// const API_ANXINYUN_STATISTICS_URL = process.env.API_ANXINYUN_STATISTICS_URL || 'https://statistics.anxinyun.cn';
// 视频平台 api
// const API_VCMP_URL = process.env.API_VCMP_URL || flags.apiVcmpUrl;
// iot鉴权平台 api
// const API_IOT_AUTH = process.env.API_IOT_AUTH || flags.apiIotAuth;
//设备升级
const API_CRAW_URL = process.env.API_CRAW_URL || flags.apiCrawUrl;
//设备管理-下发指令/升级接口
const DEVICE_MANAGE_URL =
  process.env.DEVICE_MANAGE_URL || flags.deviceManageUrl;

// 高德地图的参数
const GOD_URL =
  process.env.GOD_URL || flags.godUrl || "https://restapi.amap.com/v3";
const GOD_KEY = process.env.GOD_KEY || flags.godKey;

// 视频后台 mqtt 信息推送地址
// const MQTT_VIDEO_SERVER = process.env.MQTT_VIDEO_SERVER || flags.mqttVideoServer;

// 七牛云存储参数
const QINIU_DOMAIN_QNDMN_RESOURCE =
  process.env.ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE || flags.qndmn;
const QINIU_BUCKET_RESOURCE =
  process.env.ANXINCLOUD_QINIU_BUCKET_RESOURCE || flags.qnbkt;
const QINIU_AK = process.env.ANXINCLOUD_QINIU_ACCESSKEY || flags.qnak;
const QINIU_SK = process.env.ANXINCLOUD_QINIU_SECRETKEY || flags.qnsk;
//项企web
const FS_EMIS_WEB = process.env.FS_EMIS_WEB || flags.emisWeb;

// clickHouse
const CLICKHOUST_URL = process.env.CLICKHOUST_URL || flags.clickHouseUrl;
const CLICKHOUST_PORT = process.env.CLICKHOUST_PORT || flags.clickHousePort;
const CLICKHOUST_USER = process.env.CLICKHOUST_USER || flags.clickHouseUser;
const CLICKHOUST_PASSWORD =
  process.env.CLICKHOUST_PASSWORD || flags.clickHousePassword;
const CLICKHOUST_DEFAULT =
  process.env.CLICKHOUST_DEFAULT || flags.clickHouseDefault || "default";
const CLICKHOUST_ANXINCLOUD =
  process.env.CLICKHOUST_ANXINCLOUD || flags.clickHouseAnxincloud;
const CLICKHOUST_PEP_EMIS =
  process.env.CLICKHOUST_PEP_EMIS || flags.clickHousePepEmis;
const CLICKHOUST_PROJECT_MANAGE =
  process.env.CLICKHOUST_PROJECT_MANAGE || flags.clickHouseProjectManage;
// const CLICKHOUST_POMS = process.env.CLICKHOUST_POMS || flags.clickHousePoms
// const CLICKHOUST_VCMP = process.env.CLICKHOUST_VCMP || flags.clickHouseVcmp
// const CLICKHOUST_DATA_ALARM = process.env.CLICKHOUST_DATA_ALARM || flags.clickHouseDataAlarm
const CLICKHOUST_IOT = process.env.CLICKHOUST_IOT || flags.clickHouseIot;
const CLICKHOUST_CAM_WORKFLOW =
  process.env.CLICKHOUST_CAM_WORKFLOW || flags.clickHouseCamworkflow;
// const CLICKHOUST_DATA_ALARM_LOCAL = process.env.CLICKHOUST_DATA_ALARM_LOCAL || flags.clickHouseDataAlarmLocal
// const CLICKHOUSE_DATA_CENTER = process.env.CLICKHOUSE_DATA_CENTER || flags.clickHouseDataCenter;
// const CLICKHOUSE_DATA_ANALYSIS = process.env.CLICKHOUSE_DATA_ANALYSIS || flags.clickHouseDataAnalysis;
// const CLICKHOUSE_SAVOIR = process.env.CLICKHOUSE_SAVOIR || flags.clickHouseSavoir;

// const AUTO_DISPATCH_ORDER_USER_ID = process.env.AUTO_DISPATCH_ORDER_USER_ID || flags.autoDispatchOrderUserId;

// const CONFIRM_ALARM_ANXIN_USER_ID = process.env.CONFIRM_ALARM_ANXIN_USER_ID || flags.confirmAlarmAnxinUserId

const PLATFORM_NAME =
  process.env.PLATFORM_NAME || flags.platformName || "anxinyun";

//查询频谱数据接口
// const ANXINCLOUD_PYRPC_URL = process.env.ANXINCLOUD_PYRPC_URL || 'http://10.8.30.38:5000/api' //'http://anxinyun-pyrpc:15000/api';

// 视频平台应用秘钥
// const VCMP_APP_ID = process.env.VCMP_APP_ID || flags.vcmpAppId
// const VCMP_APP_SECRET = process.env.VCMP_APP_SECRET || flags.vcmpAppSecret

// 彩云天气
// const CAIYUN_API = process.env.CAIYUN_API || flags.caiyunApi || 'https://api.caiyunapp.com/v2';
// const CAIYUN_KEY = process.env.CAIYUN_KEY || flags.caiyunKey || '1l0eNveMANMXEIJI';

//  ES
const ES_PLATFORM_NAME =
  process.env.ES_PLATFORM_NAME ||
  flags.esPlatformName ||
  "anxincloud" ||
  "anxinyun";

const ES_CONTINUITY_NAME =
  process.env.ES_CONTINUITY_NAME ||
  flags.esContinuityName ||
  "anxincloud" ||
  "anxinyun";
const ES_ANXINYUN_RAWS =
  process.env.ES_ANXINYUN_RAWS ||
  flags.esAnxinyunRaws ||
  "anxinyun" ||
  "anxincloud";
const ES_ANXINYUN__VBRAWS =
  process.env.ES_ANXINYUN__VBRAWS ||
  flags.esAnxinyunVbRaws ||
  "anxinyun" ||
  "anxincloud";
const ES_ANXINCLOUD_ALARMS =
  process.env.ES_ANXINCLOUD_ALARMS ||
  flags.esAnxinCloudAlarms ||
  "anxincloud" ||
  "anxinyun";
//能源管理项目的id
// const ENERGYMANAGEMENT_PROJECT_ID = process.env.ENERGYMANAGEMENT_PROJECT_ID || '300,452,367,473,366,365'

const ANXINCLOUD_ES_NODES_REST =
  process.env.ANXINCLOUD_ES_NODES_REST || flags.es;
// //business_key
// const  BUSINESS_KEY=process.env.BUSINESS_KEY||['160','161']

//文件上传类型限制（主要是固件升级上传固件包）
const configuredTypes =
  (process.env.TYPES && process.env.TYPES.split(",")) ||
  (flags.types && flags.types.split(",")) ||
  [];
// APP安装包管理需要上传 APK；保留部署参数中的既有白名单并补充该格式。
const TYPES = Array.from(new Set([...configuredTypes, ".apk"]));
// kafka
// const KAFKA_LOGS = process.env.KAFKA_LOGS_BROKERS || flags.kafkas;
//东江日报相关
// const DONG_JIANG_SERVER = process.env.DONG_JIANG_SERVER || flags.dongJiangServer
// const DONG_JIANG_TOKEN = process.env.DONG_JIANG_TOKEN || flags.dongJiangToken
// const DONG_JIANG_EMAIL_RECEIVER = process.env.DONG_JIANG_EMAIL_RECEIVER || flags.dongJiangEmailReceiver

//温补
// const TEMP_API = process.env.TEMP_API || flags.tempApi || 'http://localhost:4000';
const requireParams = {
  FS_CAMUNDA_HOST,
  FS_CAMUNDA_ROOT,
  POMS_DB,
  IOTA_REDIS_SERVER_HOST,
  IOTA_REDIS_SERVER_PORT,
  // ANXINCLOUD_KAFKA_BROKERS,
  GOD_KEY,
  API_ANXINYUN_URL,
  API_EMIS_URL,
  // API_VCMP_URL,
  // API_IOT_AUTH,
  QINIU_DOMAIN_QNDMN_RESOURCE,
  QINIU_BUCKET_RESOURCE,
  QINIU_AK,
  QINIU_SK,
  CLICKHOUST_URL,
  CLICKHOUST_PORT,
  CLICKHOUST_DEFAULT,
  CLICKHOUST_ANXINCLOUD,
  CLICKHOUST_PEP_EMIS,
  CLICKHOUST_PROJECT_MANAGE,
  //  CLICKHOUST_POMS,
  //   CLICKHOUST_VCMP,
  // CLICKHOUST_DATA_ALARM,
  CLICKHOUST_IOT,
  CLICKHOUST_CAM_WORKFLOW,
  // CLICKHOUSE_DATA_CENTER,
  // CLICKHOUSE_DATA_ANALYSIS,
  // AUTO_DISPATCH_ORDER_USER_ID,
  // CONFIRM_ALARM_ANXIN_USER_ID,
  // VCMP_APP_ID, VCMP_APP_SECRET,
  API_CRAW_URL,
  DEVICE_MANAGE_URL,
  // CLICKHOUST_DATA_ALARM_LOCAL,
  TYPES,
  // PHONE,
  // ANXINCLOUD_PYRPC_URL,
  // DATA_DETAIL_SERVER_URL,
  // ZOMBIE_DAYS,
  // CLICKHOUSE_SAVOIR,
  // DONG_JIANG_SERVER,
  // DONG_JIANG_TOKEN,
  // DONG_JIANG_EMAIL_RECEIVER,
  // TEMP_API,
};

const startupParams = edgeAgentLocal ? {
  POMS_DB, IOTA_REDIS_SERVER_HOST, IOTA_REDIS_SERVER_PORT,
  ...(agentFileStorage === "qiniu" ? { QINIU_DOMAIN_QNDMN_RESOURCE, QINIU_BUCKET_RESOURCE, QINIU_AK, QINIU_SK } : {}),
} : requireParams;
Object.keys(startupParams).forEach((key) => {
  if (!startupParams[key]) {
    console.error(`缺少启动参数 ${key}，异常退出`);
    process.exitCode = 1; // args.showHelp() exits internally.
    args.showHelp();
    process.exit(-1);
  }
});

const product = {
  port: flags.port || 8080,
  staticDirs: ["static"],
  mws: [
    {
      entry: require("@fs/attachment").entry,
      opts: {
        qiniu: {
          domain: QINIU_DOMAIN_QNDMN_RESOURCE,
          bucket: QINIU_BUCKET_RESOURCE,
          accessKey: QINIU_AK,
          secretKey: QINIU_SK,
        },
        maxSize: 104857600, // 100M
        types: TYPES,
      },
    },
    {
      entry: require("./app").entry,
      opts: {
        dev,
        // business_key:BUSINESS_KEY,
        camundarest: {
          host: FS_CAMUNDA_HOST,
          root: FS_CAMUNDA_ROOT,
        },
        // kafkaService: {
        //   rootURL: KAFKA_LOGS,
        // },
        // zombieDays: ZOMBIE_DAYS,
        emisWeb: FS_EMIS_WEB,
        // phone: PHONE,
        // fftService: ANXINCLOUD_PYRPC_URL,
        // energyManagementProjectId: ENERGYMANAGEMENT_PROJECT_ID,
        exclude: [
          // "*",
          { p: "/attachments/:p", o: "POST" },
          // { p: '/alarm/application/inspection', o: 'POST' },
          // { p: '/project/app_list', o: 'GET' },
          // { p: '/alarm/application/api', o: 'POST' },
          // { p: '/alarm/service/api', o: 'POST' },  //后端服务告警入库
          // { p: '/data/continuity/api', o: 'POST' },  //数据连续性监控入库
          // { p: '/page/performance/api', o: 'POST' },  //页面加载性能入库
          // { p: '/alarm/video/added_log', o: 'POST' },
          { p: "/basic-data/workflow/single/allProject", o: "GET" },

          // { p: '/weather/realtime', o: 'GET' },
          // 自定义分大屏
          // { p: '/project/group/statistic', o: 'GET' },
          // { p: '/project/group/statistic/online', o: 'GET' },
          // { p: '/project/group/statistic/alarm', o: 'GET' },
          // { p: '/project/group/list', o: 'GET' },
          // { p: '/project/group/:groupId/detail', o: 'GET' },
          // { p: '/project/workOrders/repairRank', o: 'GET' },
          // { p: '/project/workOrders', o: 'GET' },
          //物联网卡的校验，安心云用
          // { p: '/card/:cardNumber', o: 'POST' },

          // { p: '/organizations/:pepProjectId/struc', o: 'GET' },
          // { p: '/things/:iotaThingId/deploys', o: 'GET' },
          // { p: '/meta/things/:iotaThingId/devices', o: 'GET' },
          // { p: '/metrics/things/:iotaThingId/devices/link_status', o: 'GET' },
          // { p: '/things/:iotaThingId/deploy', o: 'GET' },
          // { p: '/sensors/last/data', o: 'POST' },
          // { p: '/meta/things/:iotaThingId/devices', o: 'GET' },
          // { p: '/devices/alarms', o: 'POST' },
          // { p: '/devices/cardStatus', o: 'POST' },
          // { p: '/metrics/devices/:deviceId/link_status', o: 'GET' },
          // { p: '/device/:deviceId/alarms', o: 'GET' },

          // { p: '/workflow/struc_paidan', o: 'GET' }
        ], // 不做认证的路由，也可以使用 exclude: ["*"]  跳过所有路由
        // apMergeDeVeAnxinProjectId: AP_MERGE_DEVE_ANXINPROJECT_ID,
        // anxinCloud: {
        //    confirmAlarmAnxinUserId: CONFIRM_ALARM_ANXIN_USER_ID
        // },
        // dongJiangToken: DONG_JIANG_TOKEN,
        // dongJiangServer: DONG_JIANG_SERVER,
        // dongJiangEmailReceiver: DONG_JIANG_EMAIL_RECEIVER,
        // tempApi: TEMP_API,
        // vcmp: {
        //    app: {
        //       id: VCMP_APP_ID,
        //       secret: VCMP_APP_SECRET
        //    }
        // },
        // kafka: {
        //   rootURL: ANXINCLOUD_KAFKA_BROKERS,
        //   topicPrefix: PLATFORM_NAME,
        // },
        // weChat: {//企业微信配置
        //    reqUrl: WXCHAT_REQURL,
        //    agentid: WXCHAT_AGENTID,
        //    appid: WXCHAT_APPID,//绑定的小程序id
        //    corpid: WXCHAT_CORPID,
        //    corpsecret: WXCHAT_CORPSECRET,
        //    redirect_url: WXCHAT_REDIRECT_URL,
        //    address_corpsecret: WXCHAT_ADDRESS_CORPSECRET //企业微信通讯录同步secret
        // },
        redis: {
          host: IOTA_REDIS_SERVER_HOST,
          port: IOTA_REDIS_SERVER_PORT,
          pwd: IOTA_REDIS_SERVER_PWD,
        },
        // mqtt: {
        //    mqttVideoServer: MQTT_VIDEO_SERVER,
        // },
        // sms: {
        //    ///阿里云-安心云
        //    accessKey: 'REPLACE_WITH_ALIYUN_ACCESS_KEY',
        //    accessSecret: 'REPLACE_WITH_ALIYUN_ACCESS_SECRET'
        // },
        // email: {
        //    enabled: true,
        //    host: 'smtp.exmail.qq.com',
        //    port: 465,
        //    sender: [
        //       {
        //          name: '运维服务',
        //          address: 'fsiot@free-sun.com.cn',
        //          password: 'REPLACE_WITH_SMTP_PASSWORD'
        //       },
        //       {
        //          name: '运维服务',
        //          address: 'warning1@free-sun.com.cn',
        //          password: 'REPLACE_WITH_SMTP_PASSWORD'
        //       },
        //       {
        //          name: '运维服务',
        //          address: 'warning2@free-sun.com.cn',
        //          password: 'REPLACE_WITH_SMTP_PASSWORD'
        //       }
        //    ]
        // },
        // caiyun: {
        //    key: CAIYUN_KEY,
        // },
        pssaRequest: [
          {
            // name 会作为一个 request 出现在 ctx.app.fs
            name: "axyRequest",
            root: API_ANXINYUN_URL,
          },
          {
            name: "craw",
            root: API_CRAW_URL,
            dataWord: "text",
          },
          {
            name: "emisRequest",
            root: API_EMIS_URL,
          },
          // {
          //    name: 'reportGenerate',
          //    root: API_REPOR_GENERATE_URL
          // },
          // {
          //    name: 'anxinyunStatistics',
          //    root: API_ANXINYUN_STATISTICS_URL
          // },
          // {
          //    name: 'vcmpRequest',
          //    root: API_VCMP_URL
          // },
          // {
          //    name: 'iotAuthRequest',
          //    root: API_IOT_AUTH
          // },
          //  {
          //    name: 'iotRequest',
          //    root: IOT_PROXY + '/_iota_api',
          //    dataWord: 'text'
          // },
          // {
          //    name: 'iotInvoke',
          //    root: IOT_PROXY + '/_iota_api',
          // },
          {
            name: "godRequest",
            root: GOD_URL,
            params: {
              query: {
                key: GOD_KEY,
              },
            },
          },
          // {
          //    name: 'caiyunRequest',
          //    root: CAIYUN_API
          // },
          //  {
          //    name: 'dataDetailServer',
          //    root: DATA_DETAIL_SERVER_URL
          // },
          {
            name: "deviceManageRequest",
            root: DEVICE_MANAGE_URL,
          },
        ],
        // autoDispatchOrderUserId: AUTO_DISPATCH_ORDER_USER_ID,
        clickHouse: {
          url: CLICKHOUST_URL,
          port: CLICKHOUST_PORT,
          user: CLICKHOUST_USER,
          password: CLICKHOUST_PASSWORD,
          db: [
            {
              name: "anxinyun",
              db: CLICKHOUST_ANXINCLOUD,
            },
            {
              name: "pepEmis",
              db: CLICKHOUST_PEP_EMIS,
            },
            {
              name: "projectManage",
              db: CLICKHOUST_PROJECT_MANAGE,
            },
            // {
            //    name: 'poms',
            //    db: CLICKHOUST_POMS
            // },
            //  {
            //    name: 'vcmp',
            //    db: CLICKHOUST_VCMP
            // },
            // {
            //    name: 'dataAlarm',
            //    db: CLICKHOUST_DATA_ALARM
            // },
            {
              name: "iot",
              db: CLICKHOUST_IOT,
            },
            {
              name: "camWorkflow",
              db: CLICKHOUST_CAM_WORKFLOW,
            },
            {
              name: "defaultDb",
              db: CLICKHOUST_DEFAULT,
            },
            // {
            //    name: 'alarmLocal',
            //    db: CLICKHOUST_DATA_ALARM_LOCAL
            // },
            // {
            //    name: 'dataCenter',
            //    db: CLICKHOUSE_DATA_CENTER
            // },
            // {
            //    name: 'dataAnalysis',
            //    db: CLICKHOUSE_DATA_ANALYSIS
            // },
            // {
            //    name: 'savoir',
            //    db: CLICKHOUSE_SAVOIR
            // }
          ],
        },
        es: edgeAgentLocal ? undefined : {
          strucOnline: {
            //告警记录
            rootURL: ANXINCLOUD_ES_NODES_REST.split(","),
            index: `${ES_PLATFORM_NAME}_online`,
            type: flags.esType ? flags.esType : "_doc",
          },
          strucSeries: {
            //告警记录
            rootURL: ANXINCLOUD_ES_NODES_REST.split(","),
            index: `${ES_CONTINUITY_NAME}_continue`,
            type: flags.esType ? flags.esType : "_doc",
          },
          rawData: {
            rootURL: ANXINCLOUD_ES_NODES_REST.split(","),
            index: `${ES_ANXINYUN_RAWS}_raws`,
            type: flags.esType ? flags.esType : "_doc",
          },
          vbRawData: {
            rootURL: ANXINCLOUD_ES_NODES_REST.split(","),
            index: `${ES_ANXINYUN__VBRAWS}_vbraws`,
            type: flags.esType ? flags.esType : "_doc",
          },
          alarm: {
            rootURL: ANXINCLOUD_ES_NODES_REST.split(","),
            index: `${ES_ANXINCLOUD_ALARMS}_alarms`,
            type: flags.esType ? flags.esType : "_doc",
          },
        },
      },
    },
  ],
  dc: {
    url: POMS_DB,
    opts: {
      dialectModulePath: path.join(__dirname, "app/lib/service/postgresCompat.js"),
      pool: {
        max: 80,
        min: 10,
        idle: 10000,
      },
      define: {
        freezeTableName: true, // 固定表名
        timestamps: false, // 不含列 "createAt"/"updateAt"/"DeleteAt"
      },
      timezone: "+08:00",
      logging: false,
    },
    models: [require("./app").models],
  },
  logger: {
    level: "info",
    json: false,
    filename: path.join(__dirname, "log", "runtime.log"),
    colorize: false,
    maxsize: 1024 * 1024 * 5,
    rotationFormat: false,
    zippedArchive: true,
    maxFiles: 10,
    prettyPrint: true,
    label: "",
    timestamp: () => moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
    eol: os.EOL,
    tailable: true,
    depth: null,
    showLevel: true,
    maxRetries: 1,
  },
};

if (edgeAgentLocal) {
  const application = product.mws[1];
  application.opts = {
    dev, edgeAgentLocal, exclude: [],
    redis: { host: IOTA_REDIS_SERVER_HOST, port: IOTA_REDIS_SERVER_PORT, pwd: IOTA_REDIS_SERVER_PWD },
    // Legacy firmware is independent of Agent; enable it only when requested.
    pssaRequest: API_CRAW_URL ? [{ name: "craw", root: API_CRAW_URL, dataWord: "text" }] : [],
  };
  // Core login/project/Agent testing retains PostgreSQL and Redis.
  product.mws = [application];
  product.dc.opts.pool = { max: 10, min: 0, idle: 10000, acquire: 15000 };
  product.dc.opts.dialectOptions = { statement_timeout: 15000 };
}

const development = {
  port: product.port,
  staticDirs: product.staticDirs,
  mws: product.mws,
  dc: product.dc,
  logger: product.logger,
};

if (dev) {
  // mws
  for (let mw of development.mws) {
    // if (mw.opts.exclude) mw.opts.exclude = ['*']; // 使用 ['*'] 跳过所有路由
  }
  // logger
  development.logger.filename = path.join(__dirname, "log", "development.log");
  development.logger.level = "debug";
  development.dc.opts.logging = console.log;
}

const activeConfig = dev ? development : product;
activeConfig.edgeAgentStorage = agentFileStorage === "qiniu" ? {
  domain: QINIU_DOMAIN_QNDMN_RESOURCE, bucket: QINIU_BUCKET_RESOURCE,
  accessKey: QINIU_AK, secretKey: QINIU_SK,
  downloadTTL: process.env.EDGE_AGENT_QINIU_DOWNLOAD_TTL_SECONDS || 7200,
} : null;
// 边缘告警 AI 复核：调用 FastGPT 应用（提示词在应用内维护，这里只传 event_info 变量与证据图片）
activeConfig.aiReview = {
  enabled: process.env.AI_REVIEW_ENABLED !== "false",
  url: process.env.AI_REVIEW_URL || "https://fastgpt.anxinyun.cn/api/v1/chat/completions",
  apiKey: process.env.AI_REVIEW_API_KEY || "REPLACE_WITH_AI_REVIEW_API_KEY",
  model: process.env.AI_REVIEW_MODEL || "qwen3-vl-plus",
  timeout: Number(process.env.AI_REVIEW_TIMEOUT || 60000),
  concurrency: Number(process.env.AI_REVIEW_CONCURRENCY || 2),
};
module.exports = activeConfig;
