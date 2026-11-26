// 设备问题参数（不含CD）
export const DEVICE_ISSUE_PARAMETER_WITHOUT_CD = {
  LWPT: [
    /* 分布式数据采集节点（LW） */
    {
      name: "基本参数",
      field: "BF",
      children: [
        {
          field: "CV",
          name: "配置版本号",
          dataType: "number",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "TIME",
          name: "平台时间",
          dataType: "TIME",
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
          /**
                    * TCP 定制化实现,内容:
                        [
                            {"N":1,"EN":1,"PT":8888,"IP":"192.168.1.1"}, // 编号，使能(Boolean)，端口号(0-65535)，IP地址
                            {"N":1,"EN":1,"PT":8888,"IP":"192.168.1.1"},
                            ...
                        ]
                    */
        },
      ],
    },
  ],
  RTDZ: [
    /**地灾RTU */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
      ],
    },
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "BPBS相关配置",
      field: "BPBS",
      children: [
        {
          field: "CAM",
          name: "摄像机功能选项",
        },
        {
          field: "BS",
          name: "爆闪功能选项",
        },
        {
          field: "LORA",
          name: "LORA功能选项",
        },
      ],
    },
    {
      name: "Lora参数配置",
      field: "LORA",
      children: [
        {
          field: "PID",
          name: "网络号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "NID",
          name: "id号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "TID",
          name: "透传地址",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "LFR",
          name: "载波频率",
          dataType: "number",

          // 规则：整数，范围410~441、470~510、850~950,antd表单项规则配置
          rules: [
            {
              type: "number",
              validator: (rule, value) => {
                if (
                  (value >= 410 && value <= 441) ||
                  (value >= 470 && value <= 510) ||
                  (value >= 850 && value <= 950)
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  "请输入410~441、470~510、850~950之间的整数",
                );
              },
            },
          ],
        },
        {
          field: "DBL",
          name: "调试等级",
          dataType: "inputNumber",
          maxValue: 2,
          minValue: 0,
        },
      ],
    },
    {
      name: "路安平台相关配置",
      field: "LAPRO",
      children: [
        {
          field: "UUID",
          name: "结构物编码",
          rules: [
            {
              max: 36,
              message: "结构物编码最大长度为32字节",
            },
          ],
        },
        {
          field: "GW",
          name: "网关ID",
        },
        {
          field: "CHF",
          dataType: "CHF",
          arrayConfig: [
            {
              name: "CH",
              label: "通道号",
              dataType: "number",
            },
            {
              name: "SUB",
              label: "子通道号",
              dataType: "number",
            },
            {
              name: "CD",
              label: "监测类型",
              dataType: "text",
            },
            {
              name: "ID",
              label: "传感器ID",
              dataType: "text",
            },
          ],
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
        {
          field: "MQTT",
          name: "MQTT",
        },
      ],
    },
  ],
  RSSL: [
    /* 水利RTU */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "遥测参数",
      field: "YC",
      children: [
        {
          field: "STADDR",
          name: "遥测站地址（十位）",
        },
        {
          field: "CEADDR",
          name: "中心站地址（0~255）",
          dataType: "number",
        },
        {
          field: "CEPW",
          name: "中心站密码（0~65535）",
        },
      ],
    },
  ],
  DTPT: [
    /* 自研DTU */
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "基本参数",
      field: "BF",
      children: [
        {
          field: "BOUD",
          name: "通信串口波特率",
          dataType: "select",
          options: [
            {
              label: "9600",
              value: 9600,
            },
            {
              label: "38400",
              value: 38400,
            },
            {
              label: "57600",
              value: 57600,
            },
            {
              label: "115200",
              value: 115200,
            },
          ],
        },
      ],
    },
    {
      name: "是否禁用转义",
      field: "TF1",
      children: [
        {
          field: "TF",
          name: "禁用转义",
          dataType: "switch",
        },
      ],
    },
  ],
  DCM2: [
    /* 一体化两参数监测仪 */
    {
      name: "基本参数",
      field: "BF",
      children: [
        {
          field: "CV",
          name: "配置版本号",
          dataType: "number",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "TIME",
          name: "平台时间",
          dataType: "TIME",
        },
        {
          field: "TR",
          name: "触发功能配置",
          dataType: "switch",
          checkedValue: 0, // 开启时的值
          uncheckedValue: 1, // 关闭时的值
        },
        {
          field: "ACCH",
          name: "加速度计安装高度",
          dataType: "FLOAT",
        },
      ],
    },
    {
      name: "路安平台相关配置",
      field: "LAPRO",
      children: [
        {
          field: "UUID",
          name: "结构物编码",
          rules: [
            {
              max: 36,
              message: "结构物编码最大长度为32字节",
            },
          ],
        },
        {
          field: "CHF",
          dataType: "CHF",
          arrayConfig: [
            {
              name: "CD",
              label: "监测类型编码",
              dataType: "text",
            },
            {
              name: "ID",
              label: "传感器编号",
              dataType: "text",
            },
            {
              name: "MP",
              label: "测点编号",
              dataType: "text",
            },
          ],
        },
        {
          field: "USER",
          name: "用户名",
          rules: [
            {
              max: 32,
              message: "结构物编码最大长度为32字节",
            },
          ],
        },
        {
          field: "PW",
          name: "密码",
          rules: [
            {
              max: 32,
              message: "结构物编码最大长度为32字节",
            },
          ],
        },
      ],
    },
    {
      name: "Lora参数配置",
      field: "LORA",
      children: [
        {
          field: "PID",
          name: "网络号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "NID",
          name: "id号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "TID",
          name: "透传地址",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "LFR",
          name: "载波频率",
          dataType: "number",

          // 规则：整数，范围410~441、470~510、850~950,antd表单项规则配置
          rules: [
            {
              type: "number",
              validator: (rule, value) => {
                if (
                  (value >= 410 && value <= 441) ||
                  (value >= 470 && value <= 510) ||
                  (value >= 850 && value <= 950)
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  "请输入410~441、470~510、850~950之间的整数",
                );
              },
            },
          ],
        },
        {
          field: "DBL",
          name: "调试等级",
          dataType: "inputNumber",
          maxValue: 2,
          minValue: 0,
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  DCM3: [
    /* 一体化三参数监测仪 */
    {
      name: "基本参数",
      field: "BF",
      children: [
        {
          field: "CV",
          name: "配置版本号",
          dataType: "number",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "TIME",
          name: "平台时间",
          dataType: "TIME",
        },
        {
          field: "TR",
          name: "触发功能配置",
          dataType: "switch",
          checkedValue: 0, // 开启时的值
          uncheckedValue: 1, // 关闭时的值
        },
        {
          field: "ACCH",
          name: "加速度计安装高度",
          dataType: "FLOAT",
        },
      ],
    },
    {
      name: "路安平台相关配置",
      field: "LAPRO",
      children: [
        {
          field: "UUID",
          name: "结构物编码",
          rules: [
            {
              max: 36,
              message: "结构物编码最大长度为32字节",
            },
          ],
        },
        {
          field: "CHF",
          dataType: "CHF",
          arrayConfig: [
            {
              name: "CD",
              label: "监测类型编码",
              dataType: "text",
            },
            {
              name: "ID",
              label: "传感器编号",
              dataType: "text",
            },
            {
              name: "MP",
              label: "测点编号",
              dataType: "text",
            },
          ],
        },
        {
          field: "USER",
          name: "用户名",
          rules: [
            {
              max: 32,
              message: "结构物编码最大长度为32字节",
            },
          ],
        },
        {
          field: "PW",
          name: "密码",
          rules: [
            {
              max: 32,
              message: "结构物编码最大长度为32字节",
            },
          ],
        },
      ],
    },
    {
      name: "Lora参数配置",
      field: "LORA",
      children: [
        {
          field: "PID",
          name: "网络号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "NID",
          name: "id号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "TID",
          name: "透传地址",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "LFR",
          name: "载波频率",
          dataType: "number",

          // 规则：整数，范围410~441、470~510、850~950,antd表单项规则配置
          rules: [
            {
              type: "number",
              validator: (rule, value) => {
                if (
                  (value >= 410 && value <= 441) ||
                  (value >= 470 && value <= 510) ||
                  (value >= 850 && value <= 950)
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  "请输入410~441、470~510、850~950之间的整数",
                );
              },
            },
          ],
        },
        {
          field: "DBL",
          name: "调试等级",
          dataType: "inputNumber",
          maxValue: 2,
          minValue: 0,
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  RTDS: [
    /* 地下水遥测终端 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "存储粒度(秒)",
          dataType: "number",
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "遥测参数",
      field: "YC",
      children: [
        {
          field: "STADDR",
          name: "遥测站地址（十二位）",
        },
        {
          field: "CEADDR",
          name: "中心站地址（0~255）",
          dataType: "number",
        },
        {
          field: "CEPW",
          name: "中心站密码（0~65535）",
        },
      ],
    },
    {
      name: "水位计",
      field: "SW",
      componentType: "groupPackage",
      children: [
        {
          name: "气压补偿参数配置",
          field: "BA",
          dataType: "groupPackage", // 前端组包：模块号_线长(m)_修正系数_埋深阈值(m)_重力加速度_修正气压(hPa)
          children: [
            {
              field: "moduleNo",
              name: "模块号",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("模块号必须为数字");
                    }
                    if (!Number.isInteger(Number(value))) {
                      return Promise.reject("模块号必须为整数");
                    }
                    if (value <= 0 || value > 255) {
                      return Promise.reject("模块号必须在1~255之间");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "lineLength",
              name: "线长(m)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("线长必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue <= 0 || numValue > 999.9) {
                      return Promise.reject("线长必须大于0且小于等于999.9");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 1) {
                      return Promise.reject("线长最多允许小数点后1位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "correctionFactor",
              name: "修正系数",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject("修正系数必须在-50~50之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("修正系数最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "depthThreshold",
              name: "埋深阈值(m)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("埋深阈值必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue <= 0 || numValue > 999.9) {
                      return Promise.reject("埋深阈值必须大于0且小于等于999.9");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 1) {
                      return Promise.reject("埋深阈值最多允许小数点后1位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "gravityAcceleration",
              name: "重力加速度",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("重力加速度必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < 8 || numValue > 12) {
                      return Promise.reject("重力加速度必须在8~12之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("重力加速度最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "pressureCorrection",
              name: "修正气压(hPa)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("修正气压必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < 0 || numValue > 1200) {
                      return Promise.reject("修正气压必须在0~1200之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("修正气压最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
          ],
        },
        {
          name: "系数补偿参数配置",
          field: "XS",
          dataType: "groupPackage", // 前端组包：模块号_线长(m)_埋深阈值(m)_二次项水位修正系数_一次项水位修正系数_水位修正常量_二次项水温修正系数_一次项水温修正系数_水温修正常量
          children: [
            {
              field: "moduleNo",
              name: "模块号",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("模块号必须为数字");
                    }
                    if (!Number.isInteger(Number(value))) {
                      return Promise.reject("模块号必须为整数");
                    }
                    if (value <= 0 || value > 255) {
                      return Promise.reject("模块号必须在1~255之间");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "lineLength",
              name: "线长(m)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("线长必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue <= 0 || numValue > 999.9) {
                      return Promise.reject("线长必须大于0且小于等于999.9");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 1) {
                      return Promise.reject("线长最多允许小数点后1位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "depthThreshold",
              name: "埋深阈值(m)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("埋深阈值必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue <= 0 || numValue > 999.9) {
                      return Promise.reject("埋深阈值必须大于0且小于等于999.9");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 1) {
                      return Promise.reject("埋深阈值最多允许小数点后1位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "correctionFactorSecondaryItem",
              name: "二次项水位修正系数",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("二次项水位修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject(
                        "二次项水位修正系数必须在-50~50之间",
                      );
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject(
                        "二次项水位修正系数最多允许小数点后6位",
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "correctionFactor1",
              name: "一次项水位修正系数",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("一次项水位修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject(
                        "一次项水位修正系数必须在-50~50之间",
                      );
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject(
                        "一次项水位修正系数最多允许小数点后6位",
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              name: "水位修正常量",
              field: "correctionConstant1",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("水位修正常量必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -1200 || numValue > 2000) {
                      return Promise.reject("水位修正常量必须在-1200~2000之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("水位修正常量最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              name: "二次项水温修正系数",
              field: "waterTemperatureSecondaryItem",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("二次项水温修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject(
                        "二次项水温修正系数必须在-50~50之间",
                      );
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject(
                        "二次项水温修正系数最多允许小数点后6位",
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              name: "一次项水温修正系数",
              field: "waterTemperature1",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("一次项水温修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject(
                        "一次项水温修正系数必须在-50~50之间",
                      );
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject(
                        "一次项水温修正系数最多允许小数点后6位",
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              name: "水温修正常量",
              field: "waterTemperatureConstant",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("水温修正常量必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -1200 || numValue > 2000) {
                      return Promise.reject("水温修正常量必须在-1200~2000之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("水温修正常量最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "气压计",
      field: "QY",
      children: [
        {
          field: "pressureCalibrationFactor",
          name: "修正系数",
          dataType: "number",
          rules: [
            {
              validator: (_, value) => {
                // 如果值为空，由required规则处理
                if (value === undefined || value === null || value === "") {
                  return Promise.resolve();
                }
                if (isNaN(value)) {
                  return Promise.reject("修正系数必须为数字");
                }
                const numValue = parseFloat(value);
                if (numValue < -50 || numValue > 50) {
                  return Promise.reject("修正系数必须在-50~50之间");
                }
                const decimalPart = value.toString().split(".")[1];
                if (decimalPart && decimalPart.length > 6) {
                  return Promise.reject("修正系数最多允许小数点后6位");
                }
                return Promise.resolve();
              },
            },
          ],
        },
        {
          field: "pressureCalibrationConstant",
          name: "修正常量（hPa）",
          dataType: "number",
          rules: [
            {
              validator: (_, value) => {
                // 如果值为空，由required规则处理
                if (value === undefined || value === null || value === "") {
                  return Promise.resolve();
                }
                if (isNaN(value)) {
                  return Promise.reject("修正常量必须为数字");
                }
                const numValue = parseFloat(value);
                if (numValue < -1200 || numValue > 2000) {
                  return Promise.reject("修正常量必须在-1200~2000之间");
                }
                const decimalPart = value.toString().split(".")[1];
                if (decimalPart && decimalPart.length > 6) {
                  return Promise.reject("修正常量最多允许小数点后6位");
                }
                return Promise.resolve();
              },
            },
          ],
        },
      ],
    },
  ],
  // 遥测终端RTU路安协议
  RTLA: [
    /**新增 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
      ],
    },
    // {
    //   name: "命令参数",
    //   field: "CD",
    //   componentType: "select",
    //   options: [
    //     {
    //       label: "重启",
    //       value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
    //     },
    //     {
    //       label: "清除积压数据",
    //       value: JSON.stringify({ CLR: "HISTORY" }),
    //     },
    //   ],
    // },
    {
      name: "BPBS相关配置",
      field: "BPBS",
      children: [
        {
          field: "CAM",
          name: "摄像机功能选项",
        },
        {
          field: "BS",
          name: "爆闪功能选项",
        },
        {
          field: "LORA",
          name: "LORA功能选项",
        },
      ],
    },
    {
      name: "Lora参数配置",
      field: "LORA",
      children: [
        {
          field: "PID",
          name: "网络号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "NID",
          name: "id号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "TID",
          name: "透传地址",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "LFR",
          name: "载波频率",
          dataType: "number",

          // 规则：整数，范围410~441、470~510、850~950,antd表单项规则配置
          rules: [
            {
              type: "number",
              validator: (rule, value) => {
                if (
                  (value >= 410 && value <= 441) ||
                  (value >= 470 && value <= 510) ||
                  (value >= 850 && value <= 950)
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  "请输入410~441、470~510、850~950之间的整数",
                );
              },
            },
          ],
        },
        {
          field: "DBL",
          name: "调试等级",
          dataType: "inputNumber",
          maxValue: 2,
          minValue: 0,
        },
      ],
    },
    {
      name: "路安平台相关配置",
      field: "LAPRO",
      children: [
        {
          field: "UUID",
          name: "结构物编码",
          rules: [
            {
              max: 36,
              message: "结构物编码最大长度为32字节",
            },
          ],
        },
        {
          field: "GW",
          name: "网关ID",
        },
        {
          field: "CHF",
          dataType: "CHF",
          arrayConfig: [
            {
              name: "CH",
              label: "通道号",
              dataType: "number",
            },
            {
              name: "SUB",
              label: "子通道号",
              dataType: "number",
            },
            {
              name: "CD",
              label: "监测类型",
              dataType: "text",
            },
            {
              name: "ID",
              label: "传感器ID",
              dataType: "text",
            },
          ],
        },
        {
          field: "AICAM",
          name: "AI摄像机配置",
          dataType: "AICAM",
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
        {
          field: "MQTT",
          name: "MQTT",
        },
      ],
    },
  ],
  //ivw08
  VW08: [
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
        {
          field: "CV",
          name: "配置版本号",
          dataType: "number",
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  //一体化监测
  YTJD: [
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
        {
          field: "LFT",
          name: "裂缝计拉线位移采集粒度",
          dataType: "number",
        },
      ],
    },
    {
      name: "Lora参数配置",
      field: "LORA",
      children: [
        {
          field: "PID",
          name: "网络号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "NID",
          name: "id号",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "TID",
          name: "透传地址",
          dataType: "number",
          // 规则：整数，范围0-65535,antd表单项规则配置
          rules: [
            {
              type: "number",
              min: 0,
              max: 65535,
              message: "请输入0-65535之间的整数",
            },
          ],
        },
        {
          field: "LFR",
          name: "载波频率",
          dataType: "number",

          // 规则：整数，范围410~441、470~510、850~950,antd表单项规则配置
          rules: [
            {
              type: "number",
              validator: (rule, value) => {
                if (
                  (value >= 410 && value <= 441) ||
                  (value >= 470 && value <= 510) ||
                  (value >= 850 && value <= 950)
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  "请输入410~441、470~510、850~950之间的整数",
                );
              },
            },
          ],
        },
        {
          field: "DBL",
          name: "调试等级",
          dataType: "inputNumber",
          maxValue: 2,
          minValue: 0,
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
        {
          field: "MQTT",
          name: "MQTT",
        },
      ],
    },
    {
      name: "温补",
      field: "TCA",
      children: [
        {
          field: "TCA1",
          name: "x轴温补系数",
          dataType: "TCA",
        },
        {
          field: "TCA2",
          name: "y轴温补系数",
          dataType: "TCA",
        },
        {
          field: "TCA3",
          name: "z轴温补系数",
          dataType: "TCA",
        },
      ],
    },
  ],
  //无线倾角
  QJNB: [
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "MD",
          name: "模块模式",
          dataType: "select",
          options: [
            {
              label: "角度模式",
              value: 0,
            },
            // {
            //     label: "加速度模式",
            //     value: 1,
            // },
          ],
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
        {
          field: "TR",
          name: "触发功能配置",
          dataType: "switch",
          checkedValue: 0, // 开启时的值
          uncheckedValue: 1, // 关闭时的值
        },
        {
          field: "ACCTH",
          name: "触发阈值(mg)",
          dataType: "number",
        },
        {
          field: "ANGTH",
          name: "加报阈值(°)",
          dataType: "number",
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "温补",
      field: "TCA",
      children: [
        {
          field: "TCA1",
          name: "x轴温补系数",
          dataType: "TCA",
        },
        {
          field: "TCA2",
          name: "y轴温补系数",
          dataType: "TCA",
        },
        {
          field: "TCA3",
          name: "z轴温补系数",
          dataType: "TCA",
        },
      ],
    },
  ],
  SPMX: [
    {
      name: "基本参数",
      field: "BF",
      children: [
        {
          field: "CV",
          name: "配置版本号",
          dataType: "number",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "TIME",
          name: "平台时间",
          dataType: "TIME",
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "本地网络配置",
      field: "NET",
      children: [
        {
          field: "MOD",
          name: "网络通信模式",
          dataType: "select",
          options: [
            {
              label: "EC20串口模式",
              value: 0,
            },
            {
              label: "EC20 USB模式",
              value: 1,
            },
            {
              label: "网口",
              value: 2,
            },
            {
              label: "RS485",
              value: 3,
            },
            {
              label: "WIFI",
              value: 4,
            },
            {
              label: "NB模组",
              value: 5,
            },
          ],
        },
        {
          field: "IP",
          name: "本地设备IP",
          rules: [
            {
              max: 15,
              message: "IP地址最大长度为15字符",
            },
          ],
        },
        {
          field: "GW",
          name: "本地网关IP",
          rules: [
            {
              max: 15,
              message: "网关地址最大长度为15字符",
            },
          ],
        },
        {
          field: "NTP",
          name: "NTP 授时",
        },
      ],
    },
  ],
  ZXSJ: [
    /**分布式振弦数据采集仪 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "CV",
          name: "配置版本号",
          dataType: "number",
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
      length: 1,
    },
    {
      name: "工讯配置",
      field: "GX",
      children: [
        {
          field: "CIL_MC",
          name: "客户端名称",
          dataType: "string",
          rules: [
            {
              type: "string",
              max: 33,
              transform: (value) =>
                value === undefined || value === null ? value : String(value),
              message: "最大长度为33字符",
            },
          ],
        },
        {
          field: "CIL_MM",
          name: "客户端密码",
          dataType: "string",
          rules: [
            {
              type: "string",
              max: 47,
              transform: (value) =>
                value === undefined || value === null ? value : String(value),
              message: "最大长度为47字符",
            },
          ],
        },
        {
          field: "TENANT",
          name: "账号名称",
          dataType: "string",
          rules: [
            {
              type: "string",
              max: 33,
              transform: (value) =>
                value === undefined || value === null ? value : String(value),
              message: "最大长度为33字符",
            },
          ],
        },
        {
          field: "DEV_ID",
          name: "设备编码",
          dataType: "string",
          rules: [
            {
              type: "string",
              max: 33,
              transform: (value) =>
                value === undefined || value === null ? value : String(value),
              message: "最大长度为33字符",
            },
          ],
        },
        {
          field: "COL_ID",
          name: "传感器编码",
          dataType: "string",
          rules: [
            {
              type: "string",
              max: 33,
              transform: (value) =>
                value === undefined || value === null ? value : String(value),
              message: "最大长度为33字符",
            },
          ],
        },
      ],
    },
  ],
  SWYT: [
    /**一体化水位计 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "CV",
          name: "配置版本号",
          dataType: "number",
        },
        {
          field: "CNT",
          name: "工作次数",
          dataType: "number",
          rules: [
            // 大于等于0
            {
              type: "number",
              min: 0,
              message: "请输入大于等于0的整数",
            },
          ],
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
        {
          field: "AGRE",
          name: "平台类型",
          dataType: "select",
          options: [
            { label: "知物云", value: 1 },
            { label: "安心云", value: 2 },
            { label: "深圳平台", value: 3 },
            { label: "广州平台", value: 4 },
          ],
        },
      ],
    },
  ],
  GNSS: [
    /**GNSS接收机 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "DR",
          name: "GNSS数据频率(s)",
          dataType: "select",
          options: [
            { label: "1", value: 1 },
            { label: "5", value: 5 },
            { label: "10", value: 10 },
            { label: "15", value: 15 },
            { label: "30", value: 30 },
            { label: "60", value: 60 },
          ],
        },
        {
          field: "UDR",
          name: "诊断频率(s)",
          dataType: "number",
          // 最小300s，输入的值必须是60的倍数
          rules: [
            {
              type: "number",
              min: 300,
              message: "诊断频率最小300s，输入的值必须是60的倍数",
              validator: (_, value) => {
                const numValue = parseFloat(value);
                if (numValue % 60 !== 0) {
                  return Promise.reject("诊断频率必须是60的倍数");
                }
                return Promise.resolve();
              },
            },
          ],
        },
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "通道参数",
      field: "MCF",
      children: [
        { field: "THH_ACC_X", name: "X加速度阈值(mg)", dataType: "number" },
        { field: "THH_ACC_Y", name: "Y加速度阈值(mg)", dataType: "number" },
        { field: "THH_ACC_Z", name: "Z加速度阈值(mg)", dataType: "number" },
        { field: "THH_ANG_X", name: "X角度阈值(°)", dataType: "number" },
        { field: "THH_ANG_Y", name: "Y角度阈值(°)", dataType: "number" },
        { field: "THH_ANG_Z", name: "Z角度阈值(°)", dataType: "number" },
      ],
    },
  ],
  YTZD: [
    /**一体化振动设备 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          name: "诊断频率(s)",
          field: "UDR",
          dataType: "number",
        },
        {
          name: "经纬度",
          field: "GL",
          dataType: "GL",
        },
      ],
    },
    {
      name: "通道参数",
      field: "MCF",
      children: [
        {
          name: "采样参数配置",
          field: "YTZD",
          dataType: "groupPackage",
          children: [
            {
              name: "采样频率(Hz)",
              field: "FR",
              rules: [
                {
                  max: 200,
                  min: 1,
                  type: "number",
                  message: "采样频率范围1~200Hz",
                },
              ],
              dataType: "number",
            },
            {
              name: "采样时间(s)",
              field: "TIME",
              rules: [
                {
                  max: 250,
                  min: 1,
                  type: "number",
                  message: "采样时间范围1~250秒",
                },
              ],
              dataType: "number",
            },
            {
              name: "轴类型",
              field: "AX",
              options: [
                { label: "X", value: 0 },
                { label: "Y", value: 1 },
                { label: "Z", value: 2 },
                { label: "XY", value: 3 },
                { label: "XZ", value: 4 },
                { label: "YZ", value: 5 },
                { label: "XYZ", value: 6 },
              ],
              dataType: "select",
            },
            {
              name: "上报模式",
              field: "SBM",
              options: [
                { label: "定时上报", value: 0 },
                { label: "连续上报", value: 1 },
              ],
              dataType: "select",
            },
            {
              name: "去直流模式",
              field: "ZLM",
              options: [
                { label: "去直流", value: 0 },
                { label: "不去直流", value: 1 },
              ],
              dataType: "select",
            },
            {
              name: "超阈值类型",
              field: "YZM",
              options: [
                { label: "绝对值阈值", value: 0 },
                { label: "峰峰值阈值", value: 1 },
              ],
              dataType: "select",
            },
          ],
        },
        {
          name: "XYZ瞬时加速度阈值（mg）",
          field: "THTR_ACC",
          dataType: "groupPackage",
          children: [
            { name: "X轴", field: "X", dataType: "number" },
            { name: "Y轴", field: "Y", dataType: "number" },
            { name: "Z轴", field: "Z", dataType: "number" },
          ],
        },
        {
          name: "XYZ振动上报阈值(mg)",
          field: "THUP_ACC",
          dataType: "groupPackage",
          children: [
            { name: "X轴", field: "X", dataType: "number" },
            { name: "Y轴", field: "Y", dataType: "number" },
            { name: "Z轴", field: "Z", dataType: "number" },
          ],
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          name: "TCP",
          field: "TCP",
        },
      ],
    },
  ],
};

// 设备问题参数（含CD）
export const DEVICE_ISSUE_PARAMETER_WITH_CD = {
  LWPT: [
    /* 分布式数据采集节点（LW） */

    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
        {
          name: "平台参数",
          field: "SER",
          children: [
            {
              field: "TCP",
              name: "TCP",
            },
          ],
        },
      ],
    },
  ],
  RTDZ: [
    /* 遥测终端RTU 地灾RTU */

    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  RSSL: [
    /* 水利RTU */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  DTPT: [
    /* 自研DTU */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "恢复出厂设置",
          value: JSON.stringify({ RET: "DEF" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  DCM2: [
    /* 一体化两参数监测仪 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  DCM3: [
    /* 一体化三参数监测仪 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  RTDS: [
    /* 地下水遥测终端 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
        {
          label: "恢复出厂设置",
          value: JSON.stringify({ RET: "DEF" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  RTLA: [
    /* 遥测终端RTU路安协议 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
        // {
        //   label: "恢复出厂设置",
        //   value: JSON.stringify({ RET: "DEF" }),
        // },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  //ivw08
  VW08: [
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  //一体化监测
  YTJD: [
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      tcpConfigLength: 2,
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  //无线倾角
  QJNB: [
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      tcpConfigLength: 1,
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  SPMX: [
    /* 多功能静态数据采集仪 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  ZXSJ: [
    /**分布式振弦数据采集仪 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
  ],
  SWYT: [
    /* 一体化水位 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "恢复出厂配置",
          value: JSON.stringify({ RET: "DEF" }),
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
  ],
  GNSS: [
    /**GNSS接收机 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 5 }), // 重启倒计时 5s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
  YTZD: [
    /**一体化振动设备 */
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 5 }),
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
};

// 设备问题参数（原始）（检查代码发现未使用到）
export const DEVICE_ISSUE_PARAMETER_ORIGINAL = {
  LWPT: [
    /* 分布式数据采集节点（LW） */
    {
      name: "基本参数",
      field: "BF",
      children: [
        {
          field: "CV",
          name: "配置版本号",
          dataType: "number",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "TIME",
          name: "平台时间",
          dataType: "TIME",
        },
      ],
    },
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
          /**
                    * TCP 定制化实现,内容:
                        [
                            {"N":1,"EN":1,"PT":8888,"IP":"192.168.1.1"}, // 编号，使能(Boolean)，端口号(0-65535)，IP地址
                            {"N":1,"EN":1,"PT":8888,"IP":"192.168.1.1"},
                            ...
                        ]
                    */
        },
      ],
    },
  ],
  RTDZ: [
    /* 遥测终端RTU 地灾RTU */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
      ],
    },
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
        {
          field: "MQTT",
          name: "MQTT",
        },
      ],
    },
  ],
  RSSL: [
    /* 水利RTU */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
      ],
    },
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "遥测参数",
      field: "YC",
      children: [
        {
          field: "STADDR",
          name: "遥测站地址（十二位）",
        },
        {
          field: "CEADDR",
          name: "中心站地址（0~255）",
          dataType: "number",
        },
        {
          field: "CEPW",
          name: "中心站密码（0~65535）",
        },
      ],
    },
  ],
  DTPT: [
    /* 自研DTU */
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "恢复出厂设置",
          value: JSON.stringify({ RET: "DEF" }),
        },
      ],
    },
    {
      name: "基本参数",
      field: "BF",
      children: [
        {
          field: "BOUD",
          name: "通信串口波特率",
          dataType: "select",
          options: [
            {
              label: "9600",
              value: 9600,
            },
            {
              label: "38400",
              value: 38400,
            },
            {
              label: "57600",
              value: 57600,
            },
            {
              label: "115200",
              value: 115200,
            },
          ],
        },
      ],
    },
    {
      name: "是否禁用转义",
      field: "TF1",
      children: [
        {
          field: "TF",
          name: "禁用转义",
          dataType: "switch",
        },
      ],
    },
  ],
  RTDS: [
    /* 地下水遥测终端 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "DR",
          name: "采集粒度(秒)",
          dataType: "number",
        },
        {
          field: "UDR",
          name: "上报粒度(秒)",
          dataType: "number",
        },
        {
          field: "ADR",
          name: "加报粒度(秒)",
          dataType: "number",
        },
      ],
    },
    {
      name: "命令参数",
      field: "CD",
      componentType: "select",
      options: [
        {
          label: "重启",
          value: JSON.stringify({ RST: 10 }), // 重启倒计时 10s
        },
        {
          label: "清除积压数据",
          value: JSON.stringify({ CLR: "HISTORY" }),
        },
        {
          label: "恢复出厂设置",
          value: JSON.stringify({ RET: "DEF" }),
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "遥测参数",
      field: "YC",
      children: [
        {
          field: "STADDR",
          name: "遥测站地址（十二位）",
        },
        {
          field: "CEADDR",
          name: "中心站地址（0~255）",
          dataType: "number",
        },
        {
          field: "CEPW",
          name: "中心站密码（0~65535）",
        },
      ],
    },
    {
      name: "水位计",
      field: "SW",
      componentType: "groupPackage",
      children: [
        {
          name: "气压补偿参数配置",
          field: "BA",
          dataType: "groupPackage", // 前端组包：模块号_线长(m)_修正系数_埋深阈值(m)_重力加速度_修正气压(hPa)
          children: [
            {
              field: "moduleNo",
              name: "模块号",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("模块号必须为数字");
                    }
                    if (!Number.isInteger(Number(value))) {
                      return Promise.reject("模块号必须为整数");
                    }
                    if (value <= 0 || value > 255) {
                      return Promise.reject("模块号必须在1~255之间");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "lineLength",
              name: "线长(m)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("线长必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue <= 0 || numValue > 999.9) {
                      return Promise.reject("线长必须大于0且小于等于999.9");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 1) {
                      return Promise.reject("线长最多允许小数点后1位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "correctionFactor",
              name: "修正系数",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject("修正系数必须在-50~50之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("修正系数最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "depthThreshold",
              name: "埋深阈值(m)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("埋深阈值必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue <= 0 || numValue > 999.9) {
                      return Promise.reject("埋深阈值必须大于0且小于等于999.9");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 1) {
                      return Promise.reject("埋深阈值最多允许小数点后1位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "gravityAcceleration",
              name: "重力加速度",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("重力加速度必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < 8 || numValue > 12) {
                      return Promise.reject("重力加速度必须在8~12之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("重力加速度最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "pressureCorrection",
              name: "修正气压(hPa)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("修正气压必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < 0 || numValue > 1200) {
                      return Promise.reject("修正气压必须在0~1200之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("修正气压最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
          ],
        },
        {
          name: "系数补偿参数配置",
          field: "XS",
          dataType: "groupPackage", // 前端组包：模块号_线长(m)_埋深阈值(m)_二次项水位修正系数_一次项水位修正系数_水位修正常量_二次项水温修正系数_一次项水温修正系数_水温修正常量
          children: [
            {
              field: "moduleNo",
              name: "模块号",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("模块号必须为数字");
                    }
                    if (!Number.isInteger(Number(value))) {
                      return Promise.reject("模块号必须为整数");
                    }
                    if (value <= 0 || value > 255) {
                      return Promise.reject("模块号必须在1~255之间");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "lineLength",
              name: "线长(m)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("线长必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue <= 0 || numValue > 999.9) {
                      return Promise.reject("线长必须大于0且小于等于999.9");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 1) {
                      return Promise.reject("线长最多允许小数点后1位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "depthThreshold",
              name: "埋深阈值(m)",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("埋深阈值必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue <= 0 || numValue > 999.9) {
                      return Promise.reject("埋深阈值必须大于0且小于等于999.9");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 1) {
                      return Promise.reject("埋深阈值最多允许小数点后1位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "correctionFactorSecondaryItem",
              name: "二次项水位修正系数",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("二次项水位修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject(
                        "二次项水位修正系数必须在-50~50之间",
                      );
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject(
                        "二次项水位修正系数最多允许小数点后6位",
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              field: "correctionFactor1",
              name: "一次项水位修正系数",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("一次项水位修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject(
                        "一次项水位修正系数必须在-50~50之间",
                      );
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject(
                        "一次项水位修正系数最多允许小数点后6位",
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              name: "水位修正常量",
              field: "correctionConstant1",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("水位修正常量必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -1200 || numValue > 2000) {
                      return Promise.reject("水位修正常量必须在-1200~2000之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("水位修正常量最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              name: "二次项水温修正系数",
              field: "waterTemperatureSecondaryItem",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("二次项水温修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject(
                        "二次项水温修正系数必须在-50~50之间",
                      );
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject(
                        "二次项水温修正系数最多允许小数点后6位",
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              name: "一次项水温修正系数",
              field: "waterTemperature1",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("一次项水温修正系数必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -50 || numValue > 50) {
                      return Promise.reject(
                        "一次项水温修正系数必须在-50~50之间",
                      );
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject(
                        "一次项水温修正系数最多允许小数点后6位",
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
            {
              name: "水温修正常量",
              field: "waterTemperatureConstant",
              dataType: "number",
              rules: [
                {
                  validator: (_, value) => {
                    // 如果值为空，由required规则处理
                    if (value === undefined || value === null || value === "") {
                      return Promise.resolve();
                    }
                    if (isNaN(value)) {
                      return Promise.reject("水温修正常量必须为数字");
                    }
                    const numValue = parseFloat(value);
                    if (numValue < -1200 || numValue > 2000) {
                      return Promise.reject("水温修正常量必须在-1200~2000之间");
                    }
                    const decimalPart = value.toString().split(".")[1];
                    if (decimalPart && decimalPart.length > 6) {
                      return Promise.reject("水温修正常量最多允许小数点后6位");
                    }
                    return Promise.resolve();
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "气压计",
      field: "QY",
      children: [
        {
          field: "pressureCalibrationFactor",
          name: "修正系数",
          dataType: "number",
          rules: [
            {
              validator: (_, value) => {
                // 如果值为空，由required规则处理
                if (value === undefined || value === null || value === "") {
                  return Promise.resolve();
                }
                if (isNaN(value)) {
                  return Promise.reject("修正系数必须为数字");
                }
                const numValue = parseFloat(value);
                if (numValue < -50 || numValue > 50) {
                  return Promise.reject("修正系数必须在-50~50之间");
                }
                const decimalPart = value.toString().split(".")[1];
                if (decimalPart && decimalPart.length > 6) {
                  return Promise.reject("修正系数最多允许小数点后6位");
                }
                return Promise.resolve();
              },
            },
          ],
        },
        {
          field: "pressureCalibrationConstant",
          name: "修正常量（hPa）",
          dataType: "number",
          rules: [
            {
              validator: (_, value) => {
                // 如果值为空，由required规则处理
                if (value === undefined || value === null || value === "") {
                  return Promise.resolve();
                }
                if (isNaN(value)) {
                  return Promise.reject("修正常量必须为数字");
                }
                const numValue = parseFloat(value);
                if (numValue < -1200 || numValue > 2000) {
                  return Promise.reject("修正常量必须在-1200~2000之间");
                }
                const decimalPart = value.toString().split(".")[1];
                if (decimalPart && decimalPart.length > 6) {
                  return Promise.reject("修正常量最多允许小数点后6位");
                }
                return Promise.resolve();
              },
            },
          ],
        },
      ],
    },
  ],
  GNSS: [
    /* GNSS接收机 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "DR",
          name: "GNSS数据频率(s)",
          dataType: "select",
          options: [
            { label: "1", value: 1 },
            { label: "5", value: 5 },
            { label: "10", value: 10 },
            { label: "15", value: 15 },
            { label: "30", value: 30 },
            { label: "60", value: 60 },
          ],
        },
        {
          field: "UDR",
          name: "诊断频率(s)",
          dataType: "number",
          // 最小300s，输入的值必须是60的倍数
          rules: [
            {
              type: "number",
              min: 300,
              message: "诊断频率最小300s，输入的值必须是60的倍数",
              validator: (_, value) => {
                const numValue = parseFloat(value);
                if (numValue % 60 !== 0) {
                  return Promise.reject("诊断频率必须是60的倍数");
                }
                return Promise.resolve();
              },
            },
          ],
        },
        {
          field: "GL",
          name: "平台配置经纬度（东经，北纬）",
          dataType: "GL",
        },
      ],
    },
    {
      name: "平台配置",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
    {
      name: "通道参数",
      field: "MCF",
      children: [
        { field: "THH_ACC_X", name: "X加速度阈值(mg)", dataType: "number" },
        { field: "THH_ACC_Y", name: "Y加速度阈值(mg)", dataType: "number" },
        { field: "THH_ACC_Z", name: "Z加速度阈值(mg)", dataType: "number" },
        { field: "THH_ANG_X", name: "X角度阈值(°)", dataType: "number" },
        { field: "THH_ANG_Y", name: "Y角度阈值(°)", dataType: "number" },
        { field: "THH_ANG_Z", name: "Z角度阈值(°)", dataType: "number" },
      ],
    },
  ],
  YTZD: [
    /**一体化振动设备 */
    {
      name: "基本配置",
      field: "BF",
      children: [
        {
          field: "UDR",
          name: "诊断频率(s)",
          dataType: "number",
        },
        {
          field: "GL",
          name: "经纬度",
          dataType: "GL",
        },
      ],
    },
    {
      name: "通道参数",
      field: "MCF",
      children: [
        {
          field: "YTZD",
          children: [
            {
              field: "FR",
              name: "采样频率(Hz)",
              dataType: "number",
              rules: [
                {
                  type: "number",
                  min: 1,
                  max: 200,
                  message: "采样频率范围1~200Hz",
                },
              ],
            },
            {
              field: "TIME",
              name: "采样时间(s)",
              dataType: "number",
              rules: [
                {
                  type: "number",
                  min: 1,
                  max: 250,
                  message: "采样时间范围1~250秒",
                },
              ],
            },
            {
              field: "AX",
              name: "轴类型",
              dataType: "select",
              options: [
                { label: "X", value: 0 },
                { label: "Y", value: 1 },
                { label: "Z", value: 2 },
                { label: "XY", value: 3 },
                { label: "XZ", value: 4 },
                { label: "YZ", value: 5 },
                { label: "XYZ", value: 6 },
              ],
            },
            {
              field: "SBM",
              name: "上报模式",
              dataType: "select",
              options: [
                { label: "定时上报", value: 0 },
                { label: "连续上报", value: 1 },
              ],
            },
            {
              field: "ZLM",
              name: "去直流模式",
              dataType: "select",
              options: [
                { label: "去直流", value: 0 },
                { label: "不去直流", value: 1 },
              ],
            },
            {
              field: "YZM",
              name: "超阈值类型",
              dataType: "select",
              options: [
                { label: "绝对值阈值", value: 0 },
                { label: "峰峰值阈值", value: 1 },
              ],
            },
          ],
        },
        {
          field: "THTR_ACC",
          name: "XYZ瞬时加速度阈值（mg）",
          dataType: "TEXTAREA",
          placeholder: "示例: 1.0_2.0_3.0",
        },
        {
          field: "THUP_ACC",
          name: "XYZ振动上报阈值(mg)",
          dataType: "TEXTAREA",
          placeholder: "示例: 1.0_2.0_3.0",
        },
      ],
    },
    {
      name: "平台参数",
      field: "SER",
      children: [
        {
          field: "TCP",
          name: "TCP",
        },
      ],
    },
  ],
};

// 参数模板校验规则
export const TEMPLATE_RULE_VALIDATORS = {
  LFR_RANGE: (rule, value) => {
    if (value === undefined || value === null || value === "") {
      return Promise.resolve();
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      return Promise.reject(new Error("请输入有效数字"));
    }
    if (
      (num >= 410 && num <= 441) ||
      (num >= 470 && num <= 510) ||
      (num >= 850 && num <= 950)
    ) {
      return Promise.resolve();
    }
    return Promise.reject(
      new Error(rule?.message || "请输入410~441、470~510、850~950之间的整数"),
    );
  },
};

export const TEMPLATE_RULE_TRANSFORMS = {
  TO_STRING: (value) =>
    value === undefined || value === null ? value : String(value),
};

export const hydrateTemplateSchema = (schema) => {
  const buildNumberValidator = (rule) => {
    const {
      integer,
      maxDecimals,
      minExclusive,
      maxExclusive,
      min,
      max,
      message,
    } = rule || {};
    const need =
      typeof integer !== "undefined" ||
      typeof maxDecimals !== "undefined" ||
      typeof minExclusive !== "undefined" ||
      typeof maxExclusive !== "undefined" ||
      typeof min !== "undefined" ||
      typeof max !== "undefined";
    if (!need) return null;

    return (_, value) => {
      if (value === undefined || value === null || value === "") {
        return Promise.resolve();
      }
      const num = Number(value);
      if (Number.isNaN(num)) {
        return Promise.reject(new Error(message || "请输入有效数字"));
      }
      if (integer) {
        if (!Number.isInteger(num)) {
          return Promise.reject(new Error(message || "请输入整数"));
        }
      }
      if (typeof min === "number" && num < min) {
        return Promise.reject(
          new Error(message || `请输入大于等于${min}的数字`),
        );
      }
      if (typeof max === "number" && num > max) {
        return Promise.reject(
          new Error(message || `请输入小于等于${max}的数字`),
        );
      }
      if (typeof minExclusive === "number" && num <= minExclusive) {
        return Promise.reject(
          new Error(message || `请输入大于${minExclusive}的数字`),
        );
      }
      if (typeof maxExclusive === "number" && num >= maxExclusive) {
        return Promise.reject(
          new Error(message || `请输入小于${maxExclusive}的数字`),
        );
      }
      if (typeof maxDecimals === "number") {
        const s = String(value);
        const dot = s.indexOf(".");
        if (dot >= 0) {
          const decimals = s.slice(dot + 1);
          if (decimals.length > maxDecimals) {
            return Promise.reject(
              new Error(message || `最多允许小数点后${maxDecimals}位`),
            );
          }
        }
      }
      return Promise.resolve();
    };
  };

  const hydrateRules = (rules) => {
    if (!Array.isArray(rules)) return rules;
    return rules.map((r) => {
      if (!r || typeof r !== "object") return r;
      if (typeof r.validator === "function") return r;
      if (typeof r.transform === "function") return r;
      const name = r.validatorName;
      if (name) {
        const fn = TEMPLATE_RULE_VALIDATORS[String(name)];
        if (!fn) {
          const { validatorName, ...rest } = r;
          return rest;
        }
        const { validatorName, ...rest } = r;
        return { ...rest, validator: fn };
      }

      const transformName = r.transformName;
      if (transformName) {
        const tf = TEMPLATE_RULE_TRANSFORMS[String(transformName)];
        if (!tf) {
          const { transformName: _, ...rest } = r;
          return rest;
        }
        const { transformName: _, ...rest } = r;
        return { ...rest, transform: tf };
      }

      const fn = buildNumberValidator(r);
      if (!fn) return r;
      const {
        integer,
        maxDecimals,
        minExclusive,
        maxExclusive,
        transformName: _transformName,
        validatorName: _validatorName,
        ...rest
      } = r;
      return { ...rest, validator: fn };
    });
  };

  const walk = (node) => {
    if (!node || typeof node !== "object") return node;
    const next = { ...node };
    if (Array.isArray(next.rules)) {
      next.rules = hydrateRules(next.rules);
    }
    if (Array.isArray(next.children)) {
      next.children = next.children.map(walk);
    }
    if (Array.isArray(next.arrayConfig)) {
      next.arrayConfig = next.arrayConfig.map(walk);
    }
    if (Array.isArray(next.options)) {
      next.options = next.options.map(walk);
    }
    return next;
  };

  return Array.isArray(schema) ? schema.map(walk) : [];
};
