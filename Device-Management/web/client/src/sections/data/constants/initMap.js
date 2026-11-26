let map=null
 const loadMap = () => {
    map = new window.AMap.Map('modalMapContainer', {
        center: [116.054664, 28.538966],
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
    var marker = new window.AMap.Marker({
        position: new window.AMap.LngLat(116.054664, 28.538966),
        offset: new window.AMap.Pixel(-10, -10),
        icon: '/assets/images/data/green.png', // 添加 Icon 图标 URL
        title: '北京',
        zooms: [3, 9]
    });
    var marker1 = new window.AMap.Marker({
        position: new window.AMap.LngLat(116.054664, 28.538966),
        offset: new window.AMap.Pixel(-10, -10),
        icon: '/assets/images/data/red.png', // 添加 Icon 图标 URL
        title: '北京',
        zooms: [10, 16]
    });
    map.add(marker);
    map.add(marker1);
    marker.on('click', (e) => {
        map.setCenter([116.054664, 28.538966])
        map.setZoom(10)
    })


};

export default loadMap