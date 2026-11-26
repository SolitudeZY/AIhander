'use strict';
const request = require('superagent');
const moment = require('moment')
let wechatExpires = {//企业微信access_token过期
   accessToken: null,
   expire: null
}
//相应的
const WechatApi = {
   getAccessToken: '/gettoken',//获取企业微信token相当于鉴权
   getUserId: '/user/getuserid',//根据电话号码查询企业用户id
   postSendMesg: '/message/send',//发送信息

}
const sendType = {
   'mini': 'miniprogram_notice',
}
const userIds={

}

module.exports = function (app, opts) {
   const getGetToken = async (opts) => {
      console.log(`wechatInfo ,  accessToken:${wechatExpires && wechatExpires.accessToken}, expire: ${wechatExpires && wechatExpires.expire}`)
      /**if access_token超时，重新请求 */
      if (wechatExpires && wechatExpires.accessToken && wechatExpires.expire && moment(wechatExpires.expire).isSameOrAfter(moment())) {
         return true;
      } else {
         const { reqUrl, corpid, corpsecret } = opts.weChat || {};
         console.log('Wechat  getAccessToken:', moment());
         const accessToken = await request.get(`${reqUrl}${WechatApi.getAccessToken}?corpid=${corpid}&corpsecret=${corpsecret}`);
         // const accessToken = await ctx.app.business.request.get(`${reqUrl}${WechatApi.getAccessToken}?corpid=${corpid}&corpsecret=${corpsecret}`);
         const { errmsg, access_token, expires_in } = accessToken && accessToken.body;
         if ('ok' != errmsg) {
            console.log('请求企业微信鉴权失败')
         } else {
            wechatExpires = {
               accessToken: access_token,
               expire: moment().add(expires_in - 600, 's').format('YYYY-MM-DD HH:mm:ss')
            }
            return true;
         }
      }
   }

   //获取用户id
   const getUserId = async (opts, phoneNum) => {
      if (userIds[phoneNum]) {  
         return userIds[phoneNum];  
       }  
      console.log(`info: getGetToken--start-- `)
      await getGetToken(opts)
      console.log(`info: getGetToken--end-- `)
      const res = await request.post(`${opts.weChat.reqUrl}${WechatApi.getUserId}?access_token=${wechatExpires.accessToken}`, { mobile: phoneNum })
      if(res.body.errmsg==='ok'){
         userIds[phoneNum] = res.body.userid
         return res.body.userid

      }else{
         return null
      }

   }
   //发送超期提醒消息
   async function sendWechat({ opts, data, msgtype = sendType["mini"], exDep = '' }) {
      let rslt={}
      console.log(`info: sendMesg--enter-- `);
      try {
         const { touser } = data;
         if (touser && touser.length) {
            let sendData = {};
            if (sendType["mini"] == msgtype) {//小程序通知
               const { appid } = opts.weChat || {};
               const { userId, content, url, title, description, noDescription = false } = data;
               sendData = {
                  "touser": touser.join("|"),
                  "msgtype": "miniprogram_notice",
                  "miniprogram_notice": {
                     "appid": appid,
                     "page": `${url ? url : 'package/approvalCenter/approvalCenter'}?userId=${userId}&msgRet=${true}`,
                     "title": title || "超期提醒",
                     "description": description || "详情如下，请您尽快处理",
                     "content_item": content
                  }
               }
               if (noDescription) {
                  delete sendData.miniprogram_notice.description;
               }
            }
            console.log(`info: getGetToken--start-- `)
            await getGetToken(opts)
            console.log(`info: getGetToken--end-- `)
            /**
             * 返回示例
             * {"errcode" : 0,
               "errmsg" : "ok",
               "invaliduser" : ["userid1","userid2","CorpId1/userid1","CorpId2/userid2"], // 不区分大小写，返回的列表都统一转为小写
               "invalidparty" : ["partyid1","partyid2","LinkedId1/partyid1","LinkedId2/partyid2"],
               "invalidtag":["tagid1","tagid2"]
               }
             * 
             */
            rslt = await request.post(`${opts.weChat.reqUrl}${WechatApi.postSendMesg}?access_token=${wechatExpires.accessToken}`, sendData)
            console.log(`info: WechatApi.postSendMesg----end-- `)
            return rslt
         } else {
            console.log('缺少参数，请检查')
            return rslt
         }
      } catch (err) {
         console.log('发送消息失败', err && err.message)
      }
   }

   return {
      getGetToken,
      getUserId,
      sendWechat
   }
}