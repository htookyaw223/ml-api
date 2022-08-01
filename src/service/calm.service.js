const db = require('../db/ibpem.db')

const mgmtdb = require("../db/iotmgmt.db")
const aimgmtdb = require('../db/aimgmt.db')
const dateFns = require('date-fns')
const kumoDate = require("../config/kumoDate.js")

const calcConfig = require("./calcConfig.service.js")

module.exports.getSeverityInCalm = (siteId, clientId) => {
    return aimgmtdb.getSeverityInCalm(siteId, clientId).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.getChillerHealth = async ({ siteId = "cl_tao", clientId }) => {
    let selectors = "value1, value2,client_id,site_id"
    let tableName = "calm_severity_bound"
    let condition = `where enabled=1 and site_id ='${siteId}' and client_id=${clientId}`
    const chillerBoundData = await aimgmtdb.selectRawQuery(selectors, tableName, condition)
    return this.getSeverityInCalm(siteId, clientId)
        .then(data => {
            const severityData = data

            // console.log("severityEquipmentCount: ", data, chillerBoundData[0], severityData)
            if (chillerBoundData[0].length === 0) throw new Error("no bound data");
            const severityHigh = severityData.find(v => v.severity_id === 3) ? severityData.find(v => v.severity_id === 3) : { severity_id: 3, count: 0 }
            const severityMedium = severityData.find(v => v.severity_id === 2) ? severityData.find(v => v.severity_id === 3) : { severity_id: 2, count: 0 }
            const severityLow = severityData.find(v => v.severity_id === 1) ? severityData.find(v => v.severity_id === 3) : { severity_id: 1, count: 0 }

            // console.log("severityHigh: ", data, severityHigh)

            const boundData = chillerBoundData[0][0]
            let chillerHealth = 0;
            // check health 
            if (severityHigh.count == boundData.value1 && severityMedium.count == boundData.value1 && severityLow.count == boundData.value1) {
                chillerHealth = 4
            } else if (severityHigh.count == boundData.value1 && severityMedium.count > boundData.value1) {
                chillerHealth = 3
            } else if (severityHigh.count > boundData.value1 && severityHigh.count < boundData.value2) {
                chillerHealth = 2
            } else if (severityHigh.count >= boundData.value2) {
                chillerHealth = 1
            }
            return ({
                clientId: boundData.client_id,
                siteId: boundData.site_id,
                chillerHealth: chillerHealth - 0.5, // subtract 0.5 for UI requirement
                severityHigh,
                severityMedium,
                severityLow,
                boundData
            })

        })
        .catch(error => {
            throw error
        })
}

module.exports.getChillerHealthNewOld = async ({ siteId = "cl_tao", clientId }) => {
    const periodDays = 7
    const query = `
    select 
        id, deviceType, equipId, deviceTypeName, siteId, 
        detect_id as detectId, value, start_time as startTime, end_time as endTime,
        severity_id as severityId
    from (
        select d.id, d.deviceType, d.equipId, d.deviceTypeName, d.siteId, dm.detect_id, dm.value, dm.start_time, dm.end_time, c.severity_id
        from aimgmt.device d
        left join aimgmt.detection_master dm on d.equipId=dm.equip_id and d.siteId=dm.site_id and dm.algo_id='calm_v1' and dm.timestamp between date_sub(utc_timestamp(), interval 77 day) and utc_timestamp()
        left join aimgmt.dtd_calm c on c.detect_id=dm.detect_id and d.siteId='${siteId}'
        where d.deviceType='CH'
        group by d.equipId, c.severity_id
        order by c.severity_id desc
    ) t
    group by t.equipId
    `

    const chillerHealthInfoData = await this.getChillerHealthInfo(periodDays)
    //console.log("chillerHealthInfoData: ", chillerHealthInfoData)
    // console.log("query: ", query)
    const chillerCalmResults = await aimgmtdb.selectQueryComplex(query)
    //console.log(chillerCalmResults[0])
    const chillerHealthData = chillerCalmResults[0].map(v => {
        const chillerHealthInfo = chillerHealthInfoData.find(v1 => v1.equip_id == v.equipId)
        const chillerHealth = v.severityId == 3 ? (1 - 0.5)
            : v.severityId == 2 ? (2 - 0.5)
                : v.severityId == 1 ? (3 - 0.5)
                    : (3 - 0.5)
        return ({
            ...v,
            chillerHealth: chillerHealth,
            faultCalm: chillerHealthInfo.faultCalm,
            alarmCalm: chillerHealthInfo.alarmCalm,
            faultAlarmCalm: chillerHealthInfo.faultAlarmCalm,
            maintenanceCalm: chillerHealth < 1 ? `${v.deviceTypeName} needs immediate attention.`
                : chillerHealth < 2 ? `${v.deviceTypeName} maintenance in the next one month.` : ''
        })
    })
    const plantHealthAverageValue = Math.round(chillerHealthData.reduce((r, c, a) => r + c.chillerHealth, 0) / chillerHealthData.length)
    const plantHealthAverage = plantHealthAverageValue == 1 ? "Poor"
        : plantHealthAverageValue == 2 ? "Average"
            : plantHealthAverageValue >= 3 ? "Good" : "-"
    return ({ chillerHealthData, plantHealthAverage })
    /*

    return ({
        clientId: boundData.client_id,
        siteId: boundData.site_id,
        chillerHealth: chillerHealth - 0.5, // subtract 0.5 for UI requirement
        severityHigh,
        severityMedium,
        severityLow,
        boundData
    })
    */

    /*
    let selectors = "value1, value2,client_id,site_id"
    let tableName = "calm_severity_bound"
    let condition = `where enabled=1 and site_id ='${siteId}' and client_id=${clientId}`
    const chillerBoundData = await db.selectRawQuery(selectors, tableName, condition)
    return this.getSeverityInCalm(siteId, clientId)
        .then(data => {
            const severityData = data

            // console.log("severityEquipmentCount: ", data, chillerBoundData[0], severityData)
            if (chillerBoundData[0].length === 0) throw new Error("no bound data");
            const severityHigh = severityData.find(v => v.severity_id === 3) ? severityData.find(v => v.severity_id === 3) : { severity_id: 3, count: 0 }
            const severityMedium = severityData.find(v => v.severity_id === 2) ? severityData.find(v => v.severity_id === 3) : { severity_id: 2, count: 0 }
            const severityLow = severityData.find(v => v.severity_id === 1) ? severityData.find(v => v.severity_id === 3) : { severity_id: 1, count: 0 }

            const boundData = chillerBoundData[0][0]
            let chillerHealth = 0;
            // check health 
            if (severityHigh.count == boundData.value1 && severityMedium.count == boundData.value1 && severityLow.count == boundData.value1) {
                chillerHealth = 4
            } else if (severityHigh.count == boundData.value1 && severityMedium.count > boundData.value1) {
                chillerHealth = 3
            } else if (severityHigh.count > boundData.value1 && severityHigh.count < boundData.value2) {
                chillerHealth = 2
            } else if (severityHigh.count >= boundData.value2) {
                chillerHealth = 1
            }
            return ({
                clientId: boundData.client_id,
                siteId: boundData.site_id,
                chillerHealth: chillerHealth - 0.5, // subtract 0.5 for UI requirement
                severityHigh,
                severityMedium,
                severityLow,
                boundData
            })

        })
        .catch(error => {
            throw error
        })
        */
}

// chillerHealthMeter

module.exports.getChillerHealthNew = async ({ siteId = "cl_tao", clientId }) => {
    try {
        // console.log("calm:service:--", new Date())
        const periodDays = 30
        const [chillerHealthInfoData, chillerCalmResults] = await Promise.all([this.getChillerHealthInfo(periodDays), this.chillerHealthMeter({ siteId, periodDays })])
        const chillerTextQuery = `select * from aimgmt.sensor_faults sf where site_id='${siteId}' group by equip_id, parameter order by updated_ts desc;`
        //console.log(chillerTextQuery)
        const chillerTextResults = await aimgmtdb.selectQueryComplex(chillerTextQuery)

        const chillerHealthData = chillerCalmResults.map(v => {
            // console.log("calm:service:1", new Date())
            const chillerHealthInfo = chillerHealthInfoData.find(v1 => v1.equip_id == v.equipId)
            // console.log("calm:service:2", new Date())
            const chillerFaultText = chillerTextResults[0].filter(v1 => v1.equip_id == v.equipId)
            // console.log("chillerFAultText: ", chillerFaultText)
            // console.log("chiller health info ==> ",chillerHealthInfo)
            return ({
                ...v,
                chillerFaultyText: chillerFaultText.length > 0 ? chillerFaultText.map(v1 => v1.text).join(". ") : "",
                deviceTypeName: v.equipName,
                id: v.deviceId,
                chillerHealth: v.chillerHealth - 0.5,
                faultCalm: chillerHealthInfo.faultCalm,
                alarmCalm: chillerHealthInfo.alarmCalm,
                faultAlarmCalm: chillerHealthInfo.faultAlarmCalm,
                maintenanceCalm: v.chillerHealth < 2 ? `${v.equipName} needs immediate attention.`
                    : v.chillerHealth < 3 ? `${v.equipName} maintenance in the next one month.` : ''
            })
        })
        // console.log("calm:service:1", new Date())
        const plantHealthAverageValue = Math.round(chillerHealthData.reduce((r, c, a) => r + c.chillerHealth, 0) / chillerHealthData.length)
        const plantHealthAverage = plantHealthAverageValue == 1 ? "Poor"
            : plantHealthAverageValue == 2 ? "Average"
                : plantHealthAverageValue >= 3 ? "Good" : "-"
        // console.log({ chillerHealthData, plantHealthAverage })
        return ({ chillerHealthData, plantHealthAverage })
    } catch (error) {
        console.error(error)
        return ({ chillerHealthData: [], plantHealthAverage: 2 })
    }
}

module.exports.calculateChillerHealth = async ({ siteId = "cl_pb", clientId }) => {
    try {
        let monthNo = new Date("2021-01-01").getMonth();
        const year = new Date().getFullYear()
        while (monthNo < 12) {
            let weekNo = 0;
            let dayNo = 1;
            let sDate = new Date(year, monthNo, dayNo, 0, 0, 0, 0)
            // console.log(new Date(sDate - sDate.getTimezoneOffset() * 60 * 1000))
            let eDate = sDate
            while (dayNo > 0 && dateFns.isBefore(sDate, new Date())) {
                if (dateFns.format(new Date(year, monthNo, dayNo + 14, 0, 0, 0, 0), "M") - 1 === monthNo) {
                    dayNo += 7;
                    eDate = new Date(year, monthNo, dayNo, 0, 0, 0, 0)
                } else {
                    eDate = dateFns.lastDayOfMonth(new Date(year, monthNo, 1, 0, 0, 0, 0))
                    dayNo = 0;
                }
                weekNo++;
                // const startDate = dateFns.format(new Date(sDate.valueOf() - sDate.getTimezoneOffset() * 60 * 1000), "yyyy-MM-dd")
                // const endDate = dateFns.format(new Date(eDate.valueOf() - eDate.getTimezoneOffset() * 60 * 1000), "yyyy-MM-dd")
                const startDate = new Date(sDate.valueOf() - sDate.getTimezoneOffset() * 60 * 1000)
                const endDate = new Date(eDate.valueOf() - eDate.getTimezoneOffset() * 60 * 1000)
                const diffDays = dateFns.differenceInDays(endDate, startDate)
                const ed = dateFns.format(endDate, "yyyy-MM-dd")
                // console.log("\n--------------------------")
                // console.log(startDate, endDate, " = ", diffDays)
                const periodDays = diffDays
                const chillerCalmResults = (await this.chillerHealthMeter({ siteId, periodDays, eDate: ed })).map(v => ({
                    equipId: v.equipId,
                    healthEfficiency: v.healthEfficiency,
                    healthSeverity: v.healthSeverity,
                    healthFaultyHour: v.healthFaultyHour,
                    healthIncreasedRate: v.healthIncreasedRate,
                    chillerHealth: v.chillerHealth,
                    chillerHealthRaw: v.chillerHealthRaw,
                }))

                const plantHealthAverageValue = chillerCalmResults.reduce((r, c, a) => r + c.chillerHealth, 0) / chillerCalmResults.length

                let query = `update aimgmt.forecast set health=${plantHealthAverageValue + 1} where equip_id='HD1' and ts = '${ed} 00:00:00.0';`
                for (let i = 0; i < chillerCalmResults.length; i++) {
                    const chi = chillerCalmResults[i]
                    query += `update aimgmt.forecast set health=${chi.chillerHealthRaw + 1} where equip_id='${chi.equipId}' and ts = '${ed} 00:00:00.0';`
                }
                const dbResult = (await aimgmtdb.selectQueryComplex(query))[0]

                // if(dbResult.affectedRows<1) {
                //     // console.log("PlantHealth: ", plantHealthAverageValue)
                //     console.log("update: query: ", query)
                // }

                // console.log(chillerCalmResults)

                sDate = eDate
            }
            monthNo++
        }

        // const eDate = "2020-06-01 00:00:00"
        // const periodDays = 30
        // const chillerCalmResults = (await this.chillerHealthMeter({ siteId, periodDays, eDate })).map(v => ({
        //     equipId: v.equipId,
        //     healthEfficiency: v.healthEfficiency,
        //     healthSeverity: v.healthSeverity,
        //     healthFaultyHour: v.healthFaultyHour,
        //     healthIncreasedRate: v.healthIncreasedRate,
        //     chillerHealth: v.chillerHealth,
        //     chillerHealthRaw: v.chillerHealthRaw,
        // }))

        // const plantHealthAverageValue = chillerCalmResults.reduce((r, c, a) => r + c.chillerHealth, 0) / chillerCalmResults.length

        // console.log("\n--------------------------\nPlantHealth: ", plantHealthAverageValue)
        // console.log(chillerCalmResults)

    } catch (error) {
        console.error(error)
    }
}

module.exports.getCalmRawData = async (startDate, endDate, parameter, siteId) => {
    try {
        let condition = `true `
        const devId = parseInt(parameter.split(":")[0].trim())
        const dataType = parameter.split(":")[1].trim()
        condition += siteId ? ` and site_id ='${siteId}'` : ``
        condition += `and deviceId = ${devId} and dataType ='${dataType}' `
        const rawInfoDatas = await aimgmtdb.getRawInfoData(condition)
        const infoData = rawInfoDatas[0][0]
        if (!infoData) return []
        let query = `SELECT ts, ${infoData.columnName}
               from ${infoData.tableName} where ieee= '${infoData.ieee}' 
               and ts between '${startDate}' and '${endDate}' and ${infoData.columnName} is not null order by ts asc`
        //console.log("query:",query)
        const results = await mgmtdb.getParameterBasedRawData(query)
        return results[0].map(v => ({
            ts: dateFns.format(new Date(v.ts), "yyyy-MM-dd HH:mm"),
            value: v[infoData.columnName] == 0 ? 0 : parseFloat(v[infoData.columnName].toFixed(2))
        }))
    }
    catch (error) {
        console.error(error)
        throw error
    }
}

module.exports.getCalmDetections = async ({ clientId, startDate = null, endDate = null, page = 1, deviceId, rowPerPage = 10, siteId = "cl_tao", latestFirst = false, severity = null }) => {

    const calmRawData = await aimgmtdb.getCalmdata({ clientId, siteId, deviceId, startDate, endDate, page, rowPerPage, latestFirst, severity })
    const calmRawDataCount = await aimgmtdb.getCalmdata({ clientId, siteId, deviceId, startDate, endDate, rowPerPage, latestFirst, severity })

    //console.log("length", calmRawDataCount[0].length)
    if (calmRawData[0].length === 0) return ({ pageCount: 0, data: [] })
    const calmData = calmRawData[0].map(v => ({
        ...v,
        id: v.detectId,
        siteId: v.siteId,
        deviceId: v.deviceId,
        dataType: v.dataType,
        startDate: v.startDate,
        endDate: v.endDate,
        createdTs: dateFns.format(Date.parse(v.createdTs), "yyyy-MM-dd HH:mm:ss"),
        user: v.userId,
        faultType: v.faultId ? [v.faultId] : [],
        severity: v.severityId ? [v.severityId] : [],
        anomalyState: v.anomaly,
        deviceType: v.deviceType,
        // comments: v.comments,
        // impact: v.impact,
        // situation: v.situation,
        // recomm: v.recomm,

        building: "The Atrium @ Orchard",
        sensorSignal: [],
        additionalGraphs: [],
        remark: v.remark,
        deleted: false,
        previousRemark: []
    }))
        .map(v => ({
            ...v,
            labeledBy: v.username,
            label: [v.faultType, v.severity, []],
        }))

    const calmDataCombined = [...calmData]
    for (let i = 0; i < calmDataCombined.length; i++) {
        const calm = calmDataCombined[i]
        const dDifference = dateFns.differenceInMinutes(calm.endDate, calm.startDate)
        const dStartDate = dateFns.subMinutes(calm.startDate, dDifference * 4)
        const dEndDate = dateFns.addMinutes(calm.endDate, dDifference * 4)
        calm.dStartDate = dateFns.format(dStartDate, "yyy-MM-dd HH:mm:ss")
        calm.dEndDate = dateFns.format(dEndDate, "yyy-MM-dd HH:mm:ss")
        calm.dDifference = dDifference
        calm.startDate = dateFns.format(calm.startDate, "yyyy-MM-dd HH:mm:ss")
        calm.endDate = dateFns.format(calm.endDate, "yyyy-MM-dd HH:mm:ss")
    }
    return ({ pageCount: Math.ceil(calmRawDataCount[0].length / rowPerPage), data: calmDataCombined })
}


module.exports.updateCalm = ({ id, updatedBy }) => {
    return aimgmtdb.updateCalm({ id, updatedBy }).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.acceptCalmDetection = async ({ detectionId, accept, userId }) => {
    try {
        const calmData = await aimgmtdb.setAcceptCalm({ detectionId, accept, userId })
        return calmData[0];
    }
    catch (error) {
        throw error
    }
}

module.exports.recoverCalmDetection = async (id) => {
    try {
        const resultData = await aimgmtdb.recoverCalmDetection(id)
        return resultData[0]
    }
    catch (error) {
        throw error
    }

}

// chiller health info
module.exports.getChillerHealthInfo = async (periodInDays = 100) => {
    //console.log("getChillerHealthInfo: start: ", Date.now() / 1000)
    const devices = (await aimgmtdb.getDevices("where deviceType='CH'"))[0]
    const results = []
    for (let d of devices) {
        const resultsFault = this.getFaultBasedHealthInfo(d, d.siteId, d.equipId, periodInDays)
        const resultsAlarm = this.getAlarmBasedHealthInfo(d, d.siteId, d.equipId, periodInDays)
        const resultsFaultAlarm = this.getBothFalutAlarmBasedHealthInfo(d, d.siteId, d.equipId, periodInDays)
        const ra = await Promise.all([resultsFault, resultsAlarm, resultsFaultAlarm])
        // const result = { ...resultsFault, ...resultsAlarm, ...resultsFaultAlarm }
        const result = { ...ra[0], ...ra[1], ...ra[2] }
        // console.log("results ", d.equipId, " : ", result)
        results.push(result)
    }
    //console.log("getChillerHealthInfo: end: ", Date.now() / 1000)
    return results
}

module.exports.getFaultBasedHealthInfo =
    async (device, siteId, equipId, period) => {
        const query = `
    SELECT 
        '${siteId}' as site_id,
        '${equipId}' as equip_id,
        group_concat(distinct fm.fault_id) as fault_ids,
        group_concat(distinct dm.detect_id) as detected_ids,
        min(start_time) as start_time_fdd, max(end_time) as end_time_fdd,
        ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0) as timediffMinute,
        group_concat(ifnull(timestampdiff(minute, dm.start_time, dm.end_time), 0)) as fddHours
    FROM aimgmt.detection_master dm
    left join aimgmt.dtd_fdd fdd on fdd.detect_id = dm.detect_id 
    left join aimgmt.fault_master fm on fm.fault_id = fdd.fault_id
    where 
        dm.algo_id='fdd_v1'
        and site_id = '${siteId}'
        and dm.equip_id='${equipId}' 
        and fm.fault_name like 'Sub-Optimal Operation%' 
        and dm.start_time>=date_sub(utc_timestamp(), interval ${period} day)
        and TIMESTAMPDIFF(MINUTE ,dm.start_time, dm.end_time)>=5
    order by dm.end_time desc`
        // console.log("query: ", equipId, " : \n", query)
        const dataRaw = (await aimgmtdb.selectQuery(query))[0]

        if (dataRaw.length > 0 && parseInt(dataRaw[0].timediffMinute) / 60 > 0) {
            const data = dataRaw[0]
            const timediffMinute = parseInt(data.timediffMinute)
            data.faultCalm = `${device.deviceTypeName} operated inefficiently for ${timediffMinute < 60 ? timediffMinute + " minutes" : Math.round(timediffMinute / 60) + " hours"} in the last ${period} days.`

            return data
        } else if (dataRaw.length > 0) {
            const data = dataRaw[0]
            data.faultCalm = ''
            return data
        }
        return null

    }

module.exports.getAlarmBasedHealthInfo = async (device, siteId, equipId, period) => {
    const query = `
    SELECT 
        '${siteId}' as site_id,
        '${equipId}' as equip_id,
        group_concat(distinct am.alarm_id) as alarm_ids,
        group_concat(distinct dm.detect_id) as detected_ids,
        min(start_time) as start_time_fad, max(end_time) as end_time_fad,
        ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0) as timediffMinute,
        group_concat(ifnull(timestampdiff(minute, dm.start_time, dm.end_time), 0)) as fadHours
    FROM aimgmt.detection_master dm
    left join aimgmt.dtd_fad fad on fad.detect_id = dm.detect_id 
    left join aimgmt.alarm_master am on am.alarm_id = fad.alarm_id
    where 
        dm.algo_id='fad_v1'
        and site_id = '${siteId}'
        and dm.equip_id='${equipId}' 
        and am.alarm_name like '%Trip%'
        and dm.start_time>=date_sub(utc_timestamp(), interval ${period} day)
        and TIMESTAMPDIFF(MINUTE ,dm.start_time, dm.end_time)>=5
    order by dm.end_time desc`
    //console.log("query: ", equipId, " : \n", query)
    const dataRaw = (await aimgmtdb.selectQuery(query))[0]
    if (dataRaw.length > 0 && parseInt(dataRaw[0].timediffMinute) > 0) {
        const data = dataRaw[0]
        const timediffMinute = parseInt(data.timediffMinute)
        data.alarmCalm = `${device.deviceTypeName} tripped for ${timediffMinute < 60 ? timediffMinute + " minutes" : Math.round(timediffMinute / 60) + " hours"} in the last ${period} days.`
        return data
    } else if (dataRaw.length > 0) {
        const data = dataRaw[0]
        data.alarmCalm = ''
        return data
    }
    return null
}

module.exports.getBothFalutAlarmBasedHealthInfo = async (device, siteId, equipId, period) => {
    const query = `
    SELECT 
        '${siteId}' as site_id,
        '${equipId}' as equip_id,
        date_format(dm.end_time, '%Y-%m-%d') as ts,
        group_concat(distinct fm.fault_id) as fault_ids,
        group_concat(distinct am.alarm_id) as alarm_ids,
        group_concat(distinct fdd.detect_id) as detected_ids_fdd,
        group_concat(distinct fad.detect_id) as detected_ids_fad,
        min(start_time) as start_time_fdd, max(end_time) as end_time_fdd,
        min(start_time) as start_time_fad, max(end_time) as end_time_fad,
        ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0) as timediffMinute
    FROM aimgmt.detection_master dm
    left join aimgmt.dtd_fdd fdd on fdd.detect_id = dm.detect_id 
    left join aimgmt.fault_master fm on fm.fault_id = fdd.fault_id
    left join aimgmt.dtd_fad fad on fad.detect_id = dm.detect_id 
    left join aimgmt.alarm_master am on am.alarm_id = fad.alarm_id
    where 
        (dm.algo_id='fdd_v1' or dm.algo_id='fad_v1')
        and site_id = '${siteId}'
        and dm.equip_id='${equipId}' 
        and (fm.fault_name like 'Sub-Optimal Operation%' or am.alarm_name like '%Trip%')
        and dm.start_time>=date_sub(utc_timestamp(), interval ${period} day)
        /*and TIMESTAMPDIFF(MINUTE ,dm.start_time, dm.end_time)>=5*/
    group by date_format(dm.end_time, '%Y-%m-%d')
    order by ts desc`
    //console.log("query: ", query)
    const dataRaw = (await aimgmtdb.selectQuery(query))[0]

    const data = dataRaw.reduce((r, c, i, a) => {
        if (i < a.length - 2) {
            let nextD = parseInt(a[i + 1].timediffMinute)
            if (nextD == 0) nextD = 1
            const currentD = parseInt(c.timediffMinute)
            const d = ((currentD / nextD) - 1) * 100
            return [...r, d]
        } else return r
    }, [])

    const avgData = data.reduce((r, c) => r + c, 0) / 30
    const faultAlarmCalm = ""/* avgData === 0 ? ''
        : avgData > 0 ? `${device.deviceTypeName} health improved by ${Math.abs(Math.round(avgData))}% in the last ${period} days.`
            : avgData < 0 ? `${device.deviceTypeName} health declined by ${Math.abs(Math.round(avgData))}% in the last ${period} days.`
                : ''*/
    return ({ faultAlarmCalm })

}


// this.getChillerHealthInfo()

module.exports.calmDetailCount = async (deviceId, siteId, startDate, endDate) => {

    try {
        const calmCountLists = await aimgmtdb.getCalmDetailCountList(deviceId, siteId, startDate, endDate)
        const fad = calmCountLists[0][0].filter(c => c.algoId == "fad_v1")
        const fdd = calmCountLists[0][0].filter(c => c.algoId == "fdd_v1")
        const ano = calmCountLists[0][0].filter(c => c.algoId == "ad_v1")
        const fadCount = fad.length > 0 ? fad[0].count : 0
        const fddCount = fdd.length > 0 ? fdd[0].count : 0
        const anoCount = ano.length > 0 ? ano[0].count : 0
        //console.log(fdd,fadCount,fddCount,anoCount)

        const highSeverity = calmCountLists[0][1].filter(d => d.severityId == 3)
        const meduimSeverity = calmCountLists[0][1].filter(d => d.severityId == 2)
        const lowSeverity = calmCountLists[0][1].filter(d => d.severityId == 1)
        return ({
            total: fadCount + fddCount + anoCount,
            anoCount: anoCount,
            fddCount: fddCount,
            fadCount: fadCount,
            high: highSeverity.length > 0 ? highSeverity[0].calmCount : 0,
            medium: meduimSeverity.length > 0 ? meduimSeverity[0].calmCount : 0,
            low: lowSeverity.length > 0 ? lowSeverity[0].calmCount : 0
        })
    }

    catch (error) {
        throw error
    }
}

module.exports.getTrendGraphDataCalmOld = async ({ siteId = "cl_tao", equipId = 'CH3', faultId, period = 7, formatForPeriodType, dateFormat, periodType }) => {
    const query = `
    SELECT 
        dm.site_id,
        dm.equip_id,
        date_sub(date_format(dm.end_time, '%Y-%m-%d'), interval ${period} ${periodType}) as startDate,
        date_format(dm.end_time, '%Y-%m-%d') as endTs, 
        ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0)/60 as timediffMinute, 
        group_concat(dm.detect_id) as detectIds,
        group_concat(fdd.fault_id) as faultIds
    FROM detection_master dm
    LEFT JOIN dtd_fdd fdd on fdd.detect_id=dm.detect_id
    where dm.algo_id='fdd_v1' and dm.site_id='${siteId}' and dm.equip_id='${equipId}' ${faultId ? "and fdd.fault_id=" + faultId : ""}
        and TIMESTAMPDIFF(MINUTE ,dm.start_time, dm.end_time)>=5
    group by DATEDIFF(date_format(dm.end_time, '${formatForPeriodType}'), date_format(utc_timestamp(), '${formatForPeriodType}')) DIV ${period}
    order by dm.end_time asc
    `
    const faultTrend = (await aimgmtdb.selectQuery(query))[0]
    // console.log("faultTrend: ", faultTrend)
    return faultTrend;
}

module.exports.getTrendGraphDataCalm = async ({ siteId = "cl_tao", equipId = 'CH3', faultId, period = 7, formatForPeriodType, dateFormat, periodType }) => {
    let groupBy = `week_no, month_name, year`
    let queryTs = `concat('W ', week_no, ' ', month_name, ', ', year) as ts`
    if (periodType === "month") {
        groupBy = `month_name, year`
        queryTs = `concat(month_name, ', ', year) as ts`
    } else if (periodType === "year") {
        groupBy = `year`
        queryTs = `concat(year) as ts`
    }

    const query = `
        SELECT * from (
            SELECT 
                site_id, equip_id, created_date, 
                ${queryTs}, 
                sum(hours) as hours, 
                sum(minutes) as minutes,
                STR_TO_DATE(concat(week_no, '-',month_name, '-', year), '%d-%b-%Y') as d
            FROM aimgmt.calm_graph_data
            where site_id='${siteId}' and equip_id='${equipId}'
            group by ${groupBy}
            order by STR_TO_DATE(concat(week_no, '-',month_name, '-', year), '%d-%b-%Y') desc
            limit 12 
        ) t1
        order by d asc
    `
    const faultTrend = (await mgmtdb.selectQuery(query))[0]
    const faultTrendNew = faultTrend.map((v, i, a) => {
        const increasedRate = i === 0 ? 0 : ((a[i - 1].minutes !== 0 ? (v.minutes / a[i - 1].minutes) : 0) - 1) * 100
        return ({
            ...v,
            increasedRate
        })
    })
    // console.log("faultTrend: ", faultTrendNew)
    return faultTrendNew;
}
/*
SELECT
    dm.site_id,
    dm.equip_id,
    -- date_sub(date_format(dm.end_time, '%Y-%m-%d'), interval ${period} ${periodType}) as startDate,
    -- date_format(dm.end_time, '%Y-%m-%d') as endTs,
    ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0)/60 as hours,
    ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0) as minutes
    -- group_concat(dm.detect_id) as detectIds,
    -- group_concat(fdd.fault_id) as faultIds
FROM iotdata.detection_master dm
LEFT JOIN iotmgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id
where dm.algo_id='fdd_v1' and dm.site_id='cl_tao' and dm.equip_id='CH3';
*/

const replaceAll = (string, search, replace) => {
    return string.split(search).join(replace);
}

module.exports.calculateTrendGraphDataCalmForDates = async ({ siteId, algoId = 'fdd_v1', startDate, endDate }) => {
    const queryTemplate = `
        SELECT 
            d.siteId,
            d.equipId,
            d.deviceTypeName as equipName,
            ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0)/60 as hours, 
            ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0) as minutes
        FROM aimgmt.device d 
        LEFT JOIN aimgmt.detection_master dm on dm.equip_id=d.equipId and (dm.start_time between '${startDate}' and '${startDate}' or dm.end_time between '${startDate}' and '${endDate}') and dm.algo_id='${algoId}'
        LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id 
        where d.siteId='${siteId}' and d.deviceType in ('CH')
        group by d.equipId;`

    try {
        //console.log(queryTemplate)
        const queryResults = await mgmtdb.selectQuery(queryTemplate)
        return queryResults
    } catch (error) {
        console.error(error)
        return []
    }
}

const months = ["Jan", "Feb", "March", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

module.exports.calculateTrendGraphDataCalm = async ({ siteId, algoId = 'fdd_v1', year }) => {
    console.log("starting calm graph data ")
    const clearQuery = `delete from aimgmt.calm_graph_data where site_id='${siteId}' and year=${year}`
    await aimgmtdb.selectQuery(clearQuery)
    const queryTemplate = `
        INSERT aimgmt.calm_graph_data(year, week_no, month_name, site_id, equip_id, hours, minutes)
        SELECT 
            @year as year,
            @weekNo as week_no,
            '@monthName' as month_name,
            d.siteId as site_id,
            d.equipId as equip_id,
            ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0)/60 as hours, 
            ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0) as minutes
        FROM aimgmt.device d 
        LEFT JOIN aimgmt.detection_master dm on dm.equip_id=d.equipId and (dm.start_time between '@startDate' and '@endDate' or dm.end_time between '@startDate' and '@endDate') and dm.algo_id='${algoId}'
        LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id 
        where d.siteId='${siteId}' and d.deviceType in ('CH') /*d.deviceType not in ('CHWP', 'CWP')*/
        group by d.equipId;`
    const todayDate = dateFns.endOfDay(new Date())
    // return console.log("todayDate ", todayDate)
    let query = ''
    let monthNo = 0;
    while (monthNo < 3) {
        let weekNo = 0;
        let dayNo = 1;
        let sDate = new Date(year, monthNo, dayNo, 0, 0, 0, 0)
        // console.log(new Date(sDate - sDate.getTimezoneOffset() * 60 * 1000))
        let eDate = sDate
        while (dayNo > 0 && dateFns.isBefore(sDate, todayDate)) {

            if (dateFns.format(new Date(year, monthNo, dayNo + 14, 0, 0, 0, 0), "M") - 1 === monthNo) {
                dayNo += 7;
                eDate = new Date(year, monthNo, dayNo, 0, 0, 0, 0)
            } else {
                eDate = dateFns.lastDayOfMonth(new Date(year, monthNo, 1, 0, 0, 0, 0))
                dayNo = 0;
            }
            weekNo++;
            const startDate = dateFns.format(new Date(sDate.valueOf() - sDate.getTimezoneOffset() * 60 * 1000), "yyyy-MM-dd")
            const endDate = dateFns.format(new Date(eDate.valueOf() - eDate.getTimezoneOffset() * 60 * 1000), "yyyy-MM-dd")

            query = queryTemplate
                .replace(/@startDate/gi, startDate)
                .replace(/@endDate/gi, endDate + " 23:59:59")
                .replace(/@year/gi, year)
                .replace(/@weekNo/gi, weekNo)
                .replace(/@monthName/gi, months[monthNo])
            // console.log("query: ", query)
            // console.log("================\n", monthNo, ", ", weekNo, " : ", startDate, " - ", endDate, "    ")

            // console.log(">> \n", monthNo , ", ", weekNo, " : ", startDate, " - ", endDate, "    ")

            try {
                const queryResults = await aimgmtdb.selectQuery(query)
                // console.log("queryResults: ", queryResults[0])
            } catch (error) {
                console.log("================\n", monthNo, ", ", weekNo, " : ", startDate, " - ", endDate, "    ")
                console.log(error.message)
            }
            sDate = eDate
        }
        monthNo++
    }
}

module.exports.getChillerHealthNewData = async ({ siteId, clientId }) => {
    const deviceLists = await db.getDeviceListForEfficiency(siteId)
    const endDate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
    const startDate = dateFns.format(dateFns.subMonths(Date.parse(endDate), 1), "yyyy-MM-dd HH:mm:ss")

    //query how many days each Severity type occurred
    const severityInfos = await mgmtdb.getSeverityInfo(startDate, endDate)
    // console.log(severityInfos[0],"serverity")
    const resultArr = []
    for (d of deviceLists[0]) {
        //Count Efficiency rows available and out of range efficiency rows
        const effCountQuery = `select count(*) as totalCount from ${d.tableName} where ieee='${d.ieee}' and ts between '${startDate}' and '${endDate}';
                        select count(*) as unNormalCount from ${d.tableName} where ${d.columnName}>0.8 and ieee='${d.ieee}' and ts between '${startDate}' and '${endDate}';`
        const efficiencyRawCount = await mgmtdb.getEfficiencyRawCount(effCountQuery)
        const totalEffCount = efficiencyRawCount[0][0][0].totalCount == 0 ? 1 : efficiencyRawCount[0][0][0].totalCount
        //Calculate percentage of inefficient operation.
        const effPercentage = Math.round((efficiencyRawCount[0][1][0].unNormalCount / totalEffCount) * 100)
        const efficiency = effPercentage > 40 ? "Poor" : (effPercentage > 10 || effPercentage < 40) ? "Average" : "Good"

        //Calculate how many days each Severity type occurred
        const severityHigh = severityInfos[0].filter(c => c.equipId == d.equipId && c.severityId == 3)
        const severityMedium = severityInfos[0].filter(c => c.equipId == d.equipId && c.severityId == 2)
        const severityLow = severityInfos[0].filter(c => c.equipId == d.equipId && c.severityId == 1)
        const severity = (severityHigh.length > 3 && severityMedium.length > 10 && severityLow.length > 15) ? "Poor" :
            (severityHigh.length > 1 && severityMedium.length > 5 && severityLow.length > 7) ? "Average" :
                "Good"

        //Calculate Sub-Optimal Operation time


        if (effPercentage > 0) {
            resultArr.push({ deviceId: d.deviceId, effStatus: `${d.deviceTypeName} operated inefficiently about ${effPercentage} % of the time in the last 1 month` })
        }
    }
    return resultArr
}

module.exports.getListForCH = ({ siteId }) => {
    const deviceStatusParameterList = aimgmtdb.getDeviceListForDeviceStatus(siteId)
    const efficiencyParameterList = aimgmtdb.getDeviceListForEfficiency(siteId)
    const deviceStatusIeeeList = aimgmtdb.getDeviceStatusIeeeList(siteId)
    return [deviceStatusParameterList, efficiencyParameterList, deviceStatusIeeeList]
}

module.exports.getDataForCH = ({ siteId, startDate, endDate, deviceStatusIeeeList, efficiencyParameterList, inefficientDefinition }) => {
    //HK_CHANGES
    const query = ` select d.deviceTypeName,d.deviceType,d.equipId,count(*) as deviceOnCount  
    from aimgmt.device d left join aimgmt.sensor_real_time sr on sr.equip_id= d.equipId where d.siteId='${siteId}' and d.deviceType='CH' 
     and  (sr.ts between '${startDate}' and '${endDate}') and sr.kw>10 group by d.equipId
     `

    const deviceStatusCountQueryResults = aimgmtdb.selectQuery(query)

    //End HK_CHANGES

    // const query = `SELECT ieee, count(*) as deviceOnCount
    // FROM iotmgmt.deviceStatus 
    // where  (ts between '${startDate}' and '${endDate}') and device_status>0 and
    // ieee in (${deviceStatusIeeeList[0].ieee})
    // group by ieee`;
    // // console.log(query)
    // const deviceStatusCountQueryResults = mgmtdb.selectQuery(query)
    // New Changes: 9-Oct-2020 > No 1 & No 2
    /*
    1. Calculate running hours. If not possible, Count the total number of rows availablieee in ('cltao007b', 'cltao0082','cltao0089','cltao0090','cltao0098')e for the parameter.
    2. Count Efficiency rows available. Count Efficiency Rows out of Prescribed Range. Calculate percentage of inefficient operation.
        For Eg. Chiller 1 – 43200 Rows for 1 month.
            No. Of rows that contain value > 0.8 = 12000 Rows
            Percentage = 12000/43200 * 100 = 27.7 %
            Chiller 1 operated inefficiently about 27 % of the time in the last 1 month.
    */

    // console.log("inefficientDefinition: ", inefficientDefinition)
    const efficiencyCountsQuery = efficiencyParameterList.map(v => {
        const equipInefficientDef = inefficientDefinition.find(vv => vv.param == v.equipId)
        let inefficientCondition = ""
        let inefficientDefText = ""
        // console.log("equipInefficientDef: ", equipInefficientDef)
        if (equipInefficientDef) {
            switch (equipInefficientDef.operator) {
                case "gt":
                    inefficientCondition = v.columnName + ">" + equipInefficientDef.value;
                    inefficientDefText = "E > " + equipInefficientDef.value;
                    break;
                case "lt":
                    inefficientCondition = v.columnName + "<" + equipInefficientDef.value;
                    inefficientDefText = "E < " + equipInefficientDef.value;
                    break;
                case "bt":
                    inefficientCondition = v.columnName + ">=" + equipInefficientDef.value1 + " and " + v.columnName + "<=" + equipInefficientDef.value2;
                    inefficientDefText = "E  > " + equipInefficientDef.value1 + " & E < " + equipInefficientDef.value2;
                    break;
                case "nbt":
                    inefficientCondition = v.columnName + "<" + equipInefficientDef.value1 + " and " + v.columnName + ">" + equipInefficientDef.value2;
                    inefficientDefText = "E  < " + equipInefficientDef.value1 + " & E > " + equipInefficientDef.value2;
                    break;
                default:
                    inefficientCondition = "false";
                    inefficientDefText = "No Logic found!"
            }
        } else {
            inefficientCondition = "false";
            inefficientDefText = "No Logic found!"
        }

        if (v.ieee === null) return `SELECT 1 as totalCount, 0 as inefficientCount, 0 as inefficientPercent, '${v.equipId}' as equipId, '${v.deviceTypeName}' as equipName, '${v.deviceId}' as deviceId, '${inefficientDefText}' as inefficientDefText, ${equipInefficientDef.id} as inefficientDefId;`
        return `SELECT t.*, (inefficientCount/totalCount)*100 as inefficientPercent from (
        SELECT COUNT(*) as totalCount, SUM(IF(${inefficientCondition}, 1, 0)) as inefficientCount, '${v.equipId}' as equipId, '${v.deviceTypeName}' as equipName, '${v.deviceId}' as deviceId, '${inefficientDefText}' as inefficientDefText, ${equipInefficientDef.id} as inefficientDefId
        FROM iotmgmt.${v.tableName} 
        WHERE ieee='${v.ieee}' and ts between '${startDate}' and '${endDate}') t;
        `
    }).join("")
    // console.log(efficiencyCountsQuery,"efficiencyCountsQuery")
    const efficiencyCountsQueryResults = mgmtdb.selectQuery(efficiencyCountsQuery)

    //console.log("hhhhhh",dateFns.format(new Date(),"yyyy-MM-dd HH:mm:ss"))
    // efficiencyCountsQueryResults = efficiencyCountsQueryResults.map(v => {
    //     let efficiencyText = v[0].totalCount === 0 ? `${v[0].equipName} has no efficiency data!` : Math.floor(v[0].inefficientPercent) !== 0 ? `${v[0].equipName} operated inefficiently about ${Math.floor(v[0].inefficientPercent)}% in the last ${periodDays} days.` : ""
    //     if (v[0].inefficientPercent > 40)
    //         efficiencyText += " Requires operational improvement to maintain chiller health and save Energy."
    //     return ({
    //         ...v[0],
    //         healthEfficiency: v[0].inefficientPercent > 40 ? 1 : v[0].inefficientPercent > 10 ? 2 : 3,
    //         efficiencyText,
    //     })
    // })

    // New Changes: 9-Oct-2020 > No 3
    /*
    3. Calculate how many days each Severity type occurred.
    If Sev 3 - HIGH more than 3 days – Poor
    If Sev 2 - MEDIUM more than 10 Days - Poor
    If Sev 1 - LOW more than 15 days – Poor

    If Sev 3 - HIGH more than 1 days – Average
    If Sev 2 - MEDIUM more than 5 Days - Average
    If Sev 1 - LOW more than 7 days - Average
    */
    const severityOccurenceQuery = `select t.equipId, t.deviceTypeName as equipName, t.count, sum(if(t.severity_id=3, days, 0)) highDays, sum(if(t.severity_id=2, days, 0)) mediumDays, sum(if(t.severity_id=1, days, 0)) lowDays 
    from (
        SELECT c.severity_id, d.equipId, d.deviceTypeName, count(*) as count, count(distinct "'", date_format(dm.start_time, '%Y-%m-%d'), "'") as days
        FROM aimgmt.device d
        LEFT JOIN aimgmt.detection_master dm on dm.equip_id=d.equipId and algo_id='calm_v1' and dm.start_time>='${startDate}' and dm.end_time<='${endDate}'
        LEFT JOIN aimgmt.dtd_calm c on c.detect_id=dm.detect_id
        WHERE d.deviceType='CH'
        GROUP BY d.equipId, c.severity_id
    ) t
    GROUP BY t.equipId`
    // console.log("severityOccurenceQuery: ", severityOccurenceQuery)
    const severityOccurenceQueryResults = mgmtdb.selectQuery(severityOccurenceQuery)

    const faultyOperationHourResults = this.calculateTrendGraphDataCalmForDates({ siteId, startDate, endDate })

    return [deviceStatusCountQueryResults, efficiencyCountsQueryResults, severityOccurenceQueryResults, faultyOperationHourResults]
}

// @nayhtet
const healths = ["Poor", "Average", "Good"]
module.exports.chillerHealthMeter = async ({ clientId, siteId = "cl_tao", periodDays = 30, eDate = null }) => {


    const endDate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
    // const endDate = eDate ? eDate : dateFns.format(new Date(2020, 9, 19), "yyyy-MM-dd HH:mm:ss")
    // console.log("endDate: ", endDate)
    const startDate = dateFns.format(dateFns.subDays(Date.parse(endDate), periodDays), "yyyy-MM-dd 00:00:00")

    const chmCalcConfig = await calcConfig.loadChillerHealthMeterCalc()

    const inefficientDefinition = await this.getInefficientDefinition({ siteId, enabled: 1 })

    const listForCH = await Promise.all(this.getListForCH({ siteId }))
    const [deviceStatusParameterList, efficiencyParameterList, deviceStatusIeeeList] = [listForCH[0][0], listForCH[1][0], listForCH[2][0]]

    const dataList = await Promise.all(this.getDataForCH({ siteId, startDate, endDate, deviceStatusIeeeList, efficiencyParameterList, inefficientDefinition }))
    const [deviceStatusCount, efficiencyCountsQueryResults1, severityOccurenceQueryResults1, faultyOperationHourResults1]
        = [dataList[0][0], dataList[1][0], dataList[2][0], dataList[3][0]]


    const deviceStatusCountQueryResults = deviceStatusCount;
    const efficiencyCountsQueryResults = efficiencyCountsQueryResults1.map(v => {
        let efficiencyText = v[0].totalCount === 0 ? `${v[0].equipName} has no efficiency data!` : Math.floor(v[0].inefficientPercent) !== 0 ? `${v[0].equipName} operated inefficiently about ${Math.floor(v[0].inefficientPercent)}% in the last ${periodDays} days.` : ""

        let healthEfficiency = 3
        const inefficientPercentConfig = chmCalcConfig.inefficientPercent
        for (const it of inefficientPercentConfig) {
            if (it.operator === "gt" && v[0].inefficientPercent > parseInt(it.value)) {
                healthEfficiency = healths.findIndex(e => e === it.result1) + 1
                if (it.result2 !== null && it.result2 !== "")
                    efficiencyText += it.result2
                break;
            } else if (it.operator === "lt" && v[0].inefficientPercent < parseInt(it.value)) {
                healthEfficiency = healths.findIndex(e => e === it.result1) + 1
                if (it.result2 !== null && it.result2 !== "")
                    efficiencyText += it.result2
                break;
            } else if (it.operator === "bt" && v[0].inefficientPercent >= parseInt(it.value1) && v[0].inefficientPercent <= parseInt(it.value2)) {
                healthEfficiency = healths.findIndex(e => e === it.result1) + 1
                if (it.result2 !== null && it.result2 !== "")
                    efficiencyText += it.result2
                break;
            }
        }
        return ({
            ...v[0],
            healthEfficiency, //: v[0].inefficientPercent > 40 ? 1 : v[0].inefficientPercent > 10 ? 2 : 3,
            efficiencyText//: "",
        })
    })

    const severityOccurenceQueryResults = severityOccurenceQueryResults1.map(v => {
        let health = 3 // Good
        let s = null
        let d = 0

        const severityConfig = chmCalcConfig.severityDayCount
        for (const it of severityConfig) {
            if (it.operator === "gt" && v[it.param] > parseInt(it.value)) {
                health = healths.findIndex(e => e === it.result1) + 1
                s = it.result2
                d = v[it.param]
                break;
            } else if (it.operator === "lt" && v[it.param] < parseInt(it.value)) {
                health = healths.findIndex(e => e === it.result1) + 1
                s = it.result2
                d = v[it.param]
                break;
            } else if (it.operator === "bt" && v[it.param] >= parseInt(it.value1) && v[it.param] <= parseInt(it.value2)) {
                health = healths.findIndex(e => e === it.result1) + 1
                s = it.result2
                d = v[it.param]
                break;
            }
        }

        const severityText = (s === null) ? "" : `${v.equipName} had Severity ${s} Issues repeatedly for ${d} days in the last ${periodDays} days.`
        return ({
            ...v,
            healthSeverity: health,
            severityText
        })
    })
    const faultyOperationHourResults = faultyOperationHourResults1.map(v => {
        let rh = deviceStatusCountQueryResults.find(vv => vv.equipId == v.equipId)
        if (!rh)
            rh = { deviceOnCount: periodDays * 24 * 60 }
        const faultyPercent = (v.minutes / parseInt(rh.deviceOnCount)) * 100

        let health = 3
        const faultyPercentConfig = chmCalcConfig.faultyPercent
        for (const it of faultyPercentConfig) {
            if (it.operator === "gt" && faultyPercent > parseInt(it.value)) {
                health = healths.findIndex(e => e === it.result1) + 1
                break;
            } else if (it.operator === "lt" && faultyPercent < parseInt(it.value)) {
                health = healths.findIndex(e => e === it.result1) + 1
                break;
            } else if (it.operator === "bt" && faultyPercent >= parseInt(it.value1) && faultyPercent <= parseInt(it.value2)) {
                health = healths.findIndex(e => e === it.result1) + 1
                break;
            }
        }
        const faultyHourText = faultyPercent === 0 ? "" : `${v.equipName} faulty hour is ${Math.abs(Math.floor(faultyPercent))}% in the last 30 days.`

        return ({ ...v, faultyPercent, healthFaultyHour: health, faultyHourText, rh: parseInt(rh.deviceOnCount) })
    })


    const faultyHoursRateResults = await Promise.all(efficiencyCountsQueryResults
        .map(v => ({ equipId: v.equipId, equipName: v.equipName }))
        .map(async v => {
            const r = await this.getTrendGraphDataCalm({ equipId: v.equipId, siteId: siteId, periodType: "month" })
            const rl3m = [r[r.length - 1].increasedRate, r[r.length - 2].increasedRate, r[r.length - 3].increasedRate]
            const increasedRate = Math.max(...rl3m)
            let health = 3
            const faultyIncreasedRateConfig = chmCalcConfig.faultyIncreasedRate
            for (const it of faultyIncreasedRateConfig) {
                if (it.operator === "gt" && increasedRate > parseInt(it.value)) {
                    health = healths.findIndex(e => e === it.result1) + 1
                    break;
                } else if (it.operator === "lt" && increasedRate < parseInt(it.value)) {
                    health = healths.findIndex(e => e === it.result1) + 1
                    break;
                } else if (it.operator === "bt" && increasedRate >= parseInt(it.value1) && increasedRate <= parseInt(it.value2)) {
                    health = healths.findIndex(e => e === it.result1) + 1
                    break;
                }
            }
            // const health = increasedRate > 10 ? 1 : increasedRate > 5 ? 2 : 3
            const rateText = "" //`${v.equipName} fault rate ${increasedRate >= 0 ? 'increased' : 'decreased'} rate of ${Math.abs(Math.floor(increasedRate))}% in the last 3 months.`
            return ({ ...v, increasedRate, healthIncreasedRate: health, faultyMinutes: r[r.length - 1].minutes, rateText })
        })
    )
    // console.log("faultyHoursRateResults: ", faultyHoursRateResults) // LOG result

    const preResults = efficiencyCountsQueryResults.map(v => {
        const severityR = severityOccurenceQueryResults.find(c => c.equipId === v.equipId)
        const faultyHourR = faultyOperationHourResults.find(c => c.equipId === v.equipId)
        const faultyRateR = faultyHoursRateResults.find(c => c.equipId === v.equipId)
        return ({ ...v, ...severityR, ...faultyHourR, ...faultyRateR })
    })

    const finalResults = preResults.map(v => {
        let chd = parseFloat(v.healthEfficiency) + parseFloat(v.healthSeverity) + parseFloat(v.healthFaultyHour) + parseFloat(v.healthIncreasedRate)
        return ({ ...v, chillerHealth: parseInt(Math.round(chd / 4)), chillerHealthRaw: chd / 4 })
    })
    return finalResults
}

module.exports.getEnergySavingsOriginal = async ({ siteId = "cl_tao", period = "year", toInsert = false, dateForMonth = null }) => { // period=year|month
    try {
        // const periodDays = 30
        const currentDate = dateForMonth ? new Date(dateForMonth) : kumoDate.Date()
        const currentYear = dateFns.format(currentDate, "yyyy")
        const currentMonth = dateFns.format(currentDate, "MMM").toLocaleLowerCase()
        const dateUnit = period === "year" ? "Year" : "Month"
        const inefficientDefinition = await this.getInefficientDefinition({ siteId, enabled: 1 })

        const siteInefficientDef = inefficientDefinition.find(v => !v.param)
        let inefficientCondition = ""
        let inefficientDefText = ""
        switch (siteInefficientDef.operator) {
            case "gt":
                inefficientCondition = "eff>" + siteInefficientDef.value;
                inefficientDefText = "E > " + siteInefficientDef.value;
                break;
            case "lt":
                inefficientCondition = "eff<" + siteInefficientDef.value;
                inefficientDefText = "E < " + siteInefficientDef.value;
                break;
            case "bt":
                inefficientCondition = "eff>=" + siteInefficientDef.value1 + " and eff<=" + siteInefficientDef.value2;
                inefficientDefText = "E  > " + siteInefficientDef.value1 + " & E < " + siteInefficientDef.value2;
                break;
            case "nbt":
                inefficientCondition = "eff<" + siteInefficientDef.value1 + " and eff>" + siteInefficientDef.value2;
                inefficientDefText = "E  < " + siteInefficientDef.value1 + " & E > " + siteInefficientDef.value2;
                break;
            default:
                inefficientCondition = "false";
                inefficientDefText = "No Logic found!"
        }

        // console.log("siteInefficientDef: ", siteInefficientDef)
        if (!toInsert) {
            if (dateUnit === "Year") {
                const data = (await aimgmtdb.selectQuery(`select * from aimgmt.yearly_savings where years=${currentYear} limit 1`))[0][0]
                const savingResponse = {
                    year: data.years,
                    dateUnit: dateUnit,
                    currency: data.currency,
                    costPerKW: data.costPerKW,
                    faultyPercent: Math.round(data.faultyPercent * 0.3), //faultyOperationPercent.toFixed(1)*1,
                    totalPowerSaved: data.totalPowerSaved,
                    totalAmountSaved1: Math.round(data.totalAmountSaved1),
                    totalAmountSaved5: Math.round(data.totalAmountSaved1 * 3),
                    totalAmountSaved15: Math.round(data.totalAmountSaved1 * 5),
                    updatedTs: data.updatedTs,
                    inefficientMinutes: data.inefficientMinutes,
                    inefficientDefText,
                    inefficientDefId: siteInefficientDef.id,
                    success: true,
                }
                return savingResponse
            }
            else if (dateUnit === "Month") {
                // const data = (await aimgmtdb.selectQuery(`select * from aimgmt.monthly_savings where years=${currentYear} and months='${dateForMonth ? currentMonth : 'oct'}' limit 1`))[0][0]
                const data = (await aimgmtdb.selectQuery(`select *, avg(faultyPercent) as faultyPercent, avg(totalAmountSaved1) as totalAmountSaved1  from aimgmt.monthly_savings where years=${currentYear} limit 1`))[0][0]
                const savingResponse = {
                    year: data.years,
                    month: data.months,
                    dateUnit: dateUnit,
                    currency: data.currency,
                    costPerKW: data.costPerKW,
                    faultyPercent: Math.round(data.faultyPercent * 0.3), //faultyOperationPercent.toFixed(1)*1,
                    totalPowerSaved: data.totalPowerSaved,
                    totalAmountSaved1: Math.round(data.totalAmountSaved1),
                    totalAmountSaved5: Math.round(data.totalAmountSaved1 * 3),
                    totalAmountSaved15: Math.round(data.totalAmountSaved1 * 5),
                    updatedTs: data.updatedTs,
                    inefficientMinutes: data.inefficientMinutes,
                    inefficientDefText,
                    inefficientDefId: siteInefficientDef.id,
                    success: true,
                }
                return savingResponse
            } else throw "Please provide valid period!"
        }

        const endDate = dateFns.format(dateFns.endOfMonth(currentDate), "yyyy-MM-dd HH:mm:ss")
        const startDate = period === "year" ? dateFns.format(dateFns.startOfYear(new Date(endDate)), "yyyy-MM-dd HH:mm:ss")
            : dateFns.format(dateFns.startOfMonth(currentDate), "yyyy-MM-dd 00:00:00")

        const algoId = "fdd_v1"

        // const chmCalcConfig = await calcConfig.loadChillerHealthMeterCalc()

        const esCalcConfig = await calcConfig.loadEnergySavingCalc()

        const costPerKW = esCalcConfig.costPerKW.value

        const deviceStatusIeeeList = await aimgmtdb.getDeviceStatusIeeeList(siteId)

        // const deviceStatusCountQuery = `SELECT ieee, count(*) as deviceOnCount
        // from (
        //     SELECT ts, ieee
        //     FROM iotmgmt.deviceStatus 
        //     where  (ts between '${startDate}' and '${endDate}') and device_status>0 and
        //     ieee in (${deviceStatusIeeeList[0][0].ieee})
        // ) t
        // group by ieee
        // order by ts desc`

        // Tempo
        // console.log("deviceStatusCountQuery: ", deviceStatusCountQuery)
        // const faultyTimeQuery = `
        // SET SESSION group_concat_max_len = 1024*1024;
        // SELECT 
        //     d.siteId,
        //     d.equipId,
        //     /*d.deviceTypeName as equipName,*/
        //     group_concat("'",dm.start_time,"'and'", dm.end_time, "'") as tss 
        // FROM aimgmt.device d 
        // LEFT JOIN aimgmt.detection_master dm on dm.equip_id=d.equipId and (dm.start_time between '${startDate}' and '${endDate}' or dm.end_time between '${startDate}' and '${endDate}') and dm.algo_id='${algoId}'
        // LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id 
        // where d.siteId='${siteId}' and d.deviceType in ('CH')
        // group by d.equipId;`
        const [
            // deviceStatusCount,
            // faultyTimeResults1,
            devicePowerParameterList,
            // deviceStatusParameterList,
            efficiencyParameterList,
        ] = await Promise.all([
            // mgmtdb.selectQuery(deviceStatusCountQuery),
            // aimgmtdb.selectQuery(faultyTimeQuery),
            aimgmtdb.getDeviceListForPower(siteId),
            // aimgmtdb.getDeviceListForDeviceStatus(siteId),
            aimgmtdb.getDeviceListForPlantEfficiency(siteId)
        ])

        // Tempo
        // const deviceStatusCountQueryResults = deviceStatusCount[0].map(d=>{
        //     const equip =deviceStatusParameterList[0].find(v=>v.ieee==d.ieee)
        //     return({...d,equipId:equip.equipId})
        // })

        // Tempo
        /*
        const queryTemplate = `
        SELECT 
            d.siteId,
            d.equipId,
            d.deviceTypeName as equipName,
            ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0)/60 as hours, 
            ifnull(sum(timestampdiff(minute, dm.start_time, dm.end_time)), 0) as minutes
        FROM aimgmt.device d 
        LEFT JOIN aimgmt.detection_master dm on dm.equip_id=d.equipId and (dm.start_time between '${startDate}' and '${startDate}' or dm.end_time between '${startDate}' and '${endDate}') and dm.algo_id='${algoId}'
        LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id 
        where d.siteId='${siteId}' and d.deviceType in ('CH')
        group by d.equipId;`

        const faultyTimeResults = [faultyTimeResults1[0][1]]

        const powerQuery = []
        for(const ft of faultyTimeResults[0]) {
            if(!ft.tss) continue;
            try {
                const dm = devicePowerParameterList[0].find(v => v.equipId==ft.equipId)
                const tss = ft.tss.split(",")
                // console.log("\n",JSON.stringify(tss))
                if(tss.length===0) continue; 
                const pq = tss.map(ts1 => {
                    // const q = `select '${dm.equipId}' as equipId, t2.${dm.columnName}-t1.${dm.columnName} as power from iotmgmt.${dm.tableName} t1, iotmgmt.${dm.tableName} t2 where (t1.ts between ${ts1[0]}) and (t2.ts between ${ts1[1]}) and t1.ieee='${dm.ieee}' and t2.ieee='${dm.ieee}' limit 1;`
                    // const q = `select '${dm.equipId}' as equipId, max(${dm.columnName})-min(${dm.columnName}) as power from iotmgmt.${dm.tableName} where (ts between ${ts1}) and ieee='${dm.ieee}'`
                    const q = `select max(${dm.columnName})-min(${dm.columnName}) as power from iotmgmt.${dm.tableName} where (ts between ${ts1}) and ieee='${dm.ieee}';`
                    return q;
                })
                powerQuery.push(...pq)
            } catch(error) {
                console.error(error)
            }
        }
        */

        // select COUNT(*) as totalCount, SUM(IF(dsCount>0 and (eff>0.75 OR eff<0.3), 1, 0)) as inefficientCount

        const efficiencyCountsQuery = await efficiencyParameterList[0].map(v => {
            if (v.ieee === null) return ``
            return `
            select t2.*, (inefficientCount/totalCount) as inefficientPercent
            from (
                select COUNT(*) as totalCount, SUM(IF(dsCount>0 and ${inefficientCondition}, 1, 0)) as inefficientCount
                FROM (
                    select cl.ts, cl.${v.columnName} as eff, count(ds.ts) as dsCount
                    FROM iotmgmt.${v.tableName} cl
                    LEFT JOIN iotmgmt.${deviceStatusIeeeList[0][0].tableName} ds on ds.${deviceStatusIeeeList[0][0].columnName} > 0 and ds.ts = cl.ts and ds.ieee in (${deviceStatusIeeeList[0][0].ieee})
                    WHERE
                        cl.ieee = '${v.ieee}'
                        and (cl.ts between '${startDate}' and '${endDate}')
                    GROUP by cl.ts
                ) t1
            ) t2
            `
            return `SELECT t.*, (inefficientCount/totalCount) as inefficientPercent from (
            SELECT COUNT(*) as totalCount, SUM(IF(${v.columnName}>0.75 OR ${v.columnName}<0.3, 1, 0)) as inefficientCount, '${v.equipId}' as equipId, '${v.deviceTypeName}' as equipName, '${v.deviceId}' as deviceId
            FROM iotmgmt.${v.tableName} 
            WHERE ieee='${v.ieee}' and ts between '${startDate}' and '${endDate}') t;
            `
        }).join("")
        // console.log(efficiencyCountsQuery,"efficiencyCountsQuery")

        const efficiencyCountsQueryResults = await mgmtdb.selectQuery(efficiencyCountsQuery)
        // console.log("efficiencyCountQueryResults: ", efficiencyCountsQueryResults[0])

        // console.log("devicePowerParameterList[0]: ", devicePowerParameterList[0])
        const powerIeees = devicePowerParameterList[0].map(v => v.ieee ? `'${v.ieee}'` : null).filter(v => v)
        const fpm = devicePowerParameterList[0].reduce((r, c) => r ? r : c, null) //firstPowerMap
        const totalPowerChillerQuery = `select ieee, max(${fpm.columnName})-min(${fpm.columnName}) as power 
        from iotmgmt.${fpm.tableName}
        where ieee in (${powerIeees}) and ts between '${startDate}' and '${endDate}'
        group by ieee`
        const totalPowerChiller1 = (await mgmtdb.selectQuery(totalPowerChillerQuery))
        // const totalPowerChiller = totalPowerChiller1[0].map(p => {
        //     const dm = devicePowerParameterList[0].find(v => v.ieee===p.ieee)
        //     const insufficient = efficiencyCountsQueryResults[0].find(v => v[0].equipId===dm.equipId)[0]
        //     const insufficientPower = parseFloat(insufficient.inefficientPercent) * parseFloat(p.power)
        //     // const inefficientDollar = insufficientPower * 0.2143
        //     return ({ equipId: dm.equipId, insufficientPower, inefficientPercent: parseFloat(insufficient.inefficientPercent), totalPower:parseFloat( p.power) })
        // })

        const totalPowerChiller = totalPowerChiller1[0].reduce((r, c) => r + c.power, 0)

        // const totalInefficientDollar = totalPowerChiller.reduce((r,c) => r+c.inefficientDollar, 0)
        // const totalChillerPower = totalPowerChiller1[0].reduce((r,c) => r+c.power, 0)
        // const totalChillerDollar = totalChillerPower * 0.2143
        // const percentDollarByInefficientDollar = totalChillerDollar / totalInefficientDollar 

        // console.log({
        //     totalChillerPower,
        //     totalChillerDollar,
        //     totalInefficientDollar, 
        //     percentDollarByInefficientDollar,
        //     detailChillerInefficientDollars : totalPowerChiller.map(v => ({ equipId: v.equipId, inefficientPercent: v.inefficientPercent, inefficientDollar: v.inefficientDollar }))
        // })

        // const totalInefficientPowerFiltered = totalPowerChiller.filter(v => v.inefficientPercent>0.05)
        // console.log("totalInefficientPowerFiltered: ", totalInefficientPowerFiltered)
        // const totalInsufficientPower = totalInefficientPowerFiltered.reduce((r,c) => r+c.insufficientPower, 0)
        // const totalInefficientPerent = totalInefficientPowerFiltered.reduce((r,c) => r+c.inefficientPercent, 0) / totalInefficientPowerFiltered.length

        // console.log("totalPowerChiller: ", totalPowerChiller, efficiencyCountsQueryResults[0][0])

        const totalInefficientPerent = efficiencyCountsQueryResults[0][0].inefficientPercent
        const totalInsufficientPower = totalPowerChiller * efficiencyCountsQueryResults[0][0].inefficientPercent;
        const inefficientMinutes = efficiencyCountsQueryResults[0][0].inefficientCount
        // return console.log("inefficientMinutes: ", inefficientMinutes)

        // console.log("\nInefficientPercentage: ", totalInefficientPerent, "\ntotalInefficientPower: ", totalInsufficientPower, "\ntotalInefficientCost: ", totalInsufficientPower*0.2143 )

        // console.log("powerQuery: ", JSON.stringify(powerQuery))

        // const fem = efficiencyParameterList[0].reduce((r,c) => r ? r : c, null) //firstEfficiencyMap
        // const efficiencyIees = efficiencyParameterList[0].map(v => v.ieee ? `'${v.ieee}'` : null ).filter(v => v)
        // console.log("efficiencyIees: ", efficiencyIees, powerIeees)

        // const efficiencyBasedSavingPowerQuery = `
        //     select sum(aimgmt.${fpm.tableName}.${fpm.columnName}) 
        //     from aimgmt.${fem.tableName}
        //     left join aimgmt.${fpm.tableName} on 
        //         aimgmt.${fpm.tableName}.ieee in (${powerIeees}) and 
        //         (date_format(aimgmt.${fpm.tableName}.ts, '%Y-%m-%d %H:%i:00') = date_format(aimgmt.${fem.tableName}.ts, '%Y-%m-%d %H:%i:00') )
        //     where aimgmt.${fem.tableName}.ieee in (${efficiencyIees.join(",")}) aimgmt.${fem.tableName}.${fem.columnName} > 0.7 
        // `
        // console.log("efficiencyBasedSavingPowerQuery: ", efficiencyBasedSavingPowerQuery)

        // Tempo
        // const [
        //     faultyOperationHourResults1,
        //     powerQueryResults
        // ] = await Promise.all([
        //     mgmtdb.selectQuery(queryTemplate),
        //     aimgmtdb.selectQuery(powerQuery.join(""))
        // ])

        // tempo
        // const faultyOperationHourResults = faultyOperationHourResults1[0].map(v => {
        //     let rh = deviceStatusCountQueryResults.find(vv => vv.equipId == v.equipId)
        //     if (!rh) {
        //         console.log("default :: ", v.equipId)
        //         rh = { deviceOnCount: periodDays * 24 * 60 }
        //     }
        //     const faultyPercent = (v.minutes / parseInt(rh.deviceOnCount)) * 100
        //     return ({ ...v, faultyPercent, rh: parseInt(rh.deviceOnCount) })
        // })
        // console.log("faultyOperationHourResults: ", faultyOperationHourResults)
        //const faultyOperationPercent = faultyOperationHourResults.reduce((r,c)=> r+c.faultyPercent, 0)/faultyOperationHourResults.length


        // console.log("powerQueryResults[0]: ", powerQueryResults[0].map(v => v[0].power))
        // tempo
        // const totalPowerSaved = powerQueryResults[0].map(v => v[0].power).reduce((r,c) => r+parseFloat(c), 0)
        const totalAmountSaved = totalInsufficientPower * costPerKW / 100 //(totalPowerSaved * costPerKW)/100

        // console.log("\nfaultyOperationPercent: ", faultyOperationPercent)
        // console.log("totalPowerSaved: ", totalPowerSaved)
        // console.log("totalAmountSaved: ", totalAmountSaved)

        const savingResponse = {
            dateUnit: dateUnit,
            currency: "$",
            costPerKW,
            faultyPercent: (totalInefficientPerent * 100).toFixed(), //faultyOperationPercent.toFixed(1)*1,
            totalPowerSaved: Math.round(totalInsufficientPower),
            totalAmountSaved1: Math.round(totalAmountSaved),
            totalAmountSaved5: Math.round(totalAmountSaved * 3),
            totalAmountSaved15: Math.round(totalAmountSaved * 5),
            inefficientMinutes,
            inefficientDefText,
            inefficientDefId: siteInefficientDef.id,
            success: true,
            totalPowerChiller
        }
        // To develop 
        // goal : if not exist INSERT, if already existed UPDATE

        if (dateUnit === "Year") {
            const insertQuery = `delete from yearly_savings where years=${currentYear};
            insert into yearly_savings(years, costPerKW, currency, faultyPercent, totalPowerSaved, totalAmountSaved1, inefficientMinutes, updatedTs)
            values (${currentYear}, ${savingResponse.costPerKW}, '${savingResponse.currency}', ${savingResponse.faultyPercent}, ${savingResponse.totalPowerSaved}, ${savingResponse.totalAmountSaved1}, ${inefficientMinutes}, utc_timestamp())`
            aimgmtdb.selectQuery(insertQuery)
        } else if (dateUnit === "Month") {
            const insertQuery = `delete from monthly_savings where years=${currentYear} and months='${currentMonth}';
            insert into monthly_savings(years, months, costPerKW, currency, faultyPercent, totalPowerSaved, totalAmountSaved1, inefficientMinutes, updatedTs)
            values (${currentYear}, '${currentMonth}', ${savingResponse.costPerKW}, '${savingResponse.currency}', ${savingResponse.faultyPercent}, ${savingResponse.totalPowerSaved}, ${savingResponse.totalAmountSaved1}, ${inefficientMinutes}, utc_timestamp())`
            aimgmtdb.selectQuery(insertQuery)
        }

        return ({ ...savingResponse, faultyPercent: Math.round(savingResponse.faultyPercent * 0.3) })

    } catch (error) {
        console.error(error)
        const savingResponse = {
            costPerKW: -1,
            faultyOperationPercent: -1,
            totalPowerSaved: -1,
            totalAmountSaved1: -1,
            totalAmountSaved5: -1,
            totalAmountSaved15: -1,
            inefficientDefText,
            inefficientDefId: siteInefficientDef.id,
            inefficientMinutes,
            success: false
        }
        return savingResponse
    }

}

module.exports.getEnergySavingsNewLogic = async ({ siteId = "cl_tao", period = "year", toInsert = false, dateForMonth = null }) => { // period=year|month
    try {
        // const periodDays = 30
        const currentDate = dateForMonth ? new Date(dateForMonth) : kumoDate.Date()
        const currentYear = dateFns.format(currentDate, "yyyy")
        const currentMonth = dateFns.format(currentDate, "MMM").toLocaleLowerCase()
        const dateUnit = period === "year" ? "Year" : "Month"
        const inefficientDefinition = await this.getInefficientDefinition({ siteId, enabled: 1 })

        const siteInefficientDef = inefficientDefinition.find(v => !v.param)
        let inefficientCondition = ""
        let inefficientDefText = ""
        switch (siteInefficientDef.operator) {
            case "gt":
                inefficientCondition = "eff>" + siteInefficientDef.value;
                inefficientDefText = "E > " + siteInefficientDef.value;
                break;
            case "lt":
                inefficientCondition = "eff<" + siteInefficientDef.value;
                inefficientDefText = "E < " + siteInefficientDef.value;
                break;
            case "bt":
                inefficientCondition = "eff>=" + siteInefficientDef.value1 + " and eff<=" + siteInefficientDef.value2;
                inefficientDefText = "E  > " + siteInefficientDef.value1 + " & E < " + siteInefficientDef.value2;
                break;
            case "nbt":
                inefficientCondition = "eff<" + siteInefficientDef.value1 + " and eff>" + siteInefficientDef.value2;
                inefficientDefText = "E  < " + siteInefficientDef.value1 + " & E > " + siteInefficientDef.value2;
                break;
            default:
                inefficientCondition = "false";
                inefficientDefText = "No Logic found!"
        }

        const esCalcConfig = await calcConfig.loadEnergySavingCalc()

        const costPerKW = esCalcConfig.costPerKW.value

        // console.log("siteInefficientDef: ", siteInefficientDef)
        if (!toInsert) {
            if (dateUnit === "Year") {
                const data = (await aimgmtdb.selectQuery(`select * from aimgmt.yearly_savings where years=${currentYear} limit 1`))[0][0]
                const savingResponse = {
                    year: data.years,
                    dateUnit: dateUnit,
                    currency: data.currency,
                    costPerKW: data.costPerKW,
                    faultyPercent: Math.round(data.faultyPercent * 0.3), //faultyOperationPercent.toFixed(1)*1,
                    totalPowerSaved: data.totalPowerSaved,
                    totalAmountSaved1: Math.round(data.totalAmountSaved1),
                    totalAmountSaved5: Math.round(data.totalAmountSaved1 * 3),
                    totalAmountSaved15: Math.round(data.totalAmountSaved1 * 5),
                    updatedTs: data.updatedTs,
                    inefficientMinutes: data.inefficientMinutes,
                    inefficientDefText,
                    inefficientDefId: siteInefficientDef.id,
                    success: true,
                }
                return savingResponse
            }
            else if (dateUnit === "Month") {
                // const data = (await aimgmtdb.selectQuery(`select * from aimgmt.monthly_savings where years=${currentYear} and months='${dateForMonth ? currentMonth : 'oct'}' limit 1`))[0][0]
                const data = (await aimgmtdb.selectQuery(`select *, avg(faultyPercent) as faultyPercent, avg(totalAmountSaved1) as totalAmountSaved1  from aimgmt.monthly_savings where years=${currentYear} limit 1`))[0][0]
                const savingResponse = {
                    year: data.years,
                    month: data.months,
                    dateUnit: dateUnit,
                    currency: data.currency,
                    costPerKW: data.costPerKW,
                    faultyPercent: Math.round(data.faultyPercent * 0.3), //faultyOperationPercent.toFixed(1)*1,
                    totalPowerSaved: data.totalPowerSaved,
                    totalAmountSaved1: Math.round(data.totalAmountSaved1),
                    totalAmountSaved5: Math.round(data.totalAmountSaved1 * 3),
                    totalAmountSaved15: Math.round(data.totalAmountSaved1 * 5),
                    updatedTs: data.updatedTs,
                    inefficientMinutes: data.inefficientMinutes,
                    inefficientDefText,
                    inefficientDefId: siteInefficientDef.id,
                    success: true,
                }
                return savingResponse
            } else throw "Please provide valid period!"
        }

        const endDate = dateFns.format(dateFns.endOfMonth(currentDate), "yyyy-MM-dd HH:mm:ss")
        const startDate = period === "year" ? dateFns.format(dateFns.startOfYear(new Date(endDate)), "yyyy-MM-dd HH:mm:ss")
            : dateFns.format(dateFns.startOfMonth(currentDate), "yyyy-MM-dd 00:00:00")

        const query = `select t.*, 
            t.totalKW-totalCoolingLoad as inefficientKWH, 
            (t.totalKW-totalCoolingLoad) * 0.24 as totalCost, 
            (t.totalKW-totalCoolingLoad)/t.totalKW*100 as inefficientPercent
        from (
            select sum(kw)/60 as totalKW, sum(if(equip_id like 'CH%',cooling_load, 0))*${siteInefficientDef.value}/60 as totalCoolingLoad, sum(if(chw_flowrate<=0, 1, 0)) faultyMinutes
            from aimgmt.sensor_real_time 
            where (ts between '${startDate}' and '${endDate}') and start_stop>0 and site_id='${siteId}'
        )t;
        `
        console.log("query: ", query)

        const queryResult = (await aimgmtdb.selectQueryComplex(query))[0][0]

        console.log("queryResult: ", queryResult)

        const totalAmountSaved = queryResult.inefficientKWH * costPerKW / 100

        const savingResponse = {
            dateUnit: dateUnit,
            currency: "$",
            costPerKW,
            faultyPercent: (queryResult.inefficientPercent * 100).toFixed(), //faultyOperationPercent.toFixed(1)*1,
            totalPowerSaved: Math.round(queryResult.inefficientKWH),
            totalAmountSaved1: Math.round(totalAmountSaved),
            totalAmountSaved5: Math.round(totalAmountSaved * 3),
            totalAmountSaved15: Math.round(totalAmountSaved * 5),
            inefficientMinutes: queryResult.faultyMinutes,
            inefficientDefText,
            inefficientDefId: siteInefficientDef.id,
            success: true,
            totalPowerChiller: queryResult.totalKW
        }
        return console.log("savingReponse: ", savingResponse)

        if (dateUnit === "Year") {
            const insertQuery = `delete from yearly_savings where years=${currentYear};
            insert into yearly_savings(years, costPerKW, currency, faultyPercent, totalPowerSaved, totalAmountSaved1, inefficientMinutes, updatedTs)
            values (${currentYear}, ${savingResponse.costPerKW}, '${savingResponse.currency}', ${savingResponse.faultyPercent}, ${savingResponse.totalPowerSaved}, ${savingResponse.totalAmountSaved1}, ${inefficientMinutes}, utc_timestamp())`
            aimgmtdb.selectQuery(insertQuery)
        } else if (dateUnit === "Month") {
            const insertQuery = `delete from monthly_savings where years=${currentYear} and months='${currentMonth}';
            insert into monthly_savings(years, months, costPerKW, currency, faultyPercent, totalPowerSaved, totalAmountSaved1, inefficientMinutes, updatedTs)
            values (${currentYear}, '${currentMonth}', ${savingResponse.costPerKW}, '${savingResponse.currency}', ${savingResponse.faultyPercent}, ${savingResponse.totalPowerSaved}, ${savingResponse.totalAmountSaved1}, ${inefficientMinutes}, utc_timestamp())`
            aimgmtdb.selectQuery(insertQuery)
        }

        return savingResponse

        // return ({ ...savingResponse, faultyPercent: Math.round(savingResponse.faultyPercent * 0.3) })

    } catch (error) {
        console.error(error)
        const savingResponse = {
            costPerKW: -1,
            faultyOperationPercent: -1,
            totalPowerSaved: -1,
            totalAmountSaved1: -1,
            totalAmountSaved5: -1,
            totalAmountSaved15: -1,
            inefficientDefText,
            inefficientDefId: siteInefficientDef.id,
            inefficientMinutes,
            success: false
        }
        return savingResponse
    }

}

module.exports.getEnergySavings = async ({ siteId = "cl_pb", period = "year", toInsert = false, dateForMonth = null }) => { // period=year|month
    try {
        // const periodDays = 30
        const currentDate = dateForMonth ? new Date(dateForMonth) : kumoDate.Date()
        const currentYear = dateFns.format(currentDate, "yyyy")
        const currentMonth = dateFns.format(currentDate, "MMM").toLocaleLowerCase()
        const dateUnit = period === "year" ? "Year" : "Month"
        const inefficientDefinition = await this.getInefficientDefinition({ siteId, enabled: 1 })
        const siteInefficientDef = inefficientDefinition.find(v => !v.param)
        let inefficientCondition = ""
        let inefficientDefText = ""

        // console.log(currentDate,currentYear,dateUnit,siteInefficientDef)

        switch (siteInefficientDef.operator) {
            case "eq":
                inefficientCondition = "eff=" + siteInefficientDef.value;
                inefficientDefText = "E = " + siteInefficientDef.value;
                break;
            case "gt":
                inefficientCondition = "eff>" + siteInefficientDef.value;
                inefficientDefText = "E > " + siteInefficientDef.value;
                break;
            case "lt":
                inefficientCondition = "eff<" + siteInefficientDef.value;
                inefficientDefText = "E < " + siteInefficientDef.value;
                break;
            case "bt":
                inefficientCondition = "eff>=" + siteInefficientDef.value1 + " and eff<=" + siteInefficientDef.value2;
                inefficientDefText = "E  > " + siteInefficientDef.value1 + " & E < " + siteInefficientDef.value2;
                break;
            case "nbt":
                inefficientCondition = "eff<" + siteInefficientDef.value1 + " and eff>" + siteInefficientDef.value2;
                inefficientDefText = "E  < " + siteInefficientDef.value1 + " & E > " + siteInefficientDef.value2;
                break;
            default:
                inefficientCondition = "false";
                inefficientDefText = "No Logic found!"
        }

        const esCalcConfig = await calcConfig.loadEnergySavingCalc()

        const costPerKW = esCalcConfig.costPerKW.value

        // console.log("siteInefficientDef: ", siteInefficientDef)
        if (!toInsert) {
            if (dateUnit === "Year") {
                const data = (await aimgmtdb.selectQuery(`select * from aimgmt.yearly_savings where years=${currentYear} limit 1`))[0][0]
                const savingResponse = {
                    year: data.years,
                    dateUnit: dateUnit,
                    currency: data.currency,
                    costPerKW: data.costPerKW,
                    faultyPercent: Math.round(data.faultyPercent), //faultyOperationPercent.toFixed(1)*1,
                    totalPowerSaved: data.totalPowerSaved,
                    totalAmountSaved1: Math.round(data.totalAmountSaved1),
                    totalAmountSaved5: Math.round(data.totalAmountSaved1 * 3),
                    totalAmountSaved15: Math.round(data.totalAmountSaved1 * 5),
                    updatedTs: data.updatedTs,
                    inefficientMinutes: data.inefficientMinutes,
                    inefficientDefText,
                    inefficientDefId: siteInefficientDef.id,
                    success: true,
                }
                // console.log("SavingResponse : ", savingResponse)
                return savingResponse
            }
            else if (dateUnit === "Month") {
                // const data = (await aimgmtdb.selectQuery(`select * from aimgmt.monthly_savings where years=${currentYear} and months='${dateForMonth ? currentMonth : 'oct'}' limit 1`))[0][0]
                // const data = (await aimgmtdb.selectQuery(`select *, avg(faultyPercent) as faultyPercent, avg(totalAmountSaved1) as totalAmountSaved1  from aimgmt.monthly_savings where years=${currentYear} limit 1`))[0][0]
                const data = (await aimgmtdb.selectQuery(`
                    select t.years, t.costPerKW, t.currency, avg(t.faultyPercent) as faultyPercent, avg(t.totalPowerSaved) as totalPowerSaved, avg(t.totalAmountSaved1) as totalAmountSaved1, t1.inefficientMinutes as inefficientMinutes
                    from aimgmt.monthly_savings t
                    left join aimgmt.monthly_savings as t1 on t1.months='${/*currentMonth*/'oct'}' and t.years=t1.years
                    where t.years=${currentYear} limit 1;
                `))[0][0];
                const savingResponse = {
                    year: data.years,
                    month: data.months,
                    dateUnit: dateUnit,
                    currency: data.currency,
                    costPerKW: data.costPerKW,
                    faultyPercent: Math.round(data.faultyPercent), //faultyOperationPercent.toFixed(1)*1,
                    totalPowerSaved: data.totalPowerSaved,
                    totalAmountSaved1: Math.round(data.totalAmountSaved1),
                    totalAmountSaved5: Math.round(data.totalAmountSaved1 * 3),
                    totalAmountSaved15: Math.round(data.totalAmountSaved1 * 5),
                    updatedTs: data.updatedTs,
                    inefficientMinutes: data.inefficientMinutes,
                    inefficientDefText,
                    inefficientDefId: siteInefficientDef.id,
                    success: true,
                }
                return savingResponse
            } else throw "Please provide valid period!"
        }

        const plantEfficiencyQuery = `select dm.ieee from aimgmt.device d
            left join aimgmt.device_mapping dm on d.id=dm.deviceId
            where d.siteId = '${siteId}' and d.deviceTypeName like '%Plant%' and dm.dataType='plant_efficiency'
            limit 1`
        const plantEfficiencyQueryResult = (await aimgmtdb.selectQueryComplex(plantEfficiencyQuery))[0]

        const plantEfficiency = plantEfficiencyQueryResult.length > 0 ? plantEfficiencyQueryResult[0].ieee : null

        const endDate = dateFns.format(dateFns.endOfMonth(currentDate), "yyyy-MM-dd HH:mm:ss")
        const startDate = period === "year" ? dateFns.format(dateFns.startOfYear(new Date(endDate)), "yyyy-MM-dd HH:mm:ss")
            : dateFns.format(dateFns.startOfMonth(currentDate), "yyyy-MM-dd 00:00:00")

        // const newEnergySavingQuery = `select t1.totalCoolingLoadCalc / t2.totalkW * 100 as inefficientPercent, t1.totalCoolingLoadCalc as inefficientKWH, t2.totalKW as totalKW
        // from (select
        //     sum(if(rt.equip_id like 'CH%', (rt.cooling_load * ef.eff / 60) - (rt.cooling_load * ${siteInefficientDef.value} / 60)  , 0)) as totalCoolingLoadCalc 
        // from aimgmt.sensor_real_time rt
        // left join iotmgmt.efficiency ef on ef.ieee = '${plantEfficiency}' and ef.ts=rt.ts
        // where (rt.ts between '${startDate}' and '${endDate}') and rt.start_stop>0 and rt.cooling_load>0 
        // and rt.site_id='${siteId}' and rt.kw>0 and ef.eff>${siteInefficientDef.value}) t1, 
        // (select sum(kw)/60 as totalKW
        //     from aimgmt.sensor_real_time 
        // where (ts between '${startDate}' and '${endDate}') and site_id='${siteId}') t2;`

        // select t1.totalCoolingLoadCalc / t2.totalkW * 100 as inefficientPercent, t1.totalCoolingLoadCalc as inefficientKWH, t2.totalKW as totalKW
        // from ( select sum(if(rt.equip_id like 'CH%', (ef.coolingCapacity * ef.efficiency / 60) - (ef.coolingCapacity * 2 / 60)  , 0)) as totalCoolingLoadCalc
        // from aimgmt.sensor_real_time rt left join dataPlatform.chillerEfficiency ef on  ef.ts=rt.ts where (rt.ts between '${startDate}' and '${endDate}') and  ef.coolingCapacity>0
        // and rt.site_id='${siteId}' and rt.kw>10 and ef.efficiency>${siteInefficientDef.value} AND rt.equip_id in ('CH1','CH2','CH3','CH4') and ef.siteId=${dpSitePb}
        // ) t1, (select sum(kw)/60 as totalKW from aimgmt.sensor_real_time where (ts  between '${startDate}' and '${endDate}') and site_id='${siteId}' AND equip_id in ('CH1','CH2','CH3','CH4')) t2;
        
        //HK_CHANGES
        const dpSitePb = 10;
        const newEnergySavingQuery = `
        select t1.totalCoolingLoadCalc / t2.totalkW * 100 as inefficientPercent, t1.totalCoolingLoadCalc as inefficientKWH, t2.totalKW as totalKW
        from (select sum( (coolingCapacity * efficiency / 60) - (coolingCapacity * 2 / 60)) as totalCoolingLoadCalc from (
        select sum(ef.coolingCapacity) coolingCapacity,sum(ef.efficiency) efficiency from aimgmt.sensor_real_time rt left join dataPlatform.chillerEfficiency ef on  ef.ts=rt.ts where
        (rt.ts between '${startDate}' and '${endDate}') and  ef.coolingCapacity>0
        and rt.site_id='${siteId}' and rt.kw>10 and ef.efficiency>${siteInefficientDef.value} AND  rt.equip_id in ('CH1','CH2','CH3','CH4') and ef.siteId=${dpSitePb}
        ) as t2) t1, (select sum(kw)/60 as totalKW from aimgmt.sensor_real_time where (ts between '${startDate}' and '${endDate}') and site_id='${siteId}' AND equip_id in ('CH1','CH2','CH3','CH4')) t2;
       
        `


        // const inefficientMinuteQuery = `select count(*) as inefficientMinute
        // from (select ts from sensor_real_time 
        // where 
        //     (ts between '${startDate}' and '${endDate}') and
        //     site_id='${siteId}' and start_stop>0 and kw>0 and efficiency>${siteInefficientDef.value} and equip_id like 'CH%'
        // group by ts) t;`

        // console.log(newEnergySavingQuery)
        //HK_CHANGES
        const inefficientMinuteQuery = ` select count(*) as inefficientMinute from (select ts from dataPlatform.chillerEfficiency
        where  (ts between '${startDate}' and '${endDate}') and watt>10  and efficiency>2 and siteId=${dpSitePb} group by ts) t;`

        console.log(inefficientMinuteQuery)

        const queryResult = (await aimgmtdb.selectQueryComplex(newEnergySavingQuery + inefficientMinuteQuery))[0]
        const energySavingQueryResult = queryResult[0][0]
        const inefficientQueryResult = queryResult[1][0]

        if (!energySavingQueryResult || !inefficientQueryResult) {
            console.log("Result null => ", {
                energySavingQueryResult, inefficientQueryResult
            })
            if (dateUnit === "Year") {
                const insertQuery = `delete from yearly_savings where years=${currentYear};`
                aimgmtdb.selectQuery(insertQuery)
            } else if (dateUnit === "Month") {
                const insertQuery = `delete from monthly_savings where years=${currentYear} and months='${currentMonth}';`
                aimgmtdb.selectQuery(insertQuery)
            }
            return null
        }

        // console.log("newEnergySavingQuery: ", newEnergySavingQuery)
        console.log("energySavingQueryResult: ", energySavingQueryResult, inefficientQueryResult)

        const totalAmountSaved = energySavingQueryResult.inefficientKWH * costPerKW / 100

        const savingResponse = {
            dateUnit: dateUnit,
            currency: "$",
            costPerKW,
            faultyPercent: Math.round(energySavingQueryResult.inefficientPercent), //faultyOperationPercent.toFixed(1)*1,
            totalPowerSaved: Math.round(energySavingQueryResult.inefficientKWH),
            totalAmountSaved1: Math.round(totalAmountSaved),
            totalAmountSaved5: Math.round(totalAmountSaved * 3),
            totalAmountSaved15: Math.round(totalAmountSaved * 5),
            inefficientMinutes: inefficientQueryResult.inefficientMinute,
            inefficientDefText,
            inefficientDefId: siteInefficientDef.id,
            success: true,
            totalPowerChiller: energySavingQueryResult.totalKW
        }
        // return console.log("savingReponse: ", savingResponse)

        if (dateUnit === "Year") {
            const insertQuery = `delete from yearly_savings where years=${currentYear};
            insert into yearly_savings(years, costPerKW, currency, faultyPercent, totalPowerSaved, totalAmountSaved1, inefficientMinutes, updatedTs)
            values (${currentYear}, ${savingResponse.costPerKW}, '${savingResponse.currency}', ${savingResponse.faultyPercent}, ${savingResponse.totalPowerSaved}, ${savingResponse.totalAmountSaved1}, ${savingResponse.inefficientMinutes}, utc_timestamp())`
            aimgmtdb.selectQuery(insertQuery)
        } else if (dateUnit === "Month") {
            const insertQuery = `delete from monthly_savings where years=${currentYear} and months='${currentMonth}';
            insert into monthly_savings(years, months, costPerKW, currency, faultyPercent, totalPowerSaved, totalAmountSaved1, inefficientMinutes, updatedTs)
            values (${currentYear}, '${currentMonth}', ${savingResponse.costPerKW}, '${savingResponse.currency}', ${savingResponse.faultyPercent}, ${savingResponse.totalPowerSaved}, ${savingResponse.totalAmountSaved1}, ${savingResponse.inefficientMinutes}, utc_timestamp())`
            aimgmtdb.selectQuery(insertQuery)
        }

        return savingResponse
        // return ({ ...savingResponse, faultyPercent: Math.round(savingResponse.faultyPercent * 0.3) })
    } catch (error) {
        console.error(error)
        const savingResponse = {
            costPerKW: -1,
            faultyOperationPercent: -1,
            totalPowerSaved: -1,
            totalAmountSaved1: -1,
            totalAmountSaved5: -1,
            totalAmountSaved15: -1,
            inefficientDefText: '',
            inefficientDefId: null,//siteInefficientDef.id,
            inefficientMinutes: null,
            success: false
        }
        return savingResponse
    }

}

module.exports.getInefficientDefinition = async ({ siteId, enabled }) => {
    try {
        const query = `select * from aimgmt.cal_config where key1 = 'calm' and key2='inefficient_threshold' and site_id='${siteId}' ${enabled ? `and enabled=${enabled}` : ''}`
        console.log("energy savin def ", query)
        const results = (await aimgmtdb.selectQuery(query))[0]
        return results
    }
    catch (error) {
        throw error
    }
}

module.exports.getEfficiencyForecast = async ({ siteId, startDate, endDate, equipId = 'HD1', key }) => {
    try {
        const equipmentIdList = (await aimgmtdb.getEfficiencyForecast(siteId, startDate, endDate, equipId, key))[0]
        // console.log("equipmentIdList: ", equipmentIdList[0])
        const rawLength = equipmentIdList.length

        const responseData = [
            { data: [], dataType: key + "_upper_lower", equipId: equipId, },
            { data: [], dataType: key, equipId: equipId, },
            { data: [], dataType: key + "_pred", equipId: equipId, },
        ]

        // if(key==="health") {
        // console.log("Here ", equipId, key)
        let predictTimePre = null
        for (let i = 0; i < rawLength; i++) {
            const d = equipmentIdList[i]
            if (d[key + "_lower"] > 0)
                responseData[0].data.push({ ts: d.time, value: d[key + "_lower"] > 0 ? d[key + "_lower"] : null, value1: d[key + "_upper"] > 0 ? d[key + "_upper"] : null, range: 1 })
            if (d[key] > 0)
                responseData[1].data.push({ ts: d.time, value: d[key] > 0 ? d[key] : null })
            if (d[key + "_pred"] > 0)
                responseData[2].data.push({ ts: d.time, value: d[key + "_pred"] > 0 ? d[key + "_pred"] : null })
        }
        // console.log(JSON.stringify(responseData, null, 2))
        return { predictTime: dateFns.getUnixTime(new Date("2020-10-22 00:00:00")) * 1000, responseData }
        // }
        console.log("NOT  ->  ", equipId, key)
        const dataCollected = []

        const todayDate = dateFns.endOfDay(new Date())
        // return console.log("todayDate ", todayDate)

        let monthNo = new Date(startDate).getMonth();
        const year = new Date().getFullYear()
        while (monthNo < 12) {
            let weekNo = 0;
            let dayNo = 1;
            let sDate = new Date(year, monthNo, dayNo, 0, 0, 0, 0)
            // console.log(new Date(sDate - sDate.getTimezoneOffset() * 60 * 1000))
            let eDate = sDate
            while (dayNo > 0 && dateFns.isBefore(sDate, todayDate)) {
                if (dateFns.format(new Date(year, monthNo, dayNo + 14, 0, 0, 0, 0), "M") - 1 === monthNo) {
                    dayNo += 7;
                    eDate = new Date(year, monthNo, dayNo, 0, 0, 0, 0)
                } else {
                    eDate = dateFns.lastDayOfMonth(new Date(year, monthNo, 1, 0, 0, 0, 0))
                    dayNo = 0;
                }
                weekNo++;
                // const startDate = dateFns.format(new Date(sDate.valueOf() - sDate.getTimezoneOffset() * 60 * 1000), "yyyy-MM-dd")
                // const endDate = dateFns.format(new Date(eDate.valueOf() - eDate.getTimezoneOffset() * 60 * 1000), "yyyy-MM-dd")
                const startDate = new Date(sDate.valueOf() - sDate.getTimezoneOffset() * 60 * 1000)
                const endDate = new Date(eDate.valueOf() - eDate.getTimezoneOffset() * 60 * 1000)

                const tmpDataLower = []
                const tmpDataUpper = []
                const tmpDataPred = []
                const tmpData = []
                for (let i = 0; i < rawLength; i++) {
                    const tmpD = equipmentIdList[i]
                    if (dateFns.isWithinInterval(new Date(tmpD.ts), { start: startDate, end: endDate })) {
                        if (tmpD[key + "_lower"] > 0)
                            tmpDataLower.push(tmpD[key + "_lower"])
                        if (tmpD[key + "_upper"] > 0)
                            tmpDataUpper.push(tmpD[key + "_upper"])
                        if (tmpD[key + "_pred"] > 0)
                            tmpDataPred.push(tmpD[key + "_pred"])
                        if (tmpD[key] > 0)
                            tmpData.push(tmpD[key])
                    }
                }
                const weekData = {
                    [key]: tmpData.reduce((r, c) => r + c, 0) / (tmpData.length > 0 ? tmpData.length : 1),
                    [key + "_lower"]: tmpDataLower.reduce((r, c) => r + c, 0) / (tmpDataLower.length > 0 ? tmpDataLower.length : 1),
                    [key + "_upper"]: tmpDataUpper.reduce((r, c) => r + c, 0) / (tmpDataUpper.length ? tmpDataUpper.length : 1),
                    [key + "_pred"]: tmpDataPred.reduce((r, c) => r + c, 0) / (tmpDataPred.length ? tmpDataPred.length : 1),
                    // eff_lower: tmpDataEffLower.reduce((r,c)=> c<r ? c : r, 10000),
                    // eff_upper: tmpDataEffUpper.reduce((r,c)=> c>r ? c : r, -10000),
                    time: endDate.getTime()
                }
                // console.log("weekData: ", weekData)
                dataCollected.push(weekData)
                // console.log(">> \n", monthNo , ", ", weekNo, " :::: ", startDate, " - ", endDate, "    ")
                // console.log(JSON.stringify(weekData, null, 2))

                sDate = eDate
            }
            monthNo++
        }

        const dataLength = dataCollected.length
        for (let i = 0; i < dataLength; i++) {
            const d = dataCollected[i]
            responseData[0].data.push({ ts: d.time, value: d[key + "_lower"] > 0 ? d[key + "_lower"] : null, value1: d[key + "_upper"] > 0 ? d[key + "_upper"] : null, range: 1 })
            responseData[1].data.push({ ts: d.time, value: d[key] > 0 ? d[key] : null })
            responseData[2].data.push({ ts: d.time, value: d[key + "_pred"] > 0 ? d[key + "_pred"] : null })
        }

        // console.log(JSON.stringify(responseData, null, 2))
        return responseData
    } catch (error) {
        console.error(error)
        return []
    }
}

module.exports.getInefficientDefinition = async ({ siteId, enabled }) => {
    try {
        const query = `select * from aimgmt.cal_config where key1 = 'calm' and key2='inefficient_threshold' 
        and site_id='${siteId}' ${enabled ? `and enabled=${enabled}` : ''}`
        const results = (await aimgmtdb.getInefficientDefinition(query))[0]
        // console.log("results: ", results)
        return results
    }
    catch (error) {
        throw error
    }
}

module.exports.updateInefficientDefinition = async ({ id, parm, operator, value = null, value1 = null, value2 = null, result1, result2, priority, enabled = null }) => {
    try {
        const columns = []
        const data = []
        if (parm) {
            columns.push("parm")
            data.push(parm)
        }
        if (operator) {
            columns.push("operator")
            data.push(operator)
        }
        if (value !== null) {
            columns.push("value")
            data.push(value)
        }
        if (value1 !== null) {
            columns.push("value1")
            data.push(value1)
        }
        if (value2 !== null) {
            columns.push("value2")
            data.push(value2)
        }
        if (result1) {
            columns.push("result1")
            data.push(result1)
        }
        if (result2) {
            columns.push("result2")
            data.push(result2)
        }
        if (priority) {
            columns.push("priority")
            data.push(priority)
        }
        if (enabled !== null) {
            columns.push("enabled")
            data.push(enabled)
        }

        const condition = `id=${id}`

        const results = (await aimgmtdb.updateInefficientDefinition({ tableName: "cal_config", columns, condition, data }))[0]
        return results
    }
    catch (error) {
        throw error
    }
}

module.exports.createInefficientDefinition = async ({ key1, key2, param, operator, value, value1, value2, result1, result2, priority, enabled = null, siteId }) => {
    try {
        const query = `insert into aimgmt.cal_config(key1,key2,param,operator,value,value1,value2,result1,result2,priority, enabled,site_id)
        values('${key1}','${key2}','${param}', '${operator}', ${value}, ${value1}, ${value2}, '${result1}', '${result2}', ${priority}, ${enabled}, '${siteId}')`
        const results = (await aimgmtdb.getInefficientDefinition(query))[0]
        return results
    }
    catch (error) {
        throw error
    }
}

module.exports.calculateSensorFaultyMessage = async ({ siteId = 'cl_tao' }) => {
    try {
        const dataToInsert = []
        const loadConfigQuery = `SELECT param as equipId, value1 as cond, value2 as parameter, result1 as text FROM aimgmt.cal_config where key1='calm' and key2='sensor_faulty_message' and site_id='${siteId}' and enabled=1;`
        const loadConfigQueryResults = (await aimgmtdb.selectQueryComplex(loadConfigQuery))[0]

        for (let i = 0; i < loadConfigQueryResults.length; i++) {
            const config = loadConfigQueryResults[i]
            const equipId = config.equipId
            const faultyQuery = `select equip_id, ts as ts, timestampdiff(DAY, ts, UTC_TIMESTAMP()) as dayDiff 
                from aimgmt.sensor_real_time where site_id='${siteId}' and equip_id='${equipId}' and ${config.cond} and year(ts) = year(now())
                order by ts desc
                limit 1;`
            const faultyQueryResults = (await aimgmtdb.selectQueryComplex(faultyQuery))[0]
            if (faultyQueryResults.length === 0) {
                faultyQueryResults.push({
                    dayDiff: dateFns.getDayOfYear(new Date()),
                    equip_id: equipId,
                })
            }
            if (faultyQueryResults[0].dayDiff > 0) {
                dataToInsert.push({
                    site_id: siteId,
                    equip_id: equipId,
                    parameter: config.parameter,
                    num_days: faultyQueryResults[0].dayDiff,
                    text: config.text.replace("@day", faultyQueryResults[0].dayDiff)
                })
            }
        }
        if (dataToInsert.length === 0) return 0;
        let insertQuery = `insert into aimgmt.sensor_faults(site_id, equip_id, parameter, num_days, text, updated_ts) values `
        insertQuery += dataToInsert.map(v => `('${v.site_id}', '${v.equip_id}', '${v.parameter}', ${v.num_days}, '${v.text}', utc_timestamp())`).join(",")
        // console.log("insertQuery: ", insertQuery)
        aimgmtdb.selectQueryComplex(insertQuery)
        return dataToInsert.length
    } catch (error) {
        throw error
    }
}

// Write important codes above
// The below lines are only for testing 

// this.getChillerHealthNew({ })

// this.chillerHealthMeter({})

// this.calculateTrendGraphDataCalm({ siteId: "cl_pb", year: 2021 })

// this.getTrendGraphDataCalm({ periodType: "month" })

// this.getChillerHealthInfo()

// this.calculateChillerHealth({})

const test = async () => {

    // await this.getEnergySavings({ toInsert: true, period: "year" })

    /*console.log(
        "this.getEnergySavings:: ", 
        await this.getEnergySavings({ toInsert: true, period:"year", dateForMonth:"2020-11-01" })
    )*/
    /*console.log(
         "this.getEnergySavings:: ", 
         await this.getEnergySavingsNewLogic({ toInsert: true, period:"year", dateForMonth:"2020-11-01" })
    )*/
    /*console.log(
        "this.getEnergySavings:: ", 
        await this.getEnergySavingsNewLogic2({ toInsert: true, period:"year", dateForMonth:"2020-11-01" })
    )*/
    /*console.log(
        "this.getEnergySavings:: ", 
        await this.getEnergySavingsNewLogic2({ toInsert: true, period:"month", dateForMonth:"2020-10-01" })
    )*/
    /* this.calculateSensorFaultyMessage({ siteId: "cl_tao" }) */
}
// test()