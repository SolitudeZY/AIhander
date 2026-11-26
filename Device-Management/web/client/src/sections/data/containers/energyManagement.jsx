import React, { useEffect, useState, useRef, useMemo } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import { SearchOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Spin } from 'antd';
import Area from '../components/area'
import Trend from '../components/trend'
import Detail from '../components/detail'
import DeviceStatistics from '../components/deviceStatistics';
import city from '../constants/cityList'
import { WEATHERMARGIN, ICONSMAP } from '../constants/weather'
import { RouteRequest } from '@peace/utils'

export const powerColor = (v) => {
    if (v <= 0) {
        return '#C3C3C3';
    } else if (v <= 10) {
        return '#FF9496';
    } else if (v <= 33) {
        return '#FDAD31';
    } else if (v <= 66) {
        return '#E5E465';
    } else {
        return '#82EB7B';
    }
}

export const powerIcon = (v) => {
    if (v <= 0) {
        return 'gray';
    } else if (v <= 10) {
        return 'red';
    } else if (v <= 33) {
        return 'origin';
    } else if (v <= 66) {
        return 'yellow';
    } else {
        return 'green';
    }
}

const EnergyManagement = (props) => {
    const { dispatch, actions, user, clientHeight, clientWidth } = props


    const { data } = actions
    const [dataObj, setDataObj] = useState({})
    const [listData, setListData] = useState([])
    const [statusList, setStatusList] = useState([])
    const [rateList, setRateList] = useState([])
    const [cityList, setCityList] = useState([])
    const [weather, setWeather] = useState([])
    const [isLoading, setIsLoading] = useState(true)//加载效果
    //按照状态分类统计的数组
    const [classifyList, setClassifyList] = useState([
        { id: 1, name: '电量充足', total: 0, percent: 0 },
        { id: 2, name: '弱预警', stroke: '#307EFB', total: 0, percent: 0 },
        { id: 3, name: '强预警', stroke: '#FE9812', total: 0, percent: 0 },
        { id: 4, name: '离线数', stroke: '#FF6F42', total: 0, percent: 0 },
    ])
    const firstTwoStyle = {
        minHeight: 450,
        background: '#FFFFFF',
        height: 740
    }
    const secondTwoStyle = {
        minHeight: 340,
        background: '#FFFFFF',
        height: 468

    }
    // const obtainData = (data, subordinateDevices) => {
    //     let list = []
    //     for (let i = 0; i < data.length; i++) {
    //         if (!list.some(item => item.projectId == data[i].projectId)) {
    //             list.push({
    //                 projectId: data[i].projectId,
    //                 projectName: data[i].projectName,
    //                 structures: [
    //                     {
    //                         structureId: data[i].structureId,
    //                         structureName: data[i].structureName,
    //                         iotaThingId: data[i].iota_thing_id,
    //                         devices: [
    //                             {
    //                                 deviceId: data[i].deviceId,
    //                                 deviceName: data[i].deviceName,
    //                                 data: data[i].Data,
    //                                 collectTime: data[i].CollectTime,
    //                                 subordinateDevices: subordinateDevices.filter(item => item.toLayoutNodeId == data[i].deviceId),
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             })
    //         } else {
    //             let index = list.findIndex(j => j.projectId == data[i].projectId)
    //             if (!list[index].structures?.some(q => q.structureId == data[i].structureId)) {
    //                 list[index].structures.push({
    //                     structureId: data[i].structureId,
    //                     structureName: data[i].structureName,
    //                     iotaThingId: data[i].iota_thing_id,
    //                     devices: [
    //                         {
    //                             deviceId: data[i].deviceId,
    //                             deviceName: data[i].deviceName,
    //                             data: data[i].Data,
    //                             collectTime: data[i].CollectTime,
    //                             subordinateDevices: subordinateDevices.filter(item => item.toLayoutNodeId == data[i].deviceId),
    //                         },
    //                     ],
    //                 })
    //             } else {
    //                 let index1 = list[index].structures.findIndex(k => k.structureId == data[i].structureId)
    //                 if (!list[index].structures[index1].devices.some(q => q.deviceId == data[i].deviceId)) {
    //                     list[index].structures[index1].devices.push({
    //                         deviceId: data[i].deviceId,
    //                         deviceName: data[i].deviceName,
    //                         data: data[i].Data,
    //                         collectTime: data[i].CollectTime,
    //                         subordinateDevices: subordinateDevices.filter(item => item.toLayoutNodeId == data[i].deviceId),
    //                     })
    //                 }

    //             }
    //         }
    //     }
    //     return list
    // }

    const getData = () => {
        // dispatch(data.getMapData()).then(res => {
        //     const list = [
        //         { id: 1, name: '裂缝', total: 0, percent: 0 },
        //         { id: 2, name: '倾角', total: 0, percent: 0 },
        //         { id: 3, name: '其他', total: 0, percent: 0 },
        //     ]
        //     let weakWaning = 0
        //     let health = 0
        //     let offline = 0
        //     let strongWarning = 0
        //     let total = 0
        //     //根据状态统计的设备总数
        //     let classTotal = 0
        //     //设备在线率（按照项目分）
        //     let rate = []
        //     const listData = obtainData(res?.payload?.data?.deviceData, res?.payload?.data?.subordinateDevices)
        //     setListData(listData)
        //     listData?.map(item => {
        //         item?.structures?.map(item1 => {
        //             let onLineTotal = 0
        //             let offlineTotal = 0
        //             let allTotal = 0
        //             item1?.devices?.map(item2 => {
        //                 type += item2.deviceName
        //                 if (item2.data !== '') {
        //                     total += 1
        //                     const data = JSON.parse(item2.data)
        //                     //设备在线个数
        //                     if(data.powerstr > 0){
        //                         onLineTotal+=1
        //                     }
        //                     if(data.powerstr <= 0){
        //                         offlineTotal+=1
        //                     }
        //                     allTotal += 1
        //                     if (data.powerstr > 80) {
        //                         health += 1
        //                     } else if (data.powerstr > 30 && data.powerstr <= 80) {
        //                         weakWaning += 1
        //                     } else if (data.powerstr > 0 && data.powerstr <= 30) {
        //                         strongWarning += 1
        //                     } else if (data.powerstr <= 0) {
        //                         offline += 1
        //                     }
        //                     // if(item.projectId===367){
        //                     // }

        //                     if (!rate?.some(r => r.projectId === item.projectId)) {
        //                         //在线
        //                         if (data.powerstr > 0) {
        //                             if (data.powerstr > 80) {
        //                                 rate.push({
        //                                     projectId: item.projectId,
        //                                     projectName: item.projectName,
        //                                     normal: 1, weakWarning: 0, strongWarning: 0, offline: 0, onLine: 1, total: 1
        //                                 })
        //                             } else if (data.powerstr > 30 && data.powerstr <= 80) {
        //                                 rate.push({
        //                                     projectId: item.projectId,
        //                                     projectName: item.projectName,
        //                                     normal: 0, weakWarning: 1, strongWarning: 0, offline: 0, onLine: 1, total: 1
        //                                 })
        //                             }else if(data.powerstr>0&&data.powerstr<=30){
        //                                 rate.push({
        //                                     projectId: item.projectId,
        //                                     projectName: item.projectName,
        //                                     normal: 0, weakWarning: 0, strongWarning: 1, offline: 0, onLine: 1, total: 1
        //                                 })
        //                             }
        //                         } else {
        //                             //离线
        //                             rate.push({ projectId: item.projectId, projectName: item.projectName,
        //                                  offline: 1, onLine: 0, total: 1,normal:0,weakWarning:0,strongWarning:0
        //                                 })
        //                         }
        //                     } else {
        //                         //更新已有数据的东西
        //                         let obj = rate?.find(rate => rate.projectId === item.projectId)
        //                         if (data.powerstr > 0) {
        //                             if (data.powerstr > 80) {
        //                                 // debugger
        //                                 obj.onLine += 1
        //                                 obj.normal += 1
        //                                 obj.total += 1
        //                             }else if(data.powerstr > 30 && data.powerstr <= 80){       
        //                                 obj.onLine += 1
        //                                 obj.weakWarning += 1
        //                                 obj.total += 1
        //                             }else if(data.powerstr>0&&data.powerstr<=30){
        //                                 obj.onLine += 1
        //                                 obj.strongWarning += 1
        //                                 obj.total += 1
        //                             }
        //                         } else {
        //                             obj.offline += 1
        //                             obj.total += 1
        //                         }

        //                     }
        //                 }
        //                 let type = item2?.subordinateDevices?.map(qq => qq.name)
        //                 if ((type && type.length === 3
        //                     && type.some(i1 => i1.includes('加速度'))
        //                     && type.some(i1 => i1.includes('裂缝'))
        //                     && (type.some(i1 => i1.includes('倾角') || type.some(i1 => i1.includes('拉线')))))) {
        //                     list[0].total += 1
        //                 } else if (type && type.length === 2 && type.some(i1 => i1.includes('加速度')) && type.some(i1 => i1.includes('倾角'))) {
        //                     list[1].total += 1
        //                 } else if (type && type.length === 1) {
        //                     if (list?.find(o => o.name === item2?.subordinateDevices[0]?.modelName)) {
        //                         list.find(o => o.name === item2?.subordinateDevices[0].modelName).total += 1
        //                     } else {
        //                         list.push({ id: item2.deviceId, name: item2?.subordinateDevices[0].modelName, total: 1 })
        //                     }
        //                     //其他情况统计为其他
        //                 }else{
        //                     list[2].total += 1
        //                 }
        //             })
        //             //整理滑坡仪
        //             let rateObj = rate?.find(li => li.projectId === item.projectId)
        //             if (rateObj) {
        //                 rateObj.huapoyiOnlineCount = onLineTotal
        //                 rateObj.huapoyiCount = allTotal
        //             }

        //         })

        //     })
        //     classTotal = list.reduce((p, c, i) => {
        //         p += c.total
        //         return p
        //     }, 0)
        //     const classifyList = [
        //         { id: 1, name: '电量充足', total: health, percent: total > 0 ? ((health / total) * 100).toFixed(0) : 0 },
        //         {
        //             id: 2,
        //             name: '弱预警',
        //             stroke: '#307EFB',
        //             total: weakWaning,
        //             percent: total > 0 ? ((weakWaning / total) * 100).toFixed(0) : 0,
        //         },
        //         {
        //             id: 3,
        //             name: '强预警',
        //             stroke: '#FE9812',
        //             total: strongWarning,
        //             percent: total > 0 ? ((strongWarning / total) * 100).toFixed(0) : 0,
        //         },
        //         {
        //             id: 4,
        //             name: '离线',
        //             stroke: '#FF6F42',
        //             total: offline,
        //             percent: total > 0 ? ((offline / total) * 100).toFixed(0) : 0,
        //         },
        //     ]

        //     setClassifyList(classifyList)
        //     res?.payload?.data?.deviceData?.sort((a,b) => {
        //         const power1=a.Data&&JSON.parse(a.Data).powerstr
        //         const power2=b.Data&&JSON.parse(b.Data).powerstr
        //         return power1-power2
        //     })
        //     setDataObj({ ...res?.payload?.data, total: total, statusTotal: classTotal })
        //     list?.forEach(ii => {
        //         ii.percent = classTotal > 0 ? ((ii.total / classTotal) * 100).toFixed(0) : 0
        //     })
        //     setStatusList(list)
        //     setRateList(rate)
        //     //传递给天气卡片组件
        //     if(rate&&rate.length){
        //         for(let i=0;i<rate.length;i++){
        //           let list=city&&city.length?city:[]
        //           city.forEach(item=>{
        //             if(rate[i].projectName.includes(item.cityName)){
        //               item.normal=rate[i].normal
        //               item.weakWarning=rate[i].weakWarning
        //               item.strongWarning=rate[i].strongWarning
        //               item.offline=rate[i].offline
        //             }
        //           })
        //           setCityList(list)
        //       }
        //     }
        // })
        setIsLoading(true)
        dispatch(data.getMapData()).then(res => {
            const { listData, classifyList, dataObj, statusList, rateList } = res?.payload?.data
            const rate = res?.payload?.data?.rateList
            setListData(listData)
            setClassifyList(classifyList)
            // debugger
            setDataObj(dataObj)
            setStatusList(statusList)
            setRateList(rateList)
            if (rate && rate.length) {
                for (let i = 0; i < rate.length; i++) {
                    let list = city && city.length ? city : []
                    city.forEach(item => {
                        if (rate[i].projectName.includes(item.cityName)) {
                            item.normal = rate[i].normal
                            item.charge = rate[i].charge
                            item.weakWarning = rate[i].weakWarning
                            item.strongWarning = rate[i].strongWarning
                            item.offline = rate[i].offline
                        }
                    })
                    setCityList(list)
                }
            }
        })


    }

    useEffect(() => {
        getData()
    }, [])
    useEffect(() => {
        if (cityList && cityList.length) {
            queryWeather()
        }
    }, [cityList])

    useEffect(() => {
        if (cityList.length && rateList.length && statusList.length && dataObj || weather.length) {
            setIsLoading(false)
        }
    }, [cityList, weather, rateList, statusList, dataObj])















    const detail = useMemo(() => {
        let detail = []
        if (weather && weather.length) {
            for (let i = 0; i < weather.length; i++) {
                if (weather[i].daily.length === 7) {
                    const t = weather[i]
                    let obj = {}
                    obj['location'] = t.location
                    obj['cityNanme'] = t.cityName
                    obj['weather'] = []
                    for (let j = 0; j < 7; j++) {
                        const tt = t.daily[j]
                        obj['weather'].push({
                            icon: ICONSMAP[tt.textDay], day: tt.fxDate.substring(5),
                            weather: tt.textDay, temp: tt.tempMin + '°~' + tt.tempMax + '°',
                            wind: tt.windDirDay + tt.windScaleDay + '级',
                            precip: tt.precip + 'mm'
                        })
                    }
                    detail.push(obj)
                }
            }
            return detail
        }
        return []

    }, [weather])

    const queryWeather = async () => {
        if (cityList && cityList.length) {
            let list = []
            for (let i = 0; i < cityList.length; i++) {
                let cityName = cityList[i].cityName
                let location = cityList[i].location
                const res = await RouteRequest.get(`/query/weather/7d?location=${location}`)
                if (res?.daily?.length === 7) {
                    let weatherDetail = {}
                    weatherDetail['cityName'] = cityName
                    weatherDetail['location'] = location
                    weatherDetail['daily'] = res.daily
                    list.push(weatherDetail)
                }
            }
            setWeather(list)
        }

    }

    return (
        <>
            <Spin spinning={isLoading}>
                <div style={{ margin: '8px 0px', height: clientHeight + 360, width: '100%' }}>
                    <div style={{ display: 'flex' }}>
                        <div style={{ ...firstTwoStyle, position: 'relative', width: 'calc(100% - 600px)', margin: 10 }}>
                            <DeviceStatistics
                                dataObj={dataObj}
                                classifyList={classifyList}
                                statusList={statusList}
                                rateList={rateList}
                                listData={listData}
                                detail={detail}
                            />
                        </div>

                        <div style={{ ...firstTwoStyle, width: 570, margin: '10px 20px 10px 10px' }}>
                            <Area detail={detail} cityList={cityList} />
                        </div>
                    </div>
                    <div style={{ display: 'flex' }}>

                        <div style={{ ...secondTwoStyle, position: 'relative', width: 'calc(100% - 600px)', margin: 10 }}>
                            <Detail data={dataObj?.deviceData} recentData={dataObj?.recent1monthDeviceData} />
                        </div>

                        <div style={{ ...secondTwoStyle, width: 570, margin: '10px 20px 10px 10px' }}>
                            <Trend />
                        </div>
                    </div>

                </div>

            </Spin>
        </>
    )
}

function mapStateToProps (state) {
    const { auth, global } = state;
    return {
        user: auth.user,
        actions: global.actions,
        clientHeight: global.clientHeight,
        clientWidth: global.clientWidth,

    };
}

export default connect(mapStateToProps)(EnergyManagement);
