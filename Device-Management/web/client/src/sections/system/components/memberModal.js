import React, { useMemo, useRef, useState, useEffect } from "react";
import { Button, Form, TreeSelect } from "antd";
import {
  ModalForm,
  ProFormText,
  ProFormSwitch,
  ProFormSelect,
} from "@ant-design/pro-form";

import { Func } from "$utils";
const FormItem = Form.Item;
const { SHOW_PARENT } = TreeSelect;

export default (props) => {
  const {
    title,
    triggerRender,
    authorData = [],
    editData = null,
    onFinish,
    roles,
    roleGroupRoles = [],
    posts = [],
  } = props;
  const formRef = useRef();

  const formItemLayout = { labelCol: { span: 6 }, wrapperCol: { span: 12 } };
  // 统一让弹框内的下拉挂载到弹框节点，避免被外层表格/吸顶表头“穿透”覆盖
  const getPopupContainer = (triggerNode) =>
    triggerNode?.closest?.(".ant-modal") || document.body;
  const memberList = useMemo(
    () =>
      authorData.reduce((pre, cur) => {
        pre = [].concat(pre, cur.members);
        return pre;
      }, []),
    [authorData]
  );

  const departmentOptions = useMemo(() => {
    const filteredAuthorData = authorData.filter(
      (dept) => dept.name !== "默认"
    );
    const nested = Func.nestTree(filteredAuthorData, {
      idKey: "departmentId",
      parentIdKey: "parentId",
    });
    const toTreeSelect = (nodes) =>
      (nodes || []).map((n) => ({
        title: n.departmentName || n.name,
        value: n.departmentId || n.id,
        key: n.departmentId || n.id,
        children: n.children ? toTreeSelect(n.children) : undefined,
      }));
    return toTreeSelect(nested);
  }, [authorData]);

  const rolesOptions = useMemo(() => {
    if (Array.isArray(roleGroupRoles) && roleGroupRoles.length > 0) {
      return roleGroupRoles
        .filter((g) => g.name !== "默认")
        .map((group) => ({
        title: group.name,
        value: `group-${group.id}`,
        key: `group-${group.id}`,
        disableCheckbox: true,
        children: (group.roles || [])
          .filter((r) => r.name !== "所有者")
          .map((r) => ({
          title: r.name,
          value: r.id,
          key: r.id,
          })),
      }));
    }
    const nested = Func.nestTreeRoles(roles || [], true);
    const filterNodes = (nodes) =>
      (nodes || [])
        .filter((n) => n.title !== "默认" && n.title !== "所有者")
        .map((n) => ({
          ...n,
          children: n.children ? filterNodes(n.children) : undefined,
        }));
    return filterNodes(nested);
  }, [roleGroupRoles, roles]);
  const flattenKeys = (nodes) =>
    (nodes || []).reduce((acc, n) => {
      const childKeys = flattenKeys(n.children);
      return acc.concat(n.key, childKeys);
    }, []);
  const allRoleKeys = useMemo(() => flattenKeys(rolesOptions), [rolesOptions]);
  const [rolesExpandedKeys, setRolesExpandedKeys] = useState([]);
  useEffect(() => {
    setRolesExpandedKeys(allRoleKeys);
  }, [allRoleKeys]);

  const initialValues = editData
    ? {
        name: editData?.username,
        username: editData?.name,
        depId: editData?.departmentId,
        orgRole: (editData.roles || []).map((v) => v.id),
        postId: editData?.postId,
        enabled: editData?.enabled,
      }
    : { enabled: true };
  return (
    <ModalForm
      title={title || ""}
      initialValues={initialValues}
      trigger={
        triggerRender ? (
          triggerRender
        ) : (
          <Button type="primary" ghost>
            {title || ""}
          </Button>
        )
      }
      layout="horizontal"
      {...formItemLayout}
      modalProps={{
        destroyOnHidden: true,
        onCancel: () => {},
        width: 680,
        // 添加自定义 class，用于在全局样式中设置更高的层级
        wrapClassName: "member-modal-high-z-index",
        // 强制挂载到 body，避免被 ProTable/布局容器的层叠上下文影响导致"穿透"
        getContainer: () => document.body,
      }}
      onFinish={async (values) => {
        onFinish && (await onFinish(values, editData));
        //message.success('提交成功');
        return true;
      }}
    >
      <ProFormText
        width="md"
        name="name"
        label="用户名"
        rules={[
          {
            required: true,
            message: "用户名称不能为空",
          },
          {
            max: 10,
            message: "名称长度不能大于10个字符",
          },
          {
            whitespace: true,
            message: "请勿输入空格",
          },
        ]}
        placeholder="请输入用户名"
      />
      <ProFormText
        width="md"
        name="username"
        label="账号"
        rules={[
          {
            required: true,
            message: "账号不能为空",
          },
          {
            max: 20,
            message: "账号长度不能大于20个字符",
          },
          {
            whitespace: true,
            message: "请勿输入空格",
          },
          {
            validator: async (rule, value) => {
              if (editData) {
                if (
                  memberList.some(
                    (v) => editData.id !== v.id && v.username === value
                  )
                ) {
                  return Promise.reject(new Error("账号已经存在!"));
                }
              } else {
                if (memberList.some((v) => v.username === value)) {
                  return Promise.reject(new Error("账号已经存在!"));
                }
              }
              return Promise.resolve();
            },
          },
        ]}
        placeholder="请输入账号"
      />

      <FormItem
        label="所属部门"
        name="depId"
        rules={[{ required: true, message: "请选择所属部门!" }]}
        {...formItemLayout}
      >
        <TreeSelect
          treeData={departmentOptions}
          showSearch
          treeNodeFilterProp="title"
          placeholder="请选择所属部门"
          treeDefaultExpandAll
          style={{ width: "316px" }}
          getPopupContainer={() => document.body}
          popupStyle={{ zIndex: 99999 }}
        />
      </FormItem>
      <ProFormSelect
        width="md"
        rules={[{ required: true, message: "请选择职位!" }]}
        options={posts.map((v) => {
          return {
            label: v.name,
            value: v.id,
          };
        })}
        name="postId"
        label="职位"
        fieldProps={{
          getPopupContainer: () => document.body,
          popupStyle: { zIndex: 99999 },
        }}
      />

      <FormItem
        label="所属角色"
        name="orgRole"
        rules={[{ required: true, message: "请至少选择一个角色!" }]}
        {...formItemLayout}
      >
        <TreeSelect
          treeData={rolesOptions}
          treeCheckable
          showSearch
          treeNodeFilterProp="title"
          treeExpandedKeys={rolesExpandedKeys}
          onTreeExpand={setRolesExpandedKeys}
          onSearch={() => setRolesExpandedKeys(allRoleKeys)}
          onInputKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          showCheckedStrategy={SHOW_PARENT}
          placeholder="请选择所属角色"
          allowClear
          multiple
          treeDefaultExpandAll
          style={{ width: "316px" }}
          getPopupContainer={() => document.body}
          popupStyle={{ zIndex: 99999 }}
        />
      </FormItem>

      <ProFormSwitch width="md" name="enabled" label="是否启用" />
    </ModalForm>
  );
};
