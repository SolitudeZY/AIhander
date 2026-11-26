'use strict';
const moment = require('moment')

module.exports = async function factory (app, opts) {

   app.socket.on('connection', async (socket) => {
      console.info('WEB_SOCKET token：' + socket.handshake.query.token + ' 已连接：id ' + socket.id + ' 时间：' + moment(socket.handshake.time).format());

      socket.on('disconnecting', async (reason) => {
         const connectSeconds = moment().diff(moment(socket.handshake.time), 'seconds')

         console.info('WEB_SOCKET token：' + socket.handshake.query.token + ' 已断开连接：' + reason + ' 连接时长：' + connectSeconds + 's');

         const { models } = app.fs.dc
         await models.User.increment({
            onlineDuration: connectSeconds
         }, {
            where: {
               id: socket.handshake.query.pomsUserId
            }
         })
      })
   })

   // 使用测试 保持链接
   // setInterval(async () => {
   //    const { connected } = app.socket.sockets

   //    const roomId = 'ROOM_' + Math.random()
   //    // if (connected) {
   //    //    for (let c in connected) {
   //    //       connected[c].join(roomId)
   //    //    }
   //    //    app.socket.to(roomId).emit('TEST', { someProperty: `【星域 ROOM:${roomId}】呼叫自然选择号！！！`, })
   //    // }

   //    app.socket.emit('TEST', { someProperty: '【广播】呼叫青铜时代号！！！', })

   // }, 3000)
}
