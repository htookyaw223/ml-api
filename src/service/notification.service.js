const dateFns = require('date-fns')
const kumoDate = require("../config/kumoDate.js")
const configMappingService = require("./configMapping.service")
const aimgmtdb = require('../db/aimgmt.db')
const chillerService = require('../service/chiller.service')
const anomalyService = require('./anomaly.service')
const realtimeGlobalReponse = require('../config/realtimeGlobalReponse')

module.exports.getNotification = async ({ siteId, page, equipment, dataType, detectionType, unRead = null }) => {

    try {
        const rowPerPage = 20

        const tableName = `notification`
        let selectors = "`idd`, `id`, `detectionType`, `equip`, `dataType`, `description`, `ts`, `startDate`, `endDate`, `read`, `siteId`, `dataTypeId`, `deviceId`"
        let condition = ` where true `
        let limit = ``
        if (equipment) condition += ` and equip='${equipment}'`
        if (siteId) condition += ` and siteId='${siteId}'`
        if (dataType) condition += ` and dataType='${dataType}'`
        if (detectionType && detectionType != 4) condition += ` and detectionType='${detectionType}'`
        if (detectionType && detectionType == 4) condition += ` and detectionType!= 4 and detectionType!=-5`
        if (unRead !== null) condition += " and `read`=" + (unRead === "true" ? 0 : 1)
        condition += " order by ts desc, `read` asc"

        const pageCountRaw = await aimgmtdb.selectRawQuery("count(*) as pageCount", tableName, condition)
        const pageCount = pageCountRaw[0].length > 0
            ? Math.ceil(pageCountRaw[0][0].pageCount / rowPerPage)
            : 0

        if (page) limit += ` LIMIT ${(page - 1) * rowPerPage}, ${rowPerPage}`
        condition += limit
        const notificationData = await aimgmtdb.selectRawQuery(selectors, tableName, condition)
        return ({
            pageCount,
            data: (detectionType < 0 ? notificationData[0].filter((v, i) => i < 5) : notificationData[0]).map(v => ({
                ...v, read: Boolean(v.read),
                ts: dateFns.format(v.ts, "MMM d, HH:mm"),
                startDate: dateFns.format(v.startDate, "yyyy-MM-dd"),
                endDate: dateFns.format(v.endDate, "yyyy-MM-dd")
            }))
        })

    } catch (error) {
        throw error
    }
}

module.exports.saveNotification = async (detectionNoti) => {

    try {
        let commaSeparatedValues = commaSeparatedStringWithQuote([detectionNoti.id,
        detectionNoti.detectionType,
        detectionNoti.equip,
        detectionNoti.dataType,
        detectionNoti.description,
        detectionNoti.ts,
        detectionNoti.startDate,
        detectionNoti.endDate,
        detectionNoti.read,
        detectionNoti.siteId,
        detectionNoti.dataTypeId,
        detectionNoti.deviceId
        ])
        const tableName = `notification`
        let columns = "( `id`, `detectionType`, `equip`, `dataType`, `description`, `ts`, `startDate`, `endDate`, `read`, `siteId`, `dataTypeId`, `deviceId`)"

        let values = `(
            ${commaSeparatedValues}
        )`
        //console.log(values,"values")
        const duplicatedData = await aimgmtdb.checkDuplicatedId(detectionNoti.id)
        if (duplicatedData[0].length > 0) {
            const notificationUpdatedData = await aimgmtdb.updateNotification(detectionNoti.id,
                detectionNoti.ts,
                detectionNoti.startDate,
                detectionNoti.endDate,
                detectionNoti.read,
                )
            return notificationUpdatedData[0] 
        }
        else {
            const notificationData = await aimgmtdb.insertRawQuery(columns, tableName, values)
            return notificationData[0]
        }

    } catch (error) {
        throw error
    }
}

///////////modified
module.exports.getUnreadNotificationCount = async ({ siteId, detectionType, equip, dataType, startDate, endDate }) => {
    try {
        const tableName = `notification`
        let selectors = "count(*) as unreadNotiCount"
        let condition = " where `read`=0 "


        if (detectionType) condition += ` and detectionType='${detectionType}'`
        if (equip) condition += ` and equip='${equip}'`
        if (dataType) condition += ` and dataType='${dataType}'`
        if (startDate && endDate) condition += `and ts between '${startDate}' and '${endDate}' `
        condition += ` and siteId='${siteId}'`


        const notificationData = await aimgmtdb.selectRawQuery(selectors, tableName, condition)

        return notificationData[0] ? notificationData[0][0] : 0

    } catch (error) {
        throw error
    }
}


module.exports.setReadNotification = async ({ notiId }) => {
    try {
        const tableName = `notification`
        let column = "`read`"
        let value = 1
        let condition = " where `id`=" + notiId

        const notificationData = await aimgmtdb.updateRawQuery(column, tableName, value, condition)
        return notificationData[0] ? notificationData[0][0] : 0

    } catch (error) {
        throw error
    }
}


//
module.exports.saveNewNoti = async () => {
    try {

        const endDate = dateFns.format(dateFns.subMinutes(kumoDate.Date(), 5), "yyyy-MM-dd HH:mm:59") // HH:mm
        const currentDate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:00")

        console.log("Noti save for every ten minutes startDate", currentDate, "EndDate", endDate)

        const deviceList = chillerService.getDevices()
        const deviceListData = await deviceList
        let detectionDataRealTime = await anomalyService.getAnomalyDataAllBetweenStartDateAndEndDate({
            startDate: endDate,
            endDate: currentDate
        })
        detectionDataRealTime = detectionDataRealTime.filter(d => d.algoId != "calm_v1")
        //console.log(detectionDataRealTime,"detectionDataRealTime")
        console.log("detectionDataRealTime: ", detectionDataRealTime.length)
        if (detectionDataRealTime.length > 0) {
            Object.values(realtimeGlobalReponse).map(v => v.write(`data: ${JSON.stringify({ newNoti: true })}\n\n`))

            detectionDataRealTime.map(async detection => {
                const deviceInfo = deviceListData.filter(v => v.equipId === detection.deviceId && v.siteId === detection.siteId)
                if (deviceInfo.length > 0) {
                    detection.equipName = deviceInfo[0].deviceTypeName
                }
                const detectionName = (detection.algoId == "ad_v1")? "Anomaly Detection"
                                     : (detection.algoId == "fad_v1")? "False Alarm Detection"
                                     :(detection.algoId == "fdd_v1")? "Fault Detection":""
                const detectionTypeInfo = await aimgmtdb.getDetectionType(detection.algoId)
                detection.ts = detection.createdTs
                detection.startDate = detection.startDate
                detection.endDate = detection.endDate
                detection.detectionType = detectionTypeInfo[0][0].detectionType
                detection.read = false
                detection.equip = detection.deviceId
                detection.dataTypeId = detection.dataType ? detection.dataType.toLowerCase() : ''
                detection.dataType = detection.dataTypeId ? detection.dataTypeId : ''
                detection.description = `${detectionName} for ${detection.equipName} is detected at ${detection.ts}.`

                //console.log("saved: ", detection)

                this.saveNotification(detection)
                console.log("Notification save ten minutes scheduler is finish:::::::::::")
            })
        }
    } catch (error) {
        console.log("noti save error :", error.toString())
    }
}


// helper methods

const commaSeparatedString = (stringArray) => {
    return stringArray.reduce((r, c, i) => {
        if (i === 0) return c
        else return `${r},${c}`
    }, "")
}

const commaSeparatedStringWithQuote = (stringArray) => {
    return stringArray.reduce((r, c, i) => {
        if (i === 0) return typeof c === "string" ? `'${c}'` : c
        else return `${r},${typeof c === "string" ? `'${c}'` : c}`
    }, "")
}