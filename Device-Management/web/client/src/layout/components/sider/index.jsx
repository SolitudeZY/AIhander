import React, { useEffect, useState } from 'react';
import PerfectScrollbar from 'perfect-scrollbar';
import { connect } from 'react-redux';
import { Menu, Layout, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { push } from 'react-router-redux';
import { useLocation } from 'react-router';
import "./index.less";

const { Sider: AntSider } = Layout;

let scrollbar = null
const homePath = '/example/e1/c1'
const Sider = (props) => {
    const { collapsed, clientHeight, dispatch, pathname, leftItems, leftChange } = props
    const [items, setItems] = useState([])
    const [selectedKeys, setSelectedKeys] = useState([])
    const [openKeys, setOpenKeys] = useState([])
    const [siderCollapsed, setSiderCollapsed] = useState(() => {
        const saved = localStorage.getItem('poms_sider_collapsed')
        return saved ? JSON.parse(saved) : false
    })
    useEffect(() => {
        const { sections, dispatch, user } = props;
        let nextItems = leftItems
        
        // 转换数据格式以适配Ant Design Menu
        const convertToMenuItems = (items) => {
            return items?.map(item => ({
                key: item.itemKey,
                label: item.text,
                icon: item.icon,
                to: item.to,
                children: item.items && item.items.length > 0 ? convertToMenuItems(item.items) : undefined
            })) || []
        }
        
        const menuItems = convertToMenuItems(nextItems)
        setItems(menuItems)
        
        // scrollbar = new PerfectScrollbar('#page-slider', { suppressScrollX: true });
        if (pathname == '/') {
            dispatch(push(homePath))
        }
    }, [leftItems])
    
    // 保存折叠状态到localStorage
    useEffect(() => {
        localStorage.setItem('poms_sider_collapsed', JSON.stringify(siderCollapsed))
    }, [siderCollapsed])
    
    let routeSelectedKey = [useLocation().pathname.split('/')[1]]//没有子目录的
    let routeSelectedKeys = [useLocation().pathname.split('/')[2]]//有子目录的
    let routeSelectedKeyss = [useLocation().pathname.split('/')[3]]//有子目录的
    useEffect(() => {
        if (routeSelectedKeyss[0]) {
            setSelectedKeys(routeSelectedKeyss)
        }
        else if (routeSelectedKeys[0]) {
            setSelectedKeys(routeSelectedKeys)
        }
        else {
            setSelectedKeys(routeSelectedKey)
        }
        
        // 只在非收起状态下从localStorage恢复openKeys
        if (!siderCollapsed) {
            const lastOpenKeys = localStorage.getItem('poms_open_sider')
            if (lastOpenKeys && lastOpenKeys !== 'undefined') {
                try {
                    setOpenKeys(JSON.parse(lastOpenKeys))
                } catch (error) {
                    console.warn('Failed to parse poms_open_sider from localStorage:', error)
                    setOpenKeys([])
                }
            }
        } else {
            // 收起状态下清空openKeys，让悬停触发
            setOpenKeys([])
        }
    }, [window.localStorage.poms_open_sider, window.localStorage.poms_selected_sider, leftChange, siderCollapsed])

    useEffect(() => {
        // if (scrollbar) {
        //     scrollbar.update();
        // }
    })
    return (
        <AntSider
            collapsible
            collapsed={siderCollapsed}
            onCollapse={(collapsed) => setSiderCollapsed(collapsed)}
            width={240}
            collapsedWidth={80}
            style={{
                background: '#101531',
                height: clientHeight,
                position: 'relative'
            }}
            trigger={null} // 隐藏默认折叠按钮，使用自定义
        >
            {/* 自定义折叠按钮 */}
            <div style={{ 
                padding: '16px', 
                borderBottom: '1px solid #2A3A5C',
                display: 'flex',
                justifyContent: siderCollapsed ? 'center' : 'flex-end'
            }}>
                <Button
                    type="text"
                    icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setSiderCollapsed(!siderCollapsed)}
                    style={{
                        color: '#F2F3F5',
                        border: 'none',
                        background: 'transparent'
                    }}
                />
            </div>
            
            <div id={'page-slider'} style={{ height: 'calc(100% - 64px)', overflow: 'hidden' }}>
                <Menu
                    style={{ 
                        background: '#101531', 
                        border: 'none',
                        height: '100%'
                    }}
                    selectedKeys={selectedKeys}
                    mode="inline"
                    theme="dark"
                    inlineCollapsed={siderCollapsed}
                    openKeys={openKeys}
                    triggerSubMenuAction="hover"
                    onSelect={({ item, key, selectedKeys }) => {
                        // 从items数组中找到对应的菜单项
                        const findMenuItem = (items, targetKey) => {
                            for (const menuItem of items) {
                                if (menuItem.key === targetKey) {
                                    return menuItem;
                                }
                                if (menuItem.children) {
                                    const found = findMenuItem(menuItem.children, targetKey);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };
                        
                        const selectedItem = findMenuItem(items, key);
                        if (selectedItem && selectedItem.to) {
                            dispatch(push(selectedItem.to))
                            let myfatherKey = selectedItem.to
                            localStorage.setItem('poms_selected_sider', JSON.stringify([myfatherKey.split('/')[1]]))
                        }
                        setSelectedKeys(selectedKeys)
                    }}
                    onOpenChange={(openKeys) => {
                        // 在收起状态下，不保存openKeys到localStorage，但允许临时展开
                        if (!siderCollapsed) {
                            setOpenKeys(openKeys)
                            localStorage.setItem('poms_open_sider', JSON.stringify(openKeys))
                        } else {
                            // 收起状态下允许临时设置openKeys用于悬停显示
                            setOpenKeys(openKeys)
                        }
                    }}
                    items={items}
                />
            </div>
        </AntSider>
    )
}

function mapStateToProps (state) {
    const { global } = state;
    return {
        clientHeight: global.clientHeight,
    };
}

export default connect(mapStateToProps)(Sider);