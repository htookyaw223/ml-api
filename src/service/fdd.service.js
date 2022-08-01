const aimgmtdb = require('../db/aimgmt.db')
const mgmtdb = require("../db/iotmgmt.db")
const dateFns = require('date-fns')
const kumoDate = require("../config/kumoDate.js")
const { compareSync } = require('bcrypt')


module.exports.getFaultDetections = async ({ detectId = null, startDate = null, endDate = null, dataType, page = 1, deviceId, rowPerPage = 10, siteId = "cl_tao", latestFirst = true, }) => {
    try {
        const fddRawDataCount = await aimgmtdb.getFDDdata({ siteId, deviceId, dataType, startDate, endDate, rowPerPage, latestFirst })
        let fddRawData = await aimgmtdb.getFDDdata({ siteId, deviceId, dataType, startDate, endDate, page, rowPerPage, latestFirst })

        let selectedPage = page
        let alreadyReviewed = false
        let start_time = null
        let end_time = null
        let pageCount = Math.ceil(fddRawDataCount[0].length / rowPerPage)
        const tableName = "eight_days_fdd"
        let fddData = await this.getFddResult(fddRawData[0])

        if (detectId) {
            const index = fddRawDataCount[0].findIndex(v => v.detectId == detectId)
            //if detectId is reviewed
            //console.log("index is",index)
            if (index == -1) {
                const tableName = "dtd_fdd"
                const checkReviewedResult = await aimgmtdb.checkReviewedResult(detectId, tableName)
                // if detectId have in dtd-fdd table
                if (checkReviewedResult[0].length > 0) {
                    alreadyReviewed = true
                    const sdate = dateFns.format(checkReviewedResult[0][0].start_time, "yyyy-MM-dd HH:mm:ss")
                    const selectedDate = await aimgmtdb.getCurrentEightDaysIntervalFdd(sdate)
                    const startDate = dateFns.format(selectedDate[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
                    const endDate = dateFns.format(selectedDate[0][0].endDate, "yyyy-MM-dd HH:mm:ss")
                    let page = selectedPage
                    const fddRawData = await aimgmtdb.getFDDdata({ siteId, deviceId, dataType, startDate, endDate, page, rowPerPage, latestFirst })
                    const fddData = await this.getFddResult(fddRawData[0])
                    return ({
                        pageCount: pageCount,
                        startDate: startDate,
                        endDate: endDate,
                        alreadyReviewed: alreadyReviewed,
                        selectedPage: selectedPage * 1,
                        data: fddData
                    })

                }
                //if detectId not have in dtd-fdd table
                else {
                    alreadyReviewed = true
                    let page = selectedPage
                    const sdate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
                    const currentInterval = await aimgmtdb.getCurrentEightDaysIntervalFdd(sdate)
                    const startDate = dateFns.format(currentInterval[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
                    const endDate = dateFns.format(currentInterval[0][0].endDate, "yyyy-MM-dd 23:59:59")
                    const fddRawData = await aimgmtdb.getFDDdata({ siteId, deviceId, dataType, startDate, endDate, page, rowPerPage, latestFirst })
                    const fddData = await this.getFddResult(fddRawData[0])
                    return ({
                        pageCount: pageCount,
                        startDate: startDate,
                        endDate: endDate,
                        alreadyReviewed: alreadyReviewed,
                        selectedPage: selectedPage * 1,
                        data: fddData
                    })
                }
            }
            //if  index >-1 detectId is not reviewed
            else {
                const sdate = dateFns.format(fddRawDataCount[0][index].startDate, "yyyy-MM-dd HH:mm:ss")
                const selectedDate = await aimgmtdb.getCurrentEightDaysIntervalFdd(sdate)
                const startDate = dateFns.format(selectedDate[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
                const endDate = dateFns.format(selectedDate[0][0].endDate, "yyyy-MM-dd HH:mm:ss")
                const fddRawDataCount1 = await aimgmtdb.getFDDdata({ siteId, deviceId, dataType, startDate, endDate, rowPerPage, latestFirst })
                const result1 = fddRawDataCount1[0].findIndex(v => v.detectId == detectId)
                selectedPage = Math.ceil((result1 + 1) / rowPerPage)
                let page = selectedPage
                const fddRawData = await aimgmtdb.getFDDdata({ siteId, deviceId, dataType, startDate, endDate, page, rowPerPage, latestFirst })
                const fddData = await this.getFddResult(fddRawData[0])
                pageCount = Math.ceil(fddRawDataCount1[0].length / rowPerPage)
                return ({
                    pageCount: pageCount,
                    startDate: startDate, endDate: endDate,
                    alreadyReviewed: alreadyReviewed,
                    selectedPage: selectedPage * 1,
                    data: fddData
                })
            }
        }

        // if startDate and endDate 
        else if (startDate && endDate) {
            return ({
                pageCount: pageCount,
                startDate: startDate, endDate: endDate,
                alreadyReviewed: alreadyReviewed,
                selectedPage: selectedPage * 1,
                data: fddData
            })

        }

        else if (fddRawDataCount[0].length == 0 || fddRawData[0].length == 0) {
            const sdate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
            const currentInterval = await aimgmtdb.getCurrentEightDaysIntervalFdd(sdate)
            start_time = dateFns.format(currentInterval[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
            end_time = dateFns.format(currentInterval[0][0].endDate, "yyyy-MM-dd HH:mm:ss")
            return ({
                pageCount: pageCount,
                startDate: start_time, endDate: end_time,
                alreadyReviewed: alreadyReviewed,
                selectedPage: selectedPage * 1, data: []
            })
        }

        // #combine_chiller_ml for ibpem
        // else {
        //     const sdate = dateFns.format(new Date(fddData[0].startDate), "yyyy-MM-dd HH:mm:ss")
        //     const edate = dateFns.format(new Date(fddData[fddData.length - 1].endDate), "yyyy-MM-dd HH:mm:ss")
        //     const selectedDate = await aimgmtdb.getStartAndEndDate(sdate, edate)
        //     start_time = dateFns.format(selectedDate[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
        //     end_time = dateFns.format(selectedDate[0][0].endDate, "yyyy-MM-dd HH:mm:ss")
        //     pageCount = Math.ceil(fddRawDataCount[0].length / rowPerPage)

        //     return ({
        //         pageCount: pageCount,
        //         startDate: start_time, endDate: end_time,
        //         alreadyReviewed: alreadyReviewed,
        //         selectedPage: selectedPage * 1, data: fddData
        //     })
        // }

        // #combine_chiller_ml for chiller
        else {
            console.log("hello")
            const sdate = dateFns.format(new Date(fddData[0].startDate), "yyyy-MM-dd")
            const edate = dateFns.format(new Date(fddData[fddData.length - 1].endDate), "yyyy-MM-dd")
            const selectedDate = await aimgmtdb.getStartAndEndDate(sdate, edate)
            // console.log("selectedDate[0]: ", selectedDate[0], fddData.length, sdate, edate)
            start_time = dateFns.format(selectedDate[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
            end_time = dateFns.format(selectedDate[0][0].endDate, "yyyy-MM-dd HH:mm:ss")
            let fddReturnData = fddRawDataCount[0].filter(f => {
                return (
                    (dateFns.isAfter(new Date(f.startDate), new Date(start_time))
                        || dateFns.isEqual(new Date(f.startDate), new Date(start_time))
                    )
                    && (dateFns.isBefore(new Date(f.endDate), new Date(end_time))
                        || dateFns.isEqual(new Date(f.endDate), new Date(end_time))
                    ))
            })
            // console.log(fddReturnData.length)
            pageCount = Math.ceil(fddReturnData.length / rowPerPage)

            return ({
                pageCount: pageCount,
                startDate: start_time, endDate: end_time,
                alreadyReviewed: alreadyReviewed,
                selectedPage: selectedPage * 1, data: fddData
            })
        }
    } catch (error) {
        console.error(error)
        throw error
    }
}


module.exports.getFddResult = (data) => {
    const fddData = data.map(v => ({
        ...v,
        id: v.detectId,
        siteId: v.siteId,
        deviceId: v.deviceId,
        dataType: v.dataType,
        startDate: dateFns.format(v.startDate, "yyyy-MM-dd HH:mm:ss"),
        endDate: dateFns.format(v.endDate, "yyyy-MM-dd HH:mm:ss"),
        createdTs: dateFns.format(Date.parse(v.createdTs), "yyyy-MM-dd HH:mm:ss"),
        user: v.userId,
        faultType: v.faultId ? [v.faultId] : [],
        severity: v.severityId ? [v.severityId] : [],
        // severity: v.severity_id ? [v.severity_id] : [],
        anomalyState: v.anomaly,
        deviceType: v.deviceType,
        comments: v.comments,
        impact: v.impact,
        situation: v.situation,
        recomm: v.recomm,
        building: "The Atrium @ Orchard",
        sensorSignal: [],
        additionalGraphs: [],
        remark: v.remark,
        deleted: false,
        previousRemark: [],
        dDifference: dateFns.differenceInMinutes(v.endDate, v.startDate),
        dStartDate: dateFns.format(dateFns.subMinutes(v.startDate, dateFns.differenceInMinutes(v.endDate, v.startDate) * 4), "yyy-MM-dd HH:mm:ss"),
        dEndDate: dateFns.format(dateFns.addMinutes(v.endDate, dateFns.differenceInMinutes(v.endDate, v.startDate) * 4), "yyyy-MM-dd HH:mm:ss")
    }))
        .map(v => ({
            ...v,
            labeledBy: v.username,
            label: [v.faultType, v.severity, []],
        }))


    return fddData
}


module.exports.acceptFaultDetection = async ({ detectionId, accept, userId, remark, newStartTs, newEndTs }) => {
    try {
        const fddRawData = await aimgmtdb.setAcceptFDD({ detectionId, accept, userId, remark, newStartTs, newEndTs })
        // save in Label Log 
        aimgmtdb.saveLabelLog({
            detectId: detectionId,
            updatedBy: userId,
            remark: remark,
            detectionType: 2,
            labelType: accept ? "accept" : "reject"
        })
        return fddRawData[0];
    }
    catch (error) {
        throw error
    }
}

module.exports.recoverFaultDetection = async (id) => {
    try {
        const resultData = await aimgmtdb.recoverFaultDetection(id)
        return resultData[0]
    }
    catch (error) {
        throw error
    }

}

module.exports.getFddEightDaysHistory = async (year, siteId) => {
    try {
        const eightDaysFddData = await aimgmtdb.eightDaysFddData(year, siteId)
        const deviceMapping = await aimgmtdb.getFddDeviceMapping(siteId)
        const fddDatas = eightDaysFddData[0]
        for (let i1 = 0; i1 < fddDatas.length; i1++) {
            const fddData = fddDatas[i1]
            const startDate = dateFns.format(fddData.startDate, "yyy-MM-dd HH:mm:ss")
            const endDate = dateFns.format(fddData.endDate, "yyy-MM-dd HH:mm:ss")
            const deviceId = fddData.deviceId
            const fddDevice = deviceMapping[0].filter(d => d.deviceId == fddData.deviceId)
            let query = ""
            for (let i = 0; i < fddDevice.length; i++) {
                const tableName = fddDevice[i].tableName
                const ieeeList = fddDevice[i].ieee
                query += (i == fddDevice.length - 1) ? `select count(*) as count from iotdata.${tableName} where
                        ts between '${startDate}' and '${endDate}' and ieee in (${ieeeList}) ` :
                    `select count(*) as count from iotdata.${tableName} where 
                        ts between '${startDate}' and '${endDate}' and ieee in (${ieeeList}) union `
            }
            const rawCount = await mgmtdb.getRawCount(query)
            const totalCount = rawCount[0][0].countt > 0 ? rawCount[0][0].countt : 0
            //console.log(rawCount[0][0],"hery")
            const addFddCount = await aimgmtdb.updateFddCount(startDate, endDate, deviceId, totalCount, siteId)
            //updateQuery += (i == fddDatas.length-1)?`(${id},${totalCount})`:`(${id},${totalCount}),`
        }
        return
    }
    catch (error) {
        console.log(error, "fdd eight days history count error:", error)
    }

}

module.exports.getFddEightDaysRealTime = async () => {
    try {
        const endDate = dateFns.format(kumoDate.Date('Asia/Singapore'), "yyyy-MM-dd HH:mm:ss")// dateFns.format(kumoDate.UtcToGmt(Date.now()), "yyyy-MM-dd HH:mm:ss")
        const startDate = dateFns.format(dateFns.subHours(Date.parse(endDate), 1), "yyyy-MM-dd HH:mm:ss")
        // console.log(startDate,endDate)
        const sdate = dateFns.format(kumoDate.Date('Asia/Singapore'), "yyyy-MM-dd HH:mm:ss")
        const fddDatas = (await aimgmtdb.eightDaysFddDataForRealTime(sdate))[0]
        const deviceMapping = await aimgmtdb.getFddDeviceMapping()
        let result = []
        //console.log("fddDatas",fddDatas)
        for (let i1 = 0; i1 < fddDatas.length; i1++) {
            const fddData = fddDatas[i1]
            const fddDevice = deviceMapping[0].filter(d => d.deviceId == fddData.deviceId && d.siteId == fddData.siteId)
            let query = ""
            for (let i = 0; i < fddDevice.length; i++) {
                const tableName = fddDevice[i].tableName
                const ieeeList = fddDevice[i].ieee
                query += (i == fddDevice.length - 1) ? `select count(*) as count,date(ts) as ts from ${tableName} where
                        ts between '${startDate}' and '${endDate}' and ieee in (${ieeeList}) group by date(ts) ` :
                    `select count(*) as count,date(ts) as ts from ${tableName} where 
                        ts between '${startDate}' and '${endDate}' and ieee in (${ieeeList}) group by date(ts) union all `
            }
            const rawCount = await mgmtdb.getRawCount(query)
            //console.log(rawCount[0].length,fddData.deviceId,"test")
            // console.log(rawCount[0][0].countt,fddData.count,fddData.id)
            const totalCount = rawCount[0].length > 0 ? rawCount[0][0].countt + parseInt(fddData.count) : 0 + parseInt(fddData.count)
            //console.log(totalCount,fddData.deviceId,fddData.id)
            result += (i1 == fddDatas.length - 1) ? `(${fddData.id},${totalCount})` :
                `(${fddData.id},${totalCount}),`

        }
        const addFddCount = await aimgmtdb.updateFddRealTimeCount(result)
        console.log("Fdd RealTime Raw Count Update:", startDate, endDate)
        return
    }
    catch (error) {
        console.log(error, "fdd eight days real time raw count error:", error)
    }

}

module.exports.calculateFddEnergyWastage = async ({ clientId, siteId, detectIds = null }) => {
    try {
        const queryFddDatum = `SELECT dm.detect_id, DATE_FORMAT(dm.start_time, '%Y-%m-%d %H:%i:00') as start_time, DATE_FORMAT(dm.end_time, '%Y-%m-%d %H:%i:00') as end_time, dm.equip_id, cc.value1
        FROM aimgmt.detection_master dm
        LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id
        LEFT JOIN aimgmt.fault_master fm on fm.fault_id=fdd.fault_id
        LEFT JOIN aimgmt.cal_config cc on cc.key1='fdd' and cc.key2='energy_wastage_kw_eff' and cc.param=dm.equip_id and cc.site_id=dm.site_id and fm.fault_name like concat("%", cc.operator, "%")
        WHERE dm.algo_id='fdd_v1' and dm.site_id='${siteId}' and dm.equip_id in ('CH1', 'CH2','CH3','CH4')
        and dm.detect_id not in (select wt.detect_id from aimgmt.detection_energy_wastage wt)`
        const fddDatum = (await aimgmtdb.selectQueryComplex(queryFddDatum))[0]
        console.log(fddDatum.length)
        for (let i = 0; i < fddDatum.length; i++) {
            const fddData = fddDatum[i]

            // const queryFddEnergyWastage = `insert into aimgmt.detection_energy_wastage
            // select ${fddData.detect_id} as detect_id, '${siteId}' as site_id, '${fddData.equip_id}' as equip_id, sum(${fddData.value1})/60 as wastage_energy, '${fddData.value1}' as eff_offset, utc_timestamp() as updated_ts
            // from aimgmt.sensor_real_time t
            // where (ts between '${fddData.start_time}' and '${fddData.end_time}') and equip_id='${fddData.equip_id}' and site_id='${siteId}'
            // `

            const queryFddEnergyWastage = `insert into aimgmt.detection_energy_wastage 
            select ${fddData.detect_id} as detect_id, '${siteId}' as site_id, '${fddData.equip_id}' as equip_id,sum(wastage_energy)/60,  'kw-(cooling_load*0.65)' as eff_offset, utc_timestamp() as updated_ts
             from (select  c.kw - (c.cooling_load * 0.65) as wastage_energy  FROM
             (SELECT  a.ts, equip_id, kw, chwr_temp, chws_temp, chw_flowrate, count, chw_flowrate / count as flowrate,
                ((chw_flowrate / count) * (CASE WHEN (chwr_temp - chws_temp) < 0 THEN 0 ELSE (chwr_temp - chws_temp)
                END) * 4.19 * 1000 * 0.28434517) / 3600 AS cooling_load    FROM aimgmt.sensor_real_time AS a
                RIGHT JOIN (  SELECT COUNT(*) as count, ts  FROM  aimgmt.sensor_real_time WHERE   kw > 10  AND equip_id in ('CH1' , 'CH2', 'CH3', 'CH4')
                and (ts between '${fddData.start_time}' and '${fddData.end_time}')
                GROUP BY ts  ORDER BY ts DESC  ) AS b ON a.ts = b.ts 
                WHERE  a.equip_id = '${fddData.equip_id}' and a.kw > 10 and  site_id='${siteId}') AS c) as outerTbl where wastage_energy>0 ;
            `


            // console.log(queryFddEnergyWastage)
            /* ON DUPLICATE KEY 
            UPDATE wastage_energy=sum(${fddData.value1})/60, eff_offset='${fddData.value1}', updated_ts=utc_timestamp()*/
            // console.log("queryFddEnergyWastage: ", queryFddEnergyWastage)
            try {
                const fddEnergyWastage = (await aimgmtdb.selectQueryComplex(queryFddEnergyWastage))[0]
            } catch (error) {

            }
            if (i === fddDatum.length - 1) {
                console.log("Done fddEnergyWastage: inserted count = ", fddDatum.length)
            }
        }
        // console.log("fddDatum: ", fddDatum)
    }
    catch (error) {
        console.log(error, "calculateFddEnergyWastage error:", error)
        throw error
    }
}

module.exports.getFddEnergyWastage = async ({ clientId, siteId, equipId }) => {
    try {
        const equipCondtion = equipId ? `and equip_id='${equipId}'` : ''
        const fddEnergySavingQuery = `select sum(wastage_energy) as totalWastageEnergy from aimgmt.detection_energy_wastage where site_id='${siteId}' ${equipCondtion}`
        const fddFaultyTimeQuery = `select sum(timestampdiff(MINUTE, start_time, end_time)) as fddFaultyHour from aimgmt.detection_master where site_id='${siteId}' ${equipCondtion}`

        const fddEnergySavingResult = (await aimgmtdb.selectQueryComplex(fddEnergySavingQuery))[0]
        const fddEnergyWastage = fddEnergySavingResult.length === 0 ? 0 : Math.round(fddEnergySavingResult[0].totalWastageEnergy, 1)
        const fddFaultyTimeResult = (await aimgmtdb.selectQueryComplex(fddFaultyTimeQuery))[0]
        const fddFaultyHour = fddFaultyTimeResult.length === 0 ? 0 : fddFaultyTimeResult[0].fddFaultyHour
        return ({ fddEnergyWastage, fddFaultyHour })
    }
    catch (error) {
        console.log(error, "calculateFddEnergyWastage error:", error)
        throw error
    }
}

const test = () => {
    this.calculateFddEnergyWastage({ siteId: "cl_pb" })
}

// test()