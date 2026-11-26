
import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Table, Button, Alert, Spin, Pagination, Tooltip } from 'antd';
// import { ApiTable } from '../../../../utils/webapi';
import { QuestionCircleOutlined } from '@ant-design/icons';
import FileSaver from 'file-saver';
import moment from 'moment';
import '../style.less'
import { vibration_time_columns, vibration_ffts_columns } from '../constants';
const DataTableComponent = (props) => {
    const { dataList, setQueryParams, queryParams, dispatch, actions, user, sensorId, endTime, project, startTime, factorId, vibrationFftsData, vibrationRawsData, factorType } = props
    const [currentPage, setCurrentPage] = useState(1);
    const [exportingFlag, setExportingFlag] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);
    const [hasRaws, setHasRaws] = useState(false)
    const [hasFfts, setHasFfts] = useState(false)
    const [fftsDataFrequencies, setFftsDataFrequencies] = useState([])
    const [fftTableData, setFftTableData] = useState([])
    const [rawsDataValues, setRawsDataValues] = useState([])
    const [rawTableData, setRawTableData] = useState([])
    const [rawsCfg, setRawsCfg] = useState({})
    // const [exportings, setExportings] = useState(false)
    const [ffKey, setFfkey] = useState('frequency')
    // const [arr,setArr]=useState({})
    const [data, setData] = useState([])
    const [exportUrl, setExportUrl] = useState('')
    // const [list,setList]=useState(dataList.sensors)
    const [columns, setColumns] = useState([])

    // useEffect(() => {
    //   if (exportUrl) {
    //     <iframe src={`/_api/${exportUrl}`} style={{ display: 'none' }} />
    //     setIsRequesting(false)
    //   }
    // }, [exportUrl])
    //初始化  
    // useEffect(()=>{
    //     setArr(dataList.items)
    // },[dataList])
    useEffect(() => {
        // setFftTableData([])
        // setRawTableData([])
        // setRawsCfg({})
        // setRawsDataValues([])
        setHasRaws(false)
        setHasFfts(false)
        let rawTableData = []
        let rawsDataValues = []
        let rawsCfg = {}
        if (vibrationRawsData.length) {
            vibrationRawsData.map((e) => {
                const { data = [], config = {} } = e?.data || {};
                rawsCfg = { ...config };
                if (data && data.length) {
                    setHasRaws(true)
                    data.sort((a, b) => (Number(a.time) > Number(b.time) ? 1 : -1));
                    rawsDataValues = data.map((d) => d?.value);
                    rawTableData = data.map((item, index) => ({
                        index: index + 1,
                        time: Number(item.time),
                        value: Number(item.value),
                    }));
                }
            })
            setRawsCfg(rawsCfg)
            setRawTableData(rawTableData)
            setRawsDataValues(rawsDataValues.sort((a, b) => Math.abs(Number(b)) - Math.abs(Number(a))))
        }
        let fftsDataFrequencies = []
        let fftTableData = []
        // const ffKey = 'frequency'
        if (vibrationFftsData.length) {
            vibrationFftsData.map((e) => {
                const { data = [], } = e?.data || {};
                if (data && data.length) {
                    setHasFfts(true)
                    data.sort((a, b) => (a[ffKey] > b[ffKey] ? 1 : -1));
                    fftsDataFrequencies = data.map((d) => ({ value: d?.value, [ffKey]: d?.[ffKey] }));
                    fftTableData = data.map((item, index) => ({
                        index: index + 1,
                        time: item[ffKey],
                        value: item.value.toFixed(3),
                    }));
                }

            });
            setFftsDataFrequencies(fftsDataFrequencies.sort((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value))))
            setFftTableData(fftTableData)
        }

    }, [vibrationFftsData, vibrationRawsData])

    const getSearchData = (dataList) => {
        const data1 = []
        let arr = dataList.items
        if (JSON.stringify(dataList) != "{}") {
            let themeItems = dataList.items
            let themeStations = dataList.sensors
            for (let i = 0; i < themeStations.length; i++) {
                for (let k = 0; k < themeStations[i].data.length; k++) {
                    let cdataT = {}
                    let startT = "";
                    let endT = "";
                    let dataTS = themeStations[i].data[k];
                    cdataT.key = `station-${themeStations[i].id}-${k}`;
                    cdataT.position = themeStations[i].name;
                    cdataT.acqTime = moment(dataTS.time).format('YYYY-MM-DD HH:mm:ss');
                    cdataT.realTime = moment(dataTS.time).valueOf();
                    if (startT == "") {
                        startT = dataTS.time;
                        endT = dataTS.time;
                    } else {
                        if (moment(startT) >= moment(dataTS.time))
                            startT = dataTS.time;
                        if (moment(endT) <= moment(dataTS.time))
                            endT = dataTS.time;
                    }
                    //动态列的值
                    for (let themeItem in arr) {
                        cdataT[themeItem] = dataTS.values[themeItem];
                    }
                    data1.push(cdataT)
                }
            }
        }
        return data1
    }





    useEffect(() => {
        let arr = dataList.items
        // debugger
        // let arr=[{readingNumber:{name: '电表示数', unit: 'kWh'}}]
        // let dataSource = [{values: {total: 24138.97}, time: "2023-11-03 14:18:27.000"},{values: {total: 24138.97}, time: "2023-11-03 14:18:27.000"}]
        let columns = []
        columns.push({
            title: '设备位置',
            dataIndex: 'position',
            key: 'position',
        });
        for (let index in arr) {
            columns.push({
                title: arr[index].name + '(' + arr[index].unit + ')',
                dataIndex: index,
                sorter: (a, b) => b[index] - a[index],
                key: index,
            })
        };
        columns.push({
            title: '采集时间',
            dataIndex: 'acqTime',
            sorter: (a, b) => b['realTime'] - a['realTime'],
            key: 'acqTime',
        });
        //设备
        // console.log('dataList',dataList)   
        const data2 = getSearchData(dataList)
        setData(data2)
        setColumns(columns)
    }, [dataList])



    const exportCsvs = (data, title, filename) => {
        // setExportings(true)
        const strs = `\uFEFF${[title].concat(data.map((d) => [d.index, d.time, d.value].join(','))).join('\r\n')}`;
        const blob = new Blob([strs], { type: 'text/csv' });
        FileSaver.saveAs(blob, `${filename}.csv`);
        // setExportings(false)
    };

    //   useEffect(()=>{
    //     if(exporting){
    //         exportCsvs
    //     }
    //   },[exporting])

    const exporting = () => {
        setIsRequesting(true)
        let url = `structure/factors/sensors/data/detail?token=${user.token}&sensorId=${sensorId}&timestamp=${moment().valueOf()}&toExport=1&factorId=${factorId}&startTime=${startTime}&endTime=${endTime}`
        setExportUrl(url)
        // await dispatch(actions.data.exportFile(data, columns))
        setIsRequesting(false)

    }
    const getData = (limit, pageSize) => {
        //表格详细数据
        let query = {
            factorId: factorId ? factorId : -1,
            sensorId: sensorId,
            startTime,
            endTime
        }
        dispatch(actions?.data?.getMonitorData({ ...query, limit: limit, page: pageSize })).then(res => {
            if (res.success) {
                const data3 = getSearchData(res.payload.data)
                setData(data3)
            }
        })
    }
    const pageChange = (page, pageSize) => {
        setCurrentPage(page);
    };

    const exportCsv = (data, title, filename) => {
        setExportingFlag(true);
    };

    const exportVibrationCsv = (data, title, filename) => {
        setExportingFlag(true);
    };

    const renderViberationChart = () => {
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [props]);



    return (
        <div>
            <Spin spinning={isRequesting}>
                <div>
                    <p style={{ textAlign: 'right', margin: 8 }}>
                        {
                            data.length ? <div style={{ display: 'flex', justifyContent: 'flex-end' }}><a style={{ cursor: 'pointer' }} onClick={exporting}>导出</a><span style={{ paddingTop: 2 }}><Tooltip
                                content={'最多导出最新10000条数据'}
                            ><QuestionCircleOutlined className={{ marginTop: 10 }} /></Tooltip></span></div> : null
                        }
                    </p>
                    <Table dataSource={data} columns={columns} pagination={false} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ lineHeight: "30px", fontSize: 13, color: 'rgba(0,90,189,0.8)' }}>
                            共{dataList?.count}条数据
                        </span>
                        <Pagination
                            total={dataList?.count}
                            showSizeChanger
                            current={queryParams?.page + 1}
                            pageSizeOpts={[10, 20, 30, 40]}
                            onChange={(currentPage, pageSize) => {
                                setQueryParams({ limit: pageSize, page: currentPage - 1 })
                                getData(pageSize, currentPage - 1)
                            }}
                        />
                    </div>
                </div>
            </Spin>
            {
                exportUrl ? <iframe src={`/_api/${exportUrl}`} style={{ display: 'none' }} /> : ''
            }
            {hasFfts && hasRaws ? (
                <>
                    <div className="A14" style={{ lineHeight: '27px', height: 54, paddingLeft: 10, backgroundColor: '#eee' }}>
                        <div style={{ fontSize: 12 }}>
                            <span style={{ marginLeft: 0 }}>
                                采样频率:
                                {rawsCfg.sampleFreq}
                            </span>
                            <span style={{ marginLeft: 20 }}>
                                采样点数:
                                {rawsCfg.count}
                            </span>
                        </div>
                        <div style={{ fontSize: 12, display: 'flex', flexDirection: 'row' }}>
                            <div style={{ marginRight: 25 }}>
                                <span>
                                    最大点幅值:
                                    {rawsDataValues[0]}
                                </span>
                                <span style={{ marginLeft: 20 }}>
                                    次大点幅值:
                                    {rawsDataValues[1]}
                                </span>
                                <span style={{ marginLeft: 20 }}>
                                    第三大点幅值:
                                    {rawsDataValues[2]}
                                </span>
                            </div>
                            <div>
                                <span>
                                    最大点频率:
                                    {fftsDataFrequencies[0]?.[ffKey]}
                                </span>
                                <span style={{ marginLeft: 20 }}>
                                    次大点频率:
                                    {fftsDataFrequencies[1]?.[ffKey]}
                                </span>
                                <span style={{ marginLeft: 20 }}>
                                    第三大点频率:
                                    {fftsDataFrequencies[2]?.[ffKey]}
                                </span>
                            </div>
                        </div>
                    </div>


                    <div style={{ display: 'flex' }}>
                        <div className="data-table-container" style={{ width: '50%', marginBottom: 10 }}>
                            <div style={{
                                marginBottom: 5, padding: '0 10px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            }}
                            >
                                <div style={{}}>时域图数据表</div>
                                <div style={{}}><Button disabled={rawTableData.length < 1} onClick={() => exportCsvs(rawTableData, 'index,time,value', 'raw')}>导出</Button></div>
                            </div>
                            <div style={{ padding: '1px 2px' }}>
                                <Table size="middle" columns={vibration_time_columns} dataSource={rawTableData} />
                            </div>
                        </div>
                        <div className="data-table-container" style={{ width: '50%', marginBottom: 10 }}>
                            <div style={{
                                marginBottom: 5, padding: '0 10px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            }}
                            >
                                <div style={{}}>频谱图数据表</div>
                                <div style={{}}><Button disabled={fftTableData.length < 1} onClick={() => exportCsvs(fftTableData, `index,${[ffKey]},value`, 'fft')}>导出</Button></div>
                            </div>
                            <div style={{ padding: '1px 2px' }}>
                                <Table size="middle" columns={vibration_ffts_columns} dataSource={fftTableData} />
                            </div>
                        </div>
                    </div> </>) : ''}


        </div>
    );
};

const mapStateToProps = (state) => {
    const { auth, global, dataContinuityType, dataContinuity, pepProjectId } = state;
    return {
        user: auth.user,
        actions: global.actions,
        dataContinuityType: dataContinuityType.data || [],
        dataContinuity: dataContinuity.data || [],
        pepProjectId: global.pepProjectId,
    };
};

export default connect(mapStateToProps)(DataTableComponent);