const anomalyService = require('../service/anomaly.service')
const aimgmtdb = require('../db/aimgmt.db')
const chillerService = require("../service/chiller.service")

module.exports.getHistory = async ({ siteId, onlyReject, page, deviceId, dataType, detectionType, labeledBy, startDate, endDate }) => {
    const rowPerPage = 20
    const rowCount = await anomalyService.getAnomalyCount({ siteId, onlyReject, startDate, endDate, dataType, deviceId, detectionType })
    const pageCount = rowCount[0].length > 0
        ? Math.ceil(rowCount[0][0].count / rowPerPage)
        : 0
    const historyData = await anomalyService.getAnomalyData1({ siteId, onlyReject, startDate, endDate, dataType, page, deviceId, rowPerPage, detectionType })
        .then(data => {
            return data
        })

    return [pageCount, historyData]//historyCount
}

module.exports.getHistoryFilterData = async (siteId) => {
    try {
        const anyKey = { key: -10, label: 'Any' }
        // const parameterType = await aimgmtdb.getDataType(siteId)
        // const equipmentType = await aimgmtdb.getEquipmentAlias(siteId)
        // const faultTypeData = await aimgmtdb.getFaultType()
        // const severityData = await aimgmtdb.getSeverityType()
        // const algorithmData = await aimgmtdb.getAlgorithmName()
        // const alarmTypeData = await aimgmtdb.getAlarmType()
        // const labeledByData = await aimgmtdb.getUser()
        // const parameterData = await aimgmtdb.getParameter[]

        const queries = `
        SELECT distinct dataTypeName ,
            dataType FROM aimgmt.device_mapping dm left join device d on d.id=dm.deviceId
            where dm.dataTypeName !='some data' and dm.dataType is not null and d.siteId='${siteId}';
        SELECT equipId as equipAlias,deviceTypeName as equipTypeName,id as equipId FROM aimgmt.device 
            where equipId is not null and siteId='${siteId}';
        SELECT fault_id as 'key',fault_name as 'label', severity_id as 'severity_id', parameters FROM aimgmt.fault_master;
        SELECT severity_id as 'key',severity_name as 'label' FROM aimgmt.severity_master;
        SELECT * FROM aimgmt.algo_master;
        SELECT * FROM aimgmt.alarm_master;
        SELECT * FROM user;
        `
        const [
            parameterType, 
            equipmentType,
            faultTypeData,
            severityData,
            algorithmData,
            alarmTypeData,
            labeledByData,
        ] = (await aimgmtdb.selectQueryComplex(queries))[0]

        const alarm = alarmTypeData.map(d => ({ label: d.alarm_name, key: d.alarm_id, comment: d.comment, id: d.alarm_id }))
        let labeledBy = labeledByData.map((d, i) => ({ key: i + 1, label: d.username, }))

        // console.log(equipmentType)

        let parameter = parameterType.map((d, i) => ({ key: d.dataType, label: d.dataTypeName }))
        let equipmentAlias = equipmentType.map(d => ({ key: d.equipAlias, label: d.equipTypeName, id: d.equipId }))
        let dectionType = algorithmData.map((d, i) => ({ key: i + 1, label: d.algo_name }))
        let faultType = faultTypeData.map((d, i) => ({ key: d.key, label: d.label, severity_id: d.severity_id, parameter: d.parameters.split(",") }))

        parameter.unshift(anyKey)
        equipmentAlias.unshift(anyKey)
        dectionType.unshift(anyKey)
        labeledBy.unshift(anyKey)
        alarm.unshift(anyKey)

        return ({
            detectionType: dectionType, equipment: equipmentAlias, dataType: parameter,
            faultType: faultType, severity: severityData, alarmType: alarm, labeledBy: labeledBy
        })
    }
    catch (error) {
        throw error
    }

}