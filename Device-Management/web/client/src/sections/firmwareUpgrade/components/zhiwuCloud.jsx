import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Button } from 'antd';
import moment from 'moment';

const ZhiwuCloud = (props) => {
    const { actions, dispatch, pepProjectId, user } = props;

    return <div>
        知物云
    </div>;
}

function mapStateToProps (state) {
    const { auth, global } = state;
    return {
        user: auth.user,
        actions: global.actions,
        pepProjectId: global.pepProjectId
    };
}

export default connect(mapStateToProps)(ZhiwuCloud);
