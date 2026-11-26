import React, { useState, useEffect } from "react";
import { Tree, Input, Row, Col, Popconfirm, message } from "antd";
import Highlighter from "react-highlight-words";
import { FormOutlined, DeleteOutlined } from "@ant-design/icons";
import { isAuthorized } from "$utils";
import RoleModal from "./roleModal";

function RoleTree(props) {
  const {
    height,
    dataList,
    onSelectedRole,
    onSaveRole,
    onDeleteGroupRole,
    onDeleteRole,
  } = props;
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  const onGroupRoleDel = (e, s) => {
    if (s.roles.length > 0) {
      message.warning("该角色组已存在角色,请先删除角色！");
      return;
    }
    onDeleteGroupRole && onDeleteGroupRole(s.id);
  };

  const onRoleDel = (e, k) => {
    onDeleteRole && onDeleteRole(k.id);
    setSelectedKeys([]);
  };

  // 角色组
  const renderGroupTitle = (s) => {
    return (
      <div className="icon">
        <Highlighter
          searchWords={[searchValue]}
          autoEscape
          textToHighlight={s.name}
        />
        {s.name != "默认" && (
          <span>
            {isAuthorized("EDITROLE") && (
              <RoleModal
                title="编辑角色组"
                isGroup
                triggerRender={
                  <FormOutlined className="tips" style={{ marginLeft: 10 }} />
                }
                roles={dataList}
                editData={s}
                onFinish={onSaveRole}
              />
            )}
            {isAuthorized("DELETEROLE") && (
              <DeleteOutlined
                className="tips"
                onClick={(e) => onGroupRoleDel(e, s)}
                style={{ marginLeft: 5 }}
              />
            )}
          </span>
        )}
      </div>
    );
  };
  // 角色
  const renderTitle = (k, groupId) => (
    <div className="icon">
      <Highlighter
        searchWords={[searchValue]}
        autoEscape
        textToHighlight={k.name}
      />
      {k.name == "所有者" ? (
        ""
      ) : (
        <span>
          {isAuthorized("EDITROLE") && (
            <RoleModal
              title="编辑角色"
              triggerRender={
                <FormOutlined className="tips" style={{ marginLeft: 10 }} />
              }
              roles={dataList}
              editData={{ ...k, groupId }}
              onFinish={onSaveRole}
            />
          )}
          {isAuthorized("DELETEROLE") && (
            <Popconfirm
              title="删除角色,将导致关联该角色的用户权限受影响，确认删除吗?"
              onConfirm={(e) => onRoleDel(e, k)}
              okText="是"
              cancelText="否"
            >
              <DeleteOutlined className="tips" style={{ marginLeft: 5 }} />
            </Popconfirm>
          )}
        </span>
      )}
    </div>
  );

  const treeData =
    dataList.length > 0
      ? dataList.map((item) => {
          return {
            ...item,
            title: renderGroupTitle(item),
            value: `group-${item.id}`,
            key: `group-${item.id}`,
            selectable: false,
            children: Array.isArray(item.roles)
              ? item.roles.map((v) => ({
                  ...v,
                  title: renderTitle(v, item.id),
                  value: `${v.id}`,
                  key: `${v.id}`,
                }))
              : [],
          };
        })
      : [];

  useEffect(() => {
    if (dataList.length > 0) {
      if (expandedKeys.length === 0) {
        setExpandedKeys([treeData[0].key]);
      }
      if (selectedKeys.length === 0 && treeData[0].children.length > 0) {
        setSelectedKeys([treeData[0].children[0].key]);
        onSelectedRole && onSelectedRole(treeData[0].children[0]);
      }
    } else {
      setExpandedKeys([]);
      setSelectedKeys([]);
    }
  }, [dataList]);

  // 搜索框变化触发方法
  const onChange = (e) => {
    const { value } = e.target;
    const expandedKeys = dataList
      .reduce((p, c) => p.concat(c.roles), [])
      .map((item) => {
        if (item.name.indexOf(value) > -1) {
          return getParentKey(`${item.id}`, treeData);
        }
        return null;
      })
      .filter((item, i, self) => item && self.indexOf(item) === i);
    setExpandedKeys(expandedKeys);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const getParentKey = (key, tree) => {
    let parentKey;
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      if (node.children) {
        if (node.children.some((item) => item.key === key)) {
          parentKey = node.key;
        } else if (getParentKey(key, node.children)) {
          parentKey = getParentKey(key, node.children);
        }
      }
    }
    return parentKey;
  };

  const onExpand = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
    setAutoExpandParent(false);
  };

  const onSelectNode = (selected, selectNodes) => {
    if (selectNodes.selected) {
      setSelectedKeys(selected);
      onSelectedRole && onSelectedRole(selectNodes.node);
    }
  };

  return (
    <div className="role-tree">
      <Row gutter={16}>
        <Col span={24}>
          <Input placeholder="搜索: 角色" onChange={onChange} />
        </Col>
      </Row>

      {isAuthorized("ADDROLE") && (
        <Row gutter={16} style={{ marginTop: 10 }} justify="space-between">
          <Col span={12}>
            <RoleModal
              title="新建角色组"
              isGroup
              roles={dataList}
              onFinish={onSaveRole}
            />
          </Col>
          <Col span={12}>
            <RoleModal
              title="新建角色"
              roles={dataList}
              onFinish={onSaveRole}
            />
          </Col>
        </Row>
      )}

      <Tree
        height={height || 300}
        style={{ marginTop: 20 }}
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        autoExpandParent={autoExpandParent}
        treeData={treeData}
        onSelect={onSelectNode}
      />
    </div>
  );
}

export default RoleTree;
