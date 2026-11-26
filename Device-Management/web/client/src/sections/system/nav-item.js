import React from "react";
import { ProductOutlined, SettingOutlined } from "@ant-design/icons";
import { isAuthorized } from "$utils";

export function getNavItem(user, dispatch, localName) {
  let list = [];

  if (isAuthorized("SYSTEMMANAGEMENT")) {
    // 创建系统管理子项数组
    const systemManagementItems = [];

    // 添加系统管理子项
    if (
      isAuthorized("ORGANIZATIONALMANAGEMENT") &&
      isAuthorized("VIEWORGANIZATIONDATA")
    ) {
      console.log(111)
      systemManagementItems.push({
        itemKey: "organizationalManagement",
        to: "/system/systemManagement/organizationalManagement",
        text: "组织管理",
      });
    }

    if (isAuthorized("USERMANAGEMENT") && isAuthorized("VIEWUSERDATA")) {
      systemManagementItems.push({
        itemKey: "userManagement",
        to: "/system/systemManagement/userManagement",
        text: "用户管理",
      });
    }

    if (isAuthorized("ROLEMANAGEMENT") && isAuthorized("VIEWROLEDATA")) {
      systemManagementItems.push({
        itemKey: "roleManagement",
        to: "/system/systemManagement/roleManagement",
        text: "角色管理",
      });
    }

    // 项目管理
    if (isAuthorized("PROJECTMANAGEMENT") && isAuthorized("VIEWPROJECTDATA")) {
      console.log(222)
      systemManagementItems.push({
        itemKey: "projectManagement",
        to: "/system/systemManagement/projectManagement",
        text: "项目管理",
      });
    }

    if (isAuthorized("SYSTEMLOG") && isAuthorized("VIEWSYSTEMLOG")) {
      systemManagementItems.push({
        itemKey: "systemLog",
        to: "/system/systemManagement/systemLog",
        text: "系统日志",
      });
    }

    // 创建完整的系统管理项
    list.push({
      itemKey: "system",
      text: "系统",
      icon: <ProductOutlined />,
      items: [
        {
          itemKey: "systemManagement",
          text: "系统管理",
          to:
            systemManagementItems.length > 0
              ? systemManagementItems[0].to
              : "/system/systemManagement/organizationalManagement",
          icon: <SettingOutlined />,
          items: systemManagementItems,
        },
      ],
    });
  }

  return list;
}
