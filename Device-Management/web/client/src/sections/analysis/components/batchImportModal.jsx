"use strict";

import React, { useEffect, useState, useRef } from "react";
import { batch, connect } from "react-redux";
import { Button, Form, Modal } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

import * as XLSX from "xlsx";

function batchImportModal(props) {
  const { visible, onClose, user, dispatch, actions } = props;
  const { analysis } = actions;
  const [uploadAble, setUploadAble] = useState(true);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [postData, setPostData] = useState([]);
  const [allCardNumber, setAllCardNumber] = useState([]);

  useEffect(() => {
    dispatch(analysis.findAllCardNumber()).then((res) => {
      if (res.success) {
        setAllCardNumber(res.payload.data.map((item) => item.cardNumber));
      }
    });
  }, []);

  const workerKeys = {
    cardNumber: "cardNumber",
  };
  //模板下载
  const dldCsvMb = () => {
    //表头
    let head = [];
    Object.keys(workerKeys).map((key) => {
      head.push(workerKeys[key]);
    });
    head = head.join(",") + "\n";
    //数据
    let templateCsv = "data:text/xls;charset=utf-8,\ufeff" + head;
    //创建一个a标签
    let link = document.createElement("a");
    //为a标签设置属性
    link.setAttribute("href", templateCsv);
    link.setAttribute("download", `物联网卡导入模板.xls`);
    //点击a标签
    link.click();
  };
  const download = () => {
    dldCsvMb();
  };
  const confirm = () => {
    if (postData.length) {
      dispatch(analysis.batchImport(postData)).then((res) => {
        if (res.success) {
          onClose();
          setMsg("");
          setPostData([]);
        }
      });
    }
  };

  return (
    <>
      <Modal
        title={"批量导入物联网卡"}
        open={visible}
        open={visible}
        width={520}
        onOk={confirm}
        confirmLoading={loading}
        onCancel={() => {
          setMsg("");
          setLoading(false);
          setPostData([]);
          onClose();
        }}
      >
        <Form>
          <Form.Upload
            action={"/"}
            accept={".xls,.xlsx"}
            limit={1}
            onRemove={(currentFile, fileList, fileItem) => {
              setMsg("");
              setPostData([]);
            }}
            customRequest={async (data) => {
              const { fileInstance, onSuccess, onError } = data;
              const error = (msg) => {
                setMsg(msg);
                onError({ message: msg });
              };
              let isLt = fileInstance.size / 1024 / 1024 < 200;
              if (!isLt) {
                error(`文件最大不超过200M`);
                return;
              }
              const reader = new FileReader();
              reader.onload = (e) => {
                const data = e.target.result;
                const workbook = XLSX.read(data, {
                  type: "binary",
                  codepage: 936,
                });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                //XLSX.utils.sheet_to_json解析 ------
                Object.keys(worksheet).forEach((k) => {
                  worksheet[k].w ? (worksheet[k].v = worksheet[k].w) : "";
                });
                //------------------end------------------

                const res = XLSX.utils.sheet_to_json(worksheet);
                if (res.length > 3000) {
                  error("一次性上传数据行数应小于3000行，请分批上传");
                  return;
                }
                if (!res.length) {
                  error("请填写至少一行数据");
                  return;
                }
                let postData = [];
                for (let i = 0; i < res.length; i++) {
                  let d = res[i];
                  let obj = {};

                  Object.keys(workerKeys).map((key) => {
                    obj[key] = d[workerKeys[key]] || null;
                  });
                  if (obj.cardNumber) {
                    const isExist = allCardNumber.includes(obj.cardNumber);
                    if (!isExist) {
                      //自身判重复
                      const isExists = postData.some(
                        (item) => item === obj.cardNumber
                      );
                      if (isExists) {
                        error(
                          `第${i + 2}行数据中，${
                            obj.cardNumber
                          }，在excel中重复，请重新填写`
                        );
                        return;
                      }
                      //判断号码的长度
                      // if (obj.cardNumber.length !== 11) {
                      //   error(
                      //     `第${i + 2}行数据中，${
                      //       obj.cardNumber
                      //     }，卡号长度应为11位，请重新填写`
                      //   );
                      //   return;
                      // }
                      postData.push(obj.cardNumber);
                    } else {
                      error(
                        `第${i + 2}行数据中，${
                          obj.cardNumber
                        }已存在，请重新填写`
                      );
                      return;
                    }
                  }
                }

                if (postData.length) {
                  setPostData(postData);
                  let msg = "文件解析完成，点击确定按钮上传保存！";
                  setMsg(msg);
                  onSuccess({ message: msg });
                }else{
                    let msg = "文件解析完成，上传的文件中没有任何数据！";
                    setMsg(msg);
                    setUploadAble(true)
                    onSuccess({ message: msg });
                }
              };
              reader.readAsBinaryString(fileInstance);
            }}
          >
            <Button
              icon={<DownloadOutlined />}
              theme="light"
              disabled={!uploadAble}
            >
              请选择文件
            </Button>
          </Form.Upload>
          <span style={{ color: msg.includes('点击确定按钮上传保存')?'': 'red'  }}>{msg}</span>
          <div style={{ color: "#ccc", marginTop: 20 }}>
            最大不超过200M，导入文件需与
            <span
              onClick={() => download()}
              style={{ cursor: "pointer", color: "#0066FF" }}
            >
              导入模板
            </span>
            一致
          </div>
        </Form>
      </Modal>
    </>
  );
}
function mapStateToProps(state) {
  const { auth, global } = state;
  return {
    clientHeight: global.clientHeight,
    actions: global.actions,
  };
}
export default connect(mapStateToProps)(batchImportModal);
