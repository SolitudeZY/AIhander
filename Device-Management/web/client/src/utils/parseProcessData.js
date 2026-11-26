'use strict';

const schemaRecursionObj = (obj, target, schemaPath) => {
    let schemaPath_ = JSON.parse(JSON.stringify(schemaPath))
    if (obj.properties) {
        for (let prKey in obj.properties) {
            if (obj.properties[prKey].title == target) {
                schemaPath_.push({
                    prKey,
                    ...obj.properties[prKey]
                })
                return schemaPath_
            }
            const hasProperties = obj.properties[prKey].properties
            const isGroup = obj.properties[prKey].type == 'array' && obj.properties[prKey].title == '分组'
            if (hasProperties || isGroup) {
                schemaPath_.push({
                    prKey,
                    ...obj.properties[prKey],
                    isGroup: isGroup,
                })
                schemaPath_ = schemaRecursionObj(
                    isGroup ?
                        obj.properties[prKey].items
                        : obj.properties[prKey],
                    target,
                    schemaPath_
                )
                if (!schemaPath_) {
                    return []
                }
                if (schemaPath_.length > schemaPath.length) {
                    return schemaPath_
                }
            }
        }
    } else {
        return schemaPath_
    }
}

const dataRecursionObj = (dataObj, index, needData, lastKeyObj, nd) => {
    const keyObj = needData[nd].schemaPath[index]
    if (dataObj.hasOwnProperty(keyObj.prKey)) {
        if (lastKeyObj.prKey == keyObj.prKey) {
            let gotValue = dataObj[keyObj.prKey]
            if (keyObj.enum && !needData[nd].fromDataSource) {
                let vIndex = keyObj.enum.findIndex(ke => ke == gotValue)
                gotValue = keyObj.enumNames[vIndex]
            }
            return gotValue
        } else {
            if (keyObj.isGroup) {
                debugger
                for (let item of dataObj[keyObj.prKey]) {
                    const gotValue = dataRecursionObj(item, index + 1, needData, lastKeyObj, nd)
                    if (gotValue) {
                        return gotValue
                    }
                }
            } else {
                return dataRecursionObj(dataObj[keyObj.prKey], index + 1, needData, lastKeyObj, nd)
            }
        }
    }
}

const getData = (applyDetail, needData) => {
    for (let nd in needData) {
        if (needData[nd].noProcess) {
            continue
        }
        needData[nd].schemaPath = schemaRecursionObj(applyDetail.formSchema.jsonSchema, needData[nd]['keyWord'], [])
        if (needData[nd].schemaPath && needData[nd].schemaPath.length) {
            const lastKeyObj = needData[nd].schemaPath[
                needData[nd].schemaPath.length - 1
            ]
            needData[nd].value = dataRecursionObj(applyDetail.formData, 0, needData, lastKeyObj, nd)
        } else {
            // 记录错误 关键数据没找到
        }
    }
}

export const parseProcessData = (applyDetail, pomsNeedData = {
    title: {
        keyWord: '标题',
    },
    detail: {
        keyWord: '问题详情'
    },

    pomsProjectId: {
        keyWord: '关联项目',
        fromDataSource: true
    },
    projectName: {
        keyWord: '项目名称',
    },
    expectTime: {
        keyWord: '期望完成时间'
    },
    applyContent: {
        keyWord: '申请内容描述'
    },
    // handlingPerson: {
    //    keyWord: '处理人员',
    //    fromDataSource: true
    // },
    handlingResult: {
        keyWord: '处理结果',
    },
    // issueType: {
    //    keyWord: '问题类型',
    // },
    // completionTime: {
    //    keyWord: '处理完成时间',
    // },

}) => {
    let needData = JSON.parse(JSON.stringify(pomsNeedData))
    getData(applyDetail, needData)
    return needData
}