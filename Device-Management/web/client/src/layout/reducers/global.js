'use strict';
import Immutable from 'immutable';
import { INIT_LAYOUT, RESIZE, INIT_API_ROOT, PEPPROJECTID } from '../actions/global';

function global (state = {
   title: '',
   copyright: '',
   sections: [],
   actions: {},
   plugins: {},
   clientHeight: 768,
   clientWidth: 1024,
   apiRoot: '',
   iotVcmpWeb: '',
   pomsMonitor: '',
   pomsKubesphere: '',
   pomsAmbari: '',
   pomsKowl: '',
   pomsPghero: '',
   pomsEs: '',
   pomsNotebook: '',
   dcWeb: '',
   networkWeb: '',
   traitLabel: '',
   crawapi: '',
   qiniu: {}
}, action) {
   const payload = action.payload;
   switch (action.type) {
      case RESIZE:
         return Immutable.fromJS(state).merge({
            clientHeight: payload.clientHeight,
            clientWidth: payload.clientWidth
         }).toJS();
      case INIT_LAYOUT:
         return Immutable.fromJS(state).merge({
            title: payload.title,
            copyright: payload.copyright,
            sections: payload.sections,
            actions: payload.actions,
            plugins: payload.plugins,
         }).toJS();
      case INIT_API_ROOT:
         return Immutable.fromJS(state).merge({
            apiRoot: payload.apiRoot,
            iotVcmpWeb: payload.iotVcmpWeb,
            pomsMonitor: payload.pomsMonitor,
            pomsKubesphere: payload.pomsKubesphere,
            pomsAmbari: payload.pomsAmbari,
            pomsKowl: payload.pomsKowl,
            pomsPghero: payload.pomsPghero,
            pomsEs: payload.pomsEs,
            pomsNotebook: payload.pomsNotebook,
            dcWeb: payload.dcWeb,
            networkWeb: payload.networkWeb,
            qiniu: payload.qiniu,
            webEmis: payload.webEmis,
            webOa: payload.webOa,
            crawapi: payload.crawapi,
            traitLabel: payload.traitLabel,
         }).toJS();
      case PEPPROJECTID:
         return Immutable.fromJS(state).merge({
            pepProjectId: payload.pepProjectId,
         }).toJS();
      default:
         return state;
   }
}

export default global;