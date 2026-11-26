import React, { useState, useRef, useEffect } from 'react';
import { connect } from 'react-redux';
import { Modal, Checkbox } from 'antd';

function authorityModal(props) {
  const { close, cancel, visible, dispatch, actions, editObj, userResource} = props;
  const { install } = actions;
  const isMountedRef = useRef(true); // 组件挂载状态
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // 组件挂载时清理状态并初始化
  useEffect(() => {
    if (visible && editObj?.id) {
      // 重置权限状态
      setSelectedPermissions([]);
      // 获取用户权限
      dispatch(install.getUserResource(editObj.id));
    }
  }, [visible, editObj?.id]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 初始化用户已有权限
  useEffect(() => {
    if (userResource && userResource.length > 0 && isMountedRef.current) {
      // 只保留设备权限
      const deviceRelatedPermissions = userResource
        .filter(item => {
          const resourceCode = item.resourceId || item.resource?.code;
          return resourceCode === 'DEVICE';
        })
        .map(item => item.resourceId || item.resource?.code);
      
      setSelectedPermissions(deviceRelatedPermissions);
    } else if (userResource && userResource.length === 0 && isMountedRef.current) {
      // 如果用户没有任何权限，清空选择状态
      setSelectedPermissions([]);
    }
  }, [userResource]);

  function handleOk() {
    dispatch(install.postUserRes({ userId: editObj.id, resCode: selectedPermissions })).then(res=>{
            if(res.success && isMountedRef.current) {
              // 清理状态并关闭弹框
              setSelectedPermissions([]);
              close();
            }
    })
  }
  
  function handleCancel() {
    // 清理状态并取消
    setSelectedPermissions([]);
    cancel();
  }

  // 处理权限选择变化
  const handlePermissionChange = (permissionCode, checked) => {
    if (isMountedRef.current) {
      setSelectedPermissions(prev => {
        if (checked) {
          return [...prev, permissionCode];
        } else {
          return prev.filter(code => code !== permissionCode);
        }
      });
    }
  }

  // 处理全选/取消全选
  const handleSelectAll = (checked) => {
    if (isMountedRef.current) {
      if (checked) {
        const allCodes = ['DEVICE'];
        setSelectedPermissions(allCodes);
      } else {
        setSelectedPermissions([]);
      }
    }
  }
  return (
    <>
      <Modal
        title='权限管理'
        okText='确定'
        cancelText='取消'
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        fullScreen
      >
        <div style={{ margin: '0px 25px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Checkbox
              checked={selectedPermissions.includes('DEVICE')}
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              设备权限
            </Checkbox>
          </div>
          
          <div style={{ padding: '20px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>
              可分配权限
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
              <Checkbox
                checked={selectedPermissions.includes('DEVICE')}
                onChange={(e) => handlePermissionChange('DEVICE', e.target.checked)}
                style={{ fontSize: '14px' }}
              >
                设备管理权限
              </Checkbox>
              <div style={{ marginTop: '8px', marginLeft: '24px', color: '#666', fontSize: '12px' }}>
                包含设备查看、管理等基础功能
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
function mapStateToProps(state) {
  const { auth, global ,resource,userResource} = state;
  return {
    user: auth.user,
    actions: global.actions,
    resource: resource.data || [],
    userResource: userResource.data || [],

  };
}

export default connect(mapStateToProps)(authorityModal);
