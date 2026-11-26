import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Modal, Form, Select } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';


function adminModal (props) {
    const {
        close,
        cancel,
        open,
        dispatch,
        pepList,
        actions,
        adminEdit,//是否是编辑
        editObj,
    } = props;
    const { install } = actions;
    const [form] = Form.useForm();//表单
    const isMountedRef = useRef(true); // 组件挂载状态
    const [disablePeople, setDisablePeople] = useState(true); //页码信息
    const [peopleList, setPeopleList] = useState([]); //人员List
    const [departmentId, setDepartmentId] = useState(); //部门id
    const [peopleId, setPeopleId] = useState(); //人员id
    //初始化
    useEffect(() => {
        if (editObj.id) {
            let departmentList = []
            for (let i = 0; i < pepList.length; i++) {
                if (pepList[i].id == editObj.departments[0].id) {
                    let allusers=[]
                    pepList[i]?.departmentUsers?.forEach(depUser=>{
                            if(!allusers.some(item=>item.userId===depUser.userId)){
                                allusers.push({...depUser,id:depUser.userId,name:depUser?.user?.name})
                            }
                            
                        })
                    departmentList = allusers
                }
            }
            if (isMountedRef.current) {
                setPeopleList(departmentList)
                setDepartmentId(editObj.departments[0].id)
                setPeopleId(editObj.pepUserId)
                setDisablePeople(false)
                
                // 设置表单初始值
                form.setFieldsValue({
                    department: editObj.departments[0].id,
                    pepUserId: editObj.pepUserId
                });
            }
        } else {
            // 新增模式，重置表单
            if (isMountedRef.current) {
                setPeopleList([])
                setDepartmentId(undefined)
                setPeopleId(undefined)
                setDisablePeople(true)
                form.resetFields();
            }
        }
    }, [editObj, form]);

    // 监听Modal打开状态，确保每次打开都能正确初始化
    useEffect(() => {
        if (open && editObj.id) {
            // 编辑模式下，确保表单值正确设置
            setTimeout(() => {
                form.setFieldsValue({
                    department: editObj.departments[0].id,
                    pepUserId: editObj.pepUserId
                });
            }, 100);
        }
    }, [open, editObj, form]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    function handleOk () {
        //点击弹框确定  右边按钮
        form
            .validateFields()
            .then((values) => {
                if (adminEdit) {
                    dispatch(install.deteleOrganizationAdmin({id:editObj.id,msg:''})).then(
                        dispatch(install.postOrganizationUser({ role: ['admin'], pepUserId: values.pepUserId, msg: '修改管理员' })).then((res) => {//获取项企(PEP)全部部门及其下用户
                            if (res.success && isMountedRef.current) {
                                close();
                            }
                        })
                    )
                }
                else {
                    dispatch(install.postOrganizationUser({ role: ['admin'], pepUserId: values.pepUserId, msg: '新增管理员' })).then((res) => {//获取项企(PEP)全部部门及其下用户
                        if (res.success && isMountedRef.current) {
                            close();
                        }
                    })
                }
            })
            .catch((errorInfo) => {
                console.log('表单验证失败:', errorInfo);
            })
    }
    function handleCancel () {
        cancel();
        //点击弹框取消  左边按钮
    }
    
    return (
        <>
            <Modal
                title="管理员设置"
                okText="确定"
                cancelText="取消"
                open={open}
                onOk={handleOk}
                width={600}
                onCancel={handleCancel}
            >
                <div style={{ margin: "0px 25px" }}>
                    <div style={{ width: '100%', height: 32, background: '#F4F8FF', borderRadius: 2, border: '1px solid #C7E1FF', display: 'flex', alignItems: 'center', marginBottom:20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 12 }}><ExclamationCircleOutlined style={{ color: '#0F7EFB' }} /></div>
                        <div style={{ color: '#0F7EFB', fontSize: 12, marginLeft: 8 }}>成员成为管理员后，拥有平台所有权限和项目，成员的普通角色会被禁用。</div>
                    </div>
                    <Form
                        layout="horizontal"
                        labelAlign="right"
                        labelCol={{ span: 4 }}
                        wrapperCol={{ span: 20 }}
                        onValuesChange={(changedValues, allValues) => {
                            if (changedValues.department !== undefined) {
                                if (changedValues.department >= 0) {
                                    let departmentList = []
                                    for (let i = 0; i < pepList.length; i++) {
                                        if (pepList[i].id == changedValues.department) {
                                            let allusers=[]
                                            pepList[i]?.departmentUsers?.forEach(depUser=>{
                                                if(!allusers.some(item=>item.userId===depUser.userId)){
                                                    allusers.push({...depUser,id:depUser.userId,name:depUser?.user?.name})
                                                }
                                            })
                                            departmentList = allusers
                                        }
                                    }
                                    if (isMountedRef.current) {
                                         setPeopleList(departmentList)
                                         setDisablePeople(false)
                                         form.setFieldValue('pepUserId', undefined);
                                     }
                                }
                                else {
                                    if (isMountedRef.current) {
                                         setPeopleList([])
                                         setDisablePeople(true)
                                         form.setFieldValue('pepUserId', undefined);
                                     }
                                }
                            }
                        }}
                        form={form}
                    >
                        <Form.Item
                            label="选择部门:"
                            name="department"
                            rules={[{ required: true, message: "请选择部门" }]}
                        >
                            <Select
                                placeholder="请选择部门"
                                style={{ width: 417 }}
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {
                                    pepList.map((item, index) => {
                                        return (
                                            <Select.Option key={index} value={item.id}>
                                                {item.name}
                                            </Select.Option>
                                        )
                                    })
                                }
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label="选择人员:"
                            name="pepUserId"
                            rules={[{ required: true, message: "请选择人员" }]}
                        >
                            <Select
                                placeholder="请选择人员"
                                style={{ width: 417 }}
                                allowClear
                                showSearch
                                disabled={disablePeople}
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {
                                    peopleList.map((item, index) => {
                                        return (
                                            <Select.Option key={item.id} value={item.id}>
                                                {item.name}
                                            </Select.Option>
                                        )
                                    })
                                }
                            </Select>
                        </Form.Item>
                    </Form>
                </div>
            </Modal>
        </>
    );
}
function mapStateToProps (state) {
    const { auth, global, members } = state;
    return {
        //   loading: members.isRequesting,
        user: auth.user,
        actions: global.actions,
        //   members: members.data,
    };
}

export default connect(mapStateToProps)(adminModal);
