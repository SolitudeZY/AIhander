'use strict';
import io from 'socket.io-client';

export const INIT_WEB_SOCKET = 'INIT_WEB_SOCKET'
export function initWebSocket ({ ioUrl, token, pomsUserId }) {
   if (!ioUrl) {
      ioUrl = localStorage.getItem('apiRoot')
      ioUrl = JSON.parse(ioUrl).root
   }
   if (!token) {
      let user = sessionStorage.getItem('user')
      if (user) {
         user = JSON.parse(user)
         token = user.token
         pomsUserId = user.userInfo.id
      }
   }
   if (!ioUrl || !token || !pomsUserId) {
      return {
         type: '',
      }
   }

   return dispatch => {
      // const socket = io(
      //    ioUrl
      //    // 'http://10.8.30.7:4000'
      //    , {
      //       query: {
      //          token: token,
      //          pomsUserId: pomsUserId
      //       },
      //    });
      dispatch({
         type: INIT_WEB_SOCKET,
         payload: {
            socket:null// socket
         }
      })
   }
}