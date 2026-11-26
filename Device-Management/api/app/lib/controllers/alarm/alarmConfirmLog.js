'use strict';

const moment = require('moment')

async function alarmConfirmLog(ctx, confirmPost, content) {
    try {
        const { models } = ctx.fs.dc;
        const { utils: { sendConfirmToWeb } } = ctx.app.fs
        //存日志
        let logDatas = [];
        confirmPost.map(cp => {
            let { pepUserId, projectCorrelationIds, alarmInfo } = cp;
            projectCorrelationIds.map(id => {
                logDatas.push({
                    pepUserId,
                    projectCorrelationId: id,
                    alarmInfo,//包含告警id,type,source
                    confirmTime: moment().format(),
                    confirmContent: content
                })
            })
        })
        let rslt = await models.AlarmConfirmLog.bulkCreate(logDatas, { returning: true });

        //存最新动态
        let dynamics = rslt.map(r => {
            return {
                time: r.confirmTime,
                alarmConfirmId: r.id,
                projectCorrelationId: r.projectCorrelationId,
                type: 4//告警确认
            }
        })
        await models.LatestDynamicList.bulkCreate(dynamics);

        //消息推送到前端
        if (logDatas.length) {
            await sendConfirmToWeb(logDatas, false);
        }
    } catch (error) {
        ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
        ctx.status = 400;
        ctx.body = {
            message: typeof error == 'string' ? error : undefined
        }
    }
}

module.exports = {
    alarmConfirmLog
};