import React, { useEffect, useState, useMemo } from 'react'
import { connect } from 'react-redux'
import { Empty, Tooltip } from 'antd';
import './areaStyle.less'


const AreaCard = props => {
    const { cityName, deviceTotal, normal, charge, weakWarning, strongWarning, offline, weatherDetail = [] } = props

    const normalRate = deviceTotal && normal ? ((normal * 100.0 / deviceTotal)).toFixed(4) : 0
    const chargeRate = deviceTotal && charge ? ((charge * 100.0 / deviceTotal)).toFixed(4) : 0
    const weakWarningRate = deviceTotal && weakWarning ? ((weakWarning * 100.0 / deviceTotal)).toFixed(4) : 0
    const strongWarningRate = deviceTotal && strongWarning ? ((strongWarning * 100.0 / deviceTotal)).toFixed(4) : 0
    const offlineRate = deviceTotal && offline ? ((offline * 100.0 / deviceTotal)).toFixed(4) : 0
    // const second=(Number(normalRate)+Number(weakWarningRate))+'%'
    // const third=(Number(normalRate)+Number(weakWarningRate)+Number(strongWarningRate))+'%'
    // const forth=(Number(normalRate)+Number(weakWarningRate)+Number(strongWarningRate)+Number(offlineRate))+'%'
    return (
        <>
            <div className='area-card'>
                <div className='area-card-title'>
                    <div className='city-icon'>
                        <img src='/assets/images/data/cityLogo.png' />
                        <span className='city'>{cityName}</span>
                    </div>
                    <div className='ai-advice'><a>查看AI检修建议</a></div>
                </div>
                <div className='area-card-content'>
                    <div className='area-card-content-item'>
                        <div className=''>设备总数：{deviceTotal}个</div>
                        <div>
                            <span className='point point1'></span><span className='tooltip'>离线数</span>
                            <span className='point point2'></span><span className='tooltip'>强预警</span>
                            <span className='point point4'></span><span className='tooltip'>弱预警</span>
                            <span className='point point5'></span><span className='tooltip'>需充电</span>
                            <span className='point point3'></span><span className='tooltip'>电量充足数</span>
                        </div>
                    </div>
                    <div className='num'>
                        {deviceTotal ? <>
                            <div className='progress'>
                                <Tooltip content={normal}><span style={{ width: normalRate + '%' }} className='total1'></span></Tooltip>
                                <Tooltip content={charge}><span style={{ width: chargeRate + '%' }} className='total5'></span></Tooltip>
                                <Tooltip content={weakWarning}><span style={{ width: weakWarningRate + '%' }} className='total4'></span></Tooltip>
                                <Tooltip content={strongWarning}><span style={{ width: strongWarningRate + '%' }} className='total2'></span></Tooltip>
                                <Tooltip content={offline}><span style={{ width: offlineRate + '%' }} className='total3'></span></Tooltip>
                            </div>
                            {/* <div className='area-card-content-item-number normal' style={{ left: `calc(${normalRate+'%'} - 20px)` }}>
                            <div></div>
                            <span>{normal}个</span>
                        </div>
                        <div className='area-card-content-item-number soft-warning'
                            style={{ left: `calc(${second} - 20px)` }}>
                            <div></div>
                            <span>{weakWarning}个</span>
                        </div>
                        <div className='area-card-content-item-number  serious-warning'
                            style={{ left: `calc(${third} - 20px)` }}>
                            <div></div>
                            <span>{strongWarning}个</span>
                        </div>
                        <div className='area-card-content-item-number offline'
                            style={{ left: `calc(${forth} - 20px)` }}>
                            <div></div>
                            <span>{offline}个</span>
                        </div> */}
                        </> : '暂无设备信息'
                        }
                    </div>
                    <div className='future7Days'>未来7天天气</div>
                    <div className='future7Days-content'>
                        {
                            weatherDetail.length ? weatherDetail.map(item => {
                                return <div style={{ flex: 1 }}>
                                    <div className='day'>{item.day}</div>
                                    <div style={{ textAlign: 'center' }}><img src={item.icon} style={{ height: 42, width: 44 }} /></div>
                                    <div className='weather'>{item.weather}</div>
                                    <div className='wind'>{item.wind}</div>
                                    <div className='precip'>{item.precip}</div>
                                </div>
                            }) : <Empty
                                image={<img src='/assets/images/background/zw-nodata.png' />}
                                darkModeImage={<img src='/assets/images/background/zw-nodata.png' />}
                                description={'暂无天气信息'}
                                style={{ margin: '0 auto' }}
                            />
                        }
                    </div>
                </div>
            </div>
        </>
    )
}

function mapStateToProps (state) {
    const { } = state
    return {}
}

export default connect(mapStateToProps)(AreaCard)
