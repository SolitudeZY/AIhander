import React from "react";
import { CodeOutlined } from '@ant-design/icons';
import { isAuthorized } from "$utils";
export function getNavItem(user, dispatch) {
  let isAdmin =
    user?.pomsUserInfo?.role.includes("SuperAdmin") ||
    user?.pomsUserInfo?.role.includes("admin");
  let list = [];
  if (isAdmin) {
    list.push({
      itemKey: "install",
      text: "设置",
      icon: <CodeOutlined />,
      items: [],
    });
  }
  //系统管理页面只有超管和管理员有
  if (isAdmin) {
    list[0].items.push({
      itemKey: "system",
      text: "系统管理",
      icon: (
        <iconpark-icon
          style={{ width: 20, height: 20 }}
          name="system-setting"
        ></iconpark-icon>
      ),
      to: "/system/organization",
      items: [
        {
          itemKey: "organization",
          to: "/system/organization",
          text: "组织管理",
        },
        {
          itemKey: "members",
          to: "/system/members",
          text: "用户管理",
        },
        {
          itemKey: "roles",
          to: "/system/roles",
          text: "角色管理",
        },
        {
          itemKey: "log",
          to: "/system/log",
          text: "系统日志",
        },
      ],
    });
  }
  return list;
}
