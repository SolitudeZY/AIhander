const schedule = require("node-schedule");
const moment = require("moment");
const request = require("superagent");

let isDev = false;
// isDev = true

module.exports = function (app, opts, ctx) {
  const certNotice = app.fs.scheduleInit(
    {
      interval: "30 40 8 * * *",
      // interval: '30 */3 * * * *',
      immediate: isDev,
      proRun: !isDev,
    },
    async () => {
      console.log(`开始进行证书到期提醒任务`);
      try {
        const { models } = app.fs.dc;
        const { clickHouse } = app.fs;
        const { pushBySms, pushByEmail, sendNoticeToWeb } = app.fs.utils;

        const certs = await models.Cert.findAll({
          where: {
            remain: { $gt: 0 },
          },
        });
        const notice = await models.CertNotice.findAll({});

        let preSendUserIds = new Set();
        let preSendSmsMsg = [];
        let preSendEmailMsg = [];
        for (let n of notice) {
          for (let cid of n.certIds) {
            const cert = certs.find((c) => c.id === cid);
            if (cert && cert.remain == n.remain) {
              if (
                n.noticeType &&
                n.noticeType.length &&
                n.noticeUsers &&
                n.noticeUsers.length
              ) {
                if (n.noticeType.includes("sms")) {
                  for (let nuid of n.noticeUsers) {
                    // 短信单条发
                    let existPre = preSendSmsMsg.find(
                      (p) =>
                        p.projectName == cert.project &&
                        p.remain == n.remain &&
                        p.noticeUser == nuid
                    );
                    if (!existPre) {
                      preSendSmsMsg.push({
                        projectName: cert.project,
                        remain: n.remain,
                        noticeUser: nuid,
                      });
                    }
                  }
                }
                if (n.noticeType.includes("email")) {
                  for (let nuid of n.noticeUsers) {
                    let existPre = preSendEmailMsg.find(
                      (p) =>
                        p.projectName == cert.project && p.noticeUser == nuid
                    );
                    if (existPre) {
                      existPre.certs.push(cert);
                    } else {
                      preSendEmailMsg.push({
                        projectName: cert.project,
                        certs: [cert],
                        noticeUser: nuid,
                      });
                    }
                  }
                }

                //
                for (let nuid of n.noticeUsers || []) {
                  preSendUserIds.add(nuid);
                }
              }
            }
          }
        }

        console.log(`需查询 pep 用户 ${preSendUserIds.size} 个`);
        if (preSendUserIds.size) {
          const userIds = Array.from(preSendUserIds);
          const receiverRes = await clickHouse.pepEmis
            .query(
              `
                  SELECT id, name, email, phone 
                  FROM user 
                  WHERE id IN (${userIds.join(",")},-1) 
                     AND active_status = 1 
                     AND state = 1
                     AND delete = 0
               `
            )
            .toPromise();

          for (let s of preSendSmsMsg) {
            try {
              let corUser = receiverRes.find((r) => r.id == s.noticeUser);
              console.log(`证书提醒推送SMS`, corUser);
              if (corUser && corUser.phone) {
                await pushBySms({
                  phone: [corUser.phone],
                  // SignName: '运维中台管理系统',
                  SignName: "江西飞尚科技有限公司",
                  templateCode: "SMS_475780283",
                  templateParam: {
                    projectName: s.projectName,
                    remain: s.remain,
                  },
                });
                await new Promise((resolve) =>
                  setTimeout(() => resolve(), 1000)
                );
              }
            } catch (error) {
              console.error("证书提醒推送SMS", error);
            }
          }

          for (let e of preSendEmailMsg) {
            try {
              let corUser = receiverRes.find((r) => r.id == e.noticeUser);
              console.log(`证书提醒推送SMS`, corUser);
              if (corUser && corUser.email) {
                await pushByEmail({
                  email: [corUser.email],
                  title: `【${e.projectName}】证书即将过期`,
                  text: `【${e.projectName}】下${e.certs
                    .map((c) => `${c.name}证书还有${c.remain}天`)
                    .join("/")}即将过期，请及时处理`,
                  html: "",
                });
                await new Promise((resolve) =>
                  setTimeout(() => resolve(), 1000)
                );
              }
            } catch (error) {
              console.error("证书提醒推送EMAIL", error);
            }
          }
        }
      } catch (error) {
        console.error("证书提醒推送失误", error);
      }
    }
  );
  return {
    certNotice,
  };
};
