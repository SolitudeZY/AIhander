import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import './areaStyle.less'
import { powerColor } from '../containers/energyManagement'

const Battery = props => {
    const { width, height, power } = props
    const intPawer = parseInt(power)
    const background = powerColor(intPawer)
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <div style={{ position: 'relative', width, height, border: `1px solid ${background}`, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width, height }}>
                    <div style={{ margin: 1, width: `calc(${power} - 2px)`, height: height - 4, background }}>
                    </div>
                </div>
                <div style={{ background, position: 'absolute', top: height / 4, left: width, width: 2, height: 5 }}></div>
            </div>
            <span style={{
                fontFamily: 'SourceHanSansCN-Regular',
                fontWeight: 400,
                fontSize: 14,
                color: '#4A4A4A',
                marginLeft: 5,
            }}>{power}</span>
        </div>
    )
}

function mapStateToProps (state) {
    const { } = state
    return {}
}

export default connect(mapStateToProps)(Battery)
