'use strict';
import * as actionTypes from '../actions/webSocket';
import Immutable from 'immutable';

const initState = {
    socket: null,
};

function webSocket (state = initState, action) {
    const payload = action.payload;
    switch (action.type) {
        case actionTypes.INIT_WEB_SOCKET:
            return Immutable.fromJS(state).merge({
                socket: payload.socket,
            }).toJS();
        default:
            return state;
    }
}

export default webSocket;