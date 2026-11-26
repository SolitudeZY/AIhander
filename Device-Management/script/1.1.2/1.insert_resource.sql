INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('BLUETOOTHAPPFEISHANG', '蓝牙APP权限（飞尚测控宝）', NULL);
INSERT INTO "public"."resource" 
("code", "name", "parent_resource") 
VALUES ('LOGONPERMISSION', '蓝牙APP登录权限', 'BLUETOOTHAPPFEISHANG');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DEBUGLOGSVIEW', '调试日志查看', 'BLUETOOTHAPPFEISHANG');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('DATAPROTOCOL', '数据协议', 'BLUETOOTHAPPFEISHANG');
INSERT INTO public.resource
(code, "name", parent_resource)
VALUES('LOGSWITCH', '日志开关', 'BLUETOOTHAPPFEISHANG');