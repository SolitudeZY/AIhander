'use strict';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Spin, Upload, message, Modal, Card, Button } from 'antd';
import moment from 'moment';
import { PlusOutlined, CloudUploadOutlined, CloseOutlined } from '@ant-design/icons';
import OSS from 'ali-oss';
import { RouteRequest } from '@peace/utils';
import { RouteTable } from '$utils'
import { v4 as uuidv4 } from 'uuid';
import request from 'superagent';

class Uploads extends Component {
   constructor(props) {
      super(props);
      this.ApiRoot = localStorage.getItem('tyApiRoot')
      this.qnDomain = localStorage.getItem('qnDomain');
      this.aliAdmin = localStorage.getItem('aliAdmin');
      this.aliBucket = localStorage.getItem('aliBucket');
      this.aliRegion = localStorage.getItem('aliRegion');
      this.state = {
         fileUploading: false,
         fileList: [],
         curPreviewPic: '',
         curPreviewVideo: '',
         delPicIng: false,
         removeFilesList: [],
         stsRes: {}
      };
   }

   dealName = (uploaded) => {
      let realName = uploaded && uploaded.split('/')[2]
      // let x1 = realName.split('.')
      // let postfix = x1.pop()
      // let allName = x1.join('.')
      // let x2 = allName.split('_')
      // let showName = `${x2[0]}.${postfix}`
      return realName
   }

   // setFileList = (value) => {
   //     let defaultFileList = [];
   //     defaultFileList = value.map((u, index) => {
   //         let fileUrl = `${this.ApiRoot}/${u.url}`;
   //         return {
   //             uid: -index - 1,
   //             name: this.dealName(u.url),
   //             status: 'done',
   //             storageUrl: u.url,
   //             url: fileUrl
   //         };
   //     });
   //     onChange(defaultFileList)
   //     this.setState({
   //         fileList: defaultFileList
   //     });
   // };

   setFileList = (nextEditData, isQiniu, isAli) => {
      let defaultFileList = [];
      if (nextEditData.length) {
         defaultFileList = nextEditData.map((u, index) => {
            let fileUrl =
               isQiniu ? `/_file-server/${u.storageUrl}`
                  : isAli ? `/_file-ali-server/${u.storageUrl}`
                     : `${this.ApiRoot}/${u.storageUrl}`;

            return {
               uid: -index - 1,
               name: this.dealName(u.storageUrl),
               status: 'done',
               storageUrl: u.storageUrl,
               url: fileUrl,
               size: u.size || -1
            };
         });
      }
      this.setState({
         fileList: defaultFileList
      });
   };

   componentWillMount () {
      this.setState({
         delPicIng: true
      })
      RouteRequest.get(RouteTable.getAliSts).then(async (result) => {
         this.setState({
            delPicIng: false,
            stsRes: result
         })
      }, (err) => {
         this.setState({
            delPicIng: false
         })
      })
   }

   componentDidMount () {
      const { value, defaultValue, isQiniu, isAli } = this.props;
      if (defaultValue) {
         this.setFileList(defaultValue, isQiniu, isAli)
      }
   }

   UNSAFE_componentWillReceiveProps (np) {
      const { dispatch, value: thisEditData, onChange } = this.props;
      const { value: nextEditData, isQiniu, isAli } = np;
      // this.setFileList(nextEditData, isQiniu)
      // const setFileList = () => {
      //     let defaultFileList = [];
      //     defaultFileList = nextEditData.map((u, index) => {
      //         let fileUrl = isQiniu ? `/_file-server/${u.storageUrl}` : `${this.ApiRoot}/${u.storageUrl}`;
      //         return {
      //             uid: -index - 1,
      //             name: this.dealName(u.storageUrl),
      //             status: 'done',
      //             storageUrl: u.storageUrl,
      //             url: fileUrl,
      //             size: u.size || -1
      //         };
      //     });
      //     this.setState({
      //         fileList: defaultFileList
      //     });
      // };
      if (nextEditData && nextEditData.length) {
         if (!thisEditData || !this.state.fileList.length) {
            this.setFileList(nextEditData, isQiniu, isAli);
         } else if (nextEditData.length != thisEditData.length) {
            this.setFileList(nextEditData, isQiniu, isAli);
         } else {
            let repeat = true;
            for (let i = 0; i < thisEditData.length; i++) {
               if (thisEditData[i] != nextEditData[i]) {
                  repeat = false;
                  break;
               }
            }
            if (!repeat) {
               this.setFileList(nextEditData, isQiniu, isAli);
            }
         }
      }
      // else{
      //     this.setState({
      //         fileList:[],
      //     })
      // }
   }

   render () {
      const UploadPath = {
         project: ['txt', 'dwg', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'pdf', 'pptx', 'png', 'jpg', 'svg', 'jpeg', 'rar', 'zip', 'jpeg', 'mp4'],
         report: ['doc', 'docx', 'xls', 'xlsx', 'csv', 'pdf'],
         data: ['txt', 'xls', 'xlsx', 'csv'],
         image: ['png', 'jpg', 'svg', 'jpeg'],
         three: ['js'],
         video: ['mp4']
      };
      /**
       * uploadType 【string】 主要区别文件上传路径 以及类型 以 web/routes/attachment/index.js 中 UploadPath 的 key 值为准；默认 project；
       * disabled 【boolean】 上传是否可用
       * maxFilesNum 【number】 最大上传数量
       * fileTypes 【array[string]】 可允许上传的文件类型；
       * maxFileSize 【number】 单个文件最大大小 M
       * listType 【antd】 upload 组件的属性
       * onChange 【function】 文件数量变化时候回调 返回文件
       * value 【array[obj]】 编辑数据 [{url:'xxx', [size:999]}]
       * onStateChange 【function】 文件状态改变回调函数 上传中 return { uploading:true/false }
       */
      const {
         uploadType,
         disabled,
         maxFilesNum,
         fileTypes,
         maxFileSize,
         listType,
         onChange = () => { },
         value,
         showUploadList,
         onStateChange,
         isQiniu,
         isAli,
      } = this.props;
      const { fileList, curPreviewPic, curPreviewVideo, delPicIng, removeFilesList, stsRes } = this.state;
      const that = this;
      let uploadType_ = uploadType || 'project';
      let maxFilesNum_ = maxFilesNum || 1;
      let defaultFileTypes = fileTypes || UploadPath[uploadType_];
      // debugger
      const uploadProps = {
         name: 'checkFile_',
         multiple: false,
         showUploadList: showUploadList || true,
         action:
            isQiniu ? `/_upload/attachments/${uploadType_}`
               : isAli ? `/_upload/attachments/ali/${uploadType_}`
                  : `${this.ApiRoot}/attachments/${uploadType_}`,
         listType: listType || 'text',
         disabled: disabled,
         beforeUpload: (file) => {
            if (fileList.length >= maxFilesNum_) {
               message.warning(`最多选择${maxFilesNum_}个文件上传`);
               return false;
            }
            if (file.name.length > 60) {
               message.warning(`文件名过长(大于60字符)，请修改后上传`);
               return false;
            }
            const extNames = file.name.split('.');
            // var reg = /^[\.\s\u4e00-\u9fa5a-zA-Z0-9_-]{0,}$/;
            // if (!reg.exec(file.name)) {
            //     message.warning(`文件名包含除字母、汉字、数字、中划线、下划线之外的字符，请修改后上传`);
            //     return false;
            // }
            let isDAE = false;
            if (extNames.length > 0) {
               let fileType = extNames[extNames.length - 1].toLowerCase();
               isDAE = defaultFileTypes.some((f) => f == fileType);
            }
            if (!isDAE) {
               message.error(`只能上传 ${defaultFileTypes.join()} 格式的文件!`);
               return false;
            }
            const isLt = file.size / 1024 / 1024 < (maxFileSize || 3);
            if (!isLt) {
               message.error(`文件必须小于${maxFileSize || 3}MB!`);
               return false;
            }
            this.setState({
               fileUploading: true
            });
            if (onStateChange) {
               onStateChange({ uploading: true });
            }
         },

         customRequest: isQiniu ? undefined : async (params) => {
            try {
               const client = new OSS({
                  // yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
                  region: that.aliRegion,
                  // 从STS服务获取的临时访问密钥（AccessKey ID和AccessKey Secret）。
                  accessKeyId: stsRes.AccessKeyId,
                  accessKeySecret: stsRes.AccessKeySecret,
                  // 从STS服务获取的安全令牌（SecurityToken）。
                  stsToken: stsRes.SecurityToken,
                  // 填写Bucket名称，例如examplebucket。
                  bucket: that.aliBucket,
               });

               let uploadRes = null
               let uploadPath = `/${uploadType_}/${uuidv4()}/` + params.file.name
               if (
                  // false &&
                  params.file.size < 1024 * 1024 * 1
               ) {
                  params.onProgress({ percent: 40 })
                  uploadRes = await client.put(
                     uploadPath,
                     params.file
                  );
               } else {
                  uploadRes = await client.multipartUpload(uploadPath, params.file, {
                     progress: (p, _checkpoint) => {
                        // Object的上传进度。
                        // console.log(p);
                        // 分片上传的断点信息。
                        // console.log(_checkpoint);
                        params.onProgress({ percent: p * 100 })
                     },
                     // 设置并发上传的分片数量。
                     parallel: 4,
                     // 设置分片大小。默认值为1 MB，最小值为100 KB。
                     partSize: 1024 * 1024 * 3, // 3m
                  });
               }

               // console.log(uploadRes);
               let { name: url, res } = uploadRes;
               let size = params.file.size;
               let nextFileList = fileList;
               let url_ = url.startsWith('/') ? url.substring(1) : url
               nextFileList[nextFileList.length - 1] = {
                  uid: -moment().unix(),
                  name: params.file.name,
                  status: 'done',
                  storageUrl: url_,
                  url: `/_file-ali-server/${url_}`,
                  size: size
               };
               onChange(nextFileList);
               that.setState({
                  fileUploading: false,
                  fileList: nextFileList
               });
               if (onStateChange) {
                  onStateChange({ uploading: false });
               }
               params.onSuccess({
                  result: {
                     uploaded: url,
                     url: res.requestUrls[0]
                  },
               })
            } catch (error) {
               console.error(error);
               params.onError({})
            }

         },

         onChange (info) {
            console.log(111,info);
            const status = info.file.status;
            if (status === 'uploading') {
               that.setState({
                  fileList: info.fileList
               });
            }
            if (status === 'done') {
               let { uploaded, url } = info.file.response;
               let size = info.file.size;
               let nextFileList = fileList;
               nextFileList[nextFileList.length - 1] = {
                  uid: -moment().unix(),
                  name: that.dealName(uploaded),
                  status: 'done',
                  storageUrl: uploaded,
                  url:
                     isQiniu ? '/_file-server/' + uploaded :
                        isAli ? `/_file-ali-server/${uploaded}` :
                           url,
                  size: size
               };
               onChange(nextFileList);
               that.setState({
                  fileUploading: false,
                  fileList: nextFileList
               });
               if (onStateChange) {
                  onStateChange({ uploading: false });
               }
            } else if (status === 'error') {
               that.setState({
                  fileUploading: false
               });
               message.error(`${info.file.name} 上传失败，请重试`);
               if (onStateChange) {
                  onStateChange({ uploading: false });
               }
            }
         },
         onRemove (file) {
            let nextFileList = [];
            fileList.map((f, i) => {
               if (f.uid != file.uid) {
                  nextFileList.push(f);
               }
            });
            let nextRemoveFiles = removeFilesList.concat([file.storageUrl]);
            if (curPreviewPic == file.url) {
               that.setState({
                  curPreviewPic: ''
               });
            }
            if (curPreviewVideo == file.url) {
               that.setState({
                  curPreviewVideo: ''
               });
            }
            onChange(nextFileList);
            that.setState({
               fileList: nextFileList,
               removeFilesList: nextRemoveFiles
            });
         },
         onPreview (file) {
            let filePostfix = file.url.split('.').pop();
            filePostfix = filePostfix.toLowerCase();
            if (UploadPath.image.some((img) => img == filePostfix)) {
               that.setState({
                  curPreviewPic: file.url
               });
            } else if (
               UploadPath.video.some((img) => img == filePostfix)
               && isAli
            ) {
               that.setState({
                  curPreviewVideo: that.aliAdmin + '/' + file.storageUrl
               });
            } else {
               //message.warn('仅支持图片预览');
               preview(file.storageUrl)
            }
         }
      };

      const preview = (url) => {
         let link = isQiniu ? encodeURI(`${this.qnDomain}/${url}`) :
            isAli ? encodeURI(`${this.aliAdmin}/${url}`) : ''
         if (link)
            if (url.indexOf("pdf") !== -1 || url.indexOf("csv") !== -1) {
               window.open(link)
            } else {
               window.open(`https://view.officeapps.live.com/op/view.aspx?src=${link}`)
            }
      }

      let fileList_ = fileList
      // .map(f => {
      //     if (f.storageUrl) {
      //         let realName = f.storageUrl.split('/').pop()
      //         if (f.name != realName) {
      //             f.name = realName
      //         }
      //     }
      //     return f
      // })
      //下载文件
      const handleDownload = (file) => {
         saveAs(file)
      };
      const saveAs = (file) => {
         let url = null
         if (file.storageUrl.endsWith('mp4')) {
            const client = new OSS({
               // yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
               region: that.aliRegion,
               // 从STS服务获取的临时访问密钥（AccessKey ID和AccessKey Secret）。
               accessKeyId: stsRes.AccessKeyId,
               accessKeySecret: stsRes.AccessKeySecret,
               // 从STS服务获取的安全令牌（SecurityToken）。
               stsToken: stsRes.SecurityToken,
               // 填写Bucket名称，例如examplebucket。
               bucket: that.aliBucket,
            });
            // 配置响应头实现通过URL访问时自动下载文件，并设置下载后的文件名。
            const response = {
               'content-disposition': `attachment; filename=${encodeURIComponent(file.name)}`
            }
            // 填写Object完整路径。Object完整路径中不能包含Bucket名称。
            url = client.signatureUrl(file.storageUrl, { response });
         }

         const link = document.createElement('a');
         link.href = url || file.url;
         link.download = file.name;
         link.style.display = 'none';
         link.click();
      }
      //自定义下载
      return (
         <div>
            <Spin spinning={delPicIng}>
               <Upload {...uploadProps} fileList={fileList_} showUploadList={{ showDownloadIcon: true, showRemoveIcon: true, }} onDownload={handleDownload}
               >
                  {
                     disabled ? (
                        ''
                     ) :
                        listType == 'picture-card' ?
                           (
                              fileList.length >= maxFilesNum_ ? null : (
                                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 85, height: 30, border: '1px solid #a29696' }}>
                                    <PlusOutlined />
                                    <div>添加附件</div>
                                 </div>
                              )
                           ) : (
                              <Button disabled={fileList.length >= maxFilesNum_} icon={<CloudUploadOutlined />}>  文件上传 </Button>
                           )
                  }
               </Upload>
               {
                  curPreviewPic ? (
                     <Card styles={{ body: { padding: 8 } }}>
                        <div style={{ marginBottom: 8 }} >
                           <span>图片预览</span>
                           <span style={{ float: 'right' }} onClick={() => { this.setState({ curPreviewPic: '' }) }}>
                              <CloseOutlined style={{ fontSize: 20 }} />
                           </span>
                        </div>
                        <img style={{ width: '100%' }} src={curPreviewPic} />
                     </Card>
                  ) : ''
               }
               {
                  curPreviewVideo ? (<Card styles={{ body: { padding: 8 } }}>
                     <div style={{ marginBottom: 8 }} >
                        <span>视频预览</span>
                        <span style={{ float: 'right' }} onClick={() => { this.setState({ curPreviewVideo: '' }) }}>
                           <CloseOutlined style={{ fontSize: 20 }} />
                        </span>
                     </div>
                     <video controls style={{ width: '100%' }}>
                        <source src={curPreviewVideo} type="video/mp4"></source>
                     </video>
                  </Card>) : ''
               }
            </Spin>
         </div >
      );
   }
}

function mapStateToProps (state) {
   const { auth } = state
   return {
      user: auth.user
   };
}

export default connect(mapStateToProps)(Uploads);