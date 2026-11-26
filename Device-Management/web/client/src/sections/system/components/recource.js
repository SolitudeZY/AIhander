"use strict";
import React, { useState, useEffect } from "react";
import { Row, Col, Checkbox, Button, Card } from "antd";

const Resource = (props) => {
  const { resourceData, checkedlist, disabled, onPostResourcesSave } = props;
  const [checkedList, setCheckedList] = useState({});
  const [indeterminate, setIndeterminate] = useState({});
  const [checkAll, setCheckAll] = useState({});
  useEffect(() => {
    getInitStates();
  }, [resourceData, checkedlist]);

  // 将扁平化的 resourceData 转换为三级嵌套结构
  // resourceData 格式: {code, name, parent_resource}
  // checkedlist 格式: {code, name, parentResource}
  const transformResourceData = (flatData) => {
    const allData = [...flatData];

    // 创建一个映射来存储所有节点
    const nodeMap = {};
    const rootNodes = [];

    // 判断是否为“查看”类权限（名称含“查看”或 code 以 VIEW 开头）
    const isViewPermission = (node) => {
      const name = (node && node.name) || "";
      const code = (node && node.code) || "";
      return name.includes("查看") || /^VIEW/i.test(code);
    };

    // 首先创建所有节点
    allData.forEach((item) => {
      nodeMap[item.code] = {
        id: item.code,
        code: item.code,
        name: item.name,
        children: [],
        parent_resource: item.parent_resource,
        level: 0, // 添加层级标识
      };
    });

    // 建立父子关系并确定层级
    allData.forEach((item) => {
      if (item.parent_resource && nodeMap[item.parent_resource]) {
        // 如果有父节点，添加到父节点的 children 中
        const parentNode = nodeMap[item.parent_resource];
        const currentNode = nodeMap[item.code];
        currentNode.level = parentNode.level + 1;
        parentNode.children.push(currentNode);
      } else if (!item.parent_resource) {
        // 如果没有父节点，这是根节点（第一级）
        nodeMap[item.code].level = 1;
        rootNodes.push(nodeMap[item.code]);
      }
    });

    // 对每一层的 children 进行排序：将“查看”权限提前到最前
    Object.values(nodeMap).forEach((node) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => {
          const av = isViewPermission(a);
          const bv = isViewPermission(b);
          if (av === bv) return 0;
          return av ? -1 : 1; // 视图权限排前
        });
      }
    });

    // 系统管理模块的二级权限固定顺序
    const desiredSystemOrder = ["组织管理", "用户管理", "角色管理", "项目管理", "系统日志"];
    const systemRoot = rootNodes.find((n) => n && n.name === "系统管理");
    if (systemRoot && Array.isArray(systemRoot.children) && systemRoot.children.length > 0) {
      const orderMap = desiredSystemOrder.reduce((acc, name, idx) => {
        acc[name] = idx;
        return acc;
      }, {});
      systemRoot.children.sort((a, b) => {
        const ai = Object.prototype.hasOwnProperty.call(orderMap, a.name)
          ? orderMap[a.name]
          : Number.MAX_SAFE_INTEGER;
        const bi = Object.prototype.hasOwnProperty.call(orderMap, b.name)
          ? orderMap[b.name]
          : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return String(a.name).localeCompare(String(b.name), "zh");
      });
    }


    // 对于三级结构，我们需要将第三级的权限项作为第二级的子项来显示
    // 但在UI中，我们只显示第一级和第二级，第三级作为第二级的checkbox选项
    const processedRootNodes = rootNodes.map((rootNode) => {
      const processedRootNode = { ...rootNode };
      processedRootNode.children = rootNode.children.map((secondLevelNode) => {
        const processedSecondNode = { ...secondLevelNode };
        // 第二级节点的children就是第三级的具体权限项
        // 这些将在UI中显示为checkbox选项
        return processedSecondNode;
      });
      return processedRootNode;
    });

    return processedRootNodes;
  };

  // 递归获取所有子权限ID
  const getAllChildrenIds = (node) => {
    let childrenIds = [];

    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        childrenIds.push(child.id);
        // 递归获取子节点的所有子权限
        childrenIds = childrenIds.concat(getAllChildrenIds(child));
      });
    }

    return childrenIds;
  };

  // 递归更新父节点状态
  const updateParentStates = (
    nodeId,
    transformedData,
    newCheckedList,
    newCheckAll,
    newIndeterminate
  ) => {
    // 查找包含当前节点的父节点
    for (const firstLevel of transformedData) {
      // 检查是否是第一级的直接子节点
      if (firstLevel.children.some((child) => child.id === nodeId)) {
        updateNodeState(
          firstLevel,
          transformedData,
          newCheckedList,
          newCheckAll,
          newIndeterminate
        );
        return;
      }

      // 检查是否是第二级的子节点
      for (const secondLevel of firstLevel.children) {
        if (
          secondLevel.children &&
          secondLevel.children.some((child) => child.id === nodeId)
        ) {
          updateNodeState(
            secondLevel,
            transformedData,
            newCheckedList,
            newCheckAll,
            newIndeterminate
          );
          updateNodeState(
            firstLevel,
            transformedData,
            newCheckedList,
            newCheckAll,
            newIndeterminate
          );
          return;
        }
      }
    }
  };

  // 更新单个节点的状态
  const updateNodeState = (
    node,
    transformedData,
    newCheckedList,
    newCheckAll,
    newIndeterminate
  ) => {
    if (!node.children || node.children.length === 0) {
      return;
    }

    // 检查所有子节点是否都被选中
    const allChildrenChecked = node.children.every((child) => {
      if (child.children && child.children.length > 0) {
        // 如果子节点还有子节点，检查其全选状态
        return newCheckAll[child.id];
      } else {
        // 如果子节点没有子节点，检查是否在选中列表中
        return (
          newCheckedList[node.id] && newCheckedList[node.id].includes(child.id)
        );
      }
    });

    // 检查是否有任何子节点被选中
    const hasAnyChildChecked = node.children.some((child) => {
      if (child.children && child.children.length > 0) {
        // 如果子节点还有子节点，检查其是否有选中项
        return (
          newCheckAll[child.id] ||
          (newCheckedList[child.id] && newCheckedList[child.id].length > 0)
        );
      } else {
        // 如果子节点没有子节点，检查是否在选中列表中
        return (
          newCheckedList[node.id] && newCheckedList[node.id].includes(child.id)
        );
      }
    });

    newCheckAll[node.id] = allChildrenChecked;
    newIndeterminate[node.id] = hasAnyChildChecked && !allChildrenChecked;
  };

  //选中数据处理
  const getInitStates = () => {
    let obj = {
      initCheckedList: {},
      initIndeterminate: {},
      initCheckAll: {},
    };

    // 转换扁平化数据为嵌套结构
    const transformedData = transformResourceData(resourceData);

    //处理权限是否选中 - 支持三级结构
    const data = transformedData.map((item) => {
      const findItem = checkedlist.some((s) => s.code == item.code);
      let obj = {
        id: item.code,
        code: item.code,
        name: item.name,
        children: [],
      };
      if (findItem) {
        obj.checked = true;
      } else {
        obj.checked = false;
      }

      // 处理第二级和第三级
      obj.children = item.children.map((secondLevel) => {
        let secondLevelObj = {
          id: secondLevel.code,
          code: secondLevel.code,
          name: secondLevel.name,
          children: [],
        };

        if (checkedlist.some((s) => s.code == secondLevel.code)) {
          secondLevelObj.checked = true;
        } else {
          secondLevelObj.checked = false;
        }

        // 处理第三级
        if (secondLevel.children && secondLevel.children.length > 0) {
          secondLevelObj.children = secondLevel.children.map((thirdLevel) => {
            let thirdLevelObj = {
              id: thirdLevel.code,
              code: thirdLevel.code,
              name: thirdLevel.name,
            };
            if (checkedlist.some((s) => s.code == thirdLevel.code)) {
              thirdLevelObj.checked = true;
            } else {
              thirdLevelObj.checked = false;
            }
            return thirdLevelObj;
          });
        }

        return secondLevelObj;
      });
      return obj;
    });

    // 初始化第一级状态
    data.forEach((firstLevel) => {
      // 收集所有第二级和第三级的选中项
      let allCheckedItems = [];

      firstLevel.children.forEach((secondLevel) => {
        if (secondLevel.children && secondLevel.children.length > 0) {
          // 有第三级权限的第二级处理
          // 初始化第二级状态
          obj.initCheckedList[secondLevel.id] = secondLevel.children
            .filter((f) => f.checked)
            .map((m) => m.id);
          obj.initCheckAll[secondLevel.id] =
            secondLevel.children.length > 0 &&
            secondLevel.children.every((s) => s.checked);
          obj.initIndeterminate[secondLevel.id] =
            secondLevel.children.some((s) => s.checked) &&
            secondLevel.children.some((s) => !s.checked);

          // 将第三级选中项加入第一级
          allCheckedItems.push(
            ...secondLevel.children.filter((f) => f.checked).map((m) => m.id)
          );
        } else {
          // 没有第三级权限的第二级处理
          if (secondLevel.checked) {
            allCheckedItems.push(secondLevel.id);
          }
          // 初始化空的第二级状态
          obj.initCheckedList[secondLevel.id] = [];
          obj.initCheckAll[secondLevel.id] = false;
          obj.initIndeterminate[secondLevel.id] = false;
        }
      });

      // 设置第一级状态
      obj.initCheckedList[firstLevel.id] = allCheckedItems;

      // 重新计算第一级全选状态：检查所有第二级是否都处于全选状态
      const allSecondLevelChecked = firstLevel.children.every((secondLevel) => {
        if (secondLevel.children && secondLevel.children.length > 0) {
          // 有第三级的第二级：检查是否所有第三级都选中
          return secondLevel.children.every((thirdLevel) => thirdLevel.checked);
        } else {
          // 没有第三级的第二级：检查第二级本身是否选中
          return secondLevel.checked;
        }
      });

      // 第一级全选状态：当所有第二级都处于全选状态时为true
      obj.initCheckAll[firstLevel.id] =
        allSecondLevelChecked && firstLevel.children.length > 0;

      // 第一级半选状态：有部分选中但不是全部选中
      const hasAnyChecked = firstLevel.children.some((secondLevel) => {
        if (secondLevel.children && secondLevel.children.length > 0) {
          return secondLevel.children.some((thirdLevel) => thirdLevel.checked);
        } else {
          return secondLevel.checked;
        }
      });

      obj.initIndeterminate[firstLevel.id] =
        hasAnyChecked && !allSecondLevelChecked;
    });
    setCheckedList(obj.initCheckedList);
    setIndeterminate(obj.initIndeterminate);
    setCheckAll(obj.initCheckAll);
  };

  const onChange = (value, item) => {
    let newCheckedList = { ...checkedList };
    newCheckedList[item.id] = value;

    let newCheckAll = { ...checkAll };
    let newIndeterminate = { ...indeterminate };

    // 更新当前节点的状态
    if (item.children && item.children.length > 0) {
      newCheckAll[item.id] =
        item.children.length === newCheckedList[item.id].length;
      newIndeterminate[item.id] =
        !!newCheckedList[item.id].length &&
        newCheckedList[item.id].length < item.children.length;
    }

    // 更新父节点状态
    const transformedData = transformResourceData(resourceData);
    updateParentStates(
      item.id,
      transformedData,
      newCheckedList,
      newCheckAll,
      newIndeterminate
    );

    setCheckedList(newCheckedList);
    setCheckAll(newCheckAll);
    setIndeterminate(newIndeterminate);
  };

  const onCheckAllChange = (e, item) => {
    let newCheckAll = { ...checkAll };
    let newCheckedList = { ...checkedList };
    let newIndeterminate = { ...indeterminate };

    // 递归处理当前节点及其所有子节点
    const processNodeRecursively = (node, checked) => {
      newCheckAll[node.id] = checked;
      newIndeterminate[node.id] = false;

      if (node.children && node.children.length > 0) {
        // 如果有子节点，设置子节点的选中列表
        newCheckedList[node.id] = checked
          ? node.children.map((child) => child.id)
          : [];

        // 递归处理所有子节点
        node.children.forEach((child) => {
          processNodeRecursively(child, checked);
        });
      } else {
        // 如果没有子节点，确保有空的选中列表
        if (!newCheckedList[node.id]) {
          newCheckedList[node.id] = [];
        }
      }
    };

    // 处理当前节点
    processNodeRecursively(item, e.target.checked);

    // 更新父节点状态
    const transformedData = transformResourceData(resourceData);
    updateParentStates(
      item.id,
      transformedData,
      newCheckedList,
      newCheckAll,
      newIndeterminate
    );

    setCheckAll(newCheckAll);
    setCheckedList(newCheckedList);
    setIndeterminate(newIndeterminate);
  };

  const onCheckAll = (e) => {
    let obj = {
      initCheckedList: {},
      initIndeterminate: {},
      initCheckAll: {},
    };

    // 转换扁平化数据为嵌套结构
    const transformedData = transformResourceData(resourceData);

    // 递归处理所有节点
    const processAllNodesRecursively = (node, checked) => {
      obj.initCheckAll[node.id] = checked;
      obj.initIndeterminate[node.id] = false;

      if (node.children && node.children.length > 0) {
        // 设置当前节点的选中列表
        obj.initCheckedList[node.id] = checked
          ? node.children.map((child) => child.id)
          : [];

        // 递归处理所有子节点
        node.children.forEach((child) => {
          processAllNodesRecursively(child, checked);
        });
      } else {
        // 确保每个节点都有选中列表
        obj.initCheckedList[node.id] = [];
      }
    };

    // 处理所有第一级节点
    transformedData.forEach((firstLevel) => {
      processAllNodesRecursively(firstLevel, e.target.checked);
    });

    setCheckedList(obj.initCheckedList);
    setIndeterminate(obj.initIndeterminate);
    setCheckAll(obj.initCheckAll);
  };

  const renderCheckboxGroups = (item) => {
    // 防护检查：确保 children 存在且是数组
    if (!item.children || !Array.isArray(item.children)) {
      return null;
    }


    return (
      <div style={{ width: "100%" }}>
        {item.children.map((secondLevelItem) => {
          if (secondLevelItem.children && secondLevelItem.children.length > 0) {
            return (
              <div key={secondLevelItem.id} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: 8,
                    color: "#1890ff",
                    fontSize: "14px",
                  }}
                >
                  <Checkbox
                    checked={checkAll[secondLevelItem.id]}
                    disabled={disabled}
                    indeterminate={indeterminate[secondLevelItem.id]}
                    onChange={(e) => onCheckAllChange(e, secondLevelItem)}
                  >
                    {secondLevelItem.name}
                  </Checkbox>
                </div>
                <Checkbox.Group
                  style={{ width: "100%", paddingLeft: 24 }}
                  disabled={disabled}
                  value={checkedList[secondLevelItem.id]}
                  onChange={(value) => onChange(value, secondLevelItem)}
                >
                  <Row gutter={[16, 8]}>
                    {secondLevelItem.children.map((thirdLevelItem) => (
                      <Col span={12} key={thirdLevelItem.id}>
                        <Checkbox value={thirdLevelItem.id}>
                          {thirdLevelItem.name}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </div>
            );
          }
          return (
            <div key={secondLevelItem.id} style={{ marginBottom: 8 }}>
              <Checkbox
                disabled={disabled}
                checked={
                  checkedList[item.id] &&
                  checkedList[item.id].includes(secondLevelItem.id)
                }
                onChange={(e) => {
                  const newValue = checkedList[item.id] || [];
                  if (e.target.checked) {
                    onChange([...newValue, secondLevelItem.id], item);
                  } else {
                    onChange(
                      newValue.filter((id) => id !== secondLevelItem.id),
                      item
                    );
                  }
                }}
              >
                {secondLevelItem.name}
              </Checkbox>
            </div>
          );
        })}
      </div>
    );
  };
  const onHandleSave = () => {
    let selectedPermissions = [];

    // 转换数据以便正确收集选中项
    const transformedData = transformResourceData(resourceData);

    // 递归收集所有真正被选中的权限
    const collectSelectedPermissions = (node) => {
      if (node.children && node.children.length > 0) {
        // 如果有子节点，检查子节点的选中状态
        node.children.forEach((child) => {
          if (child.children && child.children.length > 0) {
            // 第二级节点有第三级子节点的情况
            // 检查第二级节点的checkedList，这里存储的是第三级被选中的权限
            if (checkedList[child.id] && checkedList[child.id].length > 0) {
              checkedList[child.id].forEach((thirdLevelId) => {
                selectedPermissions.push(thirdLevelId);
              });
            }
          } else {
            // 第二级节点没有第三级子节点的情况
            // 检查该第二级节点是否在第一级的checkedList中
            if (
              checkedList[node.id] &&
              checkedList[node.id].includes(child.id)
            ) {
              selectedPermissions.push(child.id);
            }
          }

          // 递归处理子节点
          collectSelectedPermissions(child);
        });
      }
    };

    // 处理所有第一级节点
    transformedData.forEach((firstLevel) => {
      collectSelectedPermissions(firstLevel);
    });

    // 去重选中的权限
    const uniqueSelectedPermissions = [...new Set(selectedPermissions)];

    // 根据选中的权限，找出所有需要的父级权限
    const findRequiredParents = (selectedPermissions) => {
      const parents = new Set();

      // 为每个选中的权限找到其父级权限链
      selectedPermissions.forEach((permissionCode) => {
        // 在resourceData中找到对应的权限项
        const permission = resourceData.find(
          (item) => item.code === permissionCode
        );
        if (permission && permission.parent_resource) {
          // 递归添加所有父级权限
          const addParentChain = (parentCode) => {
            if (parentCode) {
              parents.add(parentCode);
              const parentPermission = resourceData.find(
                (item) => item.code === parentCode
              );
              if (parentPermission && parentPermission.parent_resource) {
                addParentChain(parentPermission.parent_resource);
              }
            }
          };
          addParentChain(permission.parent_resource);
        }
      });

      return Array.from(parents);
    };

    // 获取所有需要的父级权限
    const requiredParentPermissions = findRequiredParents(
      uniqueSelectedPermissions
    );

    // 合并选中的权限和必需的父级权限
    const finalData = [
      ...new Set([...uniqueSelectedPermissions, ...requiredParentPermissions]),
    ];

    onPostResourcesSave && onPostResourcesSave(finalData);
  };

  const renderItem = () => {
    // 转换扁平化数据为嵌套结构
    const transformedData = transformResourceData(resourceData);

    return (
      transformedData &&
      transformedData.map((item) => (
        <Col span={8} key={item.code}>
          <Card
            title={
              <Checkbox
                checked={checkAll[item.code]}
                disabled={disabled}
                indeterminate={indeterminate[item.code]}
                onChange={(e) => onCheckAllChange(e, item)}
              >
                {item.name}
              </Checkbox>
            }
          >
            {renderCheckboxGroups(item)}
          </Card>
        </Col>
      ))
    );
  };

  return (
    <div>
      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={24}>
          <span style={{ fontSize: 16, marginRight: 10 }}>角色权限</span>
          <Checkbox
            disabled={disabled}
            checked={transformResourceData(resourceData).every(
              (v) => checkAll[v.code]
            )}
            indeterminate={
              transformResourceData(resourceData).some(
                (v) => checkAll[v.code]
              ) &&
              !transformResourceData(resourceData).every(
                (v) => checkAll[v.code]
              )
            }
            onChange={onCheckAll}
          >
            全部权限
          </Checkbox>
        </Col>
      </Row>
      <Row style={{ marginTop: 20 }} gutter={[16, 16]}>
        {renderItem()}
      </Row>
      {!disabled && (
        <Row style={{ marginTop: 20 }}>
          <Col span={6}>
            <Button type="primary" onClick={onHandleSave}>
              保存修改
            </Button>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Resource;