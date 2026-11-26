const moment = require('moment');
const request = require('superagent');
const Excel = require('exceljs');
// const path = require('path');
;const fs=require('fs')
let isDev = false;
// isDev = true;

module.exports = function (app, opts, ctx) {
  const dongjiangDayliyReport = app.fs.scheduleInit(
    {
      //每天凌晨两点
      interval: '0 0 2 * * *',
      immediate: isDev,
      proRun: !isDev,
    },
    async () => {
      // console.log(``);
      try {
        const { models } = app.fs.dc;
        const { clickHouse } = app.fs;
        const { dongJiangEmailReceiver, dongJiangServer, dongJiangToken } = opts
        const sTime = moment().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
        const eTime = moment().format('YYYY-MM-DD HH:mm:ss');
        const { pushByEmail } = app.fs.utils;
        //   const token = process.env.DONG_JIANG_TOKEN;
        const token = dongJiangToken;
        const dongjiangBridgeServer = dongJiangServer;
        const emilReceivers=dongJiangEmailReceiver.split(',')
        //设备在线率
        //_api/findAllStationsStatus 判读数据isOn字段代表在线 + 视频接口的长度_api/structures/1/videoConfigInfo
        //东江大桥服务器地址由 DONG_JIANG_SERVER 环境变量提供，token 由 DONG_JIANG_TOKEN 提供
        //平台在线总数XXX个，离线XXX个，在线率xxx
        const videoList = await request
          .get(`${dongjiangBridgeServer}/_api/structures/1/videoConfigInfo?token=${token}`)
          .then((res) => res.body);
        //   const filterVideoList = videoList.filter((item) => item.type === 'guobiao');
        const stationList = await request
          .get(`${dongjiangBridgeServer}/_api/findAllStationsStatus?token=${token}`)
          .then((res) => res.body);
        const allStations = await request
          .get(`${dongjiangBridgeServer}/_api/structures/1/stations?token=${token}`)
          .then((res) => res.body);
        let obj = {};
        if (allStations && allStations.length) {
          obj = {
            stationIds: [],
            hideArr: [],
          };
          allStations.forEach((v) => {
            v.groups.forEach((group) => {
              group.stations.forEach((s) => {
                obj.stationIds.push(s.id);
                if (s.labels.find((f) => f === 'hide')) {
                  obj.hideArr.push(s.id);
                }
              });
            });
          });
        } else {
          console.log('structures/1/stations接口查不到');
        }
        const structStationStatuses =
          stationList.filter(
            (f) =>
              f.structId === 1 &&
              !obj.hideArr.includes(f.sensorId) &&
              obj.stationIds.includes(f.sensorId)
          ) || [];
        const offlineCount = structStationStatuses.filter((f) => !f.isOn).length || 0;
        const onLineCount = structStationStatuses.length - offlineCount + videoList.length;
        const allCount = structStationStatuses.length + videoList.length;
        const onLineRate = onLineCount / (allCount || 1);
        const onLineRateStr = (onLineRate * 100).toFixed(2);
        //数据源，_api/users/1/alarms ，post,level=[1,2,3],status:'new',structures:['1'],type:[1]
        //超阈值、趋势、毛刺
        //数据异常,告警列表需要输出，结构物   测点   类型   产生时间
        //超阈值
        const alarmList = await request
          .post(`${dongjiangBridgeServer}/_api/users/1/alarms?token=${token}`)
          .send({ level: [1, 2, 3], status: 'new', structures: ['1'], type: [1] })
          .then((res) => res.body);
        let alarms = alarmList.alarms || [];
        let data = [];
        for (let a of alarms) {
          let structureName = a.structureName;
          for (let b of (a.alarms || []).filter((item) => item.content === '数据超阈值')) {
            let type = '超阈值';
            let stationName = (b.source || {}).name;
            let time = moment(b.startTime).format('YYYY-MM-DD HH:mm:ss');
            data.push({ structureName, stationName, type, time });
          }
        }
        //趋势、毛刺
        /**
         * todo
         * （这里还需要补充时间范围）
         */
        const trendAndGusleList =
          (await clickHouse.dataAlarm
            .query(
              `
               select AlarmGroupUnit,SourceName,StartTime 
               from alarm.alarms
               where AlarmGroupUnit in (48,49) ---- 趋势、毛刺
               and  AlarmGroup in (3) 
               and SourceId like '%dongjiang%'
               and StartTime  between '${sTime}' and '${eTime}'
               `
            )
            .toPromise()) || [];
        for (let a of trendAndGusleList) {
          let sourceName = a.SourceName;
          let type = a.AlarmGroupUnit === 48 ? '趋势' : a.AlarmGroupUnit === 49 ? '毛刺' : '';
          let time = moment(a.StartTime).format('YYYY-MM-DD HH:mm:ss');
          data.push({ sourceName, type, time });
        }
        //视频摄像头状态列表
        // http://58.252.10.4:30872/_video/guobiao/realTimeVideo?deviceId=34020000001180000001&channelId=34020000001310000003&token=REPLACE_WITH_DONGJIANG_VIDEO_TOKEN
        let videoConfigInfo = (videoList || []).map((item) => {
          return {
            deviceId: item.guobiao.deviceId,
            channelId: item.guobiao.channelId,
            location: item.location,
          };
        });
        
        const TIMEOUTS = [60000, 90000, 120000]; // 设置超时时间为1分钟、1.5分钟、2分钟
        let promiseList = videoConfigInfo.map((item) => {
          const attempts = [];
          let isResolved = false; 

          for (let i = 0; i < TIMEOUTS.length; i++) {
            attempts.push(
              new Promise(async (resolve) => {
                if (isResolved) {
                  resolve({ status: '已成功请求' }); // 如果已成功请求，直接返回
                  return;
                }
                try {
                  const res = await request.get(
                    `${dongjiangBridgeServer}/_video/guobiao/realTimeVideo?deviceId=${item.deviceId}&channelId=${item.channelId}&token=${token}`
                  );
                  isResolved = true; // 标记为已成功请求
                  resolve(res.body);
                } catch (error) {
                  // console.error(`请求失败: ${error.message}`);
                  resolve({ status: '异常' });
                }
              }).catch(() => {
                // 请求失败时的处理
                resolve({ status: '请求失败' });
              })
            );

            // 在每次请求后设置超时
            attempts.push(new Promise((resolve) => 
              setTimeout(() => {
                // console.error('请求超时'); 
                resolve({ status: '请求超时' }); 
              }, TIMEOUTS[i]) // 使用当前超时时间
            ));
          }

          return Promise.race(attempts);
        });

        let result = await Promise.all(promiseList);
        let videoData = [];
        for (let [index, a] of result.entries()) {
          videoData.push({
            location: videoConfigInfo[index].location,
            status: a.msg === '成功' ? '正常' : a.status==='请求超时'?'请求超时':'异常',
          });
        }
       const res = await models.AppInspection.findAll({
          attribute: ['pageName', 'loadTime', 'pageStatus','createTime'],
          order:[['createTime','DESC']],
          where: {
            loadTime: {
              $ne: null,
            },
             createTime: { $between: [moment().startOf('day').format('YYYY-MM-DD HH:mm:ss'), moment().endOf('day').format('YYYY-MM-DD HH:mm:ss')] },
          },
        });
        let pageCheckData=[];
        if(res&&res.length){
          for(let q of res) {
            //根据pageName和createTime配合，取最大的那条
            let pageName = q.pageName;
            let loadTime = q.loadTime;
            let pageStatus = q.pageStatus;
            let pageData = pageCheckData.find(item => item.pageName === pageName);
            if(!pageData){
              pageCheckData.push({
                pageName,
                loadTime,
                pageStatus,
              })
            }
          }
        }
        //组装成excel
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('东江大桥自动化巡查日报');
        // 设置标题行
        worksheet.mergeCells('A1:D1');
        worksheet.getCell('A1').value = `东江大桥自动化巡查日报-${moment().format(
          'YYYY年MM月DD日 HH时'
        )}`;
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.getCell('A1').font = { bold: true, size: 14 };

        let currentRow = 2;

        // 添加 pageStartRow 定义
        const pageStartRow = currentRow;

        // 平台页面检查表头样式
        worksheet.getCell(`A${currentRow}`).value = '平台页面检查';
        worksheet.getCell(`B${currentRow}`).value = '页面名称';
        worksheet.getCell(`C${currentRow}`).value = '加载时间（s）';
        worksheet.getCell(`D${currentRow}`).value = '状态';

        // 定义表头背景色
        const headerFill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E6E6FA' }, // 淡紫色背景
        };

        // 定义边框样式
        const borderStyle = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // 修改表头样式设置部分
        ['B', 'C', 'D'].forEach((col) => {
          const cell = worksheet.getCell(`${col}${currentRow}`);
          cell.font = { bold: true };
          cell.fill = headerFill;
          cell.border = borderStyle;
        });

        currentRow++;

        // 填充页面检查数据
        for (let page of pageCheckData) {
          worksheet.getCell(`B${currentRow}`).value = page.pageName;
          worksheet.getCell(`C${currentRow}`).value = page.loadTime;
          worksheet.getCell(`D${currentRow}`).value = page.pageStatus;
          if (page.pageStatus === '异常') {
            worksheet.getCell(`D${currentRow}`).font = { color: { argb: 'FFFF0000' } };
          }
          ['B', 'C', 'D'].forEach((col) => {
            worksheet.getCell(`${col}${currentRow}`).border = borderStyle;
          });
          currentRow++;
        }

        // 合并平台页面检查的第一列
        if (currentRow > pageStartRow + 1) {
          worksheet.mergeCells(`A${pageStartRow}:A${currentRow - 1}`);
          worksheet.getCell(`A${pageStartRow}`).alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };
        }

        // 视频摄像头检查
        const videoStartRow = currentRow;
        worksheet.getCell(`A${currentRow}`).value = '视频摄像头检查';
        worksheet.getCell(`B${currentRow}`).value = '摄像头名称';
        worksheet.getCell(`C${currentRow}`).value = '状态';
        worksheet.mergeCells(`C${currentRow}:D${currentRow}`); // 合并状态列
        currentRow++;

        // 视频摄像头检查表头样式
        ['B', 'C', 'D'].forEach((col) => {
          const cell = worksheet.getCell(`${col}${videoStartRow}`);
          cell.font = { bold: true };
          cell.fill = headerFill;
          cell.border = borderStyle;
        });

        // 填充视频数据
        for (let video of videoData) {
          worksheet.getCell(`B${currentRow}`).value = video.location;
          worksheet.getCell(`C${currentRow}`).value = video.status;
          worksheet.mergeCells(`C${currentRow}:D${currentRow}`); // 合并状态列
          if (video.status === '异常') {
            worksheet.getCell(`C${currentRow}`).font = { color: { argb: 'FFFF0000' } };
          }
          ['B', 'C', 'D'].forEach((col) => {
            worksheet.getCell(`${col}${currentRow}`).border = borderStyle;
          });
          currentRow++;
        }

        // 合并视频检查的第一列
        if (currentRow > videoStartRow + 1) {
          worksheet.mergeCells(`A${videoStartRow}:A${currentRow - 1}`);
          worksheet.getCell(`A${videoStartRow}`).alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };
        }

        // 设备在线率
        const deviceStatusRow = currentRow;
        worksheet.getCell(`A${currentRow}`).value = '设备在线率';
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`); // 合并到D列
        worksheet.getCell(
          `B${currentRow}`
        ).value = `平台在线总数${onLineCount}个，离线${offlineCount}个，在线率${onLineRateStr}%`;

        // 设置样式
        worksheet.getCell(`A${deviceStatusRow}`).alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };
        worksheet.getCell(`B${deviceStatusRow}`).alignment = {
          vertical: 'middle',
          horizontal: 'left',
        };
        ['A', 'B', 'C', 'D'].forEach((col) => {
          worksheet.getCell(`${col}${deviceStatusRow}`).border = borderStyle;
        });
        currentRow++;

        // 数据异常
        const alarmStartRow = currentRow;
        worksheet.getCell(`A${currentRow}`).value = '数据异常';
        worksheet.getCell(`B${currentRow}`).value = '测点';
        worksheet.getCell(`C${currentRow}`).value = '类型';
        worksheet.getCell(`D${currentRow}`).value = '产生时间';
        currentRow++;

        // 数据异常表头样式

        ['B', 'C', 'D'].forEach((col) => {
          const cell = worksheet.getCell(`${col}${alarmStartRow}`);
          cell.font = { bold: true };
          cell.fill = headerFill;
          cell.border = borderStyle;
        });

        // 填充告警数据
        for (let alarm of data) {
          worksheet.getCell(`B${currentRow}`).value = alarm.stationName || alarm.sourceName || '';
          worksheet.getCell(`C${currentRow}`).value = alarm.type;
          worksheet.getCell(`D${currentRow}`).value = alarm.time;

          // 添加边框
          ['B', 'C', 'D'].forEach((col) => {
            worksheet.getCell(`${col}${currentRow}`).border = borderStyle;
          });
          currentRow++;
        }
        if (data.length === 0) {
          //没有数据,并合并bcd列
          worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
          worksheet.getCell(`B${currentRow}`).alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };
          //填充暂无数据
          worksheet.getCell(`B${currentRow}`).value = '暂无异常';
          //新增一行暂无数据之后，数据异常需要上下合并数据异常
          worksheet.mergeCells(`A${alarmStartRow}:A${currentRow}`);
          worksheet.getCell(`A${currentRow}`).alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };
        }

        // 合并数据异常的第一列
        if (currentRow > alarmStartRow + 1) {
          worksheet.mergeCells(`A${alarmStartRow}:A${currentRow - 1}`);
          worksheet.getCell(`A${alarmStartRow}`).alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };
        }

        // 设置整个表格的外边框
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = borderStyle;
          });
        });

        // 设置列宽以优化显示
        worksheet.columns.forEach((column, index) => {
          switch (index) {
            case 0: // A列
              column.width = 15;
              break;
            case 1: // B列
              column.width = 20;
              break;
            case 2: // C列
              column.width = 25;
              break;
            case 3: // D列
              column.width = 15;
              break;
            case 4: // E列
              column.width = 20;
              break;
          }
        });
        // 保存文件
        const fileName = `东江大桥自动化巡查日报-${moment().format('YYYY年MM月DD日')}.xlsx`;
        await workbook.xlsx.writeFile(fileName);
        // 发送邮件
        await pushByEmail({
          email: emilReceivers,
          subject: `东江大桥自动化巡查日报-${moment().format('YYYY年MM月DD日')}`,
          text: '请查收附件中的东江大桥自动化巡查日报。',
          html: '',
          attachments: [
            {
              filename: fileName,
              path: `./${fileName}`,
            },
          ],
        });
        console.log('邮件发送成功');
        //删除文件
        fs.unlinkSync(fileName);
        // // 保存文件
        // const fileName = `东江大桥自动化巡查日报-${moment().format('YYYY年MM月DD日')}.xlsx`;
        // const savePath = path.join(__dirname, '../../../reports', fileName);
        // const saveDir = path.dirname(savePath);
        // if (!require('fs').existsSync(saveDir)) {
        //   require('fs').mkdirSync(saveDir, { recursive: true });
        // }
        // await workbook.xlsx.writeFile(savePath);
        // console.log(`Excel文件已保存到: ${savePath}`);
      } catch (error) {
        console.error('生成报告出错：', error);
      }
    }
  );
  return {
    dongjiangDayliyReport,
  };
};
