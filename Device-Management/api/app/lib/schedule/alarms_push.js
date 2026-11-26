const moment = require("moment");

let isDev = false;
// isDev = true

let proDebug = false;
proDebug = isDev;

module.exports = function (app, opts) {
  const alarmsPush = app.fs.scheduleInit(
    {
      interval: isDev ? "0 */10 * * * *" : "12 */1 * * * *",
      // interval: '12 0 0 0 */1 *',
      immediate: isDev,
      proRun: !isDev,

      // disabled: true
    },
    async () => {
      try {
        const { models, ORM: sequelize } = app.fs.dc;
        const { apMergeDeVeAnxinProjectId = "" } = opts;
        const { clickHouse } = app.fs;
        const { database: anxinyun } = clickHouse.anxinyun.opts.config;
        const { database: dataAlarm } = clickHouse.dataAlarm.opts.config;
        const { database: iota } = clickHouse.iot.opts.config;
        const { pushBySms, pushByEmail, sendNoticeToWeb, pushByVoice } =
          app.fs.utils;
        const curMinOfYear = moment().diff(moment().startOf("year"), "minutes");
        let copyPepProjectName = void 0;
        const pLog = (...msg) => {
          if (proDebug) {
            console.log(msg);
          }
        };
        /**
         * 查询在前端页面所有生效的配置信息
         */
        const configListRes = await models.AlarmPushConfig.findAll({
          where: {
            del: false,
            disable: false,
            // id:{$in:[123]},
            // id:{$in:[143]}
          },
          order: ["id"],
        });
        let pomsProjectId = new Set();
        let pepProjectIds = new Set();
        /**
         * 遍历所有有效的配置，并整理获取得到pomsProjectId
         */
        for (let { dataValues: c } of configListRes) {
          if (c.pomsProjectId) {
            c.pomsProjectId.forEach((pid) => pomsProjectId.add(pid));
          }
        }
        /**
         * 通过pomsProjectId查询ProjectCorrelation表，获取pepProjectId，即运维中台项目的数据
         */
        const pomsProjectRes = pomsProjectId.size
          ? await models.ProjectCorrelation.findAll({
              where: {
                id: { $in: [...pomsProjectId] },
              },
            })
          : [];
        for (let { dataValues: c } of pomsProjectRes) {
          if (c.pepProjectId) {
            pepProjectIds.add(c.pepProjectId);
          }
        }
        /**
         * 通过pepProjectIds查询项企项目表，获取项企项目的信息
         */
        const pepProjectRes = pepProjectIds.size
          ? await clickHouse.projectManage
              .query(
                `
                     SELECT 
                        t_pim_project.id AS id, 
                        t_pim_project.project_name AS project_name, 
                        t_pim_project.isdelete AS isdelete,
                        t_pim_project_construction.construction_status_id AS construction_status_id, 
                        t_pim_project_state.construction_status AS construction_status 
                     FROM t_pim_project 
                        LEFT JOIN t_pim_project_construction 
                           ON t_pim_project.id = t_pim_project_construction.project_id 
                        LEFT JOIN t_pim_project_state 
                           ON t_pim_project_construction.construction_status_id = t_pim_project_state.id 
                        WHERE id IN (${[...pepProjectIds].join(",")}, -1)
                  `
              )
              .toPromise()
          : [];
        /**
         *
         * @param {*} minute 分钟
         * @returns 返回天数小时分钟的字符串
         */
        const calcMinute2DHM = (minute) => {
          pLog("calcMinute2DHM ", minute);
          if (!minute && minute != 0) {
            return minute;
          }
          let title = "";
          let dm = 24 * 60;
          let d = Math.floor(minute / dm);
          let h = Math.floor((minute % dm) / 60);
          let m = (minute % dm) % 60;
          if (d) {
            title = d + "天";
          }
          if (h) {
            title = title + h + "时";
          }
          if (m) {
            title = title + m + "分";
          }
          pLog("calcMinute2DHM Rslt", title);
          return title;
        };
        /**
         * 告警过滤函数 - 过滤掉状态大于2（已处理）的告警
         *
         * 该函数用于处理告警数据，通过查询ClickHouse数据库，过滤掉状态大于2（已处理）的告警，
         * 返回未处理的告警列表。函数采用分组查询策略优化数据库访问性能。
         *
         * @param {Array<Object>} dataAlarms - 需要过滤的原始告警数据数组
         * @param {string} [idKey='AlarmId'] - 告警唯一标识字段名，默认为'AlarmId'
         * @returns {Promise<Array<Object>>} 过滤后的告警数据数组（只包含未处理的告警）
         *
         * @example
         * // 使用示例
         * const originalAlarms = [
         *   { AlarmId: 'A001', ... },
         *   { AlarmId: 'A002', ... }
         * ];
         *
         * const filteredAlarms = await alarmfilterDone(originalAlarms);
         * console.log(filteredAlarms); // 输出未处理的告警
         *
         * @description
         * ## 函数工作原理
         * 1. 将告警按100个一组分组
         * 2. 对每组告警ID查询ClickHouse中状态>2的记录
         * 3. 将已处理的告警存储在映射对象中
         * 4. 遍历原始告警，过滤掉已处理的告警
         *
         * ## 性能优化
         * - 分组查询：每次最多查询100个告警ID，避免大查询导致性能问题
         * - 映射存储：使用对象存储已处理告警，O(1)时间复杂度的查找
         * - 单ID处理：特殊处理单条查询情况，避免查询失败
         *
         * ## 注意事项
         * - 函数为异步函数，需要使用await或.then()处理结果
         * - 依赖于ClickHouse数据库的alarms表结构
         * - 假设告警ID在dataAlarms中是唯一的
         */
        const alarmfilterDone = async (dataAlarms, idKey = "AlarmId") => {
          // 鉴于 ck 可能会有重复的告警数据
          let nAlarms = [];
          let ni = 0;
          let checkStateAlarmIds = [];
          let checkStateAlarms = {};
          for (let alarm of dataAlarms) {
            ni++;
            checkStateAlarmIds.push("'" + alarm[idKey] + "'");

            if (checkStateAlarmIds.length >= 100 || ni == dataAlarms.length) {
              // 分组查询
              if (checkStateAlarmIds.length == 1) {
                // 避免单条数据导致查询失败
                checkStateAlarmIds.push("'" + -1 + "'");
              }

              const repeatRes = await clickHouse.dataAlarm
                .query(
                  `SELECT * FROM alarms WHERE AlarmId IN (${checkStateAlarmIds.join(
                    ","
                  )}) AND State > 2`
                  // `SELECT AlarmId, MAX(AlarmState) FROM alarm_details WHERE AlarmId IN (${checkStateAlarmIds.join(',')}) AND AlarmState > 2 GROUP BY AlarmId`
                )
                .toPromise();

              if (repeatRes.length) {
                for (let r of repeatRes) {
                  checkStateAlarms[r.AlarmId] = r; // 插入对象中 提高后续判断速度
                }
              }
              checkStateAlarmIds = [];
            }
          }
          for (let alarm of dataAlarms) {
            if (checkStateAlarms[alarm[idKey]]) {
              continue;
            } else {
              nAlarms.push(alarm);
            }
          }

          return nAlarms;
        };

        pLog("EM推送列表_" + configListRes.length);
        pLog(`当前时间:${moment().format("YYYY-MM-DD HH:mm:ss")}`);
        pLog(`curMinOfYear / ${curMinOfYear}`);

        for (let { dataValues: c } of configListRes) {
          try {
            /***
             * 本地传感器数组
             */
            let localSensor = [];
            // if (isDev && c.id != 20) {
            //    continue
            // }

            // if (isDev && c.name != '【百分比】重点项目跟踪') {
            //    continue
            // }
            // if (isDev && c.name != '瑞昌水库临时查看') {
            //    continue
            // }
            // if (isDev && c.name != '重点项目跟踪') {
            //     continue
            //  }

            pLog(`当前运行EM配置:id=${c.id} name=${c.name}`);
            /**
             * 是否存在策略参数和策略
             */
            if (c.tacticsParams && c.tactics) {
              // pomsProjectId 是个数组 []
              const { strucId, pomsProjectId, pomsStrucFactorId } = c;
              let { interval, deviceProportion } = c.tacticsParams;
              /**
               * 策略是abnormal_rate，对应前端的异常率推送机制
               */
              if (c.tactics == "abnormal_rate") {
                interval = parseInt(interval) * 60;
              }
              pLog(`tactics = ${c.tactics}`);
              pLog(
                `interval / ${interval} /${curMinOfYear % parseInt(interval)}`
              );
              //判断设置的时间间隔（分钟）和当前的时间的分钟是不是正数倍关系，没有余数就是代表符合节点，进行推送设置
              if (curMinOfYear % parseInt(interval) == 0 || isDev) {
                pLog(`符合时间断点`);
                /**
                 * pomsProjectRes为所有配置的的运维中台项目，corPomsProject为当前匹配的运维中台项目
                 */
                const corPomsProject = pomsProjectRes.filter((poms) =>
                  pomsProjectId.includes(poms.id)
                );
                /**
                 * curAnxinProjectId为所选择的安心云项目的id的set
                 */
                let curAnxinProjectId = new Set();
                /**
                 * 所有项企项目的名称
                 */
                let pepProjectName_ = [];
                let pepProject_name = []; //当前有关联的项目，后面往对应项目里面插入对应的结构物-监测因素-告警源

                try {
                  /**
                   * 遍历corPomsProject，分别获取curAnxinProjectId，pepProjectName_，pepProject_name·
                   */
                  /**
                   * corPomsProject中有pepProjectId为项企项目的，pepProjectId为null的是自定义项目
                   */
                  for (let { dataValues: poms } of corPomsProject) {
                    if (poms.pepProjectId) {
                      // 找对应的项企项目
                      const corPepProject = pepProjectRes.find(
                        (p) => p.id == poms.pepProjectId
                      );
                      //添加true，优化成EM推送不需要关联项企项目的状态
                      if (
                        corPepProject &&
                        (true ||
                          c.timeType.some(
                            (ct) => ct == corPepProject.construction_status_id
                          ))
                      ) {
                        pepProjectName_.push(corPepProject.project_name);
                        pepProject_name.push({
                          id: poms.id,
                          anxinProjectId: poms.anxinProjectId,
                          name: corPepProject.project_name,
                        });
                      } else {
                        // 不符合当前项目的时间节点
                        pLog(`不符合当前项目的时间节点`);
                        continue;
                      }
                    } else {
                      // 是自定义项目
                      if (poms.name) {
                        pepProjectName_.push(poms.name);
                        pepProject_name.push({
                          id: poms.id,
                          anxinProjectId: poms.anxinProjectId,
                          name: poms.name,
                        });
                      }
                    }
                    // 筛选全部的 anxinProjectId pepProjectId
                    for (let axId of poms.anxinProjectId) {
                      curAnxinProjectId.add(axId);
                    }
                  }
                } catch (error) {
                  console.error("数据筛选失败", error);
                  throw error;
                }

                //去重复
                const anxinProjectId = [...curAnxinProjectId];

                // 查当前 poms 下的结构物 并把不包含的去掉
                // 可能有结构物已解绑
                /**
                 * 根据配置项所选择的结构物id和安心云的项目id查询当前项目下的结构物，
                 * 输出结构物和项目的相关信息，包括external_platform，用于区分是不是本地化项目
                 */
                const strucListRes =
                  strucId.length && anxinProjectId.length
                    ? await clickHouse.anxinyun
                        .query(
                          `
                              SELECT
                                 DISTINCT id, 
                                 t_structure.id AS id, 
                                 t_structure.name AS name,
                                 t_structure.iota_thing_id AS iotaThingId,
                                 external_platform AS platform,
                                 t_project.id AS projectId
                              FROM 
                                 t_project 
                              LEFT JOIN
                                 t_project_structure
                                    ON t_project_structure.project = t_project.id
                              LEFT JOIN
                                 t_project_structuregroup
                                    ON t_project_structuregroup.project = t_project.id
                              LEFT JOIN 
                                 t_structuregroup_structure
                                    ON t_structuregroup_structure.structuregroup = t_project_structuregroup.structuregroup
                              LEFT JOIN
                                 t_project_construction
                                    ON t_project_construction.project = t_project.id
                              LEFT JOIN
                                 t_structure_site
                                    ON t_structure_site.siteid = t_project_construction.construction
                              RIGHT JOIN
                                 t_structure
                                    ON t_structure.id = t_project_structure.structure
                                    OR t_structure.id = t_structuregroup_structure.structure
                                    OR t_structure.id = t_structure_site.structid
                              WHERE 
                                 project_state != -1 
                                 AND t_project.id IN (${anxinProjectId.join(
                                   ","
                                 )})
                                 AND t_structure.id IN (${strucId.join(",")})
                           `
                        )
                        .toPromise()
                    : [];

                /**
                 * 以太平台的thingId
                 */
                let strucThingId = [];
                /**
                 * 结构物映射表
                 */
                let strucMap = {};
                /**
                 * 安心云结构物id
                 */
                let strucAnxinId = [];
                /**
                 * 本地化结构物id
                 */
                let strucLocalId = [];
                /**
                 * 遍历strucListRes，把结构物id和项目id加入到strucMap中，
                 * 同时把结构物id加入到searchStrucIds中，
                 * 把结构物的thingId加入到strucThingId中，
                 * 把结构物的id加入到strucAnxinId或strucLocalId中，
                 */
                let searchStrucIds = strucListRes.map((s) => {
                  s.pepProject = [];
                  pepProject_name.map((p) => {
                    //在数据里加入项企项目或自定义项目id
                    if (p.anxinProjectId.includes(s.projectId)) {
                      s.pepProject.push(p.id);
                    }
                  });
                  if (s.iotaThingId) {
                    strucThingId.push(s.iotaThingId);
                  }
                  //本地化结构物
                  if (s.platform) {
                    strucLocalId.push(s.id);
                  } else {
                    //安心云结构物
                    strucAnxinId.push(s.id);
                  }

                  strucMap[s.id] = {
                    ...s,
                    factor: [],
                  };

                  return s.id;
                });
                if (strucLocalId && strucLocalId.length) {
                  localSensor =
                    (await clickHouse.dataAlarm
                      .query(
                        `select SensorId,SensorLocationDescription from sensors where IsDeleted=false and  PlatformStructureId in (${strucLocalId
                          .map((t) => `'${t}'`)
                          .join(",")})`
                      )
                      .toPromise()) || [];
                }
                if (searchStrucIds.length) {
                  searchStrucIds.unshift(-1);
                } else {
                  // 没有结构物可查
                  pLog(`没有结构物可查`);
                  continue;
                }
                let pepProjectName = pepProjectName_.length
                  ? pepProjectName_.join("<br/>")
                  : "";
                let smsProjectName = pepProjectName_.length
                  ? pepProjectName_.join("、")
                  : "";
                let voiceProjectName = pepProjectName_.length
                  ? pepProjectName_.join("、")
                  : "";

                let emailTitle = `${
                  pepProjectName_.length ? pepProjectName_.join("、") : ""
                }-${c.name}-`;
                let emailSubTitle = "";
                /**
                 * 数据告警条件
                 */
                let dataAlarmOption = [];
                /**
                 * 本地化数据告警条件
                 */
                let dataAlarmOptionLocal = [];
                /**
                 * 分组条件
                 */
                let dataAlarmGroupOption = [];
                /**
                 * 告警子类型
                 */
                let dataAlarmSubType = [];
                /**
                 * 告警列表
                 */
                let dataAlarms = [];
                /**
                 * 视频告警查询条件
                 */
                let videoAlarmWhereOption = [];
                /**
                 * 视频告警列表
                 */
                let videoAlarms = [];
                /**
                 * 应用告警查询条件
                 */
                let appAlarmWhereOption = {
                  confirmTime: null,
                };
                /**
                 * 应用告警列表
                 */
                let appAlarms = [];
                /**
                 * 设备数量
                 */
                let deviceCount = 0;
                let alarmDeviceCount = 0;
                /**摄像头数量 */
                let cameraCount = 0;
                let alarmCameraCount = 0;
                // 判断推送策略
                let nowTime = moment().startOf("minute");
                let pointTime = moment()
                  .subtract(
                    parseInt(interval),
                    // + 1440 * 365,
                    "minute"
                  )
                  .startOf("minute")
                  .format("YYYY-MM-DD HH:mm:ss");

                let newAddStartTime = pointTime;
                let newAddEndTime = nowTime.clone();
                let pushTypeStr = "";
                // 即时推送
                if (c.tactics == "immediately") {
                  // !查所有未解决告警 所以时间范围大可不必
                  dataAlarmOption.push(`StartTime >= '${pointTime}'`);
                  appAlarmWhereOption.createTime = { $gte: pointTime }
                  videoAlarmWhereOption.push(`camera_status_alarm.create_time >= '${pointTime}'`)
                  pushTypeStr = "即时推送";
                  emailTitle += `即时推送服务`;
                  emailSubTitle += `截止${moment(pointTime).format(
                    "YYYY年MM月DD日 HH时mm分"
                  )}-${moment(nowTime).format("HH时mm分")}:`;
                } else if (
                  c.tactics == "continue" ||
                  c.tactics == "abnormal_rate"
                ) {
                  //持续推送和异常率推送
                  // 新增的应该是上一个时间节点到上上个节点之间
                  dataAlarmOption.push(`StartTime <= '${pointTime}'`);
                  dataAlarmOptionLocal.push(`StartTime <= '${pointTime}'`);
                  appAlarmWhereOption.createTime = { $lte: pointTime };
                  videoAlarmWhereOption.push(
                    `camera_status_alarm.create_time <= '${pointTime}'`
                  );
                  // 新增的应该是上一个时间节点到上上个节点之间
                  newAddStartTime = moment(pointTime)
                    .subtract(parseInt(interval), "minute")
                    .format("YYYY-MM-DD HH:mm:ss");
                  newAddEndTime = pointTime;

                  if (c.tactics == "continue") {
                    pushTypeStr = "持续时长推送";
                    emailTitle += `持续时长推送服务`;
                    emailSubTitle += `告警持续时长超${interval}分钟的告警源,详情如下:`;
                  } else {
                    //不是持续告警中策略情况下，告警类型包括了数据异常和数据中断
                    if (
                      c.alarmType.includes("data_outages") ||
                      c.alarmType.includes("data_exception")
                    ) {
                      // 查了设备异常率 去安心云查当前项目下的设备数量
                      //todo，这里计算设备总数，需要统计sensor，而不是device
                      let localSensorCount = 0;
                      let anxinSensorCount = 0;
                      if (strucLocalId && strucLocalId.length) {
                        const res =
                          (await clickHouse.dataAlarm
                            .query(
                              `select count(1) as count from sensors where IsDeleted=false and  PlatformStructureId in (${strucLocalId
                                .map((t) => `'${t}'`)
                                .join(",")})`
                            )
                            .toPromise()) || [];
                        localSensorCount = res.length ? res[0].count : 0;
                      }
                      if ((strucThingId || []).length) {
                        const devices =
                          (await clickHouse.iot
                            .query(
                              `
                                       SELECT id  FROM Device WHERE thingId IN (${strucThingId
                                         .map((t) => `'${t}'`)
                                         .join(",")}, -1)
                                    `
                            )
                            .toPromise()) || [];
                        const sensorCount =
                          devices && devices.length
                            ? await clickHouse.anxinyun
                                .query(
                                  `
                                       SELECT count(id) AS count FROM t_device_sensor WHERE iota_device_id IN (${devices
                                         .map((t) => `'${t.id}'`)
                                         .join(",")}, -1)
                                    `
                                )
                                .toPromise()
                            : [];
                        anxinSensorCount = sensorCount.length
                          ? sensorCount[0].count
                          : 0;
                      }
                      deviceCount = localSensorCount + anxinSensorCount;
                      pLog(`查得安心云当前项目下设备总数量 - ${deviceCount}`);
                    }
                    if (c.alarmType.includes("video_exception")) {
                      // 查了视频异常 去安心云查 接入的 萤石 设备数量
                      cameraCount = searchStrucIds.length
                        ? (
                            await clickHouse.anxinyun
                              .query(
                                `
                                       SELECT count(*) AS count FROM t_video_ipc
                                       WHERE structure IN (${searchStrucIds.join(
                                         ","
                                       )})
                                    `
                              )
                              .toPromise()
                          )[0].count
                        : 0;
                      pLog(
                        `查得安心云当前项目下萤石设备总数量 - ${cameraCount}`
                      );
                    }
                    pushTypeStr = `异常率推送`;
                    emailTitle += `异常率推送服务`;
                    emailSubTitle += `持续产生时间超过${(interval / 60).toFixed(
                      0
                    )}小时的异常设备数量**个,异常率达到项目或结构物内设备总数量${
                      parseInt(deviceCount) + parseInt(cameraCount)
                    }个的 --%,详情如下`; //  --% ** 是在下面计算得
                  }
                }

                emailTitle += "_POMS飞尚运维中台";

                // 判断告警数据范围
                if (c.alarmType.includes("data_outages")) {
                  dataAlarmGroupOption.push(1);
                  dataAlarmGroupOption.push(4);
                  dataAlarmGroupOption.push(5);
                  if (c.alarmSubType)
                    dataAlarmSubType = dataAlarmSubType.concat(
                      c.alarmSubType["data_outages"] || []
                    );
                }
                if (c.alarmType.includes("data_exception")) {
                  dataAlarmGroupOption.push(2);
                  dataAlarmGroupOption.push(3);
                  if (c.alarmSubType)
                    dataAlarmSubType = dataAlarmSubType.concat(
                      c.alarmSubType["data_exception"] || []
                    );
                }
                // if (c.alarmType.includes('strategy_hit')) {
                //    dataAlarmGroupOption.push(3)
                //    if (c.alarmSubType) dataAlarmSubType = dataAlarmSubType.concat(c.alarmSubType['strategy_hit'] || [])
                // }
                if (c.alarmType.includes("video_exception")) {
                  let videoAlarmSubType = c.alarmSubType
                    ? c.alarmSubType["video_exception"] || []
                    : [];
                  if (videoAlarmSubType && videoAlarmSubType.length == 1) {
                    // 一个参数的时候不能兼容 sql 的 in 方法 in (1,2,3)
                    videoAlarmSubType.push(-1);
                  }
                  videoAlarms =
                    searchStrucIds.length &&
                    (!c.alarmSubType ||
                      (videoAlarmSubType && videoAlarmSubType.length > 0))
                      ? await clickHouse.vcmp
                          .query(
                            `
                                 SELECT         
                                    cameraAlarm.cameraId AS cameraId,
                                    cameraAlarm.cameraName AS cameraName,
                                       cameraAlarm.cameraSerialNo AS cameraSerialNo,
                                       cameraAlarm.cameraChannelNo AS cameraChannelNo,
                                    cameraAlarm.alarmId AS alarmId,
                                    cameraAlarm.createTime AS createTime,
                                    cameraAlarm.confirmContent AS confirmContent,
                                    cameraAlarm.confirmTime AS confirmTime,
                                    cameraAlarm.autoRestore AS autoRestore,
                                    camera_status.describe AS statusDescribe,
                                    camera_kind.kind AS cameraKind,
                                    "gbCamera".online AS cameraOnline,
                                       anxinIpc.name AS anxinIpcPosition,
                                       anxinStation.id AS anxinStationId,
                                       anxinStation.name AS anxinStationName,
                                       anxinStation.factor AS anxinStationFactorId,
                                       anxinStruc.name AS strucName,
                                       anxinStruc.id AS strucId
                                    FROM (
                                       SELECT
                                          camera.id AS cameraId,
                                          camera.gb_id AS gbId,
                                          camera.name AS cameraName,
                                          camera.kind_id AS cameraKindId,
                                          camera_status_alarm.id AS alarmId,
                                          camera_status_alarm.platform AS platform,
                                          camera_status_alarm.create_time AS createTime,
                                          camera_status_alarm.status_id AS statusId,
                                          camera_status_alarm.serial_no AS cameraSerialNo,
                                          camera_status_alarm.channel_no AS cameraChannelNo,
                                          camera_status_alarm.confirm AS confirmContent,
                                          camera_status_alarm.auto_restore AS autoRestore,
                                          camera_status_alarm.confirm_time AS confirmTime
                                       FROM camera_status_alarm
                                       INNER JOIN ${anxinyun}.t_video_ipc 
                                          ON toString(${anxinyun}.t_video_ipc.channel_no) = camera_status_alarm.channel_no
                                          AND ${anxinyun}.t_video_ipc.serial_no = camera_status_alarm.serial_no
                                          AND ${anxinyun}.t_video_ipc.structure IN (${searchStrucIds.join(
                              ","
                            )})
                                       INNER JOIN camera
                                          ON camera.serial_no = camera_status_alarm.serial_no
                                          AND camera.channel_no = camera_status_alarm.channel_no
                                          AND camera.delete = false 
                                          AND camera.recycle_time is null
                                          ${
                                            c.alarmSubType
                                              ? `AND camera.kind_id in (${videoAlarmSubType.join(
                                                  ","
                                                )})`
                                              : ""
                                          }
                                       WHERE 
                                          camera_status_alarm.confirm_time IS null
                                          ${
                                            videoAlarmWhereOption.length
                                              ? ` AND ${videoAlarmWhereOption.join(
                                                  " AND "
                                                )}`
                                              : ""
                                          }
                                    ) AS cameraAlarm
                                 LEFT JOIN camera_status
                                    ON cameraAlarm.platform = camera_status.platform
                                    AND cameraAlarm.statusId = camera_status.id
                                 LEFT JOIN "gbCamera"
                                    ON "gbCamera".id = cameraAlarm.gbId 
                                 LEFT JOIN camera_kind
                                    ON camera_kind.id = cameraAlarm.cameraKindId
                                 LEFT JOIN ${anxinyun}.t_video_ipc AS anxinIpc
                                    ON toString(anxinIpc.channel_no) = cameraAlarm.cameraChannelNo
                                    AND anxinIpc.serial_no = cameraAlarm.cameraSerialNo
                                 LEFT JOIN ${anxinyun}.t_structure AS anxinStruc
                                    ON anxinStruc.id = anxinIpc.structure
                                    AND anxinStruc.id IN (${searchStrucIds.join(
                                      ","
                                    )})
                                 LEFT JOIN ${anxinyun}.t_video_ipc_station AS anxinIpcStation
                                    ON anxinIpcStation.ipc = anxinIpc.id
                                 LEFT JOIN ${anxinyun}.t_sensor AS anxinStation
                                    ON anxinStation.id = anxinIpcStation.station
                                 ORDER BY cameraAlarm.createTime DESC
                              `
                          )
                          .toPromise()
                      : [];
                  let returnD = [];
                  let positionD = {};
                  // 每个设备一个告警
                  for (let a of videoAlarms) {
                    if (positionD[a.cameraId]) {
                      let curD = returnD[positionD[a.cameraId].positionReturnD];

                      if (
                        a.strucId &&
                        !curD.struc.some((s) => s.id == a.strucId)
                      ) {
                        curD.struc.push({
                          id: a.strucId,
                          projectId: a.projectId,
                          name: a.strucName,
                        });
                      }
                      if (
                        a.anxinStationId &&
                        !curD.station.some((s) => s.id == a.anxinStationId)
                      ) {
                        curD.station.push({
                          id: a.anxinStationId,
                          name: a.anxinStationName,
                          position: a.anxinIpcPosition,
                        });
                      }
                    } else {
                      /**按监测因素 factor 筛选告警*/
                      // if (pomsStrucFactorId) {
                      //    if (!a.strucId || !a.anxinStationFactorId) {
                      //       // 当前告警没有绑定结构物或者摄像头没有绑定测点
                      //       continue
                      //    } else if (!pomsStrucFactorId[a.strucId]) {
                      //       // 推送配置没配置这个结构物
                      //       continue
                      //    } else if (!pomsStrucFactorId[a.strucId].includes(a.anxinStationFactorId)) {
                      //       // 不包含这个监测因素
                      //       continue
                      //    }
                      // }

                      let d = {
                        cameraId: a.cameraId,
                        cameraName: a.cameraName,
                        camerOnline: a.cameraOnline,
                        cameraSerialNo: a.cameraSerialNo,
                        cameraChannelNo: a.cameraChannelNo,
                        autoRestore: a.autoRestore,
                        createTime: a.createTime,
                        updateTime: a.updateTime,
                        platform: a.platform,
                        statusDescribe: a.statusDescribe,
                        alarmId: a.alarmId,
                        confirmContent: a.confirmContent,
                        confirmTime: a.confirmTime,
                        cameraKind: a.cameraKind,
                        factorId: a.anxinStationFactorId,
                        struc: [],
                        station: [],
                      };

                      if (a.strucId) {
                        d.struc.push({
                          id: a.strucId,
                          projectId: a.projectId,
                          name: a.strucName,
                        });
                      }
                      if (a.anxinStationId) {
                        d.station.push({
                          id: a.anxinStationId,
                          name: a.anxinStationName,
                          position: a.anxinIpcPosition,
                        });
                      }
                      returnD.push(d);
                      positionD[a.cameraId] = {
                        positionReturnD: returnD.length - 1,
                      };
                    }
                  }
                  videoAlarms = returnD;
                }
                if (c.alarmType.includes("app_exception")) {
                  if (c.alarmSubType) {
                    appAlarmWhereOption.type = {
                      $in: c.alarmSubType["app_exception"] || [],
                    };
                  }
                  appAlarms =
                    c.alarmSubType &&
                    c.alarmSubType["app_exception"] &&
                    c.alarmSubType["app_exception"].length
                      ? await models.AppAlarm.findAll({
                          where: appAlarmWhereOption,
                          order: [["createTime", "DESC"]],
                          include: [
                            {
                              model: models.App,
                              required: true,
                              include: [
                                {
                                  model: models.ProjectApp,
                                  where: {
                                    projectId: { $in: pomsProjectId },
                                  },
                                  required: true,
                                },
                              ],
                            },
                          ],
                        })
                      : [];
                }
                // if (c.alarmType.includes('device_exception')) {
                //    dataAlarmGroupOption.push(4)
                //    dataAlarmGroupOption.push(5)
                //    if (c.alarmSubType) dataAlarmSubType = dataAlarmSubType.concat(c.alarmSubType['device_exception'])
                // }

                /** if dataAlarmSubType 含有 47 （数据中断）则采用查询 pg 设备最新数据判断 */

                let subType47 = false;
                if (dataAlarmSubType.includes(47)) {
                  // 删掉 47
                  dataAlarmSubType = dataAlarmSubType.filter((s) => s != 47);
                  subType47 = true;
                }

                // 查数据告警 三警合一
                if (dataAlarmGroupOption.length && searchStrucIds.length) {
                  dataAlarmGroupOption.push(-1);
                  dataAlarmOption.push(
                    `AlarmGroup IN (${dataAlarmGroupOption.join(",")})`
                  );
                  let dataAlarmSubType_ = dataAlarmSubType.filter((s) => s);
                  if (c.alarmSubType && dataAlarmSubType_.length) {
                    dataAlarmSubType_.push(-1);
                    dataAlarmOption.push(
                      `AlarmGroupUnit IN (${dataAlarmSubType_.join(",")})`
                    );
                    dataAlarmOptionLocal.push(
                      `AlarmGroupUnit IN (${dataAlarmSubType_.join(",")})`
                    );
                  }

                  //   AND alarms.SourceTypeId = 2
                  //安心云
                  dataAlarms = [];
                  if (!c.alarmSubType || dataAlarmSubType_.length) {
                    //dataAlarms = await clickHouse.dataAlarm.query(`
                    //    SELECT alarms.*,
                    //       anxinStation.id,anxinStation.manual_data,anxinStation.name,anxinStation.extras,anxinStation.id,
                    //       anxinStation.combine_params,anxinStation.factor,anxinStation.portrait,anxinStation.structure,
                    //       anxinStation.labels
                    //     FROM alarms
                    //       LEFT JOIN ${anxinyun}.t_sensor
                    //          AS anxinStation
                    //             ON toString(anxinStation.id) = alarms.SourceId
                    //       WHERE
                    //          ${`State NOT IN (3, 4) AND `}
                    //          StructureId IN (${searchStrucIds.join(',')})
                    //       AND (Project IS null OR Project='')
                    //          ${dataAlarmOption.length ? ' AND ' + dataAlarmOption.join(' AND ') : ''}
                    //       ORDER BY StartTime DESC
                    // `).toPromise()

                    let dataAlarms_ = await clickHouse.dataAlarm
                      .query(
                        `
                              SELECT *
                              FROM alarms
                              WHERE 
                                 State NOT IN (3, 4) AND
                                 StructureId IN (${searchStrucIds.join(",")})
                              AND (Project IS null OR Project='')
                                 ${
                                   dataAlarmOption.length
                                     ? " AND " + dataAlarmOption.join(" AND ")
                                     : ""
                                 }
                                 AND AlarmId NOT LIKE 'zd:202407%' AND AlarmId NOT LIKE 'zd:202408%' AND AlarmId NOT LIKE 'zd:202409%' AND AlarmId NOT LIKE 'zd:202410%'
                              ORDER BY StartTime DESC
                           `
                      )
                      .toPromise();

                    let sourceIds = [
                      ...new Set(
                        dataAlarms_
                          .filter((d) => !isNaN(d.SourceId))
                          .map((d) => d.SourceId)
                      ),
                    ];
                    let anxinStation = sourceIds.length
                      ? await clickHouse.anxinyun
                          .query(
                            `
                              SELECT id,manual_data,name,extras,combine_params,factor,portrait,structure,labels
                              FROM t_sensor
                              WHERE id IN (${sourceIds.join(",")})
                           `
                          )
                          .toPromise()
                      : [];

                    for (let alarm of dataAlarms_) {
                      let corStation = anxinStation.find(
                        (s) => s.id == alarm.SourceId
                      );
                      //将当前结构物的传感器信息合并到告警中
                      alarm = { ...alarm, ...(corStation || {}) };
                    }
                    dataAlarms = dataAlarms_;
                  }

                  //本地化
                  let dataAlarmsLocal = [];
                  if (!c.alarmSubType || dataAlarmSubType_.length) {
                    // dataAlarmsLocal = await clickHouse.dataAlarm.query(`
                    //    SELECT *
                    //    FROM alarms
                    //       LEFT JOIN sensors
                    //          AS anxinStation
                    //             ON  anxinStation.ID = alarms.SourceId
                    //             AND anxinStation.IsDeleted = false
                    //       WHERE
                    //          ${`State NOT IN (3, 4) AND `}
                    //          PlatformStructureId IN (${searchStrucIds.join(',')})
                    //          ${dataAlarmOption.length ? ' AND ' + dataAlarmOption.join(' AND ') : ''}
                    //          AND Project IS NOT null
                    //       ORDER BY StartTime DESC
                    // `).toPromise()

                    let anxinStation = await clickHouse.dataAlarm
                      .query(
                        `
                              SELECT *
                              FROM sensors
                              WHERE IsDeleted = false
                                 AND PlatformStructureId IN (${searchStrucIds.join(
                                   ","
                                 )})
                           `
                      )
                      .toPromise();

                    let sourceIds = [
                      ...new Set(anxinStation.map((d) => `'${d.ID}'`)),
                    ];

                    let dataAlarmsLocal_ = sourceIds.length
                      ? await clickHouse.dataAlarm
                          .query(
                            `
                              SELECT *
                              FROM alarms final
                                 WHERE 
                                    ${`State NOT IN (3, 4)`}
                                    AND SourceId IN (${sourceIds.join(",")})
                                    ${
                                      dataAlarmOption.length
                                        ? " AND " +
                                          dataAlarmOption.join(" AND ")
                                        : ""
                                    }
                                    AND Project IS NOT null
                                    AND AlarmId NOT LIKE 'zd:202407%' AND AlarmId NOT LIKE 'zd:202408%' AND AlarmId NOT LIKE 'zd:202409%' AND AlarmId NOT LIKE 'zd:202410%'
                                 ORDER BY StartTime DESC 
                           `
                          )
                          .toPromise()
                      : [];

                    let nextDataAlarmsLocal = [];
                    for (let alarm of dataAlarmsLocal_) {
                      let corStation = anxinStation.find(
                        (s) => s.ID == alarm.SourceId
                      );
                      if (corStation) {
                        nextDataAlarmsLocal.push({
                          ...alarm,
                          ...(corStation || {}),
                        });
                      }
                    }
                    dataAlarmsLocal = nextDataAlarmsLocal;
                  }

                  //合并本地化和安心云的告警
                  dataAlarms = [...dataAlarms, ...dataAlarmsLocal];
                  pLog("合并的告警列表（安心云+本地）", dataAlarms.length);
                  pLog("合并的告警列表（安心云+本地）", dataAlarmsLocal.length);
                }

                let dataAlarmTitle2 = [
                  {
                    n: "项目",
                    k: "",
                    v: pepProjectName,
                  },
                  {
                    n: "结构物",
                    k: "",
                    f: (d) => {
                      return (strucMap[d.StructureId] || { name: "" }).name;
                      // return (strucListRes.find(s => s.id == d.StructureId) || { name: '' }).name
                    },
                  },
                  {
                    n: "告警源名称",
                    k: "SourceName",
                  },
                  {
                    n: "告警源类型",
                    k: "",
                    f: (d) => {
                      switch (d.SourceTypeId) {
                        case 0:
                          return "DTU";
                        case 1:
                          return "传感器";
                        case 2:
                          return "测点";
                        default:
                          return "";
                      }
                    },
                  },
                  {
                    n: "告警信息",
                    k: "AlarmContent",
                  },
                  {
                    n: "合理值",
                    k: "",
                    f: (d) => (d.AlarmTypeCode == 3018 ? "是" : "否"),
                  },
                  {
                    n: "告警等级(当前)",
                    k: "",
                    f: (d) => {
                      switch (d.CurrentLevel) {
                        case 1:
                          return "一级";
                        case 2:
                          return "二级";
                        case 3:
                          return "三级";
                        default:
                          return "";
                      }
                    },
                  },
                  {
                    n: "持续时间",
                    k: "",
                    f: (d) => {
                      let str = "";
                      if (d.StartTime) {
                        str = calcMinute2DHM(
                          moment().diff(moment(d.StartTime), "minutes")
                        );
                      }
                      return str ? "超过" + str : "";
                    },
                  },
                ];

                let dataAlarmTitle = [
                  {
                    n: "项目",
                    k: "",
                    v: pepProjectName,
                  },
                  {
                    n: "结构物",
                    k: "",
                    f: (d) => {
                      return (strucMap[d.StructureId] || { name: "" }).name;
                      // return (strucListRes.find(s => s.id == d.StructureId) || { name: '' }).name
                    },
                  },
                  {
                    n: "告警源名称",
                    k: "SourceName",
                  },
                  {
                    n: "告警源类型",
                    k: "",
                    f: (d) => {
                      switch (d.SourceTypeId) {
                        case 0:
                          return "DTU";
                        case 1:
                          return "传感器";
                        case 2:
                          return "测点";
                        default:
                          return "";
                      }
                    },
                  },
                  {
                    n: "告警信息",
                    k: "AlarmContent",
                  },
                  {
                    n: "告警等级(当前)",
                    k: "",
                    f: (d) => {
                      switch (d.CurrentLevel) {
                        case 1:
                          return "一级";
                        case 2:
                          return "二级";
                        case 3:
                          return "三级";
                        default:
                          return "";
                      }
                    },
                  },
                  {
                    n: "持续时间",
                    k: "",
                    f: (d) => {
                      let str = "";
                      if (d.StartTime) {
                        str = calcMinute2DHM(
                          moment().diff(moment(d.StartTime), "minutes")
                        );
                      }
                      return str ? "超过" + str : "";
                    },
                  },
                ];

                // let dataLnterruptTitle = [{
                //    n: '项目',
                //    k: '',
                //    v: pepProjectName
                // }, {
                //    n: '结构物',
                //    k: '',
                //    f: (d) => {
                //       return (strucMap[d.StructureId] || { name: '' }).name
                //       // return (strucListRes.find(s => s.id == d.StructureId) || { name: '' }).name
                //    }
                // }, {
                //    n: '监测因素(中断比例)',
                //    k: '',
                //    f: (d) => {
                //       // d.factor.join('<b/>')
                //       // console.log(21211231131,d.factor);
                //       let data = []
                //       d.factor.map(f => data.push(f.name + '(' + f.breakData + '/' + f.sum + ')'))
                //       return data.join('<br/>')
                //    }
                // }, {
                //    n: '告警源名称',
                //    k: 'SourceName'
                // }, {
                //    n: '告警源类型',
                //    k: '',
                //    f: (d) => {
                //       switch (d.SourceTypeId) {
                //          case 0:
                //             return 'DTU'
                //          case 1:
                //             return '传感器'
                //          case 2:
                //             return '测点'
                //          default:
                //             return ''
                //       }
                //    }
                // }, {
                //    n: '告警信息',
                //    k: 'AlarmContent'
                // }, {
                //    n: '告警等级(当前)',
                //    k: '',
                //    f: (d) => {
                //       switch (d.CurrentLevel) {
                //          case 1:
                //             return '一级'
                //          case 2:
                //             return '二级'
                //          case 3:
                //             return '三级'
                //          default:
                //             return ''
                //       }
                //    }
                // }, {
                //    n: '持续时间',
                //    k: '',
                //    f: (d) => {
                // let str = ''
                // if (d.StartTime) {
                //    str = calcMinute2DHM(moment().diff(moment(d.StartTime), 'minutes'))
                // }
                // return str ?
                //    '超过' + str : ''
                //    }
                // },
                // {
                //    n: '中断时间',
                //    k: '',
                //    f: (d) => {
                //       return d.StartTime ?
                //          moment(d.StartTime).format('YYYY-MM-DD HH:mm:ss') : ''
                //    }
                // },]

                let dataLnterruptTitle = [
                  {
                    n: "项目",
                    k: "name",
                    // v: pepProjectName
                  },
                  {
                    n: "结构物",
                    k: "Structure",
                    // f: (d) => {
                    //    return (strucMap[d.StructureId] || { name: '' }).name
                    //    // return (strucListRes.find(s => s.id == d.StructureId) || { name: '' }).name
                    // }
                  },
                  {
                    n: "监测因素(中断比例)",
                    k: "factor",
                    // f: (d) => {
                    //    // d.factor.join('<b/>')
                    //    let data = []
                    //    d.factor.map(f => data.push(f.name + '(' + f.breakData + '/' + f.sum + ')'))
                    //    return data.join('<br/>')
                    // }
                  },
                  {
                    n: "告警源",
                    k: "SourceName",
                  },
                  {
                    n: "中断时间",
                    k: "",
                    f: (d) => {
                      return d.StartTime
                        ? d.StartTime == "--"
                          ? "--"
                          : moment(d.StartTime).format("YYYY-MM-DD HH:mm:ss")
                        : "";
                    },
                  },
                ];

                let videoAlarmTitle = [
                  {
                    n: "项目",
                    k: "",
                    v: pepProjectName,
                  },
                  {
                    n: "结构物",
                    k: "",
                    f: (d) => {
                      return d.struc.map((ds) => ds.name).join("、");
                    },
                  },
                  {
                    n: "告警源名称",
                    k: "cameraName",
                  },
                  {
                    n: "告警源类型",
                    k: "cameraKind",
                  },
                  {
                    n: "序列号",
                    k: "cameraSerialNo",
                  },
                  {
                    n: "通道号",
                    k: "cameraChannelNo",
                  },
                  {
                    n: "测点",
                    k: "",
                    f: (d) => {
                      return d.station
                        ? d.station.map((ds) => ds.name).join("、")
                        : "";
                    },
                  },
                  {
                    n: "位置",
                    k: "",
                    f: (d) => {
                      return d.station
                        ? d.station.map((ds) => ds.position).join("、")
                        : "";
                    },
                  },
                  {
                    n: "告警信息",
                    k: "statusDescribe",
                  },
                  {
                    n: "持续时间",
                    k: "",
                    f: (d) => {
                      let str = "";
                      if (d.createTime) {
                        str = calcMinute2DHM(
                          moment().diff(moment(d.createTime), "minutes")
                        );
                      }
                      return str ? "超过" + str : "";
                    },
                  },
                ];

                let appAlarmTitle = [
                  {
                    n: "项目",
                    k: "",
                    v: pepProjectName,
                  },
                  {
                    n: "应用名称",
                    k: "",
                    f: (d) => {
                      return d.app ? d.app.name : "";
                    },
                  },
                  {
                    n: "异常类型",
                    k: "",
                    f: (d) => {
                      if (d.type == "element") {
                        return "元素异常";
                      } else if (d.type == "apiError") {
                        return "接口报错";
                      } else {
                        return "";
                      }
                    },
                  },
                  {
                    n: "异常信息",
                    k: "alarmContent",
                  },
                  {
                    n: "URL地址",
                    k: "cameraName",
                    f: (d) => {
                      return d.app && d.app.url
                        ? `<a href="${d.app.url}">${d.app.url}</a>`
                        : "";
                    },
                  },
                  {
                    n: "持续时间",
                    k: "",
                    f: (d) => {
                      let str = "";
                      if (d.createTime) {
                        str = calcMinute2DHM(
                          moment().diff(moment(d.createTime), "minutes")
                        );
                      }
                      return str ? "超过" + str : "";
                    },
                  },
                ];

                let ifEmailSend = false;
                let tableTitlePostfix = ",详情如下:";

                function packageTableTitle(titleArr) {
                  let tableTitle = "<tr>";
                  for (let t of titleArr) {
                    tableTitle += `<th style="background-color:#8faadc; color:#fff; text-align:left">${t.n}</th>`;
                  }
                  tableTitle += "</tr>";
                  return tableTitle;
                }
                function packageTableData({ data, titleArr }) {
                  let tableData = "<tr>";
                  for (let t of titleArr) {
                    if (t.v) {
                      tableData += `<td>${t.v || ""}</td>`;
                    } else if (t.f) {
                      tableData += `<td>${t.f(data) || ""}</td>`;
                    } else if (t.k) {
                      tableData += `<td>${data[t.k] || ""}</td>`;
                    } else {
                      tableData += `<td></td>`;
                    }
                  }
                  tableData += "</tr>";
                  return tableData;
                }

                let apMergeDeVeAnxinProjectId_ = apMergeDeVeAnxinProjectId
                  ? apMergeDeVeAnxinProjectId.split(",")
                  : [];
                let apMergeDeVeAlarms = {
                  // 结构物id :{
                  //    data_exception 数据异常告警:[],
                  //    video_exception 视频异常告警:[]
                  // }
                };

                let dataAlarmG1 = [];
                let dataAlarmG2 = [];
                let dataAlarmG3 = [];
                let dataAlarmG45 = [];
                let deviceStatistic = new Set();
                let dataAlarmDetails = [];

                pLog(`查得数据告警 ${dataAlarms.length} 条`);
                // pLog(dataAlarms);

                dataAlarms = await alarmfilterDone(dataAlarms);

                if (dataAlarms.length) {
                  const alarmIds = dataAlarms.map(
                    (ar) => "'" + ar.AlarmId + "'"
                  );
                  let lengthLength = 0;
                  while (lengthLength >= 0) {
                    let AlarmId = alarmIds.slice(
                      lengthLength,
                      lengthLength + 3000
                    );
                    let AlarmDetails =
                      (await clickHouse.dataAlarm
                        .query(
                          `
                              SELECT * FROM alarm_details 
                                 WHERE AlarmId IN (${AlarmId.join(",")}, -1)
                                 AND AlarmState = 0
                           `
                        )
                        .toPromise()) || [];

                    dataAlarmDetails = [...dataAlarmDetails, ...AlarmDetails];
                    lengthLength = lengthLength + 3000;
                    if (AlarmId.length < 3000) {
                      lengthLength = -1;
                    }
                  }
                }

                pLog(`查得数据告警详情数据  ${dataAlarmDetails.length} 条`);

                let deviceIds = new Set();
                for (let d of dataAlarms) {
                  d = { ...d, stationId: d.id };

                  /** 按监测因素筛选 且为测点告警 */
                  // if (pomsStrucFactorId && d.SourceTypeId == 2) {
                  //    // 做了监测因素筛选 且当前告警有监测因素
                  //    if (!d.factor || d.factor == 0) {
                  //       // 监测因素不对劲
                  //       continue
                  //    } else if (!d.StructureId) {
                  //       // 当前告警没有绑定结构物
                  //       continue
                  //    } else if (!pomsStrucFactorId[d.StructureId]) {
                  //       // 推送配置没配置这个结构物
                  //       continue
                  //    } else if (!pomsStrucFactorId[d.StructureId].includes(d.factor)) {
                  //       // 不包含这个监测因素
                  //       continue
                  //    }
                  // }

                  if (d.AlarmGroup == 1) {
                    // if (d.StructureId) {
                    //    //查询结构物的监测因素
                    //    const factorData = await clickHouse.anxinyun.query(
                    //       `
                    //       SELECT
                    //       t_structure_factor.structure AS structureId,
                    //       t_factor.name AS name,
                    //       t_factor.id AS id
                    //       FROM
                    //           t_structure_factor
                    //       LEFT JOIN t_factor
                    //          ON t_factor.id = t_structure_factor.factor
                    //       WHERE
                    //       t_structure_factor.structure = (${d.StructureId})
                    //    `
                    //    ).toPromise() || []
                    //    let factorId = factorData.map(f => f.id)
                    //    //查询结构物对应的设备
                    //    const equipment = await clickHouse.anxinyun.query(
                    //       `
                    //         SELECT
                    //         t_sensor.id AS id,
                    //         t_sensor.name AS name,
                    //         t_sensor.structure AS structureId,
                    //         t_sensor.factor AS factorId,
                    //         t_device_sensor.iota_device_id AS iotaDeviceId
                    //         FROM
                    //             t_sensor
                    //         LEFT JOIN t_device_sensor
                    //            ON t_device_sensor.sensor = t_sensor.id
                    //         WHERE
                    //          t_sensor.structure = (${d.StructureId})
                    //          AND
                    //          t_sensor.factor IN (${factorId.join(',')})
                    //      `
                    //    ).toPromise() || []
                    //    const alarmDatas = await clickHouse.dataAlarm.query(
                    //       `
                    //         SELECT
                    //         alarms.AlarmId AS alarmId,
                    //         alarms.State AS state,
                    //         alarms.AlarmGroup AS alarmGroup,
                    //         alarms.SourceId AS sourceId
                    //         FROM
                    //         alarms
                    //         WHERE
                    //          alarms.StructureId = (${d.StructureId})
                    //          AND
                    //          alarms.AlarmGroup = 1
                    //          AND
                    //          alarms.State < 3
                    //      `
                    //    ).toPromise() || []
                    //    equipment.map(r => {
                    //       alarmDatas.map(u => {
                    //          if (r.iotaDeviceId == u.sourceId) {
                    //             r.sourceId = u.sourceId
                    //          }
                    //       })
                    //    })
                    //    d.factor = []
                    //    factorData.map(c => {
                    //       let breakData = equipment.filter(m => (m.factorId == c.id && m.sourceId))
                    //       d.factor.push({
                    //          name: c.name,
                    //          sum: equipment.filter(d => d.factorId == c.id).length,
                    //          breakData: breakData.length
                    //       })
                    //       d.factors = equipment.filter(d => d.factorId == c.id)
                    //       d.breakData = breakData
                    //    })
                    // }
                    // dataAlarmG1.push(d)
                  } else if (d.AlarmGroup == 2) {
                    dataAlarmG2.push(d);
                    /** 注1
                     *    根据指定的安心云结构物把数据异常和视频告警合并在一起的代码
                     *    还要指定是扬尘设备
                     *    以测点关联
                     */
                    if (
                      apMergeDeVeAnxinProjectId_.length &&
                      d.SourceName &&
                      d.SourceName.includes("扬尘") &&
                      apMergeDeVeAnxinProjectId_.some(
                        (pid) =>
                          pid == (strucMap[d.StructureId] || {}).projectId
                      )
                    ) {
                      // SourceTypeId   0: 'DTU' / 1: '传感器' / 2: '测点'

                      if (d.SourceTypeId != 2) {
                        deviceIds.add(d.SourceId);
                      }
                      if (apMergeDeVeAlarms[d.StructureId]) {
                        apMergeDeVeAlarms[d.StructureId].data_exception.push(d);
                      } else {
                        apMergeDeVeAlarms[d.StructureId] = {
                          data_exception: [d],
                          video_exception: [],
                        };
                      }
                    }
                    // 注1 END
                  } else if (d.AlarmGroup == 3) {
                    /** 按监测因项 factor-item 的名称筛选*/
                    if (pomsStrucFactorId) {
                      // 兼容之前的设置 有这个信息才进行判断
                      if (!d.StructureId) {
                        // 当前告警没有绑定结构物
                        continue;
                      } else if (!pomsStrucFactorId[d.StructureId]) {
                        // 推送配置没配置这个结构物
                        continue;
                      } else {
                        let corDetail = dataAlarmDetails.find(
                          (da) => da.AlarmId == d.AlarmId
                        );
                        // if (proDebug) {
                        //    console.log(`相应告警详情(策略命中):`, corDetail);
                        // }
                        if (corDetail) {
                          // 判断告警详情信息里有没有监测项关键字
                          if (
                            !pomsStrucFactorId[d.StructureId].some(
                              (factorItemName) => {
                                return corDetail.Content.includes(
                                  factorItemName
                                );
                              }
                            )
                          ) {
                            continue;
                          }
                        } else {
                          continue;
                        }
                      }
                    }
                    dataAlarmG2.push(d);
                  } else if (d.AlarmGroup == 4 || d.AlarmGroup == 5) {
                    // dataAlarmG45.push(d)
                  }

                  deviceStatistic.add(d.SourceId);
                }
                // if (c.tactics == 'abnormal_rate') {
                //    pLog(`异常设备数量 - ${deviceStatistic.size}`)
                //    pLog(`异常视频告警数量 - ${videoAlarms.length}`)
                //    let abnormalDeviceCount = deviceStatistic.size + videoAlarms.length
                //    let rate =(parseInt(deviceCount) + parseInt(cameraCount)) ?
                //     (abnormalDeviceCount / (parseInt(deviceCount) + parseInt(cameraCount))) * 100:0.0
                //    pLog(`异常比率 ${rate} 设定值 ${deviceProportion}`)
                //    // if (rate < parseFloat(deviceProportion)) {
                //    //    // 设备异常率低于设定值
                //    //    pLog(`异常设备率低于设定值`)
                //    //    continue
                //    // }

                //    emailSubTitle = emailSubTitle
                //       .replace('--%', rate.toFixed(1) + '%')
                //       .replace('**', abnormalDeviceCount.toFixed(0))
                // }
                // 注1
                if (apMergeDeVeAnxinProjectId_.length) {
                  for (let a of videoAlarms) {
                    let existStruc = a.struc.find(
                      (asc) => apMergeDeVeAlarms[asc.id]
                    );
                    if (existStruc) {
                      apMergeDeVeAlarms[existStruc.id].video_exception.push(a);
                    }
                  }
                }

                // 注1 END
                let html = `
                           <html>
                              <head>
                                 <meta charset="utf-8">
                                    <style>
                                       table {
                                          border-collapse:collapse;border-spacing:0;border-left:1px solid #888;border-top:1px solid #888;
                                       }
                                       th,td{
                                          border-right:1px solid #888;border-bottom:1px solid #888;padding:5px 15px;
                                       }
                                       th{
                                          font-weight:bold;
                                       }
                                    </style>
                              </head>
                           </html> 
                           <h5 style="margin-bottom:12px">${emailSubTitle}</h5>
                        `;

                // let dataAlarmG145Data = dataAlarms.filter(a => { //! 为啥有 1 4 5 就是中断
                //    return a.AlarmGroup == 1
                //       || a.AlarmGroup == 4
                //       || a.AlarmGroup == 5
                // })
                // pLog('数据中断', dataAlarmG145Data.length)

                if (
                  // dataAlarmG145Data.length
                  // dataAlarmGroupOption.some(dg => [1, 4, 5].includes(dg))
                  subType47
                ) {
                  //安心云项目是structureId数组
                  // let dataAlarmG1StructureId = new Set()
                  // //本地化项目structureId数组
                  // let dataAlarmStructureId = new Set()

                  // dataAlarmG145Data.map(c => {
                  //    if (c.Project) {
                  //       dataAlarmStructureId.add(c.StructureId)
                  //    } else {
                  //       dataAlarmG1StructureId.add(c.StructureId)
                  //    }
                  // })

                  // 2024-12-18 中断数据推送修改
                  let dataAlarmG1StructureId = new Set(strucAnxinId);
                  let dataAlarmStructureId = new Set(strucLocalId);

                  pLog("安心云项目结构物id", dataAlarmG1StructureId);
                  pLog("本地化项目结构物id", dataAlarmStructureId);
                  //查询结构物的监测因素(安心云)
                  let factorData = dataAlarmG1StructureId.size
                    ? (await clickHouse.anxinyun
                        .query(
                          `  
                              SELECT 
                                 t_structure_factor.structure AS structureId,
                                 t_factor.name AS name,
                                 t_factor.id AS id
                              FROM 
                                 t_structure_factor
                              LEFT JOIN t_factor
                                 ON t_factor.id = t_structure_factor.factor
                              WHERE 
                                 t_structure_factor.structure IN (${[
                                   ...dataAlarmG1StructureId,
                                   -1,
                                 ].join(",")})
                          `
                        )
                        .toPromise()) || []
                    : [];
                  //查询结构物的监测因素(本地化项目)
                  let factorDataLocal =
                    (await clickHouse.dataAlarm
                      .query(
                        `SELECT
                                 distinct SafetyFactorTypeId AS id,
                                 PlatformStructureId AS structureId,
                                 SafetyFactorTypeName AS name
                           FROM 
                             sensors 
                           WHERE sensors.PlatformStructureId IN (${[
                             ...dataAlarmStructureId,
                             -1,
                             -2,
                           ].join(",")})
                              AND sensors.IsDeleted=false`
                      )
                      .toPromise()) || [];
                  pLog("安心云项目监测因素", factorData.length);
                  pLog("本地化项目监测因素", factorDataLocal);

                  //安心云的factorId
                  let factorId = factorData.map((f) => f.id);
                  //本地化的factorId
                  let factorIdLocal = factorDataLocal.map((f) => f.id);
                  pLog("安心云+本地监测因素", factorData.length);

                  factorData = [...factorData, ...factorDataLocal];
                  //查询结构物对应的测点(安心云)
                  // ! 测点
                  let equipment =
                    (await clickHouse.anxinyun
                      .query(
                        ` 
                           SELECT 
                              t_sensor.id AS id,
                              t_sensor.name AS name,
                              t_sensor.structure AS structureId,
                              t_sensor.factor AS factorId,
                              t_device_sensor.iota_device_id AS iotaDeviceId,
                              Device.name AS deviceName
                           FROM 
                              t_sensor
                                 LEFT JOIN t_device_sensor
                                    ON t_device_sensor.sensor = t_sensor.id
                                 LEFT JOIN ${iota}.Device
                                    ON Device.id = toString(t_device_sensor.iota_device_id)
                              WHERE 
                              t_sensor.structure IN (${
                                [...dataAlarmG1StructureId, -1].join(",")
                                // 3025
                              })
                              AND
                              t_sensor.factor IN (${[...factorId, -1].join(
                                ","
                              )})
                            `
                      )
                      .toPromise()) || [];
                  //查询结构物对应的测点(本地化)
                  let equipmentLocal =
                    (await clickHouse.dataAlarm
                      .query(
                        ` SELECT 
                                 ID AS id,
                                 SensorLocationDescription AS name,
                                 PlatformStructureId AS structureId,
                                 SafetyFactorTypeId AS factorId,
                                 ID AS iotaDeviceId,
                                 ProductName AS deviceName
                              FROM sensors
                                 WHERE sensors.PlatformStructureId IN (${[
                                   ...dataAlarmStructureId,
                                   -1,
                                 ].join(",")})
                                 AND sensors.SafetyFactorTypeId IN (${[
                                   ...factorIdLocal,
                                   -1,
                                 ].join(",")}) 
                                 AND sensors.IsDeleted=false
                        `
                      )
                      .toPromise()) || [];
                  pLog("安心云项目测点", equipment.length);
                  pLog("本地化项目测点", equipmentLocal);
                  //合并本地化数据+安心云数据
                  equipment = [...equipment, ...equipmentLocal];
                  pLog("本地化+安心云测点", equipment.length);

                  // let alarmDataRes = await clickHouse.dataAlarm.query(
                  //    `
                  //       SELECT
                  //          alarms.AlarmId AS alarmId,
                  //          alarms.State AS state,
                  //          alarms.AlarmGroup AS alarmGroup,
                  //          alarms.SourceId AS sourceId,
                  //          alarms.StartTime AS StartTime,
                  //          alarms.SourceName AS SourceName,
                  //          alarms.AlarmCode AS AlarmCode,
                  //          alarms.SourceTypeId AS SourceTypeId,
                  //          alarms.StructureId AS StructureId,
                  //          alarms.SubDevices AS SubDevices
                  //       FROM
                  //          alarms
                  //       WHERE
                  //          AlarmGroup IN (1,4,5)
                  //          AND alarms.StructureId In (${[...dataAlarmG1StructureId, ...dataAlarmStructureId, -1].join(',')
                  //    // 3025
                  //    })
                  //       AND alarms.State < 3
                  //       ${dataAlarmOptionLocal.length ? ' AND ' + dataAlarmOptionLocal.join(' AND ') : ''}
                  //       AND alarms.AlarmId NOT LIKE 'zd:202407%' AND alarms.AlarmId NOT LIKE 'zd:202408%' AND alarms.AlarmId NOT LIKE 'zd:202409%' AND alarms.AlarmId NOT LIKE 'zd:202410%'
                  //     `
                  // ).toPromise() || []
                  // alarmDataRes = await alarmfilterDone(alarmDataRes, 'alarmId')

                  let alarmDatas = [];
                  // for (let alarms of alarmDataRes) {
                  //    if (alarms.SubDevices && alarms.SubDevices.length) {
                  //       pLog('拆解 SubDevices' + alarms.alarmId + ' ' + alarms.SubDevices.length + '个')
                  //       for (let SubDevice of alarms.SubDevices) {
                  //          alarmDatas.push({
                  //             ...alarms,
                  //             alarmId: SubDevice,
                  //             sourceId: SubDevice,
                  //             below: true
                  //          })
                  //       }
                  //    } else {
                  //       alarmDatas.push(alarms)
                  //    }
                  // }

                  // 2024-12-18 中断数据推送修改 查所有12个小时外的数据
                  let equipmentIds = equipment.map((e) => `${e.id}`);
                  let axyEquipmentIds = [];
                  equipment.forEach((e) => {
                    if (!(e.id + "").includes(":")) {
                      axyEquipmentIds.push(`axy4_0:${e.id}`);
                    }
                  });
                  let hoursIntervalAgo = moment().subtract(
                    parseInt(interval),
                    "minute"
                  ); //.format('YYYY-MM-DD HH:mm:ss')

                  let offData = [];
                  if (isDev) {
                    offData =
                      (await clickHouse.dataAlarm
                        .query(
                          ` select sensor_id sensorId,collect_time collectTime,value from poms.latest_theme
                                 where sensorId in (${[
                                   ...equipmentIds,
                                   ...axyEquipmentIds,
                                 ]
                                   .map((d) => `'${d}'`)
                                   .join(",")})`
                        )
                        .toPromise()) || [];
                  } else {
                    offData = await models.LatestTheme.findAll({
                      where: {
                        sensorId: {
                          $in: [...equipmentIds, ...axyEquipmentIds],
                        },
                        // sensorId: { $in: [...equipmentIds] },

                        // collectTime: { $lte: hoursIntervalAgo }
                      },
                    });
                  }

                  // 构造虚假的 alarmDatas 以适应下面的代码
                  // alarmDatas = offData.map(off => {
                  //    let corEquip = equipment.find(eq => eq.id == off.sensorId)
                  //    return {
                  //       alarmId: 'sensor_' + off.sensorId,
                  //       state: 2,
                  //       alarmGroup: '',
                  //       sourceId: off.sensorId,
                  //       StartTime: off.collectTime,
                  //       SourceName: corEquip ? corEquip.name : '',
                  //       AlarmCode: '',
                  //       SourceTypeId: '',
                  //       StructureId: corEquip ? corEquip.structureId : '',
                  //       below: true,
                  //    }
                  // })

                  for (let corEquip of equipment) {
                    // 兼顾没有数据的离线设备
                    let corOffData = offData.find((off) => {
                      let sensorId = off.sensorId.split(":")[1];
                      //corEquip.id如果是数字不处理,如果
                      return (
                        sensorId == corEquip.id || off.sensorId == corEquip.id
                      );
                    });
                    // let corOffData = offData.find(off => {
                    //    return off.sensorId == corEquip.id
                    // })
                    if (corOffData) {
                      if (
                        moment(corOffData.collectTime).isBefore(
                          hoursIntervalAgo
                        )
                      ) {
                        // 离线
                        alarmDatas.push({
                          alarmId: "sensor_" + corOffData.sensorId,
                          state: 2,
                          alarmGroup: "",
                          sourceId: corOffData.sensorId,
                          StartTime: corOffData.collectTime,
                          SourceName: corEquip.name,
                          AlarmCode: "",
                          SourceTypeId: "",
                          StructureId: corEquip.structureId,
                          below: true,
                          deviceId: corEquip.iotaDeviceId,
                        });
                      }
                    } else {
                      // 无数据 判断为离线
                      alarmDatas.push({
                        alarmId: "equ_" + corEquip.id,
                        state: 2,
                        alarmGroup: "",
                        sourceId: corEquip.id,
                        StartTime: "--",
                        SourceName: corEquip.name,
                        AlarmCode: "",
                        SourceTypeId: "",
                        StructureId: corEquip.structureId,
                        below: true,
                        deviceId: corEquip.iotaDeviceId,
                      });
                    }
                  }

                  // 为设备分配自己产生的告警数据
                  let matchedAlarmIds = [];
                  // 这一步能被分配的告警应该也能最终体现在邮件中

                  let deviceRepeatMap = {};

                  equipment.map((equip) => {
                    equip.alarmDatas = [];
                    alarmDatas.map((r) => {
                      // !!! 这里这里 经常这两个id对不上导致告警没有推送
                      if (
                        r.sourceId == equip.iotaDeviceId ||
                        r.sourceId == equip.id
                      ) {
                        if (!deviceRepeatMap[r.sourceId]) {
                          // 没有这个deviceId则不重复
                          deviceRepeatMap[r.sourceId] = true;
                          equip.alarmDatas.push({
                            ...r,
                            // 可能有的设备绑定了不同的测点 所以这里展示测点名称
                            SourceName:
                              r.SubDevices && r.SubDevices.length
                                ? equip.deviceName
                                : r.SourceName,
                          });
                        }
                        matchedAlarmIds.push(r.alarmId);
                      }
                    });
                  });

                  // 为监测因素分配绑定的设备
                  factorData.map((factor) => {
                    factor.devices = [];
                    equipment.map((f) => {
                      if (
                        factor.id == f.factorId &&
                        factor.structureId == f.structureId
                      ) {
                        factor.devices.push({ ...f });
                      }
                    });
                    if (strucMap[factor.structureId]) {
                      // 并为 strucMap 补充 factor 监测因素信息
                      strucMap[factor.structureId].factor.push({ ...factor });
                    }
                  });

                  let projectList = [];
                  for (let key in strucMap) {
                    if (strucMap[key].factor.length > 0) {
                      // 如果有监测因素信息
                      // 存结构物信息至 projectList
                      projectList.push(strucMap[key]);
                    }
                  }

                  if (true || projectList.length) {
                    pepProject_name.map((s) => {
                      s.projects = [];
                      projectList.map((f) => {
                        // 匹配 pepProject_name 中的项目
                        // 匹配到则向 projects 中插入 f 也就是结构物信息 + 项目的id
                        if (s.anxinProjectId.includes(f.projectId)) {
                          s.projects.push(f);
                        }
                      });
                    });
                  }

                  pLog("数据组合" + JSON.stringify(pepProject_name));

                  // 上面的代码自内而外构建数据
                  // 下面的逻辑自外向内！！！

                  // 处理那些没有被匹配到的告警信息
                  // 将设备没有绑定到测点的告警也推出去

                  let unmatchSourceId = [];
                  alarmDatas.forEach((d) => {
                    if (!matchedAlarmIds.includes(d.alarmId)) {
                      if (
                        d.sourceId &&
                        (d.sourceId + "").startsWith("axy4_0:")
                      ) {
                        d.sourceId = d.sourceId.split(":")[1];
                      }
                      unmatchSourceId.push(d.sourceId);
                    }
                  });

                  // const alarmDaRes = await clickHouse.iot.query(
                  //    `
                  //       SELECT
                  //        Device.id AS id,
                  //        Device.name AS name
                  //        FROM
                  //          Device
                  //       WHERE
                  //        Device.id IN (${[...unmatchSourceId, -1].map(d => `'${d}'`).join(',')}) `
                  // ).toPromise() || []

                  let alarmDaRes = [];
                  for (let i = 0; i < unmatchSourceId.length; i += 1000) {
                    let curRes =
                      (await clickHouse.iot
                        .query(
                          `  
                                 SELECT 
                                 Device.id AS id,
                                 Device.name AS name,
                                 anxinyun.t_device_sensor.sensor AS sensorId
                                 FROM 
                                    Device,
                                    anxinyun.t_device_sensor
                                 WHERE 
                                    Device.id=anxinyun.t_device_sensor.iota_device_id 
                                    AND anxinyun.t_device_sensor.sensor IN (${unmatchSourceId
                                      .slice(i, i + 1000)
                                      .map((d) => `'${d}'`)
                                      .join(",")}) `
                        )
                        .toPromise()) || [];
                    alarmDaRes = [...alarmDaRes, ...curRes];
                  }

                  copyPepProjectName = JSON.parse(
                    JSON.stringify(pepProject_name)
                  );
                  for (let a of alarmDatas) {
                    if (!matchedAlarmIds.includes(a.alarmId)) {
                      let deviceName =
                        (alarmDaRes.find((d) => d.sensorId == a.sourceId) || {})
                          .name ||
                        (
                          localSensor.find((d) => d.SensorId == a.sourceId) ||
                          {}
                        ).SensorLocationDescription;
                      // pLog('未匹配到的告警 ' + a.alarmId)
                      let curStruc = strucMap[a.StructureId];
                      if (curStruc) {
                        // curStruc 可以推出 告警属于哪个 project -> pomsProject
                        let curProject = pepProject_name.filter(
                          (p) =>
                            p.anxinProjectId &&
                            p.anxinProjectId.includes(curStruc.projectId)
                        );
                        for (let cp of curProject) {
                          // cp.projects 是结构物信息
                          let curStruc = cp.projects.find(
                            (cpp) => cpp.id == a.StructureId
                          );
                          if (!curStruc) {
                            console.error(
                              `没有查到结构物信息:${a.StructureId}？！不应该不应该!`
                            );
                          } else {
                            // let emptyFactor = { id: -1 }
                            let emptyFactor = curStruc.factor.find(
                              (f) => f.id == -1
                            );
                            if (!emptyFactor) {
                              curStruc.factor.push({
                                id: -1,
                                devices: [
                                  {
                                    alarmDatas: [
                                      {
                                        ...a,
                                        SourceName:
                                          a.SourceName +
                                          (a.below
                                            ? "(" + deviceName + ")"
                                            : ""),
                                      },
                                    ],
                                    iotaDeviceId: a.sourceId,
                                    name: a.SourceName,
                                    structureId: a.StructureId,
                                  },
                                ],
                              });
                            } else {
                              let curDevice = emptyFactor.devices.find(
                                (d) => d.iotaDeviceId == a.sourceId
                              );
                              if (!curDevice) {
                                emptyFactor.devices.push({
                                  alarmDatas: [
                                    {
                                      ...a,
                                      SourceName:
                                        a.SourceName +
                                        (a.below ? "(" + deviceName + ")" : ""),
                                    },
                                  ],
                                  iotaDeviceId: a.sourceId,
                                  name: a.SourceName,
                                  structureId: a.StructureId,
                                });
                              } else {
                                curDevice.alarmDatas.push({ ...a });
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  if (c.tactics == "abnormal_rate") {
                    pLog(`异常设备数量 - ${deviceStatistic.size}`);
                    pLog(`异常视频告警数量 - ${videoAlarms.length}`);
                    let abnormalDeviceCount =
                      alarmDatas.length + videoAlarms.length;
                    let rate =
                      parseInt(deviceCount) + parseInt(cameraCount)
                        ? (abnormalDeviceCount /
                            (parseInt(deviceCount) + parseInt(cameraCount))) *
                          100
                        : 0.0;
                    pLog(`异常比率 ${rate} 设定值 ${deviceProportion}`);
                    if (rate < parseFloat(deviceProportion)) {
                       // 设备异常率低于设定值
                       pLog(`异常设备率低于设定值`)
                       continue
                    }

                    emailSubTitle = emailSubTitle
                      .replace("--%", rate.toFixed(1) + "%")
                      .replace("**", abnormalDeviceCount.toFixed(0));
                    html = html.replace(
                      /<h5\s+style="[^"]*">[^<]*<\/h5>/,
                      `<h5 style="margin-bottom:12px">${emailSubTitle}</h5>`
                    );
                  }

                  emailTitle += "_POMS飞尚运维中台";
                  pepProject_name.forEach((h) => {
                    let rowspan1 = 0;
                    if (h.projects.length) {
                      h.projects.forEach((x) => {
                        let rowspan2 = 0;
                        if (x.factor.length) {
                          x.factor.forEach((f) => {
                            let rowspan3 = 0;
                            let problem = 0;
                            if (f.devices.length) {
                              f.devicesLength = f.devices.length;
                              f.devices = f.devices.filter(
                                (b) => b.alarmDatas && b.alarmDatas.length > 0
                              );
                              if (f.devices.length) {
                                f.devices.forEach((c) => {
                                  if (c.alarmDatas.length) {
                                    problem += 1;
                                    let grouped =
                                      c.alarmDatas.reduce((acc, cur) => {
                                        if (!acc[cur.AlarmCode]) {
                                          acc[cur.AlarmCode] = [];
                                        }
                                        acc[cur.AlarmCode].push(cur);
                                        return acc;
                                      }, {}) || {};
                                    let alarmData = [];
                                    for (let key in grouped) {
                                      rowspan1 += 1;
                                      rowspan2 += 1;
                                      rowspan3 += 1;
                                      grouped[key].sort((a, b) =>
                                        b.StartTime
                                          ? new Date(b.StartTime) -
                                            new Date(a.StartTime)
                                          : -1
                                      );
                                      alarmData.push(grouped[key][0]);
                                    }
                                    c.alarmDatas = alarmData;
                                  } else {
                                    delete c.alarmDatas;
                                  }
                                });
                                // 进一步筛选了有告警的设备
                                f.devices = f.devices.filter(
                                  (b) => b.alarmDatas && b.alarmDatas.length > 0
                                );
                              } else {
                                delete f.devices;
                              }
                            } else {
                              delete f.devices;
                            }
                            f.rowspan = rowspan3;
                            f.problem = problem;
                          });
                          x.factor = x.factor.filter(
                            (b) => b.devices && b.devices.length > 0
                          );
                        } else {
                          delete x.factor;
                        }
                        x.rowspan = rowspan2;
                      });
                      h.projects = h.projects.filter(
                        (b) => b.factor && b.factor.length > 0
                      );
                    } else {
                      delete h.projects;
                    }
                    h.rowspan = rowspan1;
                  });

                  dataAlarmG1 = pepProject_name; //.filter(b => b.projects && b.projects.length > 0) || []
                }

                function packageAlarmData2Table({
                  titlePrefix,
                  alarmData,
                  alarmTitleArr,
                  keyOfStartTime = "StartTime",
                  type,
                }) {
                  pLog(`${titlePrefix} ${alarmData.length}`);
                  if (!alarmData.length) {
                    return "";
                  }

                  let tableTitlePrefix = titlePrefix + "告警源";
                  let newAddCount = 0;
                  let alarmHtml =
                    '<table border="1" cellspacing="0" style="border-collapse:collapse;border-spacing:0;border-left:1px solid #888;border-top:1px solid #888;">';
                  let alarmContent = "";
                  let alarmHtmlTitle = packageTableTitle(alarmTitleArr);
                  let accumulate = 0;
                  if (type == 1) {
                    //调整结构物位置
                    alarmData.map((h, hi) => {
                      if (h.projects && h.projects.length) {
                        h.projects.map((x, xi) => {
                          let problem = 0;
                          let count = 0;
                          if (x.factor && x.factor.length) {
                            x.factor.map((f, fi) => {
                              problem += f.problem;
                              count += f.devicesLength;
                            });
                            // 如果 problem 等于 count，将该结构物移到前面
                            if (problem === count) {
                              h.projects.splice(xi, 1); // 先移除当前元素
                              h.projects.unshift(x); // 然后将该结构物移到数组前面
                            }
                          }
                        });
                      }
                    });
                    alarmData.map((h, hi) => {
                      accumulate += h.rowspan || 0;
                      if (h.projects && h.projects.length) {
                        h.projects.map((x, xi) => {
                          //用于设备全部中断做特殊标记
                          let problem = 0;
                          let count = 0;
                          let curProject =
                            copyPepProjectName.find((p) => p.id == h.id) || {};
                          let curp =
                            curProject.projects.find((p) => p.id == x.id) || {};
                          if ((curp.factor || []).length) {
                            for (let f of curp.factor) {
                              count += (f.devices || []).length;
                            }
                          }
                          let showOne1 = xi == 0 ? true : false;
                          if (x.factor && x.factor.length) {
                            x.factor.map((f, fi) => {
                              problem += f.problem;
                              let showOne2 = fi == 0 ? true : false;
                              if (f.devices && f.devices.length) {
                                f.devices.map((c, ci) => {
                                  let showOne3 = ci == 0 ? true : false;
                                  if (c.alarmDatas && c.alarmDatas.length) {
                                    // console.log('c.alarmDatas.length', c.alarmDatas.length)
                                    ifEmailSend = true;

                                    //取设备里面告警最新的一条数据
                                    if (c.alarmDatas.length > 0) {
                                      c.alarmDatas.map((d, di) => {
                                        let showOne4 = di == 0 ? true : false;

                                        let tableData = "<tr>";
                                        for (let t of alarmTitleArr) {
                                          if (t.f) {
                                            tableData += `<td>${
                                              t.f(d) || ""
                                            }</td>`;
                                          } else if (t.k) {
                                            switch (t.k) {
                                              case "name":
                                                if (
                                                  showOne1 &&
                                                  showOne2 &&
                                                  showOne3 &&
                                                  showOne4
                                                ) {
                                                  tableData += `<th rowspan=${
                                                    h.rowspan
                                                  }>${h[t.k] || ""}</th>`;
                                                }
                                                break;
                                              case "Structure":
                                                if (
                                                  showOne2 &&
                                                  showOne3 &&
                                                  showOne4
                                                ) {
                                                  tableData +=
                                                    problem == count
                                                      ? `<th style="color: red;" rowspan=${
                                                          x.rowspan
                                                        }>${
                                                          x["name"] +
                                                            "(" +
                                                            "测点数据全部中断" +
                                                            ")" || ""
                                                        }</th>`
                                                      : `<th rowspan=${
                                                          x.rowspan
                                                        }>${
                                                          x["name"] || ""
                                                        }</th>`;
                                                }
                                                break;
                                              case "factor":
                                                if (showOne3 && showOne4) {
                                                  tableData += `<th rowspan=${
                                                    f.rowspan
                                                  }>${
                                                    (f["name"] || "--") +
                                                      "（" +
                                                      f.problem +
                                                      "/" +
                                                      count +
                                                      "）" || ""
                                                  }</th>`;
                                                }
                                                break;
                                              case "SourceName":
                                                tableData += `<td>${
                                                  d[t.k] || ""
                                                }</td>`;
                                                break;
                                              default:
                                                break;
                                            }
                                          }
                                        }
                                        tableData += "</tr>";
                                        alarmContent += tableData;
                                        if (
                                          d[keyOfStartTime] &&
                                          moment(d[keyOfStartTime]).isBetween(
                                            newAddStartTime,
                                            newAddEndTime
                                          )
                                        ) {
                                          newAddCount++;
                                        }
                                      });
                                    }
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  } else {
                    ifEmailSend = true;

                    for (let [index, a] of alarmData.entries()) {
                      alarmContent += packageTableData({
                        data: a,
                        titleArr: alarmTitleArr,
                      });
                      if (
                        a[keyOfStartTime] &&
                        moment(a[keyOfStartTime]).isBetween(
                          newAddStartTime,
                          newAddEndTime
                        )
                      ) {
                        newAddCount++;
                      }
                    }
                    accumulate = alarmData.length;
                  }

                  tableTitlePrefix +=
                    titlePrefix != "数据异常&视频异常"
                      ? c.tactics == "abnormal_rate"
                        ? `${alarmData.length}个`
                        : `新增${newAddCount}个,未解决累计${accumulate}个` +
                          tableTitlePostfix
                      : "";
                  alarmHtml +=
                    `<tr><td colspan="${alarmTitleArr.length}" style="background-color:#ffff00">` +
                    tableTitlePrefix +
                    "</td></tr>";
                  alarmHtml += alarmHtmlTitle;
                  alarmHtml += alarmContent;
                  alarmHtml += "</table><br/>";

                  return alarmHtml;
                }

                if (c.alarmType.includes("data_outages")) {
                  html += packageAlarmData2Table({
                    titlePrefix: "数据中断",
                    alarmData: dataAlarmG1,
                    alarmTitleArr: dataLnterruptTitle,
                    type: 1,
                  });
                }
                if (c.alarmType.includes("data_exception")) {
                  html += packageAlarmData2Table({
                    titlePrefix: "数据异常",
                    alarmData: dataAlarmG2,
                    alarmTitleArr: dataAlarmTitle2,
                  });
                }
                if (c.alarmType.includes("strategy_hit")) {
                  html += packageAlarmData2Table({
                    titlePrefix: "策略命中",
                    alarmData: dataAlarmG3,
                    alarmTitleArr: dataAlarmTitle,
                  });
                }
                if (c.alarmType.includes("video_exception")) {
                  html += packageAlarmData2Table({
                    titlePrefix: "视频异常",
                    alarmData: videoAlarms,
                    alarmTitleArr: videoAlarmTitle,
                    keyOfStartTime: "createTime",
                  });
                }
                if (c.alarmType.includes("app_exception")) {
                  html += packageAlarmData2Table({
                    titlePrefix: "应用异常",
                    alarmData: appAlarms,
                    alarmTitleArr: appAlarmTitle,
                    keyOfStartTime: "createTime",
                  });
                }
                if (c.alarmType.includes("device_exception")) {
                  html += packageAlarmData2Table({
                    titlePrefix: "设备异常",
                    alarmData: dataAlarmG45,
                    alarmTitleArr: dataAlarmTitle,
                  });
                }

                if (Object.keys(apMergeDeVeAlarms).length) {
                  if (proDebug) {
                    console.log(`查得数据异常、视频异常合并の告警:`);
                    console.log(apMergeDeVeAlarms);
                  }
                  let deviceSensorRes = [];
                  if (deviceIds.size) {
                    const device4Search = [...deviceIds].map(
                      (id) => "'" + id + "'"
                    );
                    deviceSensorRes = await clickHouse.anxinyun
                      .query(
                        `
                              SELECT 
                                 iota_device_id, sensor 
                              FROM t_device_sensor 
                              WHERE iota_device_id
                                 ${
                                   device4Search.length > 1
                                     ? `IN (${device4Search.join(",")})`
                                     : `= ${device4Search[0]}`
                                 }
                               
                           `
                      )
                      .toPromise();
                  }

                  let alarmTitle = dataAlarmTitle.concat(
                    videoAlarmTitle.slice(2).map((v) => {
                      return {
                        ...v,
                        n:
                          v.n == "持续时间"
                            ? "摄像头告警" + v.n
                            : "摄像头" + v.n,
                      };
                    })
                  );
                  let alarmData = [];
                  for (let aKey in apMergeDeVeAlarms) {
                    let curStrucAlarm = apMergeDeVeAlarms[aKey];

                    for (let de of curStrucAlarm.data_exception) {
                      if (!de.id) {
                        let corSensor = deviceSensorRes.find(
                          (ds) => ds.iota_device_id == de.SourceId
                        );
                        if (corSensor) {
                          de.id = corSensor.sensor;
                        }
                      }
                      let corVideoException = curStrucAlarm.video_exception
                        ? curStrucAlarm.video_exception.filter((v) => {
                            // ! de.id 是告警信息关联查出来的测点的id
                            return v.station.some((vs) => vs.id == de.id);
                          })
                        : [];
                      if (!corVideoException.length) {
                        // 构造一个长度 以便在for循环里把 data_exception 放进去
                        corVideoException.push({});
                      }
                      for (let ve of corVideoException) {
                        alarmData.push({
                          ...de,
                          ...ve,
                        });
                      }
                    }
                  }

                  html += packageAlarmData2Table({
                    titlePrefix: "数据异常&视频异常",
                    alarmData: alarmData,
                    alarmTitleArr: alarmTitle,
                  });
                }

                pLog(`ifEmailSend：${ifEmailSend}`);

                if (ifEmailSend) {
                  // 查接收人的信息
                  const receiverRes = c.receiverPepUserId.length
                    ? await clickHouse.pepEmis
                        .query(
                          `
                                    SELECT id, name, email, phone FROM user 
                                    WHERE id IN (${c.receiverPepUserId.join(
                                      ","
                                    )},-1) 
                                    AND active_status = 1 
                                    AND state = 1
                                    AND delete = 0
                                 `
                        )
                        .toPromise()
                    : [];
                  let receiverId = [];

                  console.log("收件人", receiverRes);
                  let emails = [];
                  if (c.pushType.includes("email")) {
                    emails = receiverRes.reduce((arr, r) => {
                      if (r.email) {
                        arr.push(r.email);
                        receiverId.push({ id: r.id, name: r.name });
                      }
                      return arr;
                    }, []);
                  }
                  let phones = [];
                  if (c.pushType.includes("sms")) {
                    phones = receiverRes.reduce((arr, r) => {
                      if (r.phone && r.phone.length) {
                        arr.push(r.phone);
                      }
                      return arr;
                    }, []);
                  }

                  let voices = [];
                  if (c.pushType.includes("voice")) {
                    voices = receiverRes.reduce((arr, r) => {
                      if (r.phone && r.phone.length) {
                        arr.push(r.phone);
                      }
                      return arr;
                    }, []);
                  }

                  // ! 特殊情况写在这行以下
                  if (c.name == "宁波交检健康监测") {
                    emails.push("827017212@qq.com"); //冯亚非
                    emails.push("277192323@qq.com"); //赵善超
                    emails.push("191781690@qq.com"); //王维国
                  }

                  if (isDev) {
                    //  !开发测试用的数据
                    emails = [];
                    // emails = ['3557413002@qq.com']
                    emails = ["zhao.bin@free-sun.com.cn"];
                    // emails = ['wen.lele@free-sun.com.cn']

                    // phones = ['19855490260']
                    // voices = ['19855490260']
                  }

                  let pushed = false;
                  if (emails.length) {
                    pLog(`邮件推送给${emails.length}人`);
                    try {
                      await pushByEmail({
                        email: emails,
                        title: emailTitle,
                        text: "",
                        html: html,
                      });
                    } catch (error) {
                      console.error("信鸽邮件推送失败", error);
                    }
                    pushed = true;
                  }

                  if (phones.length) {
                    pLog(`短信推送给${phones.length}人`);
                    try {
                      await pushBySms({
                        phone: phones,
                        // SignName: '运维中台管理系统',
                        SignName: "江西飞尚科技有限公司",
                        templateCode: "SMS_475115136",
                        templateParam: {
                          projectName: smsProjectName,
                          time: moment().format("YYYY-MM-DD HH:mm:ss"),
                          alarmType: pushTypeStr,
                        },
                      });
                    } catch (error) {
                      console.error("信鸽短信推送失败", error);
                    }
                    pushed = true;
                  }

                  if (voices.length) {
                    pLog(`语音推送给${voices.length}人`);
                    try {
                      for (let v of voices) {
                        await pushByVoice({
                          phone: [v],
                          ttsCode: "TTS_313430030",
                          ttsParam: {
                            projectName: voiceProjectName,
                            time: moment().format("YYYY年MM月DD日HH时mm分ss秒"),
                          },
                        });
                      }
                    } catch (error) {
                      console.error("信鸽语音推送失败", error);
                    }
                    pushed = true;
                  }

                  // if (isDev) {
                  //    continue
                  // }

                  // if (pushed && !isDev) {
                  //    //  存日志 存动态 socket到前端
                  //    let dataToSave = {
                  //       time: moment().format(),
                  //       pushConfigId: c.id,
                  //       cfgName: c.name,//策略名称
                  //       tactics: c.tactics,
                  //       tacticsParams: c.tacticsParams,
                  //       projectCorrelationId: pomsProjectId,
                  //       toPepUserIds: receiverId.map(r => r.id)
                  //    }
                  //    let r = await models.EmailSendLog.create(dataToSave, { returning: true })

                  //    let dynamic = {
                  //       time: r.dataValues.time,
                  //       emailSendId: r.dataValues.id,
                  //       // projectCorrelationId: r.dataValues.projectCorrelationId,
                  //       type: 2 //通知
                  //    }
                  //    await models.LatestDynamicList.create(dynamic);

                  //    //消息推送到前端
                  //    await sendNoticeToWeb(receiverId, dataToSave);
                  // }
                }
              }
            }
          } catch (error) {
            console.error(`信鸽推送失败 ${c.id} ${c.name}`);
            console.error(error);
          }
        }
      } catch (error) {
        console.error("信鸽推送失败", error);
      }
    }
  );

  return {
    alarmsPush,
  };
};
