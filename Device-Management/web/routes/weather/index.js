const request = require('superagent');

let _weatherUrl = '';
const qweatherUrl = 'https://api.qweather.com/v7/weather/7d'
const qweatherKey = '8f5704332b95425c987dca82b5ea0a5e'
module.exports.entry = function (app, router, opts) {
    const { weatherUrl } = opts;
    _weatherUrl = weatherUrl;
    // _weatherUrl = "https://weatherssj.anxinyun.cn/weatherApp/weather/getImmeData"

    router.get('/query/weather', weather);
    router.get('/query/weather/7d', weather7day);
};

async function weather(ctx) {
    try {
        const { cname } = ctx.query;
        const reg = /.+?(省|市|自治区|自治州|县|区)/g;
        const arr = cname.match(reg);
        if (Array.isArray(arr)) {
            let cityName = arr[0];
            if (arr[1]) {
                cityName = arr[1];
            }
            const weatherRes = await request.post(_weatherUrl).send({ cityName });
            const { body } = weatherRes;
            if (body && body.data) {
                ctx.status = 200;
                ctx.body = { ...body.data, cname, texta: _weatherUrl };
            } else {
                ctx.status = 400;
                ctx.body = { msg: '获取天气错误' };
            }
        } else {
            ctx.status = 400;
            ctx.body = { msg: '地址解析错误' };
        }
    } catch (error) {
        console.log('[*err]', error);
        ctx.status = 400;
        ctx.body = error;
    }
}

async function weather7day(ctx) {
    try {
        const { location } = ctx.query;
        const weatherRes = await request.get(`${qweatherUrl}?key=${qweatherKey}&location=${location}`);
        const { body } = weatherRes;
        if (body) {
            ctx.status = 200;
            ctx.body = { ...body };
        } else {
            ctx.status = 400;
            ctx.body = { msg: '获取天气错误' };
        }
    } catch (error) {
        console.log('[*err]', error);
        ctx.status = 400;
        ctx.body = error;
    }
}

// ip地址识别库
// 淘宝IP地址查询接口：http://ip.taobao.com/service/getIpInfo.php?ip=1.1.35.57
// 腾讯IP地址查询接口：http://fw.qq.com/ipaddress
// 新浪的IP地址查询接口：http://int.dpool.sina.com.cn/iplookup/iplookup.php?format=js
// 新浪多地域测试方法：http://int.dpool.sina.com.cn/iplookup/iplookup.php?format=js&ip=218.192.3.42
// 搜狐IP地址查询接口（默认GBK）：http://pv.sohu.com/cityjson
// 搜狐IP地址查询接口（可设置编码）：http://pv.sohu.com/cityjson?ie=utf-8
// 搜狐另外的IP地址查询接口：http://txt.go.sohu.com/ip/soip
// 谷歌IP地址查询接口：http://j.maxmind.com/app/geoip.js
// 1616 IP地址查询接口：http://w.1616.net/chaxun/iptolocal.php
// 126 http://ip.ws.126.net/ipquery hao123
// http://app.hao123.com/ipquery/getcity.php?rtype=2
// 太平洋电脑网 http://whois.pconline.com.cn/