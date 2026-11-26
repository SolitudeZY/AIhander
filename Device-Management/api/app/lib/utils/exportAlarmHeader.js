'use strict';

//'projectName', 'StructureName', 'SourceName', 'AlarmGroupUnit', 'AlarmCodeName', 'sustainTime', 'createTime', 'AlarmContent',
// 'CurrentLevel', 'updateTime', 'detailCount', 'confirm', 'confirmTime'
let headerZD = [{
    title: "项目名称",
    key: 'projectName'
}, {
    title: "结构物名称",
    key: 'StructureName'
}, {
    title: "告警源",
    key: 'SourceName'
}, {
    title: "中断类型",
    key: 'AlarmGroupUnit'
}, {
    title: "常见原因",
    key: 'AlarmCodeName'
}, {
    title: "持续时间",
    key: 'sustainTime'
}, {
    title: "产生时间",
    key: 'StartTime'
}, {
    title: "告警信息",
    key: 'AlarmContent'
}, {
    title: "告警等级",
    key: 'CurrentLevel'
}, {
    title: "更新时间",
    key: 'EndTime'
}, {
    title: "产生次数",
    key: 'detailCount'
}, {
    title: "确认信息",
    key: 'confirmedContent'
}, {
    title: "确认/恢复时间",
    key: 'confirmedTime'
}];
//'projectName', 'StructureName', 'SourceName', 'type', 'createTime', 'sustainTime', 'AlarmContent', 'CurrentLevel', 'updateTime', 'detailCount', 'confirm', 'confirmTime
let headerYC = [{
    title: "项目名称",
    key: 'projectName'
}, {
    title: "结构物名称",
    key: 'StructureName'
}, {
    title: "告警源",
    key: 'SourceName'
}, {
    title: "异常类型",
    key: 'type'
}, {
    title: "产生时间",
    key: 'StartTime'
}, {
    title: "持续时间",
    key: 'sustainTime'
}, {
    title: "告警信息",
    key: 'AlarmContent'
}, {
    title: "告警等级",
    key: 'CurrentLevel'
}, {
    title: "更新时间",
    key: 'EndTime'
}, {
    title: "产生次数",
    key: 'detailCount'
}, {
    title: "确认信息",
    key: 'confirmedContent'
}, {
    title: "确认/恢复时间",
    key: 'confirmedTime'
}];
//'projectName', 'StructureName', 'SourceName', 'Strategy', 'State', 'createTime', 'sustainTime', 'AlarmContent', 'CurrentLevel', 'updateTime', 'detailCount', 'confirm', 'confirmTime'
let headerMZ = [{
    title: "项目名称",
    key: 'projectName'
}, {
    title: "结构物名称",
    key: 'StructureName'
}, {
    title: "告警源",
    key: 'SourceName'
}, {
    title: "策略类型",
    key: 'Strategy'
}, {
    title: "命中状态",
    key: 'State'
}, {
    title: "产生时间",
    key: 'StartTime'
}, {
    title: "持续时间",
    key: 'sustainTime'
}, {
    title: "告警信息",
    key: 'AlarmContent'
}, {
    title: "告警等级",
    key: 'CurrentLevel'
}, {
    title: "更新时间",
    key: 'EndTime'
}, {
    title: "产生次数",
    key: 'detailCount'
}, {
    title: "确认信息",
    key: 'confirmedContent'
}, {
    title: "确认/恢复时间",
    key: 'confirmedTime'
}];
//'projectName', 'StructureName', 'SourceName', 'station', 'sustainTime', 'venderName', 'AlarmContent', 'AlarmCodeName', 'createTime', 'updateTime', 'confirm', 'confirmTime'
let headerSB = [{
    title: "项目名称",
    key: 'projectName'
}, {
    title: "结构物名称",
    key: 'StructureName'
}, {
    title: "告警源",
    key: 'SourceName'
}, {
    title: "位置信息",
    key: 'station'
}, {
    title: "持续时间",
    key: 'sustainTime'
}, {
    title: "设备厂家",
    key: 'venderName'
}, {
    title: "告警信息",
    key: 'AlarmContent'
}, {
    title: "常见原因",
    key: 'AlarmCodeName'
}, {
    title: "产生时间",
    key: 'StartTime'
}, {
    title: "更新时间",
    key: 'EndTime'
}, {
    title: "确认信息",
    key: 'confirmedContent'
}, {
    title: "确认/恢复时间",
    key: 'confirmedTime'
}];
let header_video = [{
    title: "项目名称",
    key: 'projectName'
}, {
    title: "结构物名称",
    key: 'structureName'
}, {
    title: "告警源",
    key: 'cameraName'
}, {
    title: "位置信息",
    key: 'stations'
}, {
    title: "设备类型",
    key: 'cameraKindId'
}, {
    title: "持续时间",
    key: 'sustainTime'
}, {
    title: "设备厂家",
    key: 'venderName'
}, {
    title: "测点",
    key: 'point'
}, {
    title: "序列号",
    key: 'cameraSerialNo'
}, {
    title: "通道号",
    key: 'cameraChannelNo'
}, {
    title: "接入方式",
    key: 'platform'
}, {
    title: "告警信息",
    key: 'statusDescribe'
}, {
    title: "解决方案",
    key: 'resolve'
}, {
    title: "产生时间",
    key: 'createTime'
}, {
    title: "更新时间",
    key: 'updateTime'
}, {
    title: "确认信息",
    key: 'confirmContent'
}, {
    title: "确认/恢复时间",
    key: 'confirmTime'
}];
let header_app = [{
    title: "项目名称",
    key: "projectName",
}, {
    title: "应用名称",
    key: "appName",
}, {
    title: "URL地址",
    key: "url",
}, {
    title: "异常类型",
    key: "type",
}, {
    title: "异常信息",
    key: "alarmContent",
}, {
    title: "产生时间",
    key: "createTime",
}, {
    title: "持续时间",
    key: "sustainTime",
}, {
    title: "更新时间",
    key: "updateTime",
}, {
    title: "确认信息",
    key: "confirm",
}, {
    title: "确认/恢复时间",
    key: "confirmTime",
}];
module.exports = function (app, opts) {
    async function getExportAlarmHeader(type) {
        try {
            let headerMap = {
                "1": headerZD,//数据中断
                "2": headerYC,//数据异常
                "3": headerMZ,//策略命中
                "4,5": headerSB,//设备异常
                video: header_video,
                app: header_app,
            }
            return headerMap[type] || []
        } catch (err) {
            console.log(`获取告警导出表格表头失败, error: ${err}`);
         }
    }

    return {
        getExportAlarmHeader
    }
}