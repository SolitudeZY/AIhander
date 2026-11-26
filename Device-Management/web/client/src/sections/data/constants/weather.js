export const WEATHERArr = [
    {
        lbl: '未知',
        key: 'weizhi',
    },
    {
        lbl: '暴雪',
        key: 'baoxue',
    },
    {
        lbl: '多云',
        key: 'duoyun',
    },
    {
        lbl: '浮沉',
        key: 'fucheng',
    },
    {
        lbl: '雷阵雨',
        key: 'leizhengyu',
    },
    {
        lbl: '霾',
        key: 'mai',
    },
    {
        lbl: '强沙尘暴',
        key: 'qiangshachengbao',
    },
    {
        lbl: '晴',
        key: 'qing',
    },
    {
        lbl: '沙尘暴',
        key: 'shachengbao',
    },
    {
        lbl: '特大暴雨',
        key: 'tedabaoyu',
    },
    {
        lbl: '雾',
        key: 'wu',
    },
    {
        lbl: '小雪',
        key: 'xiaoxue',
    },
    {
        lbl: '小雨',
        key: 'xiaoyu',
    },
    {
        lbl: '扬沙',
        key: 'yangsha',
    },
    {
        lbl: '阴',
        key: 'yingtian',
    },
    {
        lbl: '雨夹雪',
        key: 'yujiaxue',
    },
    {
        lbl: '阵雨',
        key: 'zhenyu',
    },
    {
        lbl: '中雪',
        key: 'zhongxue',
    },
    {
        lbl: '中雨',
        key: 'zhongyu',
    },
    {
        lbl: '大雨',
        key: 'dayu',
    },
    {
        lbl: '暴雨',
        key: 'dayu',
    },
    {
        lbl: '大暴雨',
        key: 'dayu',
    },
];
export const WEATHERMARGIN = 1 * 60 * 60 * 1000;
export let ICONSMAP = {};

WEATHERArr.forEach(({ lbl, key }) => {
    const icon = `/assets/images/data/weather/${key}.png`;
    ICONSMAP[lbl] = icon;
});