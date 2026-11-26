'use strict';
// import { RouteRequest } from '@peace/utils';

import { RouteTable, RouteRequest } from '$utils'

export const INIT_LAYOUT = 'INIT_LAYOUT';
export function initLayout (title, copyright, sections, actions) {
   return {
      type: INIT_LAYOUT,
      payload: {
         title,
         copyright,
         sections,
         actions
      }
   };
}

export const RESIZE = 'RESIZE';
export function resize (clientHeight, clientWidth) {
   const headerHeight = 48
   const footerHeight = 0
   return {
      type: RESIZE,
      payload: {
         clientHeight: clientHeight - headerHeight - footerHeight,
         clientWidth: clientWidth
      }
   }
}

export const INIT_API_ROOT = 'INIT_API_ROOT';
export function initApiRoot () {
   return dispatch => {
      return RouteRequest.get(RouteTable.apiRoot).then(res => {
         localStorage.setItem('apiRoot', JSON.stringify(res));
         return dispatch({
            type: INIT_API_ROOT,
            payload: {
               apiRoot: res.root,
               iotVcmpWeb: res.iotVcmpWeb,
               pomsMonitor: res.pomsMonitor,
               pomsKubesphere: res.pomsKubesphere,
               pomsAmbari: res.pomsAmbari,
               pomsKowl: res.pomsKowl,
               pomsPghero: res.pomsPghero,
               pomsEs: res.pomsEs,
               pomsNotebook: res.pomsNotebook,
               dcWeb: res.dcWeb,
               qiniu: res.qiniu,
               webEmis: res.webEmis,
               webOa: res.webOa,
               crawapi: res.crawapi,
               networkWeb: res.networkWeb,
               traitLabel:res.traitLabel,
            }
         })
      });
   }
}

export const PEPPROJECTID = 'PEPPROJECTID';
export function pepProject (pepProjectId) {
   return {
      type: PEPPROJECTID,
      payload: {
         pepProjectId: pepProjectId,
      }
   }
}