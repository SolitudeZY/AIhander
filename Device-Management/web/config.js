'use strict';
/*jslint node:true*/
const path = require('path');
/*这种以CommonJS的同步形式去引入其它模块的方式代码更加简洁:获取组件*/
const os = require('os');
const moment = require('moment');
const args = require('args');
const dev = process.env.NODE_ENV == 'development' || process.env.NODE_ENV == 'developmentVite';
const vite = process.env.NODE_ENV == 'developmentVite';

dev && console.log('\x1B[33m%s\x1b[0m', '请遵循并及时更新 readme.md，维护良好的开发环境，媛猿有责');
// // 启动参数
args.option(['p', 'port'], '启动端口');
args.option(['u', 'api-url'], 'webapi的URL');
args.option('apiPomsUrl', 'webapi的URL 外网可访问');
args.option('edgeAgentApiUrl', '设备终端 API 根地址（浏览器可访问）');
args.option('apiAnxinyunUrl', '安心云 api');
args.option('apiEmisUrl', '企业管理 api');
args.option('webEmisUrl', '统一认证 web - 统一认证 配置表单的');
args.option('webOaUrl', 'OA web - 项企填表单的');
args.option('iotVcmpWeb', 'IOT 视频服务');
args.option('pomsMonitor', '运维监控 web');
args.option('pomsKubesphere', 'kubesphere web');
args.option('pomsAmbari', 'ambari web');
args.option('pomsKowl', '运维监控 web');
args.option('pomsPghero', 'pghero web');
args.option('pomsEs', 'es监控 web');
args.option('pomsNotebook', 'notebook web');
args.option('dcWeb', '报表中心web');
args.option('networkWeb', '运维组网web');
args.option('traitLabel', '映射关系里重点测点监控特征标签');

//硬件升级
args.option('crawapi', '硬件升级')

// 七牛
args.option('qnak', 'qiniuAccessKey');
args.option('qnsk', 'qiniuSecretKey');
args.option('qnbkt', 'qiniuBucket');
args.option('qndmn', 'qiniuDomain');

const flags = args.parse(process.argv);

const API_URL = process.env.API_URL || flags.apiUrl;
const API_POMS_URL = process.env.API_POMS_URL || flags.apiPomsUrl;
const EDGE_AGENT_API_URL = process.env.EDGE_AGENT_API_URL || flags.edgeAgentApiUrl || '';
const API_EMIS_URL = process.env.API_EMIS_URL || flags.apiEmisUrl;
const WEB_EMIS_URL = process.env.WEB_EMIS_URL || flags.webEmisUrl;
const WEB_OA_URL = process.env.WEB_OA_URL || flags.webOaUrl;
const API_ANXINYUN_URL = process.env.API_ANXINYUN_URL || flags.apiAnxinyunUrl;
const IOT_VIDEO_WEB = process.env.IOT_VIDEO_WEB || flags.iotVcmpWeb;
const POMS_MONITOR = process.env.POMS_MONITOR || flags.pomsMonitor;
const POMS_KUBESPHERE = process.env.POMS_KUBESPHERE || flags.pomsKubesphere;
const POMS_AMBARI = process.env.POMS_AMBARI || flags.pomsAmbari;
const POMS_KOWL = process.env.POMS_KOWL || flags.pomsKowl;
const POMS_PGHERO = process.env.POMS_PGHERO || flags.pomsPghero;
const POMS_ES = process.env.POMS_ES || flags.pomsEs;
const POMS_NOTEBOOK = process.env.POMS_NOTEBOOK || flags.pomsNotebook;
const DC_WEB = process.env.DC_WEB || flags.dcWeb;
const NETWORK_WEB = process.env.NETWORK_WEB || flags.networkWeb;
const CRAW_API = process.env.CRAW_API || flags.crawapi;
//映射关系里重点测点监控特征标签
const TRAIT_LABEL = process.env.TRAIT_LABEL || flags.traitLabel || '';


// 七牛
const ANXINCLOUD_QINIU_AK = process.env.ANXINCLOUD_QINIU_ACCESSKEY || flags.qnak;
const ANXINCLOUD_QINIU_SK = process.env.ANXINCLOUD_QINIU_SECRETKEY || flags.qnsk;
const ANXINCLOUD_QINIU_BUCKET_RESOURCE = process.env.ANXINCLOUD_QINIU_BUCKET_RESOURCE || flags.qnbkt;
const ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE = process.env.ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE || flags.qndmn;




if (
   !API_URL || !CRAW_API
   || !API_EMIS_URL || !WEB_EMIS_URL || !WEB_OA_URL
   || !API_ANXINYUN_URL
   || !POMS_MONITOR || !DC_WEB || !NETWORK_WEB
   || !ANXINCLOUD_QINIU_AK || !ANXINCLOUD_QINIU_SK || !ANXINCLOUD_QINIU_BUCKET_RESOURCE || !ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE || !IOT_VIDEO_WEB) {
   console.log('缺少启动参数，异常退出');
   args.showHelp();
   process.exit(-1);
}

const product = {
   port: flags.port || 8080,
   staticDirs: [path.join(__dirname, './client')],
   mws: [{
      entry: require('./middlewares/proxy').entry,
      opts: {
         host: API_URL,
         match: /^\/_api\//,
      }
   }, {
      entry: require('./middlewares/proxy').entry,
      opts: {
         host: API_ANXINYUN_URL,
         match: /^\/_axy\//,
      }
   }, {
      entry: require('./middlewares/proxy').entry,
      opts: {
         host: API_EMIS_URL,
         match: /^\/_emis\//,
      }
   }, {
      entry: require('./middlewares/attachment').entry,
      opts: {
         qiniu: {
            accessKey: ANXINCLOUD_QINIU_AK,
            secretKey: ANXINCLOUD_QINIU_SK,
            bucket: ANXINCLOUD_QINIU_BUCKET_RESOURCE,
            domain: ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE
         },
         maxSize: 104857600, // 100M
         uploadPath: 'other'
      }
   }, {
      entry: require('./routes').entry,
      opts: {
         apiUrl: API_POMS_URL,
         edgeAgentApiUrl: EDGE_AGENT_API_URL,
         webEmis: WEB_EMIS_URL,
         webOa: WEB_OA_URL,
         iotVcmpWeb: IOT_VIDEO_WEB,
         pomsMonitor: POMS_MONITOR,
         pomsKubesphere: POMS_KUBESPHERE,
         pomsAmbari: POMS_AMBARI,
         pomsKowl: POMS_KOWL,
         pomsPghero: POMS_PGHERO,
         pomsEs: POMS_ES,
         pomsNotebook: POMS_NOTEBOOK,
         dcWeb: DC_WEB,
         networkWeb: NETWORK_WEB,
         staticRoot: './client',
         crawapi: CRAW_API,
         traitLabel: TRAIT_LABEL,
         qiniu: {
            fetchUrl: '/_file-server',
            domain: ANXINCLOUD_QINIU_DOMAIN_QNDMN_RESOURCE
         },
      }
   }, {
      entry: require('./client').entry,// 静态信息
      opts: {}
   }],
   logger: {
      level: 'debug',
      json: false,
      filename: path.join(__dirname, 'log', 'runtime.txt'),
      colorize: true,
      maxsize: 1024 * 1024 * 5,
      rotationFormat: false,
      zippedArchive: true,
      maxFiles: 10,
      prettyPrint: true,
      label: '',
      timestamp: () => moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
      eol: os.EOL,
      tailable: true,
      depth: null,
      showLevel: true,
      maxRetries: 1
   }
};

let config;
if (dev) {
   config = {
      port: product.port,
      staticDirs: product.staticDirs,
      mws: product.mws
         .concat([
            vite ?
               {
                  entry: require('./middlewares/vite-dev').entry,
                  opts: {}
               }
               :
               {
                  entry: require('./middlewares/webpack-dev').entry,
                  opts: {}
               }
         ])
      ,
      logger: product.logger
   }
   config.logger.filename = path.join(__dirname, 'log', 'development.txt');
} else {
   config = product;
}

module.exports = config;//区分开发和发布
