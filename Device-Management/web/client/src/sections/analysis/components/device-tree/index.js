import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Input, Button, Drawer } from 'antd';

// import { useSafeState } from 'ahooks';

import Immutable from 'immutable';
import { AuthorizationCode } from '$utils';
import { Func } from '@peace/utils';
// import { PlusOutlined } from '@ant-design/icons';
import { PlusOutlined } from '@ant-design/icons';
import EquipmentOption from './equipment-option';
import ZuwangMain from './zuwang-main';


const { ModifyEquipmentNetworking } = AuthorizationCode;

export default function ({ ...props }) {
   const {
      dispatch, clientHeight, deviceMetasWithFollow, deviceList, dimensionlist, struct,
   } = props;
   const [g6TreeDirection, setG6TreeDirection] = useState('TB');
   const [devices, setDevices] = useState(null);
   const [selectedNode, setSelectedNode] = useState(null);
   const [selectedParentNode, setSelectedParentNode] = useState(null);
   const [emitDataChange, setEmitDataChange] = useState(false);
   const [collapseAll, setCollapseAll] = useState(false);
   const [collapsed, setCollapsed] = useState([]);
   const [expandAll, setExpandAll] = useState(false);
   const [expanded, setExpanded] = useState([]);
   const [targetNode, setTargetNode] = useState('');
   const [showOptionModal, setShowOptionModal] = useState(false);
   const [clientWidth, setClientWidth] = useState(document.body.clientWidth - 64 - 20 - 16 - 2);
   const [dimensions, setDimensions] = useState({});
   const [sensorsId, setSensorsId] = useState([]);
   const [sensorsDataItems, setSensorsDataItems] = useState({});
   const [foldAllG6ToCenter, setFoldAllG6ToCenter] = useState(false);
   const [inputSearching, setInputSearching] = useState(false);

   useEffect(() => {
      if (deviceMetasWithFollow?.devices) {

         if (deviceList?.instances) {
            const sensorsId = [];
            const sensorsDataItems = {};
            for (const id in deviceList.instances) {
               const instances = deviceList.instances[id];
               if (instances.type == 's.d' && instances.instance.properties.deviceType == 'sensor') {
                  const meta = deviceMetasWithFollow.devices.find((m) => m.id == instances.instance.deviceMetaId);
                  sensorsDataItems[id] = {
                     items: {},
                     deviceName: instances.name,
                  };
                  if (meta) {
                     sensorsDataItems[id].items = meta.capabilities[0].properties.reduce((p, n) => {
                        if (n.category == 'Output') {
                           p[n.name] = { name: n.showName, unit: n.unit };
                        }
                        return p;
                     }, {});
                  }
                  sensorsId.push(id);
               }
            }
            setSensorsId(sensorsId);
            setSensorsDataItems(sensorsDataItems);
         }
      }

      if (deviceList?.instances) {
         const newInstances = { ...deviceList.instances, ...dimensionlist };
         setDevices({ ...deviceList, instances: newInstances });
      } else if (!devices) {
         const data = { instances: {} };
         const uuidNode = guid();
         data.instances[uuidNode] = {
            instance: {},
            svg: {
               compX: 0,
               compY: 0,
               isSelected: false,
               rotateAng: 0,
               scaleX: 1,
               scaleY: 1,
               x: 2498,
               y: 1083,
            },
            type: 's.iota',
         };
         data.settings = {
            grid: {
               step: 20,
            },
            height: 3072,
            padding: 40,
            scale: 10,
            scrollLeft: 2047,
            scrollTop: 1082,
            width: 5120,
         };
         setDevices(data);
      }
   }, [deviceList, deviceMetasWithFollow]);

   const guid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0; const
         v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
   });

   const closeOptionModal = () => {
      setShowOptionModal(false);
      setSelectedNode(null);
   };

   const _handelNodeClick = (node) => {
      if (node) {
         const targetId = node.get('model').id;
         const selectedNode = { ...devices?.instances[targetId], id: targetId };
         const deviceMetaId = selectedNode?.instance?.deviceMetaId;
         const selectedDeviceMetaArr = [];
         let selectedDeviceMeta;
         if (selectedDeviceMetaArr.length == 0) {
            selectedDeviceMeta = deviceMetasWithFollow && deviceMetasWithFollow.devices
               ? deviceMetasWithFollow.devices.filter((s) => s.id == deviceMetaId)[0]
               : [];
         } else {
            selectedDeviceMeta = selectedDeviceMetaArr[0];
         }
         if (selectedNode.type && selectedNode.type != 's.iota') {
            // parentNode

            const parentNode = Object.keys(devices.instances).reduce((p, k) => {
               const instance = devices.instances[k];
               if (instance.type == 's.l' && instance.instance.from.ownerSvgId == targetId) {
                  p = { ...devices.instances[instance.instance.to.ownerSvgId], id: instance.instance.to.ownerSvgId };
               }
               return p;
            }, null);

            const selectedParentNodeMetaId = parentNode ? parentNode.instance.deviceMetaId : null;
            const selectedParentNodeMeta = selectedParentNodeMetaId ? deviceMetasWithFollow.devices.filter((s) => s.id == selectedParentNodeMetaId)[0] : null;

            setSelectedNode({ type: 'equipment', device: selectedNode, meta: selectedDeviceMeta });
            setSelectedParentNode({ type: 'equipment', device: parentNode, meta: selectedParentNodeMeta });
            setShowOptionModal(true);
         } else {
            setShowOptionModal(false);
            setSelectedNode(null);
            setSelectedParentNode(null);
         }
      } else {
         setShowOptionModal(false);
         setSelectedNode(null);
         setSelectedParentNode(null);
      }
   };

   const emitDataChange_ = () => {
      setEmitDataChange(true);
   };

   const _finishDataChange = () => {
      setEmitDataChange(false);
   };

   const handleNodeEnter = (node) => {
      const result = dimensionlist?.dimensions?.length <= 0;
      return result;
   };
   const onCollapse = (model, collapse) => {
      if (collapse) {
         setCollapsed(collapsed.concat([model.id]));
         setExpanded(expanded.filter((c) => c != model.id));
      } else {
         setCollapsed(collapsed.filter((c) => c != model.id));
         setExpanded(expanded.concat([model.id]));
      }
   };

   const resetFoldAllG6ToCenter = () => {
      setFoldAllG6ToCenter(false);
   };

   const changeG6TreeDirection = () => {
      setG6TreeDirection(g6TreeDirection == 'TB' ? 'LR' : 'TB');
      setShowOptionModal(false);
   };
   const containerHeight = clientHeight - 270;

   return (
      <div id="flag" style={{ position: "relative" }}>
         <div style={{
            position: 'absolute', top: 10, left: 0, zIndex: 2,
         }}
         >
            <Button
               style={{ marginRight: 12, marginBottom: 12, float: 'left' }}
               type="primary" theme='solid'
               onClick={() => {
                  setExpandAll(false);
                  setCollapseAll(true);
                  setCollapsed([]);
                  setExpanded([]);
                  setEmitDataChange(true);
                  // setFoldAllG6ToCenter(true);
                  setTargetNode('');
                  document.getElementById('searchInput').value = '';
               }}
            >
               折叠全部
            </Button>
            <Button
               type="primary" theme='solid'
               style={{ marginRight: 12, marginBottom: 12, float: 'left' }}
               onClick={() => {
                  setCollapseAll(false);
                  setExpandAll(true);
                  setCollapsed([]);
                  setExpanded([]);
                  setEmitDataChange(true);
                  setTargetNode('');
                  document.getElementById('searchInput').value = '';
               }}
            >
               展开全部
            </Button>

            <Button type="primary" theme='solid' style={{ marginLeft: 12, marginBottom: 12 }} onClick={changeG6TreeDirection}>组图方向</Button>
            <span style={{ float: 'left' }}>
               <Input
                  style={{ width: 200 }}
                  id="searchInput"
                  onEnterPress={(e) => {
                     setTargetNode(e.target.value);
                     setInputSearching(true);
                     // localStorage.setItem('inputSearching', true)
                  }}
               />
            </span>
         </div>
         {
            devices?.instances
            && (
               <ZuwangMain
                  data={devices.instances}
                  collapseAll={collapseAll}
                  expandAll={expandAll}
                  collapsed={collapsed}
                  expanded={expanded}
                  onCollapse={onCollapse}
                  width={clientWidth}
                  height={containerHeight}
                  emitChange={emitDataChange}
                  emitDataChange_={emitDataChange_}
                  changeFinish={_finishDataChange}
                  handelNodeClick={_handelNodeClick}
                  targetNode={targetNode}
                  inputSearching={inputSearching}
                  setInputSearching={setInputSearching}
                  struct={struct}
                  handleNodeEnter={handleNodeEnter}
                  foldAllG6ToCenter={foldAllG6ToCenter}
                  resetFoldAllG6ToCenter={resetFoldAllG6ToCenter}
                  g6TreeDirection={g6TreeDirection}
               />
            )
         }

         <Drawer
            getPopupContainer={() => document.getElementById('show')}
            style={{ position: 'absolute' }}
            mask={false}
            maskClosable={false}
            open={showOptionModal}
            width={480}
            onCancel={closeOptionModal}
            styles={{ body: { padding: 8 } }}
         >
            <EquipmentOption
               isEdit={false}
               struct={struct}
               devices={devices}
               deviceMetas={deviceMetasWithFollow}
               info={selectedNode}
               parentNode={selectedParentNode}
               dimensions={dimensionlist}
               height={containerHeight}
               dispatch={dispatch}
            />
         </Drawer>
      </div>
   );
}
