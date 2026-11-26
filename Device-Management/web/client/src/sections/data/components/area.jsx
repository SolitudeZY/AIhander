import React, { useEffect, useState, useMemo } from 'react'
import { connect } from 'react-redux'
import CardTitle from './cardTitle'

import PerfectScrollbar from 'perfect-scrollbar';
import AreaCard from './areaCard'
import './areaStyle.less'


let areaScrollbar
const Area = props => {
    const { detail, cityList } = props

    useEffect(() => {
        const areaScrollBarDom = document.getElementById("areaScrollBar");
        if (areaScrollBarDom) {
            areaScrollbar = new PerfectScrollbar("#areaScrollBar", {
                suppressScrollX: true,
            });
        }
    }, [])

    // const detail = useMemo(() => {
    //   let detail = []
    //   if (weather && weather.length) {
    //     for (let i = 0; i < weather.length; i++) {
    //       if (weather[i].daily.length === 7) {
    //         const t = weather[i]
    //         let obj = {}
    //         obj['location'] = t.location
    //         obj['cityNanme'] = t.cityName
    //         obj['weather'] = []
    //         for (let j = 0; j < 7; j++) {
    //           const tt = t.daily[j]
    //           obj['weather'].push({
    //             icon: ICONSMAP[tt.textDay], day: tt.fxDate.substring(5),
    //             weather: tt.textDay, temp: tt.tempMin + '°~' + tt.tempMax + '°',
    //             wind: tt.windDirDay + tt.windScaleDay + '级',
    //             precip: tt.precip + 'mm'
    //           })
    //         }
    //         detail.push(obj)
    //       }
    //     }
    //     return detail
    //   }
    //   return []

    // }, [weather])

    // const queryWeather = async () => {
    //   if (cityList && cityList.length) {
    //     let list = []
    //     for (let i = 0; i < cityList.length; i++) {
    //       let cityName = cityList[i].cityName
    //       let location = cityList[i].location
    //       const res = await RouteRequest.get(`/query/weather/7d?location=${location}`)
    //       if (res?.daily?.length === 7) {
    //         let weatherDetail = {}
    //         weatherDetail['cityName'] = cityName
    //         weatherDetail['location'] = location
    //         weatherDetail['daily'] = res.daily
    //         list.push(weatherDetail)
    //       }
    //     }
    //     setWeather(list)
    //   }

    // }
    // console.log('cityList',cityList)
    return (
        <>
            <CardTitle englishName='OVERVIEW OF REGIONAL' chineseName='区域概览'
                isWithHelp={true}
                content='根据地灾项目获取项目下设备不同状态的数量及占比，展示当前区域未来7天的天气'
            ></CardTitle>
            <div id='areaScrollBar' className='area-container'>
                {
                    cityList && cityList.length ?
                        cityList.map((item, index) => {
                          // console.log(item)
                            const weatherDetail = detail?.find(item1 => item1.location === item.location)?.weather || []
                            const deviceTotal = item.offline + item.strongWarning + item.weakWarning + item.normal + item.charge

                            return <AreaCard
                                weatherDetail={weatherDetail}
                                cityName={item.cityName}
                                deviceTotal={deviceTotal}
                                normal={item.normal}
                                charge={item.charge}
                                weakWarning={item.weakWarning}
                                strongWarning={item.strongWarning}
                                offline={item.offline}
                            />
                        })
                        : ''
                }
                {/* <div className='area-card'>
          <div className='area-card-title'>
            <div className='city-icon'>
              <img src='/assets/images/data/cityLogo.png' />
              <span className='city'>赣州市</span>
            </div>
            <div className='ai-advice'><a>查看AI检修建议</a></div>
          </div>
          <div className='area-card-content'>
            <div className='area-card-content-item'>
              <div className=''>设备总数：{135}个</div>
              <div>
                <span className='point point1'></span><span className='tooltip'>掉线数</span>
                <span className='point point2'></span><span className='tooltip'>强预警</span>
                <span className='point point4'></span><span className='tooltip'>弱预警</span>
                <span className='point point3'></span><span className='tooltip'>健康数</span>
              </div>
            </div>
            <div className='num'>
              <div className='progress'>
                <span style={{ width: '20%' }} className='total1'></span>
                <span style={{ width: '20%' }} className='total4'></span>
                <span style={{ width: '20%' }} className='total2'></span>
                <span style={{ width: '40%' }} className='total3'></span>
              </div>
              <div className='area-card-content-item-number normal' style={{ left: 'calc(20% - 20px)' }}>
                <div></div>
                <span>1000个</span>
              </div>
              <div className='area-card-content-item-number soft-warning' style={{ left: 'calc(40% - 20px)' }}>
                <div></div>
                <span>1个</span>
              </div>
              <div className='area-card-content-item-number  serious-warning' style={{ left: 'calc(60% - 20px)' }}>
                <div></div>
                <span>1个</span>
              </div>
              <div className='area-card-content-item-number offline' style={{ left: 'calc(100% - 20px)' }}>
                <div></div>
                <span>1个</span>
              </div>
            </div>
            <div className='future7Days'>未来7天天气</div>
            <div className='future7Days-content'>
              {
                detail?.map(item => {
                  return <div style={{ flex: 1 }}>
                    <div className='day'>{item.day}</div>
                    <div style={{ textAlign: 'center' }}><img src={item.icon} style={{ height: 42, width: 44 }} /></div>
                    <div className='weather'>{item.weather}</div>
                    <div className='wind'>{item.wind}</div>
                    <div className='precip'>{item.precip}</div>
                  </div>
                })
              }
            </div>
          </div>
        </div>
        <div className='area-card'>2</div>
        <div className='area-card'>3</div> */}
            </div>
        </>
    )
}

function mapStateToProps (state) {
    const { } = state
    return {}
}

export default connect(mapStateToProps)(Area)
