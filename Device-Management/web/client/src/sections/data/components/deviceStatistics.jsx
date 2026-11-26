import React, { useEffect, useState, useRef } from 'react'
import { connect } from 'react-redux'
import CardTitle from './cardTitle'
import moment from 'moment';
import { Progress, Tooltip } from 'antd'
import PerfectScrollbar from 'perfect-scrollbar'
import { MenuOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { render } from 'react-dom'
import RateModal from './rateModal'
import Card from './card'
import { jingdezhen, shangrao, jiujiang, xinyu, ganzhou, jian } from '../constants/border'
import './deviceStatisticsStyle.less'
import { powerIcon } from '../containers/energyManagement'

let map = null
let deviceStatisticsScroll

const deviceStatistics = props => {
    const [rateModalVis, setRateModalVis] = useState(false)
    const { dataObj, classifyList, statusList, rateList, listData, detail } = props
    const MAPDOMID = 'fs-amap-container'
    const srcPrefix = '/assets/images/data/'
    //图例标志数组
    const markList = [
        {
            id: 1,
            src: srcPrefix + 'green.png',
            name: '电量充足',
        },
        {
            id: 2,
            src: srcPrefix + 'yellow.png',
            name: '需充电',
        },
        {
            id: 3,
            src: srcPrefix + 'origin.png',
            name: '弱预警',
        },
        {
            id: 4,
            src: srcPrefix + 'red.png',
            name: '强预警',
        },
        {
            id: 5,
            src: srcPrefix + 'gray.png',
            name: '离线',
        },
    ]
    function addPolygon (data) {
        let polygon = new AMap.Polygon({
            path: data,
            fillColor: '#ccebc5',
            strokeOpacity: 1,
            fillOpacity: 0.5,
            strokeColor: '#2b8cbe',
            strokeWeight: 1,
            strokeStyle: 'dashed',
            strokeDasharray: [5, 5],
        });
        polygon.on('mouseover', () => {
            polygon.setOptions({
                fillOpacity: 0.7,
                fillColor: '#7bccc4'
            })
        })
        polygon.on('mouseout', () => {
            polygon.setOptions({
                fillOpacity: 0.5,
                fillColor: '#ccebc5'

            })
        })
        map.add(polygon);
    }
    // function getIconName(power) {
    //     return power > 80 ? 'green' : power > 50 ? 'softWarning' : power > 0 ? 'yellow' : 'red';
    // }
    // function addMarker(longitude, latitude, iconName, title, zooms) {
    //     const marker = new window.AMap.Marker({
    //         position: new window.AMap.LngLat(longitude, latitude),
    //         offset: new window.AMap.Pixel(-10, -10),
    //         icon: `/assets/images/data/${iconName}.png`,
    //         title: title,
    //         zooms: zooms,
    //     });
    //     map.add(marker);
    //     return marker;
    // }
    // 地图初始化
    const loadMap = () => {
        map = new window.AMap.Map(MAPDOMID, {
            center: [116.054664, 28.538966],
            zoomEnable: true,
            dragEnable: true,
            viewMode: '3D',
            pitch: 22.9,
            labelzIndex: 130,
            zoom: 8,
            cursor: 'pointer',
            mapStyle: 'amap://styles/8c94987388bc76acb45d5a79805417ec',
            layers: []

        })
        addPolygon(jingdezhen)
        addPolygon(shangrao)
        addPolygon(jiujiang)
        addPolygon(xinyu)
        addPolygon(ganzhou)
        addPolygon(jian)

        let outMarker = []
        dataObj?.structureData?.map((item, index) => {
            let lowestPower
            listData?.find(i => i.projectId === item.projectId)?.structures?.find(q => q.structureId === item.structureId)?.devices.forEach((pp, index) => {
                // console.log('pppppp',pp)
                if (pp.data !== '') {
                    const data = pp.data
                    if (data < lowestPower || lowestPower === undefined) {
                        lowestPower = data
                    }
                }
            })
            let iconStr = powerIcon(lowestPower)

            var marker = new window.AMap.Marker({
                position: new window.AMap.LngLat(item.longitude, item.latitude),
                offset: new window.AMap.Pixel(-10, -10),
                icon: `/assets/images/data/${iconStr}.png`,
                title: item.structureName,
                zooms: [3, 10.90],
            })
            marker.on('click', (e) => {
                let inMarker = []
                listData?.find(i => i.projectId === item.projectId)?.structures?.find(q => q.structureId === item.structureId)?.devices.forEach((pp, index) => {
                    let marker1
                    if (pp.data !== '') {
                        let power = pp.data
                        let secondIcon = powerIcon(power)
                        marker1 = new window.AMap.Marker({
                            position: new window.AMap.LngLat(item.longitude + index / 10, item.latitude + index / 10),
                            offset: new window.AMap.Pixel(-10, -10),
                            icon: `/assets/images/data/${secondIcon}.png`,
                            title: item.structureName + ':' + pp.deviceName,
                            zooms: [10.95, 18],
                        })
                        marker1.on('click', () => {
                            let position = marker1.getPosition ? marker1.getPosition() : marker1.getCenter()
                            infowindowFn(position, index, { power: power, deviceName: pp.deviceName, structureName: item.structureName, projectName: item.projectName })
                        })
                        inMarker.push(marker1)

                    }

                })
                map.add(inMarker)
                map.setCenter([item.longitude, item.latitude])
                map.setZoom(11)
            })
            outMarker.push(marker)

        })
        map.add(outMarker)
    }
    // 弹框详情
    const infowindowFn = (position, id, data,) => {
        const mathId = Math.floor(Math.random() * 90000) + 10000
        let infowindow = new AMap.InfoWindow({
            isCustom: true,  //使用自定义窗体
            content: `<div id="map-content" class="water-gis-infowindow">
                  <div id="contentid${mathId}"></div></div>`,
        })
        infowindow.open(map, position)
        map.setCenter(position)
        setTimeout(() => {
            if (document.getElementById(`contentid${mathId}`)) {
                render(<Card map={map} detailList={data} id={id} />,
                    document.getElementById(`contentid${mathId}`))
            }
        }, 50)
    }
    useEffect(() => {
        const deviceStatisticsScrollDom = document.getElementById('deviceStatistics')
        if (deviceStatisticsScrollDom) {
            deviceStatisticsScroll = new PerfectScrollbar('#deviceStatistics', {
                suppressScrollX: true,
            })
        }
        //阻止地图容器的冒泡
        var mapContainer = document.getElementById('fs-amap-container')
        mapContainer.addEventListener('mousewheel', function (event) {
            event.stopPropagation()
        })
    }, [])
    useEffect(() => {
        if (JSON.stringify(dataObj) != '{}') {
            loadMap()
            //    setTimeout(()=>{

            //    },1000)

            // const projectName=listData?.find(i => i.projectId === item.projectId)?.projectName
            // const icon=detail.find(i=>projectName.includes(i.cityName))?.weather[0]?.icon
            // var marker2=new window.AMap.Marker({
            //     position: new window.AMap.LngLat(item.longitude+0.8, item.latitude+0.3),
            //     offset: new window.AMap.Pixel(-10, -10),
            //     icon: icon,
            //     // title: item.structureName,
            //     zooms: [3, 16],
            // })
            // map.add(marker2)
        }

    }, [dataObj])
    useEffect(() => {
        if (listData && listData.length && detail && detail.length && map) {
            for (let item of listData) {
                let projectName = item.projectName
                let struct = dataObj?.structureData?.find(i => i.projectId === item.projectId)
                let icon = detail.find(i => projectName.includes(i.cityNanme))?.weather[0]?.icon
                const content = `<div class="custom-content-marker">
                <img src="${icon}" class="imgStyle">
                </div>`
                var marker2 = new window.AMap.Marker({
                    content: content,
                    position: new window.AMap.LngLat(struct.longitude, struct.latitude),
                    offset: new window.AMap.Pixel(-10, -10),
                    icon: icon,
                    zooms: [3, 16]
                })
                map.add(marker2)
            }
        }
    }, [listData, detail])
    // console.log('rateList',)
    return (
        <>
            <div className='statistics-card'>
                <CardTitle englishName='STATISTICS OF DEVICE' chineseName='设备统计' isWithHelp={true}
                    content={<article>
                        <p>分别按照设备电量和监测类型进行设备分类统计</p>
                        <p> 滑坡仪：一个结构物就是一个滑坡仪，整个结构物下设备在线率超过70%算在线，低于70%算离线</p>
                        <p>设备：当24h内一个设备下传感器在线数超70%，则判断该设备在线。</p>
                    </article>}></CardTitle>
                <div className='statistics-card-content'>
                    <div className='statistics-card-content-title'>
                        <div>设备总数：{dataObj?.total}</div>
                        <img src='/assets/images/data/shujutongji.png' />
                    </div>
                    {/* 按照状态分类的 */}
                    {classifyList?.map((item, index) => (
                        <div key={item.id} className='statistics-card-content-progress'>
                            <div style={{ marginRight: 5, width: 56 }}>{item.name}</div>
                            <Progress style={{ width: 160 }} percent={Number(item.percent)} stroke={item.stroke} />
                            <span className='total' style={{ marginLeft: 5 }}>
                                {item.total}
                            </span>
                        </div>
                    ))}
                    {/* 按照设备类型分类 */}
                    <div className='statistics-card-content-title'>
                        <div>设备总数：{dataObj?.statusTotal}</div>
                        <img src='/assets/images/data/statusshujutongji.png' />
                    </div>
                    <div id='deviceStatistics'>
                        {statusList?.map((item, index) => (
                            <div key={item.id} className='statistics-card-content-progress'>
                                <div
                                    title={item.name}
                                    style={{ marginRight: 5, width: 56, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {item.name}
                                </div>
                                <Progress style={{ width: 160 }} percent={Number(item.percent)} stroke='#307EFB' />
                                <span className='total'>{item?.total}</span>
                            </div>
                        )) || '暂无数据'}
                    </div>
                </div>
            </div>
            <div className='rate'>
                <div className='flexs'>
                    <Progress
                        percent={ Math.round(
                            ((rateList?.reduce((p, c) => p + c.onLine, 0)) / 
                            (rateList?.reduce((p, c) => p + c.total, 0))) * 100 * 100
                          ) / 100 || 0}
                        width={45}
                        strokeLinecap='square'
                        type='circle'
                        style={{ margin: 10 }}
                        aria-label='disk usage'
                        showInfo
                        format={() => <img src='/assets/images/data/deviceRate.png' />}
                    />
                    <div>
                        <div className='percent'>{
                            ( Math.round(
                                ((rateList?.reduce((p, c) => p + c.onLine, 0)) / 
                                (rateList?.reduce((p, c) => p + c.total, 0))) * 100 * 100
                              ) / 100 || 0) + '%'
                        }</div>
                        <div className='divide'></div>
                        <div className='rate-mean'>设备在线率</div>
                    </div>
                </div>
                <div className='flexs set'>
                    <Progress
                        percent={ Math.round(
                            ((rateList?.reduce((p, c) => p + c.huapoyiOnlineCount, 0)) / 
                            (rateList?.reduce((p, c) => p + c.huapoyiCount, 0))) * 100 * 100
                          ) / 100 || 0}
                        width={45}
                        strokeLinecap='square'
                        type='circle'
                        style={{ margin: 10 }}
                        aria-label='disk usage'
                        showInfo
                        format={() => <img src='/assets/images/data/landslideInstrumentRate.png' />}
                    />
                    <div>
                        <div className='percent'>{
                            (Math.round(
                                ((rateList?.reduce((p, c) => p + c.huapoyiOnlineCount, 0)) / 
                                (rateList?.reduce((p, c) => p + c.huapoyiCount, 0))) * 100 * 100
                              ) / 100 || 0) + '%'
                        }</div>
                        <div className='divide'></div>
                        <div className='rate-mean'>滑坡仪在线率</div>
                    </div>
                </div>
                <div
                    className='rate-setup'
                    onClick={() => {
                        setRateModalVis(true)
                    }}>
                    <MenuOutlined style={{ color: '#005ABD' }} />
                </div>
            </div>
            <div className='legend-style'>
                {markList.map((item, index) => (
                    <>
                        <div key={item.id} className='legend-mark'>
                            <div style={{ width: '30%', textAlign: 'left', flex: 1 }}>
                                <img src={item.src} style={{ display: 'block', margin: '0 auto' }} />
                            </div>
                            <div style={{ flex: 1 }}>{item.name}</div>
                        </div>
                    </>
                ))}
            </div>
            <div className='toolTip'>
                <Tooltip content={
                    <article>
                        <p>电量等级分类 ：0（离线）、0-10（强预警）、10-33（弱预警）、33-66（需充电）、66-100（电量充足）</p>
                        <p>GIS第一层级展示结构物位置，电量等级根据下属最差设备进行颜色展示</p>
                        <p>GIS第二层级展示地理区域下所有设备，点击点位可查看最新上报的电量数据</p>
                    </article>
                }><QuestionCircleOutlined /></Tooltip>
            </div>
            <div className='gis' id={MAPDOMID}></div>

            {rateModalVis && (
                <RateModal
                    data={rateList}
                    rateModalVis={rateModalVis}
                    onCancel={() => {
                        setRateModalVis(false)
                    }}></RateModal>
            )}
        </>
    )
}

function mapStateToProps (state) {
    const { global } = state
    return {
        actions: global.actions,
    }
}

export default connect(mapStateToProps)(deviceStatistics)
