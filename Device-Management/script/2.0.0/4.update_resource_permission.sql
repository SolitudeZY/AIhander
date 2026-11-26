-- 边缘模块菜单权限码：新增权限码 + 对齐父级 + 角色授权

INSERT INTO resource (code, name, parent_resource) VALUES
  ('MODELMANAGEMENT',       '模型管理',        NULL),
  ('EVENTMANAGEMENT',       '事件管理',        NULL),
  ('EDGEDEVICE',            '边缘设备',        'DEVICE'),
  ('VIEWEDGEDEVICE',        '查看设备',        'EDGEDEVICE'),
  ('VIEWEDGEDEVICELOG',     '查看日志',        'EDGEDEVICE'),
  ('ASSIGNEDGEDEVICEPROJECT','分配项目',       'EDGEDEVICE'),
  ('REBOOTEDGEDEVICE',      '重启设备',        'EDGEDEVICE'),
  ('EDGEREMOTESESSION',     '远程会话',        'EDGEDEVICE'),
  ('EDGEFILETRANSFER',      '文件传输',        'EDGEDEVICE'),
  ('VISIONMODEL',           '视觉模型库',      'MODELMANAGEMENT'),
  ('VIEWVISIONMODEL',       '查看模型',        'VISIONMODEL'),
  ('UPLOADVISIONMODEL',     '上传模型',        'VISIONMODEL'),
  ('EDITVISIONMODEL',       '编辑模型信息',    'VISIONMODEL'),
  ('EVENTALARM',            '事件与告警',      'EVENTMANAGEMENT'),
  ('VIEWEVENT',             '查看事件',        'EVENTALARM'),
  ('VIEWEVENTEVIDENCE',     '查看证据',        'EVENTALARM'),
  ('VIEWEVENTRESULT',       '查看告警结果',    'EVENTALARM'),
  ('UPGRADETASK',           '升级任务',        'EVENTMANAGEMENT'),
  ('VIEWUPGRADETASK',       '查看升级任务',    'UPGRADETASK'),
  ('VIEWUPGRADETASKDETAIL', '查看设备执行明细','UPGRADETASK')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_resource = EXCLUDED.parent_resource;

-- 产品库 / 参数模板 / 参数模板历史记录 由「设备管理」改挂「模型管理」
UPDATE resource SET parent_resource = 'MODELMANAGEMENT'
WHERE code IN ('PRODUCTLIB', 'PARAMETERTEMPLATE', 'PARAMETERTEMPLATEHISTORY');

-- 给角色授权
INSERT INTO role_resource (role, resource)
SELECT 1, code FROM resource WHERE code IN (
  'EDGEDEVICE',
  'VIEWEDGEDEVICE',
  'VIEWEDGEDEVICELOG',
  'ASSIGNEDGEDEVICEPROJECT',
  'REBOOTEDGEDEVICE',
  'EDGEREMOTESESSION',
  'EDGEFILETRANSFER',
  'VISIONMODEL',
  'VIEWVISIONMODEL',
  'UPLOADVISIONMODEL',
  'EDITVISIONMODEL',
  'EVENTALARM',
  'VIEWEVENT',
  'VIEWEVENTEVIDENCE',
  'VIEWEVENTRESULT',
  'UPGRADETASK',
  'VIEWUPGRADETASK',
  'VIEWUPGRADETASKDETAIL'
)
ON CONFLICT (role, resource) DO NOTHING;
