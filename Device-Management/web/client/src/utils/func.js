"use strict";

export const isAuthorized = (authcode) => {
  if (JSON.parse(sessionStorage.getItem("user"))) {
    const { roleNames, resources } = JSON.parse(sessionStorage.getItem("user"));
    return (
      roleNames?.includes("所有者") ||
      roleNames?.includes("管理员") ||
      resources.includes(authcode)
    );
  } else {
    return false;
  }
};

export default class Func {
  // 全局分页样式
  static getPaginationStyle = () => ({
    showTotal: (total, range) => `总共 ${total} 条`,
    pageSize: 10,
  });

  static getContentHeight = (clientHeight) =>
    // 56面包屑 48：上下padding
    clientHeight - 56 - 48;

  // 构建树形数据结构
  static nestTree = (data, options = {}) => {
    const {
      idKey = 'id',
      parentIdKey = 'parentId',
      childrenKey = 'children'
    } = options;

    if (!Array.isArray(data)) {
      return [];
    }

    // 创建一个映射表，用于快速查找节点
    const nodeMap = new Map();
    const result = [];

    // 第一遍遍历，创建所有节点的映射
    data.forEach(item => {
      const node = { ...item };
      nodeMap.set(node[idKey], node);
    });

    // 第二遍遍历，构建父子关系
    data.forEach(item => {
      const node = nodeMap.get(item[idKey]);
      const parentId = item[parentIdKey];

      if (parentId === null || parentId === undefined) {
        // 根节点
        result.push(node);
      } else {
        // 子节点
        const parent = nodeMap.get(parentId);
        if (parent) {
          if (!parent[childrenKey]) {
            parent[childrenKey] = [];
          }
          parent[childrenKey].push(node);
        } else {
          // 如果找不到父节点，也作为根节点处理
          result.push(node);
        }
      }
    });

    return result;
  };

  // 从部门树节点中获取所有成员数据（包括子部门的成员）
  static getMembersByTree = (departmentNode) => {
    if (!departmentNode) {
      return [];
    }

    const members = [];

    // 递归收集成员的函数
    const collectMembers = (node) => {
      // 收集当前节点的成员
      if (node.members && Array.isArray(node.members)) {
        members.push(...node.members);
      }

      // 递归收集子节点的成员
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
          collectMembers(child);
        });
      }
    };

    collectMembers(departmentNode);

    // 去重（基于用户ID）
    const uniqueMembers = [];
    const memberIds = new Set();

    members.forEach(member => {
      if (member && member.id && !memberIds.has(member.id)) {
        memberIds.add(member.id);
        uniqueMembers.push(member);
      }
    });

    return uniqueMembers;
  };

  // 从部门树节点中获取所有部门ID（包括子部门）
  static getDepartmentsByTree = (departmentNode) => {
    if (!departmentNode) {
      return [];
    }

    const departmentIds = [];

    // 递归收集部门ID的函数
    const collectDepartmentIds = (node) => {
      // 收集当前节点的部门ID
      if (node.departmentId) {
        departmentIds.push(node.departmentId);
      }

      // 递归收集子节点的部门ID
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
          collectDepartmentIds(child);
        });
      }
    };

    collectDepartmentIds(departmentNode);

    return departmentIds;
  };

  // 判断用户权限是否包含管理员权限
  static judgeRightsContainsAdmin = (authCode) => {
    if (JSON.parse(sessionStorage.getItem("user"))) {
      const { roleNames, resources } = JSON.parse(sessionStorage.getItem("user"));
      return (
        roleNames?.includes("所有者") ||
        roleNames?.includes("管理员") ||
        resources.includes(authCode)
      );
    } else {
      return false;
    }
  };

  // 将部门数据转换为级联选择器格式
  static nestCascader = (data) => {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(dept => ({
      label: dept.departmentName || dept.name,
      value: dept.departmentId || dept.id,
      children: dept.children ? this.nestCascader(dept.children) : undefined
    }));
  };

  // 将角色数据转换为树形选择器格式
  static nestTreeRoles = (roles, showParent = false) => {
    if (!Array.isArray(roles)) {
      return [];
    }

    return roles.map(role => ({
      title: role.name,
      value: role.id,
      key: role.id,
      children: role.children ? this.nestTreeRoles(role.children, showParent) : undefined
    }));
  };
}
