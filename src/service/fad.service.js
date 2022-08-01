const mgmtdb = require('../db/iotmgmt.db')
const aimgmtdb = require('../db/aimgmt.db')
const kumoDate = require("../config/kumoDate.js")
const dateFns = require('date-fns')


module.exports.getFadData = async ({ detectId, siteId, deviceId, dataType, alarm_id, startDate, endDate, sortBy, page = 1 }) => {

    const rowPerPage = 20
    let selectedPage = page
    let alreadyReviewed = false

    let fadRawDataCount = await aimgmtdb.getFADdata({ siteId, deviceId, dataType, alarm_id, startDate, endDate, sortBy, rowPerPage })

    let fadRawData = await aimgmtdb.getFADdata({ siteId, deviceId, dataType, alarm_id, startDate, endDate, sortBy, rowPerPage, page })

    let fadData = await this.getFadReuslt(fadRawData[0])

    if (detectId) {
        const index = fadRawDataCount[0].findIndex(v => v.detectId == detectId)
        // for detectId not found in db or being vierified 1
        if (index == -1) {
            const tableName = "dtd_fad"
            const checkReviewedResult = await aimgmtdb.checkReviewedResult(detectId, tableName)
            if (checkReviewedResult[0].length > 0) alreadyReviewed = true
            return ({
                pageCount: Math.ceil(fadRawDataCount[0].length / rowPerPage),
                selectedPage: selectedPage * 1,
                alreadyReviewed: alreadyReviewed,
                data: fadData

                
            })
        }
        // for detectId exists
        selectedPage = Math.ceil((index + 1) / rowPerPage)
        let page = selectedPage
        fadRawData = await aimgmtdb.getFADdata({ siteId, deviceId, dataType, alarm_id, startDate, endDate, sortBy, rowPerPage, page })
        fadData = await this.getFadReuslt(fadRawData[0])
        return ({
            pageCount: Math.ceil(fadRawDataCount[0].length / rowPerPage),
            selectedPage: selectedPage * 1,
            alreadyReviewed: alreadyReviewed,
            data: fadData
        })
    }

    // console.log("Hello: 1")

    if (fadRawDataCount[0].length == 0 || fadRawData[0].length == 0) {
        // console.log("Hello: 2")
        return ({
            pageCount: Math.ceil(fadRawDataCount[0].length / rowPerPage),
            selectedPage: selectedPage * 1,
            alreadyReviewed: alreadyReviewed,
            data: []
        })
    } else {
        // console.log("Hello: 3")
        return ({
            pageCount: Math.ceil(fadRawDataCount[0].length / rowPerPage),
            selectedPage: selectedPage * 1,
            alreadyReviewed: alreadyReviewed,
            data: fadData
        })
    }
}

module.exports.getFadReuslt = (data) => {
    const fadData = data.map(v => ({
        ...v,
        id: v.detectId,
        siteId: v.siteId,
        deviceId: v.deviceId,
        dataType: v.dataType,
        startDate: dateFns.format(v.startDate, "yyyy-MM-dd HH:mm:ss"),
        endDate: dateFns.format(v.endDate, "yyyy-MM-dd HH:mm:ss"),
        createdTs: dateFns.format(Date.parse(v.createdTs), "yyyy-MM-dd HH:mm:ss"),
        user: v.userId,
        severity: v.severityId ? [v.severityId] : [],
        anomalyState: v.anomaly,
        deviceType: v.deviceType,
        comments: v.comments,
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
    return fadData
}

module.exports.acceptFalseAlarmDetection = async ({ detectionId, accept, userId,remark }) => {
    try{
        const fadRawData = await aimgmtdb.setAcceptFAD({ detectionId, accept, userId,remark })
        // save in Label Log 
        aimgmtdb.saveLabelLog({
            detectId: detectionId,
            updatedBy: userId,
            remark: remark,
            detectionType: 3,
            labelType: accept ? "accept" : "reject"
        })
        return fadRawData[0];
    }
    catch (error) {
        throw error
    }
}

module.exports.recoverFalseAlarmDetection = async(id) => {
    try{
        const resultData = await aimgmtdb.recoverFalseAlarmDetection(id)
        return resultData[0]
    }
    catch (error) {
        throw error
    }

}

module.exports.readEightDayDataWithFad = async ({ deviceId, algo_id }) => {
    //console.log(deviceId, algo_id)
    try {
        //const yearlyEightDayData = await ibpemdb.loadFddYearlyEightDayData({ deviceId,algo_id })
        //console.log("eight day data :", yearlyEightDayData[0].map(v => v.year ))
        const yearlyEightDayData = await aimgmtdb.getFadEightDaysData({ deviceId, algo_id })
        const data = yearlyEightDayData[0].reduce((r, c) => {
            const R = [...r]
            const index = r.findIndex(v => v.year == c.year)
            const indexx = index === -1 ? R.length : index
            if (index === -1) R[indexx] = { year: c.year, data: [] }
            R[indexx].data.push({
                startDate: dateFns.format(Date.parse(c.startDate), "yyyy-MM-dd"),
                endDate: dateFns.format(Date.parse(c.endDate), "yyyy-MM-dd"),
                count: (parseInt(c.count) < parseInt(c.anoCount)) ? parseInt(c.anoCount) + 100 : parseInt(c.count),
                dataState: [
                    { stateId: 0, dataCount: (parseInt(c.count) < parseInt(c.anoCount)) ? 100 : (parseInt(c.count) - parseInt(c.anoCount)) },
                    { stateId: 1, dataCount: parseInt(c.anoCount) },
                ]
            })
            return R
        }, [])
        return data
    } catch (error) {

        throw error
    }
}

module.exports.getFadCount= async(siteId)=>{
    try{
        const resultData = await aimgmtdb.getFadCount(siteId)
        const total =resultData[0].length
        const trueAlarms = resultData[0].filter(d=>d.alarm_type == 1)
        const falseAlarms = resultData[0].filter(d=>d.alarm_type == 0)
        const changed = 0
        return ([{ total: total, trueAlarms: trueAlarms.length, falseAlarms: falseAlarms.length, changed: changed }])
    }
    catch (error) {
        throw error
    }

}

