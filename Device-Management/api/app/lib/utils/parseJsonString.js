/*
   Airbyte同步数据：PG->json类型数据转换成 CK->String类型，会添加转义字符"\" 
   
   示例（procinst_id='15118b44-7178-11ef-9d9f-966dff66176e'）：
      源数据：
         {"Application_Date":"2024-09-13","Linked_Project":18,"Title":"[重庆白沙长江大桥在线监测项目]项目漏液异常","Detail":"重庆白沙长江大桥在线监测项目项目下重庆白沙长江大桥健康监测结构物下XZD出现漏液。","structureId":"20240913103000_18_ly","SourceID":"{\"ly\":\"ddd184d5-5482-4b18-b6cc-376bb55bab42\"}","Expected_Completion_Time":"2024-09-20 10:30:00","StartTime":"2023-06-11 16:00:00","EndTime":"2028-06-11 16:00:00","Project_Level":"-","isAnchor":"否","Subjective_Opinion":"请分析原始数据，是否压强已至负压。并及时处理中台漏液管理功能提醒。","Processing_Personnel":1160,"Result":"待分析判断为该水路漏液，请售后人员排查设备漏液原因及情况。","Measure":"9月11日已处理NDX4设备漏液情况，XZD设备与NDX4为同一水路下设备，根据现在数据，压强漏液已至负压","Solution_Status":"false","Completion_Time":"2024-09-30 23:59","Opinion":"中秋节后安排人员对接处理","Attachment":[{"name":"重庆白沙长江大桥在线监测项目_1726194601882.xlsx","uid":"rc-upload-1726194602996-3","status":"done","url":"/assets/files/common/1726194602973_重庆白沙长江大桥在线监测项目_1726194601882.xlsx"}],"Processing_Attachment":[],"formItemName":"运维中台售后问题处理工单","expectTime":"","report_influence":["timeResponsePaper"],"pa3aGiey3N":"2024-09-17 10:55"}
      Airbyte 同步数据：
         {\"Application_Date\":\"2024-09-13\",\"Linked_Project\":18,\"Title\":\"[重庆白沙长江大桥在线监测项目]项目漏液异常\",\"Detail\":\"重庆白沙长江大桥在线监测项目项目下重庆白沙长江大桥健康监测结构物下XZD出现漏液。\",\"structureId\":\"20240913103000_18_ly\",\"SourceID\":\"{\\\"ly\\\":\\\"ddd184d5-5482-4b18-b6cc-376bb55bab42\\\"}\",\"Expected_Completion_Time\":\"2024-09-20 10:30:00\",\"StartTime\":\"2023-06-11 16:00:00\",\"EndTime\":\"2028-06-11 16:00:00\",\"Project_Level\":\"-\",\"isAnchor\":\"否\",\"Subjective_Opinion\":\"请分析原始数据，是否压强已至负压。并及时处理中台漏液管理功能提醒。\",\"Processing_Personnel\":1160,\"Result\":\"待分析判断为该水路漏液，请售后人员排查设备漏液原因及情况。\",\"Measure\":\"9月11日已处理NDX4设备漏液情况，XZD设备与NDX4为同一水路下设备，根据现在数据，压强漏液已至负压\",\"Solution_Status\":\"false\",\"Completion_Time\":\"2024-09-30 23:59\",\"Opinion\":\"中秋节后安排人员对接处理\",\"Attachment\":[{\"name\":\"重庆白沙长江大桥在线监测项目_1726194601882.xlsx\",\"uid\":\"rc-upload-1726194602996-3\",\"status\":\"done\",\"url\":\"/assets/files/common/1726194602973_重庆白沙长江大桥在线监测项目_1726194601882.xlsx\"}],\"Processing_Attachment\":[],\"formItemName\":\"运维中台售后问题处理工单\",\"expectTime\":\"\",\"report_influence\":[\"timeResponsePaper\"],\"pa3aGiey3N\":\"2024-09-17 10:55\"}
      对应的 require('clickhouse') 查询结果：
         {\\"Application_Date\\":\\"2024-09-13\\",\\"Linked_Project\\":18,\\"Title\\":\\"[重庆白沙长江大桥在线监测项目]项目漏液异常\\",\\"Detail\\":\\"重庆白沙长江大桥在线监测项目项目下重庆白沙长江大桥健康监测结构物下XZD出现漏液。\\",\\"structureId\\":\\"20240913103000_18_ly\\",\\"SourceID\\":\\"{\\\\\\"ly\\\\\\":\\\\\\"ddd184d5-5482-4b18-b6cc-376bb55bab42\\\\\\"}\\",\\"Expected_Completion_Time\\":\\"2024-09-20 10:30:00\\",\\"StartTime\\":\\"2023-06-11 16:00:00\\",\\"EndTime\\":\\"2028-06-11 16:00:00\\",\\"Project_Level\\":\\"-\\",\\"isAnchor\\":\\"否\\",\\"Subjective_Opinion\\":\\"请分析原始数据，是否压强已至负压。并及时处理中台漏液管理功能提醒。\\",\\"Processing_Personnel\\":1160,\\"Result\\":\\"待分析判断为该水路漏液，请售后人员排查设备漏液原因及情况。\\",\\"Measure\\":\\"9月11日已处理NDX4设备漏液情况，XZD设备与NDX4为同一水路下设备，根据现在数据，压强漏液已至负压\\",\\"Solution_Status\\":\\"false\\",\\"Completion_Time\\":\\"2024-09-30 23:59\\",\\"Opinion\\":\\"中秋节后安排人员对接处理\\",\\"Attachment\\":[{\\"name\\":\\"重庆白沙长江大桥在线监测项目_1726194601882.xlsx\\",\\"uid\\":\\"rc-upload-1726194602996-3\\",\\"status\\":\\"done\\",\\"url\\":\\"/assets/files/common/1726194602973_重庆白沙长江大桥在线监测项目_1726194601882.xlsx\\"}],\\"Processing_Attachment\\":[],\\"formItemName\\":\\"运维中台售后问题处理工单\\",\\"expectTime\\":\\"\\",\\"report_influence\\":[\\"timeResponsePaper\\"],\\"pa3aGiey3N\\":\\"2024-09-17 10:55\\"}
*/

module.exports = function (app, opts) {
   function parseJsonString(jsonString) {
      if (jsonString.indexOf('{\\') == 0) {
         jsonString = jsonString.replace(/\\"/g, '"').replace(/\\"/g, '"');
      }
      let jsonData = JSON.parse(jsonString);
      return jsonData;
   }

   return { parseJsonString }
}
