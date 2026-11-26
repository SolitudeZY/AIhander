import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import {
  Skeleton,
  Table,
  Radio,
  Button,
  Pagination,
  Popconfirm,
  Tooltip,
  Input,
} from "antd";
import { SkeletonScreen } from "$components";
import AdminModal from "../components/adminModal";
import MemberModal from "../components/memberModal";
import AuthorityModal from "../components/authorityModal";
import "../style.less";

const Roles = (props) => {
  const { dispatch, actions, user, loading, socket } = props;
  const { install } = actions;
  const [roleAssignment, setRoleAssignment] = useState([]); //角色分配
  const [roleChoose, setRoleChoose] = useState(""); //角色选择
  const [query, setQuery] = useState({ limit: 10, page: 0 }); //页码信息
  const [adminModal, setAdminModal] = useState(false); //管理员弹框
  const [adminEdit, setAdminEdit] = useState(false); //管理员弹框是否修改
  const [editObj, setEditObj] = useState({}); //管理员弹框修改内容
  const [memberModal, setMemberModal] = useState(false); //成员弹框
  const [memberEdit, setMemberEdit] = useState(false); //成员弹框是否修改
  const [anxincloudArr, setAnxincloudArr] = useState([]); //修改时已经选择的安心云列表
  const [anxinDelete, setAnxinDelete] = useState([]); //修改时安心云项目有删除,显示提示信息
  const [authorityModalVis, setAuthorityModalVis] = useState(false);
  
  // 添加组件卸载标记
  const isMountedRef = useRef(true);
  const [columns, setColumns] = useState([
    //表格属性
    {
      title: "成员",
      render: (_, row) => {
        const departmentsArr = row.departments || [];

        return (
          <div style={{ display: "flex", alignItems: "center" }}>
            <div>{row.name}</div>
            <div
              style={{
                padding: "2px 4px",
                background: "#E8F3FF",
                borderRadius: 2,
                fontSize: 12,
                color: "#005ABD",
                marginLeft: 4,
              }}
            >
              {departmentsArr[0]?.name || ""}
            </div>
            {departmentsArr.length > 1 ? (
              <Tooltip
                title={
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      所有部门 ({departmentsArr.length})
                    </div>
                    {departmentsArr.map((dept, index) => (
                      <div key={index} style={{ marginBottom: 2 }}>
                        {dept.name}
                      </div>
                    ))}
                  </div>
                }
                placement="bottomLeft"
                styles={{ root: { maxWidth: 300 } }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: "#005ABD",
                    marginLeft: 8,
                    cursor: "pointer",
                    padding: "2px 4px",
                    borderRadius: 2,
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#E8F3FF";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                  }}
                >
                  +{departmentsArr.length - 1}
                </div>
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "项目名称",
      render: (_, row) => {
        const projects = row.correlationProject || [];
        const deletedProjects = projects.filter(item => item.del);
        const hasDeletedProjects = deletedProjects.length > 0;
        const maxDisplayCount = 3; // 最多显示3个项目
        




        return (
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* 风险提示图标 */}
            {hasDeletedProjects && (
              <Tooltip
                title={`${deletedProjects.map(p => p.pepProjectName || p.name).join(", ")} 项目已在【项企PEP】或【映射关系】中被删除!`}
              >
                <div style={{ marginRight: 8 }}>
                  <img
                    src="/assets/images/install/risk.png"
                    alt="风险提示"
                    style={{ height: 20, width: 20 }}
                  />
                </div>
              </Tooltip>
            )}
            
            {/* 显示前几个项目 */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
              {projects.slice(0, maxDisplayCount).map((item, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center" }}>
                  <Tooltip title={item.pepProjectName || item.name}>
                    <div
                      style={{
                        maxWidth: "150px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: item.del ? "#F93920" : "#333",
                        padding: "2px 4px",
                        borderRadius: 2,
                        background: item.del ? "#FFF2F0" : "transparent",
                      }}
                    >
                      {item.del && (
                        <span style={{ 
                          fontSize: 10, 
                          color: "#F93920", 
                          marginRight: 4,
                          fontWeight: 'bold'
                        }}>
                          [已删除]
                        </span>
                      )}
                      {item.pepProjectName || item.name}
                    </div>
                  </Tooltip>
                  {index < Math.min(maxDisplayCount - 1, projects.length - 1) && (
                    <div
                      style={{
                        width: 1,
                        height: 12,
                        background: "#DCDEE0",
                        margin: "0 6px",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            
            {/* 显示更多项目的按钮 */}
            {projects.length > maxDisplayCount && (
              <Tooltip
                title={
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      所有项目 ({projects.length})
                    </div>
                    {projects.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          marginBottom: 2,
                          color: item.del ? "#ff4d4f" : "inherit"
                        }}
                      >
                        {item.del && <span style={{ marginRight: 4 }}>[已删除]</span>}
                        {item.pepProjectName || item.name}
                      </div>
                    ))}
                    {deletedProjects.length > 0 && (
                      <div style={{ 
                        marginTop: 8, 
                        fontSize: 11,
                        color: "#faad14",
                        borderTop: "1px solid #d9d9d9",
                        paddingTop: 4
                      }}>
                        注意：标记为[已删除]的项目已在【项企PEP】或【映射关系】中被删除
                      </div>
                    )}
                  </div>
                }
                placement="bottomLeft"
                styles={{ root: { maxWidth: 400 } }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: "#005ABD",
                    marginLeft: 8,
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: 2,
                    transition: "background-color 0.2s",
                    border: "1px solid #E8F3FF",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#E8F3FF";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                  }}
                >
                  +{projects.length - maxDisplayCount}
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "添加人员",
      width: "10%",
      dataIndex: "optionAddPepUser",
    },
    {
      title: "管理",
      width: "20%",
      dataIndex: "",
      render: (_, row) => {
        return (
          <div style={{ display: "flex" }}>
            {row?.disabled ? (
              <Button
                theme="borderless"
                style={{ color: "#F31C1C" }}
                onClick={() => {
                  dispatch(
                    install.putOrganizationUser({
                      pomsUserId: row?.id,
                      disabled: !row?.disabled,
                      msg: "更新成员状态",
                    })
                  ).then(() => {
                    setQuery({ limit: 10, page: page.current });
                  });
                }}
              >
                已禁用
              </Button>
            ) : (
              <Popconfirm
                title="禁用后，成员暂时将无法登录。"
                arrow={{ pointAtCenter: false }}
                showArrow={true}
                position="topRight"
                onConfirm={() => {
                  dispatch(
                    install.putOrganizationUser({
                      pomsUserId: row?.id,
                      disabled: !row?.disabled,
                      msg: "更新成员状态",
                    })
                  ).then(() => {
                    setQuery({ limit: 10, page: page.current });
                  });
                }}
              >
                <Button theme="borderless">已启用</Button>
              </Popconfirm>
            )}
            <Button
              theme="borderless"
              onClick={() => {
                let myanxinArr = [];
                let anxinErrorList = [];
                for (let i = 0; i < row.correlationProject.length; i++) {
                  if (row.correlationProject[i].del) {
                    anxinErrorList.push(
                      row.correlationProject[i].pepProjectName ||
                        row.correlationProject[i].name
                    );
                  } else {
                    myanxinArr.push(row.correlationProject[i].id);
                  }
                }
                setAnxinDelete(anxinErrorList);
                setAnxincloudArr(myanxinArr);
                setMemberModal(true);
                setEditObj(row);
                setMemberEdit(true);
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="删除后，成员将无法登录。"
              arrow={{ pointAtCenter: false }}
              showArrow={true}
              position="topRight"
              onConfirm={() => {
                dispatch(
                  install.putOrganizationUser({
                    pomsUserId: row?.id,
                    deleted: true,
                    msg: "删除成员",
                  })
                ).then(() => {
                  if (page.current > 0 && mylimits.current < 2) {
                    setQuery({ limit: 10, page: page.current - 1 });
                  } else {
                    setQuery({ limit: 10, page: page.current });
                  }
                });
              }}
            >
              <Button theme="borderless">删除</Button>
            </Popconfirm>
            <Button
              theme="borderless"
              onClick={() => {
                setAuthorityModalVis(true);
                setEditObj(row);
              }}
            >
              权限管理
            </Button>
          </div>
        );
      },
    },
  ]);

  // const [data, setData] = useState([])//表格数据
  const tableData = useRef([]); //表格数据
  const page = useRef(query.page); //哪一页
  const [limits, setLimits] = useState(); //每页实际条数
  const mylimits = useRef(); //每页实际条数
  const [pepList, setPepList] = useState([]); //角色分配
  const [pomsList, setPomsList] = useState([]); //已绑定项目列表
  const [keywords, setKeywords] = useState("");

  const userAdmin = user?.pomsUserInfo?.role.includes("admin"); //判断当前用户是否为管理员
  
  // 组件卸载时的清理函数
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    getUserList();
  }, [query, roleChoose]);
  useEffect(() => {
    dispatch(install.getOrganizationDeps()).then((res) => {
      //获取项企(PEP)全部部门及其下用户
      if (isMountedRef.current) {
        setPepList(res.payload.data);
      }
    });
    dispatch(install.getProjectPoms()).then((res) => {
      //获取已绑定项目
      if (res.success && isMountedRef.current) {
        setPomsList(res.payload.data.rows);
      }
    });
    dispatch(install.getResource());
  }, []);
  function getUserList() {
    let searchData = { ...query, role: roleChoose, keywords };
    dispatch(install.getOrganizationUser(searchData)).then((res) => {
      //获取成员列表
      if (res.success && isMountedRef.current) {
        tableData.current = res.payload.data.users.rows;
        // setData(res.payload.data.users.rows)
        let notCreatedArr = [];
        let notCreatedNum = 5 - res.payload.data.admin.length;
        for (let i = 0; i < notCreatedNum; i++) {
          notCreatedArr.push("");
        }
        if (userAdmin) notCreatedArr = [];
        setRoleAssignment(res.payload.data.admin.concat(notCreatedArr));
        setLimits(res.payload.data.users.count);
        mylimits.current = res.payload.data.users.rows.length;
      }
    });
  }
  function handleRow(record, index) {
    //斑马条纹
    // 给偶数行设置斑马纹
    if (index % 2 === 0) {
      return {
        style: {
          background: "#FAFCFF",
        },
      };
    } else {
      return {};
    }
  }
  function roleOnChange(e) {
    //角色选择
    setRoleChoose(e.target.value);
  }
  const handleChange = (e) => {
    setKeywords(e.target.value);
  };
  
  const searchHanlder = () => {
    const newQuery = { limit: 10, page: 0 };
    setQuery(newQuery);
    page.current = 0; // 重置页码
    
    let searchData = {
      ...newQuery,
      role: roleChoose,
      keywords,
    };
    dispatch(install.getOrganizationUser(searchData)).then((res) => {
      //获取成员列表
      if (res.success && isMountedRef.current) {
        tableData.current = res.payload.data.users.rows;
        // setData(res.payload.data.users.rows)
        let notCreatedArr = [];
        let notCreatedNum = 5 - res.payload.data.admin.length;
        for (let i = 0; i < notCreatedNum; i++) {
          notCreatedArr.push("");
        }
        if (userAdmin) notCreatedArr = [];
        setRoleAssignment(res.payload.data.admin.concat(notCreatedArr));
        setLimits(res.payload.data.users.count);
        mylimits.current = res.payload.data.users.rows.length;
      }
    });
  };

  return (
    <>
      <div
        style={{
          background: "#FFFFFF",
          margin: "8px 12px",
          padding: "20px 20px 0px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 0,
              height: 20,
              borderLeft: "3px solid #005ABD",
              borderTop: "3px solid transparent",
              borderBottom: "3px solid transparent",
            }}
          ></div>
          <div
            style={{
              fontFamily: "YouSheBiaoTiHei",
              fontSize: 24,
              color: "#101531",
              marginLeft: 8,
            }}
          >
            管理员设置
          </div>
          <div
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: "#969799",
              fontFamily: "DINExp",
            }}
          >
            ADMINISTRATOR SETTING
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            marginTop: 5,
          }}
        >
          <div style={{ fontSize: 12, color: "#8B8B8B" }}>
            平台最多支持5个管理员权限的关系绑定，该权限可对鉴权管理和设备管理进行设置和管理，请谨慎使用该权限。
          </div>
        </div>
        <div style={{ margintop: 15, overflow: "auto" }}>
          <div style={{ display: "inline-flex" }}>
            {roleAssignment.map((item, index) => {
              return (
                <div
                  key={index}
                  className="adminTop"
                  style={{
                    width: 305,
                    height: 127,
                    borderRadius: 2,
                    background:
                      "url(/assets/images/install/cardBackground0" +
                      (index + 1) +
                      ".png)",
                    backgroundSize: "100% 100%",
                    marginRight: 8,
                    marginBottom: 20,
                  }}
                >
                  {item.id ? (
                    <div style={{ display: "flex", marginLeft: 21 }}>
                      {item.departments?.map((itm, idx) => {
                        let mydepartmentsArr = [];
                        for (
                          let index = 0;
                          index < item.departments.length;
                          index++
                        ) {
                          mydepartmentsArr.push(item.departments[index].name);
                        }
                        return (
                          <div
                            key={idx}
                            style={{
                              background: "#52A4F6",
                              borderRadius: 2,
                              height: 18,
                              padding: "2px 4px",
                              fontSize: 10,
                              marginTop: 17,
                              width: "max-content",
                              color: "#FFFFFF",
                              alignItems: "center",
                              marginRight: 4,
                              display: idx > 3 ? "none" : "flex",
                            }}
                          >
                            {idx > 2 ? (
                              <Tooltip
                                content={mydepartmentsArr.join(",")}
                                style={{ lineHeight: 2 }}
                              >
                                <div
                                  style={{ fontSize: 14, cursor: "pointer" }}
                                >
                                  ...
                                </div>
                              </Tooltip>
                            ) : (
                              itm.name
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#52A4F6",
                        borderRadius: 2,
                        height: 18,
                        padding: "2px 4px",
                        fontSize: 10,
                        marginTop: 17,
                        marginLeft: 21,
                        width: "max-content",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      部门
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 5,
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0px 17px 0px 21px",
                    }}
                  >
                    <div style={{ marginTop: 9 }}>
                      <div style={{ display: "flex" }}>
                        {item.id ? (
                          <div
                            style={{
                              fontSize: 14,
                              color: "#4A4A4A",
                              fontWeight: 600,
                            }}
                          >
                            {item.name}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: 14,
                              color: "#4A4A4A",
                              fontWeight: 600,
                            }}
                          >
                            虚席以待
                          </div>
                        )}

                        {userAdmin ? (
                          ""
                        ) : (
                          <>
                            <div
                              style={{ marginLeft: 4, cursor: "pointer" }}
                              onClick={() => {
                                if (item.id) {
                                  setEditObj(item);
                                  setAdminEdit(true);
                                } else {
                                  setEditObj({});
                                  setAdminEdit(false);
                                }
                                setAdminModal(true);
                              }}
                            >
                              <img
                                src="/assets/images/install/icon_edit.png"
                                alt=""
                                style={{ height: 18, width: 18 }}
                              />
                            </div>
                            {item.id ? (
                              <Popconfirm
                                title="是否要移除管理员"
                                arrow={{ pointAtCenter: false }}
                                showArrow={true}
                                position="topRight"
                                onConfirm={() => {
                                  dispatch(
                                    install.deteleOrganizationAdmin({
                                      id: item.id,
                                      msg: "删除管理员",
                                    })
                                  ).then(() => getUserList());
                                }}
                              >
                                <div
                                  style={{ marginLeft: 4, cursor: "pointer" }}
                                >
                                  <img
                                    src="/assets/images/install/icon_detele.png"
                                    alt=""
                                    style={{ height: 18, width: 18 }}
                                  />
                                </div>
                              </Popconfirm>
                            ) : (
                              ""
                            )}
                          </>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#969799",
                          marginTop: 28,
                          marginLeft: 50,
                        }}
                      >
                        角色说明：拥有全平台的权限
                      </div>
                    </div>
                    <div>
                      <img
                        src="/assets/images/install/setPermissions.png"
                        alt=""
                        style={{ height: 63, width: 61 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div
        className="roleBottom"
        style={{
          margin: "20px 12px 12px 12px",
          background: "#FFFFFF",
          padding: "20px 20px 40px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 0,
              height: 20,
              borderLeft: "3px solid #005ABD",
              borderTop: "3px solid transparent",
              borderBottom: "3px solid transparent",
            }}
          ></div>
          <div
            style={{
              fontFamily: "YouSheBiaoTiHei",
              fontSize: 24,
              color: "#101531",
              marginLeft: 8,
            }}
          >
            成员管理
          </div>
          <div
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: "#969799",
              fontFamily: "DINExp",
            }}
          >
            MANAGEMENT OF MEMBERS
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          {/* <div style={{ fontSize: 12, color: '#8B8B8B' }}>平台有5种类型的成员角色，分别是数据分析师、售后运维、资源管理者、客户服务和设备维护，每名项目成员可拥有多种成员角色；</div> */}
          <div
            className="roleRadio"
            style={{ display: "flex", alignItems: "center" }}
          >
            {/* <div>
                     <Radio onChange={roleOnChange} value={roleChoose} aria-label="单选组合示例" name="demo-radio-group">
                        <Radio value=''>全部</Radio>
                        <Radio value='data_analyst'>数据分析师</Radio>
                        <Radio value='after_sale'>售后运维</Radio>
                        <Radio value='resource_manage'>资源管理者</Radio>
                        <Radio value='customer_service'>客户服务</Radio>
                        <Radio value='firmware_upgrade'>设备维护</Radio>
                     </Radio>
                  </div> */}

            <div
              style={{ display: "flex", alignItems: "center", marginLeft: 10 }}
            >
              <Input
                style={{
                  width: 200,
                  height: 32,
                  borderRadius: 2,
                  marginRight: 10,
                }}
                placeholder="请输入人员姓名"
                value={keywords}
                onChange={handleChange}
                onPressEnter={searchHanlder}
              />
              <Button onClick={searchHanlder} theme="solid">
                查询人员
              </Button>
            </div>
            <div>
              <Button
                theme="solid"
                type="primary"
                style={{
                  width: 108,
                  height: 32,
                  borderRadius: 2,
                  marginLeft: 10,
                }}
                onClick={() => {
                  setEditObj({});
                  setMemberEdit(false);
                  setMemberModal(true);
                  setAnxinDelete();
                  setAnxincloudArr();
                }}
              >
                添加成员
              </Button>
            </div>
          </div>
        </div>
        <div
          style={{
            maxHeight: 'calc(100vh - 470px)', // 整体容器最大高度
            minHeight: '400px', // 最小高度确保分页器可见
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #f0f0f0',
            borderRadius: '6px',
          }}
        >
          {/* 表格容器 - 可滚动部分 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Skeleton
              loading={loading}
              active={true}
              placeholder={SkeletonScreen()}
            >
              <Table
                columns={columns}
                dataSource={tableData.current}
                bordered={false}
                onRow={handleRow}
                empty="暂无数据"
                pagination={false}
                rowKey={(record) => record.id}
              />
            </Skeleton>
          </div>
          
          {/* 分页器 - 固定在底部 */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "20px 20px",
              borderTop: "1px solid #f0f0f0",
              backgroundColor: "#fafafa",
              borderBottomLeftRadius: '6px',
              borderBottomRightRadius: '6px',
            }}
          >
            <span
              style={{
                lineHeight: "30px",
                fontSize: 13,
                color: "rgba(0,90,189,0.8)",
              }}
            >
              共{limits}条信息
            </span>
            <Pagination
              className="22"
              total={limits}
              showSizeChanger
              current={query.page + 1}
              pageSizeOpts={[10, 20, 30, 40]}
              onChange={(currentPage, pageSize) => {
                setQuery({ limit: pageSize, page: currentPage - 1 });
                page.current = currentPage - 1;
              }}
            />
          </div>
        </div>
      </div>
      {
        //管理员弹框
        adminModal ? (
          <AdminModal
            open={true}
            pepList={pepList}
            adminEdit={adminEdit}
            editObj={editObj}
            cancel={() => {
              setAdminModal(false);
            }}
            close={() => {
              setAdminModal(false);
              getUserList();
            }}
          ></AdminModal>
        ) : (
          ""
        )
      }
      {
        //成员弹框
        memberModal ? (
          <MemberModal
            open={true}
            pepList={pepList}
            memberEdit={memberEdit}
            editObj={editObj}
            pomsList={pomsList}
            anxinDelete={anxinDelete}
            anxincloudArr={anxincloudArr}
            cancel={() => {
              setMemberModal(false);
            }}
            close={() => {
              setMemberModal(false);
              getUserList();
            }}
          ></MemberModal>
        ) : (
          ""
        )
      }
      {
        //权限管理弹框
        authorityModalVis && editObj && editObj.id ? (
          <AuthorityModal
            visible={authorityModalVis}
            editObj={editObj}
            cancel={() => {
              setAuthorityModalVis(false);
              setEditObj({});
            }}
            close={() => {
              setAuthorityModalVis(false);
              setEditObj({});
              getUserList();
            }}
          />
        ) : null
      }
    </>
  );
};

function mapStateToProps(state) {
  const { auth, global, OrganizationDeps } = state;
  return {
    loading: OrganizationDeps.isRequesting,
    user: auth.user,
    actions: global.actions,
    //   members: members.data,
  };
}
export default connect(mapStateToProps)(Roles);
