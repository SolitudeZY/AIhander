import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import ReactECharts from 'echarts-for-react';
import echarts from 'echarts';
import { Spin, Card, Radio, Form, Button } from 'antd';
import TableShow from './tableShow';
import TreeShow from './treeShow';



const Network = ({
    dispatch, actions, user, clientHeight, networkWeb,
    projectPoms, pepProjectId, organizationsStruc
}) => {

    const { analysis } = actions
    const [show, setShow] = useState('tree')
    const [projectList, setProjectList] = useState([])  //项目列表
    const [projectValue, setProjectValue] = useState()  //选中的项目
    const [thingId, setThingId] = useState()  //结构物thingId
    const [spinning, setSpinning] = useState(true)
    const form = useRef();//表单



    useEffect(() => {
        setSpinning(true)
        let projectData = []
        let project = projectPoms.filter(v => v.pepProjectIsDelete != 1)
        if (projectPoms?.length) {
            if (pepProjectId) {
                if (pepProjectId?.length) {
                    let projectId = pepProjectId + ',-1'
                    projectData = project?.filter(d => projectId?.includes(d.id?.toString()))
                } else {
                    projectData = project?.filter(d => d.id == pepProjectId)
                }
            } else {
                projectData = [...project]
            }
        }
        setProjectList(projectData?.map(d => ({ value: d.id, label: d.name || d.pepProjectName })))
        setProjectValue(projectData[0]?.id)
        form.current.setValue('projectId', projectData[0]?.id)
    }, [projectPoms, pepProjectId])

    useEffect(() => {
        //获取当前选中项目的结构物列表
        if (projectValue) dispatch(analysis.getOrganizationsStruc(projectValue))
    }, [projectValue])

    useEffect(() => {
        //获取当前选中项目的结构物列表
        if (organizationsStruc?.length) {
            setThingId(organizationsStruc[0]?.thingId)
            form.current.setValue('thingId', organizationsStruc[0]?.thingId)
        } else {
            setThingId("")
            form.current.setValue('thingId', "")
        }
    }, [organizationsStruc])

    useEffect(() => {
        // 获取iframe元素
        const iframe = document.getElementById('myIframe');
        if (iframe) {
            // 监听iframe的load事件
            iframe.addEventListener('load', function () {
                setSpinning(false)
                // 在这里可以执行一些处理，表示iframe加载完毕
            });
        }

    }, [])

    return (
        <>
            <div style={{ background: '#FFFFFF', margin: '8px 12px', padding: '20px 20px 0px 20px', height: clientHeight - 72, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: 0, height: 20, borderLeft: '3px solid #005ABD', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }}></div>
                        <div style={{ fontFamily: "YouSheBiaoTiHei", fontSize: 24, color: '#101531', marginLeft: 8 }}>一图统揽</div>
                        <div style={{ marginLeft: 6, fontSize: 12, color: '#969799', fontFamily: "DINExp", }}>PICTURE CENTRALIZE</div>
                    </div>
                </div>
                <div style={{ marginRight: 20, display: 'flex', alignItems: 'center' }} >
                    <Form
                        getFormApi={(formApi) => (form.current = formApi)}
                        layout="horizontal"
                        style={{ position: "relative", width: "100%", flex: 1, display: 'flex', margin: "16px 0" }}
                    >
                        <Form.Select
                            filter
                            // allowClear
                            label='项目选择'
                            field="projectId"
                            labelPosition="left"
                            placeholder="请选择项目选择"
                            style={{ width: 200, marginRight: 10, }}
                            // value={projectValue}
                            options={projectList || []}
                            onSelect={v => {
                                if (projectValue != v) {
                                    setProjectValue(v)
                                    setSpinning(true)
                                    form.current.setValue('projectId', v)
                                }
                            }}
                        />
                        <Form.Select
                            label='结构物选择:'
                            labelPosition="left"
                            field='thingId'
                            style={{ width: 200, }}
                            placeholder="请选择结构物选择"
                            filter
                            // allowClear
                            options={organizationsStruc?.map(d => ({ value: d.thingId, label: d.strucName })) || []}
                            onSelect={v => {
                                if (thingId != v) {
                                    setSpinning(true)
                                    setThingId(v)
                                    form.current.setValue('thingId', v)
                                }
                            }}
                        />
                    </Form>

                </div>



                <Spin
                    childStyle={{ width: "100%", height: clientHeight - 188 }}
                    spinning={spinning}>
                    <div id='show' style={{ width: "100%", height: "100%" }}>
                        <iframe
                            id="myIframe"
                            style={{
                                width: '100%',
                                height: '100%',
                                zIndex: 7, border: 0
                            }}
                            src={`${networkWeb}/network?key=${user?.token}&strucData=${JSON.stringify(organizationsStruc?.find(v => v.thingId == thingId) || {})}`}
                            allowFullScreen
                        >
                            <p>你的浏览器不支持 iframe 。</p>
                        </iframe>


                    </div>
                </Spin>

                {/* <div id='show' style={{ width: "100%", height: "calc(100% - 106px)" }}>
               <div style={{
                  display: "flex", alignItems: 'center', justifyContent: "space-between",
                  borderBottom: '1px solid rgb(184 176 176 / 60%)', padding: 10
               }}>
                  <div>设备总数: 222 个; 异常设备:0 个; 正常设备:222 个</div>
                  <Radio type='button' buttonSize='large' defaultValue={"tree"} name="demo-radio-small"
                     onChange={e => {
                        setShow(e.target?.value)
                     }}
                  >
                     <Radio value={"tree"}>树状展示</Radio>
                     <Radio value={"table"}>表格展示</Radio>
                  </Radio>
                  <div>
                     <Button
                        theme="solid"
                        type="primary"
                        style={{
                           width: 80,
                           height: 32,
                           borderRadius: 2,
                           background: '#FFFFFF',
                           color: '#005ABD',
                           border: '1px solid #005ABD'
                        }}
                        onClick={() => {

                        }}
                     >

                     </Button>
                     <Button
                        theme="solid"
                        type="primary"
                        style={{
                           width: 80,
                           height: 32,
                           borderRadius: 2,
                           marginRight: 32,
                           background: '#FFFFFF',
                           color: '#005ABD',
                           border: '1px solid #005ABD'
                        }}
                        onClick={() => { setShow() }}
                     >
                        表格展示
                     </Button>
                  </div>
               </div>
               {show == 'tree' && <TreeShow thingId={thingId} />}
               {show == 'table' && <TableShow thingId={thingId} project={projectValue} />
               }
            </div > */}
            </div >



        </>
    )
}

function mapStateToProps (state) {
    const { auth, global, ProjectPoms, organizationsStruc } = state;
    return {
        user: auth.user,
        actions: global.actions,
        clientHeight: global.clientHeight,
        projectPoms: ProjectPoms?.data?.rows || [],
        pepProjectId: global.pepProjectId,
        organizationsStruc: organizationsStruc?.data || [],  //结构物选择列表
        networkWeb: global.networkWeb,

    };
}

export default connect(mapStateToProps)(Network);
