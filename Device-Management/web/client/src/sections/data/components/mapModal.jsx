import React, { useEffect, useState, } from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import Card from './card';
import { render } from 'react-dom';
// import loadMap from '../constants/initMap';
import { powerIcon } from '../containers/energyManagement';

let map = null
const mapId = 'amap-container'
const MapModal = (props) => {
    const { mapModalVis, onCancel, longitudeAndLatitude, power, record } = props
    // console.log('record1',record)
    useEffect(() => {
        setTimeout(() => {
            const div = document.getElementById(mapId)
            if (mapModalVis && div && record) {
                loadMap()
            }
        }, 2000);
    }, [mapModalVis, record]);

    const loadMap = () => {
        // 图片图层 实现瓦片地图中国地图样式 bounds 第一个点为左下角 第二个点为右上角
        const imageLayer = new window.AMap.ImageLayer({
            url: '/assets/images/data/map.svg',
            bounds: new window.AMap.Bounds(
                [114.43534091, 24.31459741],
                [116.76103701, 30.01778765]
            ),
            zooms: 8,
        });

        map = new window.AMap.Map(mapId, {
            center: [record?.longitude, record?.latitude],
            zoomEnable: true,
            dragEnable: true,
            viewMode: '3D',
            pitch: 22.9,
            labelzIndex: 130,
            zoom: 8,
            cursor: 'pointer',
            mapStyle: 'amap://styles/8c94987388bc76acb45d5a79805417ec',
            layers: [
                window.AMap.createDefaultLayer(),
                // imageLayer,
            ],
        });
        let iconStr = powerIcon(power)
        var marker = new window.AMap.Marker({
            position: new window.AMap.LngLat(record?.longitude, record?.latitude),
            offset: new window.AMap.Pixel(-10, -10),
            icon: `/assets/images/data/${iconStr}.png`,
            title: record?.deviceName,
            zooms: [3, 20],

        });
        map.add(marker);
        marker.on('click', async () => {
            let position = marker.getPosition ? marker.getPosition() : marker.getCenter()
            infowindowFn(position, record?.deviceId,
                { power: power, deviceName: record?.deviceName, structureName: record?.structureName, projectName: record.projectName })
        })
        // marker.on('click', (e) => {
        //     map.setCenter([116.054664, 28.538966])
        //     map.setZoom(10)
        // })

        // map.on('complete', () => {
        //     setDelay(false)
        //     // tab == 'home' && map && renderMarkers()
        // });

        // map.on('click', (e) => {
        //     if (!e && !e.lnglat) {
        //         return
        //     }

        //     const zoom = map.getZoom();
        //     const pitch = map.getPitch();
        //     const center = map.getCenter();
        //     const Rotation = map.getRotation();
        //     console.log('zoom' + zoom)
        //     console.log('pitch' + pitch)
        //     console.log('center' + center)
        //     console.log('Rotation' + Rotation)
        //     console.log('e.lnglat' + e.lnglat)
        // })


    };
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

    return (
        <>
            <Modal open={mapModalVis}
                dest
                footer={null}
                closeIcon={<ClearOutlined style={{ color: '#005ABD' }} />}
                onCancel={onCancel}
                width={800}
            >
                <div id={mapId} style={{ width: 1000, height: 1000 }}></div>
            </Modal>
        </>
    )
}

function mapStateToProps (state) {
    const { } = state;
    return {

    };
}

export default connect(mapStateToProps)(MapModal);
