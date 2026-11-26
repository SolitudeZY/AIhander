'use strict';

import { ApiTable, basicAction } from '$utils'

//添加、编辑文件夹
export function addEditFile (data = {}) {
   return (dispatch) => basicAction({
      type: "post",
      dispatch: dispatch,
      actionType: "POST_ADDEDITFILE",
      data,
      url: `${ApiTable.addEditFile}`,
      msg: { option: data.id ? '文件夹编辑' : '添加文件夹' },
   });
}

//获取文件夹列表
export function fileList (query = {}) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_FILELIST",
      query,
      url: `${ApiTable.fileList}`,
      msg: { option: '获取文件夹列表' },
   });
}


//删除文件夹
export function delFile (id) {
   return (dispatch) => basicAction({
      type: "del",
      dispatch: dispatch,
      actionType: "DEL_DELFILE",
      url: `${ApiTable.delFile.replace('{id}', id)}`,
      msg: { option: '删除文件夹' },
   });
}

//添加文件
export function addFile (data = {}) {
   return (dispatch) => basicAction({
      type: "post",
      dispatch: dispatch,
      actionType: "POST_FILE",
      data,
      url: `${ApiTable.file}`,
      msg: { option:  '添加文件' },
   });
}


//获取文件列表
export function folderFileList (query = {}) {
   return (dispatch) => basicAction({
      type: "get",
      dispatch: dispatch,
      actionType: "GET_FOLDERFILELIST",
      query,
      url: `${ApiTable.file}`,
      msg: { option: '获取文件列表' },
   });
}

//删除文件
export function delfolderFile (id) {
   return (dispatch) => basicAction({
      type: "del",
      dispatch: dispatch,
      actionType: "DEL_DELFILE",
      url: `${ApiTable.delfolderFile.replace('{id}', id)}`,
      msg: { option: '删除文件' },
   });
}
