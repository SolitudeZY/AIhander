'use strict';

const moment = require('moment')
const Core = require('@alicloud/pop-core');
const nodemailer = require('nodemailer')

module.exports = function (app, opts) {
   const pushBySms = async ({ phone = [], templateCode, templateParam, SignName = '飞尚尚视' } = {}) => {
      try {
         if (phone.length) {
            const client = new Core({
               accessKeyId: opts.sms.accessKey,
               accessKeySecret: opts.sms.accessSecret,
               endpoint: 'http://dysmsapi.aliyuncs.com',//固定
               apiVersion: '2017-05-25'//固定
            });
            const SendSmsRes = await client.request('SendSms', {
               "PhoneNumbers": phone.join(','),//接收短信的手机号码。
               "SignName": SignName,//短信签名名称。必须是已添加、并通过审核的短信签名。
               "TemplateCode": templateCode,//短信模板ID。必须是已添加、并通过审核的短信签名；且发送国际/港澳台消息时，请使用国际/港澳台短信模版。
               "TemplateParam": JSON.stringify(templateParam)//短信模板变量对应的实际值，JSON格式。
            }, {
               method: 'POST'
            });
            return SendSmsRes
         }
      } catch (error) {
         throw error
      }
   }

   let senderIndex = 0
   const pushByEmail = async ({ email = [], title, text = '', html = '', attachments = undefined, } = {}) => {
      try {
         let useSender = opts.email.sender[senderIndex++ % opts.email.sender.length]
         let transporter = nodemailer.createTransport({
            host: opts.email.host,
            port: opts.email.port,
            secure: true,
            auth: {
               user: useSender.address,
               pass: useSender.password,
            }
         });

         // send mail with defined transport object
         await transporter.sendMail({
            from: `${useSender.name}<${useSender.address}>`, // sender address
            to: email.join(','), // list of receivers 逗号分隔字符串
            subject: title, // Subject line
            text: text, // plain text body
            html: html, // html body
            attachments: attachments
         });
      } catch (error) {
         console.log('邮件发送失败3', error);
         // throw error
      }
   }

   const pushByVoice = async ({phone=[], ttsCode, ttsParam} = {})=>{
      try {
         if (phone.length) {
            const client = new Core({
               accessKeyId: opts.sms.accessKey,
               accessKeySecret: opts.sms.accessSecret,
               endpoint: 'https://dyvmsapi.aliyuncs.com',//固定
               apiVersion: '2017-05-25'//固定
            });
            //SingleCallByTts，官方的这个方法，一次性只能发一个，需要多个，可以循环调用
            const SingleCallTask = await client.request('SingleCallByTts', {
               "CalledNumber": phone.join(','),//接收语音通知或语音验证码的被叫号码
               "TtsCode": ttsCode,//文本转语音模板或语音验证码模板的模板ID
               "TtsParam": JSON.stringify(ttsParam),//语音模板中的变量参数
            }, {
               method: 'POST'
            });
            return SingleCallTask
         }
      } catch (error) {
         throw error
      }
   }

   return {
      pushByEmail,
      pushBySms,
      pushByVoice
   }
}