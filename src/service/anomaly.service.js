const aimgmtdb = require("../db/aimgmt.db")
const dateFns = require('date-fns')
const kumoDate = require("../config/kumoDate.js")
const configMappingService = require("./configMapping.service")
const mgmtdb = require("../db/iotmgmt.db")

module.exports.getAnomalyData = ({ startDate = null, endDate = null, dataType = "CHWR_Temp", page, deviceId = "CH3", siteId = "cl_tao" }) => {
    // const siteId = "cl_tao"
    // const deviceId = "CH3"
    // const dataType =   "CWR_Temp"

    return aimgmtdb.getDataDetectionMasterAD({ siteId, deviceId, dataType, startDate, endDate, page })
        .then(data1 => {
            if (data1[0].length > 0) {
                const data = data1[0]
                return data.map(v => ({
                    id: v.id,
                    siteId: v.siteId,
                    deviceId: v.deviceId,
                    dataType: v.dataType,
                    startDate: dateFns.format(Date.parse(v.startDate), "yyyy-MM-dd HH:mm:ss"),
                    endDate: dateFns.format(Date.parse(v.endDate), "yyyy-MM-dd HH:mm:ss"),
                    createdTs: dateFns.format(Date.parse(v.createdTs), "yyyy-MM-dd HH:mm:ss"),

                    anomalyState: 1,
                    user: "Phyo Ko Ko",
                    deviceType: v.equipId,
                    building: "The Atrium @ Orchard",
                    faultType: [],
                    severity: [],
                    sensorSignal: [],
                    additionalGraphs: [],
                    remark: "AD_v1",
                    deleted: false,
                }))
            } else return []
        })
        .catch(error => {
            throw error
        })
}

module.exports.getAnomalyDataforHistory = ({ startDate = null, endDate = null, dataType, page, deviceId, siteId = "cl_tao" }) => {
    // const siteId = "cl_tao"
    // const deviceId = "CH3"
    // const dataType =   "CWR_Temp"

    return aimgmtdb.getDataDetectionMasterHistory({ siteId, deviceId, dataType, startDate, endDate, page })
        .then(data1 => {
            if (data1[0].length > 0) {
                const data = data1[0]
                return data.map(v => ({
                    id: v.id,
                    siteId: v.siteId,
                    deviceId: v.deviceId,
                    dataType: v.dataType,
                    startDate: dateFns.format(Date.parse(v.startDate), "yyyy-MM-dd HH:mm:ss"),
                    endDate: dateFns.format(Date.parse(v.endDate), "yyyy-MM-dd HH:mm:ss"),
                    createdTs: dateFns.format(Date.parse(v.createdTs), "yyyy-MM-dd HH:mm:ss"),

                    anomalyState: 1,
                    user: "Phyo Ko Ko",
                    deviceType: v.deviceId,
                    building: "The Atrium @ Orchard",
                    faultType: [],
                    severity: [],
                    sensorSignal: [],
                    additionalGraphs: [],
                    remark: "AD_v1",
                    deleted: false,
                }))
            } else return []
        })
        .catch(error => {
            throw error
        })
}

module.exports.getAnomalyDataforHistoryCount = ({ startDate = null, endDate = null, dataType, page, deviceId, siteId = "cl_tao" }) => {
    // const siteId = "cl_tao"
    // const deviceId = "CH3"
    // const dataType =   "CWR_Temp"

    return aimgmtdb.getDataDetectionMasterHistoryCountInSameAPI({ siteId, deviceId, dataType, startDate, endDate, page })
        .then(data1 => {
            if (data1[0].length > 0) {
                const data = data1[0]
                return data
            } else return 0
        })
        .catch(error => {
            throw error
        })
}




module.exports.getAnomalyDataInner = ({ startDate = null, endDate = null, dataType = "CWR_Temp", page, deviceId = "CH3", siteId = "cl_tao" }) => {
    // const siteId = "cl_tao"
    // const deviceId = "CH3"
    // const dataType =   "CWR_Temp"

    return aimgmtdb.getDataDetectionMasterAD({ siteId, deviceId, dataType, startDate, endDate, page })
        .then(data1 => {
            if (data1[0].length > 0) {
                const data = data1[0]
                return data.map(v => ({
                    startDate: Date.parse(v.startDate),
                    endDate: Date.parse(v.endDate),
                }))
            } else return []
        })
        .catch(error => {
            throw error
        })
}

module.exports.getAnomalyDataAllByCreatedTime = ({ startDate = null, endDate = null }) => {
    // const siteId = "cl_tao"
    // const deviceId = "CH3"
    // const dataType =   "CWR_Temp"

    return aimgmtdb.getDataDetectionMasterAllByCreatedTime({ startDate, endDate })
        .then(data1 => {
            if (data1[0].length > 0) {
                const data = data1[0]
                return data.map(v => ({
                    id: v.id,
                    siteId: v.siteId,
                    deviceId: v.deviceId,
                    dataType: v.dataType,
                    startDate: dateFns.format(Date.parse(v.startDate), "yyyy-MM-dd HH:mm:ss"),
                    endDate: dateFns.format(Date.parse(v.endDate), "yyyy-MM-dd HH:mm:ss"),
                    createdTs: dateFns.format(Date.parse(v.createdTs), "yyyy-MM-dd HH:mm:00"),
                }))
            } else return []
        })
        .catch(error => {
            throw error
        })
}
module.exports.getAnomalyDataAllBetweenStartDateAndEndDate = ({ startDate = null, endDate = null }) => {
    // const siteId = "cl_tao"
    // const deviceId = "CH3"
    // const dataType =   "CWR_Temp"

    return aimgmtdb.getAnomalyDataAllBetweenStartDateAndEndDate({ startDate, endDate })
        .then(data1 => {
            console.log(data1[0])
            if (data1[0].length > 0) {
                const data = data1[0]
                return data.map(v => ({
                    id: v.id,
                    siteId: v.siteId,
                    deviceId: v.deviceId,
                    dataType: v.dataType,
                    algoId: v.algoId,
                    startDate: dateFns.format(Date.parse(v.startDate), "yyyy-MM-dd HH:mm:ss"),
                    endDate: dateFns.format(Date.parse(v.endDate), "yyyy-MM-dd HH:mm:ss"),
                    createdTs: dateFns.format(Date.parse(v.createdTs), "yyyy-MM-dd HH:mm:00"),
                }))
            } else return []
        })
        .catch(error => {
            throw error
        })
}

module.exports.getAnomalyStartEndDateOverall = ({ }) => {
    const siteId = "cl_tao"
    const deviceId = "CH3"
    const dataType = "CWR_Temp"

    return aimgmtdb.getRawData(
        "min(year(start_time)) as startYear, max(year(end_time)) as endYear",
        "detection_master",
        ` where 
        algo_id = 'ad_v1'
        AND parameter = '${dataType}'
        AND site_id = '${siteId}'
        AND equip_id = '${deviceId}'`
    ).then(data => {
        if (data.length > 0 && data[0].length > 0)
            return data[0][0]
        else { }
    })
        .catch(error => {
            throw error
        })

}


//update anomalies
module.exports.updateAnomaliesData = async (requestId, data, callback) => {
    //console.log("request: ", data)

    const fault = data.faultType > 0 ? data.faultType[0] : null
    const severity = data.severity > 0 ? data.severity[0] : null
    const labeledBy = data.user
    const remark = data.remark
    const updated_ts = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
    //console.log("updated_ts",updated_ts)
    const detect_id = data.id
    const anomalyState = data.anomalyState
    const startDate = data.startDate
    const endDate = data.endDate
    //console.log("data =>",data)

    // for reject anomaly
    if (anomalyState == 0) {

        const tableNameAnomaly = "dtd_anomaly"
        const columnsAnomaly = ["verified", "anomaly", "updated_by", "remark", "updated_ts"]
        const dataAnomaly = [1, anomalyState, labeledBy, remark, updated_ts]
        const conditionAnomaly = `detect_id=${detect_id}`
        const anomalyUpdatedResult = await aimgmtdb.updateQuery({ tableName: tableNameAnomaly, columns: columnsAnomaly, data: dataAnomaly, condition: conditionAnomaly })
        console.log("anomalyUpdatedResult rejeCT: ", anomalyUpdatedResult[0], anomalyUpdatedResult[0].affectedRows)
        if (anomalyUpdatedResult[0].affectedRows == 0) {
            const tableName = "dtd_anomaly"
            const columns = `(detect_id,verified,anomaly,updated_by,remark,updated_ts)`
            const values = `(${detect_id},1,${anomalyState},${labeledBy},'${remark}','${updated_ts}')`
            const anomalyInsertedResult = await aimgmtdb.insertQuery({ tableName, columns, values })
            console.log("AnomalyInsertedResult: ", anomalyInsertedResult)
        }
    }
    else {
        if (fault) {
            console.log("Update dtd_fdd here")
            const tableName = "dtd_fdd"
            const columns = ["verified", "fault_id", "updated_by", "remark", "updated_ts"]
            const data = [1, fault, labeledBy, remark, updated_ts]
            const condition = `detect_id=${detect_id}`
            const faultUpdatedResult = await aimgmtdb.updateQuery({ tableName, columns, data, condition })
            console.log("faultUpdatedResult: ", faultUpdatedResult[0])
            if (faultUpdatedResult[0].affectedRows == 0) {
                const tableName = "dtd_fdd"
                const columns = `(detect_id,fault_id,verified,updated_by,remark,updated_ts)`
                const values = `(${detect_id},${fault},1,${labeledBy},'${remark}','${updated_ts}')`
                const faultInsertedResult = await aimgmtdb.insertQuery({ tableName, columns, values })
                console.log("faultInsertedResult: ", faultInsertedResult)
            }
        }
        if (severity) {
            console.log("Update dtd_calm here")
            const tableName = "dtd_calm"
            const columns = ["verified", "severity_id", "updated_by", "remark", "updated_ts"]
            const data = [1, severity, labeledBy, remark, updated_ts]
            const condition = `detect_id=${detect_id}`
            const severityUpdatedResult = await aimgmtdb.updateQuery({ tableName, columns, data, condition })
            console.log("severityUpdatedResult: ", severityUpdatedResult[0])
            if (severityUpdatedResult[0].affectedRows == 0) {
                const tableName = "dtd_calm"
                const columns = `(detect_id,severity_id,verified,updated_by,remark,updated_ts)`
                const values = `(${detect_id},${severity},1,${labeledBy},'${remark}','${updated_ts}')`
                const severityInsertedResult = await aimgmtdb.insertQuery({ tableName, columns, values })
                console.log("severityInsertedResult: ", severityInsertedResult)
            }
        }

        console.log("Update dtd_anomaly here")
        const tableNameAnomaly = "dtd_anomaly"
        const columnsAnomaly = ["verified", "anomaly", "updated_by", "remark", "updated_ts"]
        const dataAnomaly = [1, anomalyState, labeledBy, remark, updated_ts]
        const conditionAnomaly = `detect_id=${detect_id}`
        const anomalyUpdatedResult = await aimgmtdb.updateQuery({ tableName: tableNameAnomaly, columns: columnsAnomaly, data: dataAnomaly, condition: conditionAnomaly })
        console.log("anomalyUpdatedResult: ", anomalyUpdatedResult[0])
        if (anomalyUpdatedResult[0].affectedRows == 0) {
            const tableName = "dtd_anomaly"
            const columns = `(detect_id,anomaly,verified,updated_by, remark,updated_ts)`
            const values = `(${detect_id},${anomalyState},1,${labeledBy},'${remark}','${updated_ts}')`
            const anomalyInsertedResult = await aimgmtdb.insertQuery({ tableName, columns, values })
            console.log("anomalyInsertedResult: ", anomalyInsertedResult)
        }
        // if startDate and endDate
        if (startDate && endDate) {
            const dmHistoryInsertResult = await aimgmtdb.insertDetectionMasterHistory(detect_id)
            console.log("dm history insert result ", dmHistoryInsertResult[0])
            const updatedDmResult = await aimgmtdb.updateDetectionMaster(detect_id, startDate, endDate)
            console.log("dem update result", updatedDmResult[0])
        }
    }

    // save in Label Log 
    aimgmtdb.saveLabelLog({
        detectId: detect_id,
        updatedBy: labeledBy,
        remark: remark,
        detectionType: 1,
        labelType: anomalyState ? "accept" : "reject"
    })

    return callback(null, data)

}

module.exports.getAnomalyData1 = async ({ onlyReject, startDate = null, endDate = null, dataType, page, deviceId, detectionType, rowPerPage, siteId = "cl_tao", latestFirst = true, onlyAnomaly = false, notForHistory, detectId }) => {
    // const siteId = "cl_tao"
    // const deviceId = "CH3"
    // const dataType =   "CWR_Temp"
    // console.log({ notForHistory })
    return aimgmtdb.getDataDetectionMaster2({ onlyReject, siteId, deviceId, dataType, startDate, endDate, page, rowPerPage, latestFirst, onlyAnomaly, notForHistory, detectionType, detectId })
        .then(data1 => {
            if (data1[0].length > 0) {
                const data = data1[0]
                return data.map(v => ({
                    ...v,
                    id: v.detectId,
                    siteId: v.siteId,
                    deviceId: v.deviceId,
                    dataType: v.dataType,
                    startDate: dateFns.format(v.startDate, "yyyy-MM-dd HH:mm:ss"),
                    endDate: dateFns.format(v.endDate, "yyyy-MM-dd HH:mm:ss"),
                    createdTs: dateFns.format(v.createdTs, "yyyy-MM-dd HH:mm:ss"),
                    user: v.userId,
                    faultType: v.faultId ? [v.faultId] : [],
                    severity: v.severityId ? [v.severityId] : [],
                    anomalyState: v.anomaly,
                    deviceType: v.deviceType,
                    faultState: v.fault,
                    detectionType: v.detectionType,
                    building: "The Atrium @ Orchard",
                    sensorSignal: [],
                    additionalGraphs: [],
                    remark: v.remark,
                    deleted: false,
                    previousRemark: [],
                    labelingLog: !v.labelingLog ? [] : v.labelingLog.split("_<>_").map(v1 => {
                        const sv1 = v1.split("_><_")
                        return ({ userId: parseInt(sv1[0]), createdTs: sv1[1], remark: sv1[2], labelType: sv1[3] })
                    })
                }))
                    .map(v => ({
                        ...v,
                        labeledBy: v.username,
                        label: [v.faultType, v.severity, []],
                    }))
            } else return []
        })
        .catch(error => {
            throw error
        })
}

module.exports.getAnomalyCount = async ({ onlyReject, startDate = null, endDate = null, dataType, detectionType, deviceId, siteId = "cl_tao", latestFirst = false, onlyAnomaly = false, verified }) => {
    // const siteId = "cl_tao"
    // const deviceId = "CH3"
    // const dataType =   "CWR_Temp"
    return aimgmtdb.getCountDataDetectionMaster2({ onlyReject, siteId, deviceId, dataType, startDate, endDate, latestFirst, onlyAnomaly, detectionType, verified, deviceId })
        .then(data1 => {
            return data1
        })
        .catch(error => {
            throw error
        })
}

module.exports.recoverAnomalyDetection = (id) => {

    return aimgmtdb.recoverAnomalyDetection(id).then(data => {
        return data
    }).catch(error => {
        throw error
    })
}

module.exports.getAlogId = (id) => {
    return aimgmtdb.getAlgoId(id).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.getUnreviewCount = async (detectionType, clientId, siteId, deviceId) => {
    try {
        const data = await aimgmtdb.getUnreviewCount(detectionType, clientId, siteId, deviceId)
        return data[0]
    }
    catch (error) {
        throw error
    }

}

module.exports.postProcessing = async ({ startDate, endDate, siteId, dataType}) => {
    try {
        // const deviceList = (await aimgmtdb.getDeviceList(siteId, dataType))[0]
        const definitions = await this.getPostProcessingDefinition({ siteId: siteId, enabled: 1 })
        // console.log("definitions: ", definitions)
        let query = ""
        for (let i = 0; i < definitions.length; i++) {
            const def = definitions[i]
            query += `select equip_id as equipId,ts, '${def.parameter}' as dataType, ${def.id} as definitionId
             from aimgmt.sensor_real_time where  ts between '${startDate}'
             and '${endDate}' and ${def.expr} order by ts asc ;`
        }
        // console.log("query",query)
        const rawDatas = (await mgmtdb.getSensorRealTimeData(query))[0]

        let anomalyList = []
        const latestDataByEquipment = {}
        // to collect anomaly data
        for (let j = 0; j < definitions.length; j++) {
            const rawData = definitions.length === 1 ? [...rawDatas] : rawDatas[j]

            if (rawData.length > 0) {
                for (let k = 0; k < rawData.length; k++) {
                    const data = rawData[k]
                    const keyy = data.equipId + ":" + data.dataType + ":" +data.definitionId
                    if (anomalyList.length == 0 || !latestDataByEquipment[keyy]) {
                        latestDataByEquipment[keyy] = data.ts
                        anomalyList.push({
                            equipId: data.equipId,
                            parameter: data.dataType, siteId: siteId,
                            start_time: data.ts,
                            end_time: data.ts,
                            data_from: data.definitionId
                        })
                    }
                    else {
                        const differenceMinute = dateFns.differenceInMinutes(new Date(data.ts), new Date(latestDataByEquipment[keyy]))
                        // console.log(differenceMinute, "differenceMinutes")
                        latestDataByEquipment[keyy] = data.ts
                        if (differenceMinute > 2) {
                            anomalyList.push({
                                equipId: data.equipId,
                                parameter: data.dataType, siteId: siteId,
                                start_time: data.ts,
                                end_time: data.ts,
                                data_from: data.definitionId
                            })
                        }
                        else {
                            anomalyList[anomalyList.length - 1].end_time = data.ts
                        }
                        //console.log(anomalyList)
                    }

                }
            }
            // console.log("latestDataByEquipment: ", latestDataByEquipment)
        }

        const anomlayRawLength = anomalyList.length
        console.log("anomalylist", anomlayRawLength)

        const results = []

        //save data in detection master and dtd anomaly
        for (let d = 0; d < anomlayRawLength; d++) {
            const ano = anomalyList[d]
            const diffMinute = dateFns.differenceInMinutes(new Date(ano.end_time), new Date(ano.start_time))
            if (diffMinute>= 10) {
                // console.log("enter time 10 miuters")
                // console.log(lastDetectId[0][0].detect_id, "last detectID")
                ano.start_time = dateFns.format(new Date(ano.start_time), "yyyy-MM-dd HH:mm:ss")
                ano.end_time = dateFns.format(new Date(ano.end_time), "yyyy-MM-dd HH:mm:ss")
                const countData = (await aimgmtdb.getAnoCountWithDates(ano))[0]
                if(countData.count>0) {
                    console.log("SKIPPPED: ", ano)
                    continue;
                }
                results.push(ano)
                // const lastDetectId = await aimgmtdb.getLatestDetectId()
                // const dmInsertedResulted = await aimgmtdb.saveInDetectionMaster(ano,lastDetectId[0][0].detect_id+1)
                // const anomalyInsertedResulted = await aimgmtdb.saveInDtdAnomaly(lastDetectId[0][0].detect_id+1)
                /*console.log("dmInsertedResulted ", dmInsertedResulted)
                console.log("anomalyInsertedResulted ", anomalyInsertedResulted);*/
            }
        }
        console.log("Post processing Saved count: \n", results.length)
        return results

    }
    catch (error) {
        console.log("Post porcessing error:", error)
        return []
    }
}

module.exports.createNewAnomaly = async ({ siteId, parameter, equipId, fault, severity, labeledBy, remark, timestamp, anomalyState, startDate, endDate }) => {
    try {
        const lastDetectId = (await aimgmtdb.getLastDetectId())[0]
        const detectId = lastDetectId[0].detect_id + 1
        console.log("Last detectid is", detectId)

        const dmInsertResult = await aimgmtdb.saveDmData({ siteId, detectId, algoId: "ad_v1", parameter, equipId, timestamp, startDate, endDate })
        console.log("dmInsertResult:", dmInsertResult)

        const dtdAnoInsertResult =await aimgmtdb.saveAnomalyData({ detectId, anomalyState, verified: 1, labeledBy, remark, timestamp })
        console.log("dtdAnoInsertResult:", dtdAnoInsertResult)

        if (fault) {
            const dtdFddInsertResult = await aimgmtdb.saveFddData({ detectId, fault, verified: 1, labeledBy, remark, timestamp })
            console.log("dtdFddInsertResult", dtdFddInsertResult)
        }

        if (severity) {
            const dtdCalmInsertResult =await aimgmtdb.saveCalmData({ detectId, severity, verified: 1, labeledBy, remark, timestamp })
            console.log("dtdCalmInsertResult", dtdCalmInsertResult)
        }
        return []
    }
    catch (error) {
        console.log("create new anomaly error:",error)
        throw error
    }


}

module.exports.getPostProcessingDefinition = async ({ siteId, enabled }) => {
    try {
        const query = `select * from aimgmt.post_processing_definition where site_id='${siteId}' ${enabled ? `and enabled=${enabled}` : ''}`
        const results = (await aimgmtdb.selectQuery(query))[0]
        return results
    }
    catch (error) {
        throw error
    }
}

module.exports.createPostProcessingDefinition = async ({ siteId, name, userId, comments, parameter, expr, enabled }) => {
    try {
        const query = `insert into aimgmt.post_processing_definition(site_id,name,user_id,comments,expr,parameter,enabled)
        values('${siteId}', '${name}', ${userId}, '${comments}', '${expr}', '${parameter}', ${enabled})`
        const results = (await aimgmtdb.selectQuery(query))[0]
        return results
    }
    catch (error) {
        throw error
    }
}

module.exports.updatePostProcessingDefinition = async ({ id, name, comments, parameter, expr, enabled=null }) => {
    try {
        const columns = []
        const data = []
        if(name) {
            columns.push("name")
            data.push(name)
        }
        if(comments) {
            columns.push("comments")
            data.push(comments)
        }
        if(parameter) {
            columns.push("parameter")
            data.push(parameter)
        }
        if(expr) {
            columns.push("expr")
            data.push(expr)
        }
        if(enabled!==null) {
            columns.push("enabled")
            data.push(enabled)
        }

        const condition = `id=${id}`

        const results = (await aimgmtdb.updateQuery({ tableName: "post_processing_definition", columns, condition, data}))[0]
        return results
    }
    catch (error) {
        throw error
    }
}
