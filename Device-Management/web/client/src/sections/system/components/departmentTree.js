"use strict";
import React, { useState, useEffect } from "react";
import { Tree, Input } from "antd";
import Highlighter from "react-highlight-words";
import { Func } from "$utils";

const { Search } = Input;

const DepartmentTree = (props) => {
  const { height, organizations, dataList, onSelectedDepartment } = props;
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const [searchValue, setSearchValue] = useState("");
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // 构建树形数据结构
  const buildTreeData = () => {
    if (!organizations || !dataList || dataList.length === 0) {
      return [];
    }

    // 转换部门数据为树节点格式
    const convertDepartmentToTreeNode = (dept) => ({
      title: dept.departmentName || dept.name,
      key: `dept-${dept.departmentId || dept.id}`,
      departmentId: dept.departmentId || dept.id,
      departmentName: dept.departmentName || dept.name,
      parentId: dept.parentId,
      members: dept.members || [],
      isOrg: false,
    });

    // 转换所有部门
    const departmentNodes = dataList.map(convertDepartmentToTreeNode);

    // 构建嵌套树结构
    const nestedDepartments = Func.nestTree(departmentNodes, {
      idKey: "departmentId",
      parentIdKey: "parentId",
    });

    // 创建组织根节点
    const orgNode = {
      title: organizations.name,
      key: `org-${organizations.id}`,
      parentName: null,
      isOrg: true,
      departmentId: null,
      children: nestedDepartments,
    };
    return [orgNode];
  };

  const treeData = buildTreeData();

  useEffect(() => {
    if (organizations && dataList.length > 0 && treeData.length > 0) {
      if (expandedKeys.length === 0) {
        setExpandedKeys([treeData[0].key]);
      }
      if (selectedKeys.length === 0) {
        setSelectedKeys([treeData[0].key]);
        onSelectedDepartment && onSelectedDepartment(treeData[0]);
      }
    } else {
      setExpandedKeys([]);
      setSelectedKeys([]);
    }
  }, [dataList, organizations]);

  // 递归查找父节点key
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

  // 递归搜索所有节点
  const getAllTreeNodes = (tree) => {
    let nodes = [];
    tree.forEach((node) => {
      nodes.push(node);
      if (node.children && node.children.length > 0) {
        nodes = nodes.concat(getAllTreeNodes(node.children));
      }
    });
    return nodes;
  };

  //搜索框变化触发方法
  const onChange = (e) => {
    const { value } = e.target;

    if (!value) {
      setExpandedKeys([]);
      setSearchValue("");
      setAutoExpandParent(true);
      return;
    }

    // 获取所有树节点
    const allNodes = getAllTreeNodes(treeData);

    // 查找匹配的节点
    const matchedNodes = allNodes.filter(
      (node) => node.title && node.title.indexOf(value) > -1
    );

    // 获取需要展开的父节点keys
    const expandedKeys = matchedNodes
      .map((node) => getParentKey(node.key, treeData))
      .filter((item, i, self) => item && self.indexOf(item) === i);

    setExpandedKeys(expandedKeys);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const onExpand = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
    setAutoExpandParent(false);
  };

  const onSelectNode = (selected, selectNodes) => {
    if (selectNodes.selected) {
      setSelectedKeys(selected);
      onSelectedDepartment && onSelectedDepartment(selectNodes.node);
    }
  };

  return (
    <div className="department-tree">
      <Input placeholder="搜索: 部门" onChange={onChange} value={searchValue} />
      <Tree
        height={height || 300}
        style={{ marginTop: 20 }}
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        autoExpandParent={autoExpandParent}
        treeData={treeData}
        titleRender={(n) => {
          return (
            <Highlighter
              searchWords={[searchValue]}
              autoEscape={true}
              textToHighlight={n.title || ""}
            />
          );
        }}
        onSelect={onSelectNode}
      />
    </div>
  );
};

export default DepartmentTree;
