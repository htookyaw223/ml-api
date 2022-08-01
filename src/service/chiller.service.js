
const mgmtdb = require('../db/iotmgmt.db')
const aimgmtdb = require('../db/aimgmt.db')
const dateFns = require('date-fns')
const dateFnsZone = require('date-fns-tz')
const kumoDate = require("../config/kumoDate.js")
const redisService = require("./redis.service")
const anomalyService = require("./anomaly.service")
const notificationService = require("./notification.service")
const generalAlertConfig = require("../config/generalAlertConfig")

const realtimeGlobalReponse = require("../config/realtimeGlobalReponse")

module.exports.getDevices = () => {
    return aimgmtdb.getDevices()
        .then(data => {
            if (data[0].length > 0) {
                return data[0]
            } else return []
        })
        .catch(error => {
            throw error
        })
}


module.exports.getDeviceMappings = async (selectors, condition) => {
    try {
        const data = await aimgmtdb.getDeviceMappings(selectors, condition)
        return data[0]
    } catch (error) {
        throw error
    }
}

module.exports.getAllDataTypesAnomaly = (siteId) => {
    return aimgmtdb.getParameter1(siteId).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })

}

//getDeviceInfoBySiteId
module.exports.getDeviceInfoBySiteId = async () => {
    try {
        const data = await aimgmtdb.getDeviceInfoBySiteId()
        return data[0]
    } catch (error) {
        throw error
    }
}

module.exports.getEquipmentMappings = async (selectors, condition) => {
    try {
        const data = await aimgmtdb.getEquipmentMappings(selectors, condition)
        return data[0]
    } catch (error) {
        throw error
    }
}


module.exports.getAllDataTypes = (siteId) => {
    return aimgmtdb.getParameter(siteId).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })

}
module.exports.getAllDataTypesAnomaly = (siteId) => {
    return aimgmtdb.getParameter1(siteId).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })

}

module.exports.getChillerOverviewRawData = async (id, siteId) => {
    const data = await redisService.getChillerOverviewData()
    if (!data && id) return ({})
    else if (!data) return ([])
    else if (!id) return data.chillerOverview.filter(d => d.siteId == siteId)
    else return data.chillerOverview.filter(d => d.siteId == siteId && d.deviceId == id)

}

module.exports.getDeviceData = (dataType, deviceId, periodType) => {
    // default for realtime
    let endDate = /*'2020-05-05 05:00:00'*/ dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:00") // HH:mm
    let startDate = dateFns.format(dateFns.subMinutes(Date.parse(endDate), 70), "yyyy-MM-dd HH:mm:00")

    // realtime, prevDay, sevenDay, prevMonth
    // frequency minutes
    const frequency = periodType === "realtime" ? 10
        : periodType === "prevDay" ? 60
            : periodType === "sevenDay" ? 1440
                : periodType === "prevMonth" ? 1440
                    : 10
    const incrementMinute = periodType === "realtime" ? 1
        : periodType === "prevDay" ? 60
            : periodType === "sevenDay" ? 1440
                : periodType === "prevMonth" ? 1440
                    : 10
    switch (periodType) {
        case "prevDay":
            endDate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd 00:00:00") // HH:mm
            startDate = dateFns.format(dateFns.subDays(Date.parse(endDate), 1), "yyyy-MM-dd 00:00:00")
            break;
        case "sevenDay":
            endDate = dateFns.format(dateFns.subDays(kumoDate.Date(), 1), "yyyy-MM-dd 00:00:00") // HH:mm
            startDate = dateFns.format(dateFns.subDays(Date.parse(endDate), 7), "yyyy-MM-dd 00:00:00")
            break;
        case "prevMonth":
            endDate = dateFns.format(kumoDate.Date(), "yyyy-MM-01 00:00:00") // HH:mm
            startDate = dateFns.format(dateFns.subMonths(Date.parse(endDate), 1), "yyyy-MM-dd 00:00:00")
            break;
    }

    console.log("Start-End", startDate, endDate)

    // console.log("startDate: ", startDate, ", endDate: ", endDate)

    // fetch processed data for device mapping
    const condition = `where dataType='${dataType}' and deviceId=${deviceId}`
    const selectors = `tableName, columnName, ieee`
    const deviceMappings = this.getDeviceMappings(selectors, condition)

    return deviceMappings.then(deviceMappingDataArray => {
        const deviceMappingData = deviceMappingDataArray[0]
        const condition = `WHERE ts BETWEEN '${startDate}' AND '${endDate}' AND ieee='${deviceMappingData.ieee}' order by ts asc`
        //const columnName =  `${deviceMappingData.tableName == "pm"? `${deviceMappingData.columnName}/1000 `: deviceMappingData.columnName} as ${deviceMappingData.columnName}`
        const selectors = `ts, ${deviceMappingData.columnName}`
        return mgmtdb.getRawData(selectors, deviceMappingData.tableName, condition)
            .then(rawDataRows => {
                const rawData = rawDataRows[0].map(v => ({ ts: dateFns.format(Date.parse(v.ts), "yyyy-MM-dd HH:mm"), value: v[deviceMappingData.columnName] }))

                let tmpStartDate = dateFns.toDate(Date.parse(startDate))
                let tmpEndDate = dateFns.addMinutes(tmpStartDate, frequency)
                console.log("tmpEndDate:", tmpEndDate, "tmpStartDate:", tmpStartDate)
                const tmpData = []
                while (dateFns.compareAsc(tmpEndDate, Date.parse(endDate)) < (periodType === "realtime" ? 0 : 1)) {
                    // console.log("tmpEndData: ", dateFns.format(tmpEndDate, "yyyy-MM-dd HH:mm:ss:SS"), dateFns.format(Date.parse(endDate), "yyyy-MM-dd HH:mm:ss:SS"))
                    const dataBetween = rawData.filter(v => dateFns.compareAsc(Date.parse(v.ts), tmpStartDate) > -1 && dateFns.compareAsc(Date.parse(v.ts), tmpEndDate) < 1)
                    const sumData = dataBetween.reduce((r, c) => r + (c.value ? c.value : 0), 0)
                    const count = dataBetween.reduce((r, c) => c.value > 0 ? r + 1 : r, 0)
                    const divider = count > 0 ? count : 1
                    const subtractSecond = (periodType === "prevDay" || periodType === "prevMonth") ? 1 : 0
                    const value = (sumData / divider).toFixed(2) * 1
                    // const ts = dateFns.format( kumoDate.GmtDate(dateFns.subSeconds(tmpEndDate, subtractSecond), true), "yyyy-MM-dd'T'HH:mm:00X" )
                    tmpData.push({ //TODO
                        ts: dateFns.format(dateFns.subSeconds(tmpEndDate, subtractSecond), "yyyy-MM-dd HH:mm"),
                        // ts, //: dateFns.format( kumoDate.GmtDate(dateFns.subSeconds(tmpEndDate, subtractSecond), true), "yyyy-MM-dd HH:mm" ),
                        value: value,
                        // count: tmpData.length+1
                    })

                    tmpStartDate = dateFns.addMinutes(tmpStartDate, incrementMinute)
                    tmpEndDate = dateFns.addMinutes(tmpStartDate, frequency)
                }
                return tmpData
            })
            .catch(error => {
                throw error
            })
    }).catch(error => {
        throw error
    })
}

module.exports.getPlantOverviewRawData = async (clientId, siteId) => {
    const dataAll = await redisService.getPlantOverviewData()
    if (!dataAll) return ([])
    const data = dataAll.plantOverview[siteId]
    if (!data) return ([])
    return data

}

module.exports.checkDetections = async () => {
    const currentDate = dateFns.format(dateFns.subMinutes(kumoDate.Date(), 1), "yyyy-MM-dd HH:mm:59") // HH:mm
    const endDate = dateFns.format(dateFns.subMinutes(Date.parse(currentDate), 1440), "yyyy-MM-dd HH:mm:00")

    console.log("CheckDetections : \nstartDate ", currentDate, ", previous-10-minutes: ", endDate)

    const detectionDataRealTime = await anomalyService.getAnomalyDataAllByCreatedTime({
        startDate: endDate,
        endDate: currentDate,
        // startDate: "2019-01-01 00:40:00",
        // endDate: "2020-06-10 23:45:59"
    })

    const deviceList = this.getDevices()
    const deviceListData = await deviceList

    detectionDataRealTime.map(detection => {
        const deviceInfo = deviceListData.filter(v => v.equipId === detection.deviceId && v.siteId === detection.siteId)
        if (deviceInfo.length > 0) {
            // detection.deviceId = deviceInfo[0].id
            detection.equipName = deviceInfo[0].deviceTypeName
        }
        // const deviceMappingInfo = deviceMappingData.filter(v => v.deviceId === detection.deviceId && v.dataType.toLowerCase() === detection.dataType.toLowerCase())
        // if (deviceMappingInfo.length > 0) {
        //     // detection.dataTypeId = deviceMappingInfo[0].dataType 
        //     // detection.dataType = deviceMappingInfo[0].dataTypeName
        // }
        detection.ts = dateFns.format(kumoDate.GmtDate(Date.parse(detection.createdTs), true), "yyyy-MM-dd HH:mm")
        detection.startDate = detection.startDate
        detection.endDate = detection.endDate
        detection.detectionType = 1
        detection.read = false
        detection.equip = detection.deviceId
        detection.dataTypeId = detection.dataType.toLowerCase()
        detection.dataType = detection.dataTypeId
        detection.description = `${detection.equipName} is detected at ${detection.ts}.`

        try {
            // console.log("saved: ", detection)
            // notificationService.saveNotification(detection)
        } catch (error) {
            console.log("Daily Noti-saved-error: ", error.stack)
        }
    })

}

module.exports.runChillerOverviewRawData = async () => {
    const currentDateObj = dateFns.subMinutes(kumoDate.Date(), 1)
    const notisToTrigger = generalAlertConfig.data.filter(v => {
        let trigger = false;
        switch (v.frequencyType) {
            case generalAlertConfig.frequencyType.hour:
                trigger = currentDateObj.getMinutes() === 0 && Math.floor(currentDateObj.getHours() % v.frequencyValue) === 0
                break
            case generalAlertConfig.frequencyType.minute:
                trigger = Math.floor(currentDateObj.getMinutes() % v.frequencyValue) === 0
        }
        return trigger
    })

    //const condition = `where true`

    // const condition = `where deviceType='CH'`
    //const selectors = `deviceId, dataType, deviceType, tableName, columnName, ieee, deviceDesc, dataTypeName`
    const deviceMappings = this.getDeviceInfoBySiteId()
    const deviceMappingData = await deviceMappings

    const deviceList = this.getDevices()
    const deviceListData = await deviceList

    const currentDate = dateFns.format(dateFns.subMinutes(kumoDate.Date(), 1), "yyyy-MM-dd HH:mm:59") // HH:mm
    const endDate = dateFns.format(dateFns.subMinutes(Date.parse(currentDate), 10), "yyyy-MM-dd HH:mm:00")

    console.log("startDate ", currentDate, ", previous-10-minutes: ", endDate)
    // console.log("dat: ", deviceMappingData[0], deviceListData)

    return deviceMappings.then(data => {
        if (data.length === 0) {
            return []
        } else {

            const groupedData = groupColumnNamesAndIEEEsTableName(data) // [ch1Watt, ch2Watt] // ch1Watt,ch2Watt // 'ch1Watt','ch2Watt'
            //console.log("data: ", groupedData)
            const promiseArray = Object.values(groupedData).map(gd => {

                // console.log("current1: ", dateFnsZone.zonedTimeToUtc(currentDate, "America/Danmarkshavn") )
                // console.log("current2: "+ dateFns.format(kumoDate.UtcDate(currentDate), kumoDate.dateFormatNoSec) )

                // const condition = `WHERE ts BETWEEN '${ dateFns.format(kumoDate.UtcDate(endDate), kumoDate.dateFormatNoSec) }' AND '${ dateFns.format(kumoDate.UtcDate(currentDate), kumoDate.dateFormatNoSec) }' AND ieee in (${commaSeparatedStringWithQuote(gd.ieees)})`
                const condition = `WHERE ts BETWEEN '${endDate}' AND '${currentDate}' AND ieee in (${commaSeparatedStringWithQuote(gd.ieees)})`
                // const columns = `${gd.tableName == "pm"? gd.columnNames.map(c=>`${c}/1000 as ${c}`) :  gd.columnNames} ` 
                //console.log(columns,'columns')
                return mgmtdb.getRawData(commaSeparatedString(gd.columnNames) + ",ieee", gd.tableName, condition)
                    .then(data => {
                        // console.log(JSON.stringify(data[0], null, 2))
                        if (data[0].length > 0) {
                            return data[0]
                        } else return []
                    })
                    .catch(error => {
                        throw error
                    })
            })

            return Promise.all(promiseArray)
                .then(results => { // [[]]
                    const data1 = data.reduce((r, c) => {
                        const R = [...r]
                        const index = R.findIndex(v => v.deviceId === c.deviceId && v.siteId === c.siteId)
                        const result = results.reduce((r1, c1) => {
                            return c1.reduce((r2, c2) => c2.ieee === c.ieee ? [...r2, c2[c.columnName]] : r2, r1)
                        }, [])
                        const d = result[c.columnName]
                        if (index === -1) R.push({ deviceId: c.deviceId, siteId: c.siteId, data: [{ columnName: c.dataType, d: result }], }) // if need to add something such as Unit (will change here)
                        else {
                            const columnIndexInner = R[index].data.findIndex(v => v.columnName === c.columnName)
                            if (columnIndexInner === -1)
                                R[index].data.push({ columnName: c.dataType, d: result }) // if need to add something such as Unit (will change here)
                            else
                                R[index].data[columnIndexInner].d.push(...result)
                        }
                        return R
                    }, [])
                    return deviceList.then(dList => {
                        const resultedData = data1.map(async v => {
                            const avgData = v.data.reduce((r, c) => {
                                const sumValue = c.d.reduce((r1, c1) => c1 ? r1 + parseFloat(c1) : r1, 0)
                                const count = c.d.reduce((r1, c1) => (c1 && c1 > 0) ? r1 + 1 : r1, 0)
                                const divider = count > 0 ? count : 1
                                const value = c.columnName === 'start_stop' ? sumValue : (sumValue / divider).toFixed(2) * 1  //changed
                                return ({ ...r, [c.columnName]: value })
                            }, {})
                            // console.log(avgData,"avgData")
                            // console.log("startStop: ", avgData.start_stop)
                            const deviceInfo = dList.reduce((r1, c1) => (c1.id === v.deviceId && c1.siteId === v.siteId) ? c1 : r1, {})
                            // trigger notification 
                            notisToTrigger.forEach(v => {
                                const operator = v.operator
                                const value1 = v.value1
                                const value2 = v.value2
                                let valueRealtime = 0.0
                                if (v.deviceId === deviceInfo.id && avgData.start_stop > 0) {
                                    switch (operator) {
                                        case generalAlertConfig.operator.lessThan:
                                            valueRealtime = avgData[v.dataType]
                                            if (valueRealtime < value1) {
                                                // save in notification
                                                v.equip = deviceInfo.equipId
                                                v.ts = dateFns.format(kumoDate.GmtDate(Date.now(), true), "yyyy-MM-dd HH:mm")
                                                v.startDate = endDate
                                                v.endDate = currentDate
                                                v.detectionType = -5
                                                v.read = false
                                                v.dataTypeId = v.dataType.toLowerCase()
                                                v.dataType = v.dataType
                                                v.description = v.message
                                                // v.deviceId = deviceInfo.equipId
                                                try {
                                                    notificationService.saveNotification({ ...v, deviceId: deviceInfo.equipId })
                                                }
                                                catch (error) {
                                                    console.log("General Noti-saved-error: ", error.stack)
                                                }
                                                // push sse event
                                                Object.values(realtimeGlobalReponse).map(v => v.write(`data: ${JSON.stringify({ newGeneralNoti: true })}\n\n`))
                                                console.log("Trigger: ", v.message, ' :: ', valueRealtime)
                                            }
                                            break;
                                        case generalAlertConfig.operator.greaterThan:
                                            valueRealtime = avgData[v.dataType]
                                            if (valueRealtime > value1) {
                                                // save in notification
                                                v.equip = deviceInfo.equipId
                                                v.ts = dateFns.format(kumoDate.GmtDate(Date.now(), true), "yyyy-MM-dd HH:mm")
                                                v.startDate = endDate
                                                v.endDate = currentDate
                                                v.detectionType = -5
                                                v.read = false
                                                v.dataTypeId = v.dataType.toLowerCase()
                                                v.dataType = v.dataType
                                                v.description = "Chiller 1 Supply Temperature is over 9.C"
                                                v.deviceId = deviceInfo.equipId
                                                try {
                                                    notificationService.saveNotification(v)
                                                }
                                                catch (error) {
                                                    console.log("General Noti-saved-error: ", error.stack)
                                                }
                                                // push sse event
                                                Object.values(realtimeGlobalReponse).map(v => v.write(`data: ${JSON.stringify({ newGeneralNoti: true })}\n\n`))
                                                console.log("Trigger: ", v.message, ' :: ', valueRealtime)
                                            }
                                            break;
                                    }
                                }
                            })

                            delete deviceInfo.id // remove id from deviceInfo object

                            return ({ deviceId: v.deviceId, siteId: v.siteId, ...deviceInfo, ...avgData })
                        })
                        return resultedData
                    })
                        .catch(error => {
                            throw error
                        })
                    // ({ results: results, mapping: data, data1, resultedData })
                })
                .catch(error => {
                    throw error
                })
            // return groupedData
        }
    }).catch(error => {
        throw error
    })

}


// module.exports.runPlantOverviewRawData = () => {
//     const condition = `where deviceType='CH'`
//     const selectors = `deviceId, dataType, deviceType, tableName, columnName, ieee, deviceDesc`
//     const deviceMappings = this.getDeviceMappings(selectors, condition)
//     const currentDate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:59") // HH:mm
//     const startDate = dateFns.format(dateFns.subMinutes(Date.parse(currentDate), 70/*70*/), "yyyy-MM-dd HH:mm:00")

//     // const currentDateUTC = dateFns.format(kumoDate.UtcDate(currentDate), kumoDate.dateFormatNoSec)
//     // const startDateUTC = dateFns.format(kumoDate.UtcDate(startDate), kumoDate.dateFormatNoSec)
//     // console.log("currentDateUTC: ", currentDate, startDate)

//     // console.log("startDate ", currentDate, ", previous-10-minutes: ", endDate)

//     return deviceMappings.then(data => {
//         if (data.length === 0) {
//             return []
//         } else {
//             const filterData = data => data //data.filter(d => d.dataType==="ch_sys_heat_in" || d.dataType==="ch_sys_heat_out" || d.dataType==="kwh" || d.dataType==="cw_flowrate")
//             const groupedData = groupColumnNamesAndIEEEsTableName(filterData(data)) // [ch1Watt, ch2Watt] // ch1Watt,ch2Watt // 'ch1Watt','ch2Watt'
//             //console.log("data: ", groupedData)
//             const promiseArray = Object.values(groupedData).map(gd => {
//                 const condition = `WHERE ts BETWEEN '${startDate}' AND '${currentDate}' AND ieee in (${commaSeparatedStringWithQuote(gd.ieees)})`
//                 //const columns = `${gd.tableName == "pm"? gd.columnNames.map(c=>`${c}/1000 as ${c}`) :  gd.columnNames} ` 
//                 //console.log(columns,'columns')
//                 return mgmtdb.getRawData(commaSeparatedString( gd.columnNames) + ",ieee,ts", gd.tableName, condition)
//                     .then(data => {
//                         // console.log("dddlength: ", data[0].length)
//                         if (data[0].length > 0) {
//                             // console.log("dlength: ", data[0].length)
//                             return data[0]
//                         } else return []
//                     })
//                     .catch(error => {
//                         throw error
//                     })
//             })
//             return Promise.all(promiseArray)
//                 .then(results => { // [[]]
//                     const data1 = filterData(data).reduce((r, c) => {
//                         const R = [...r]
//                         const index = R.findIndex(v => v.dataType === c.dataType)
//                         const result = results.reduce((r1, c1) => {
//                             return c1.reduce((r2, c2) => /*c2.ieee===c.ieee ?*/[...r2, { value: c2[c.columnName] || 0, ts: Date.parse(c2.ts)/*dateFns.format(Date.parse(c2.ts), "yyyy-MM-dd HH:mm")*/ }], r1)
//                         }, [])
//                         if (index === -1) R.push({ dataType: c.dataType, d: result }) // if need to add something such as Unit (will change here)
//                         else {
//                             R[index].d.push(...result) // if need to add something such as Unit (will change here)
//                         }
//                         return R
//                     }, [])

//                     const resultedData = data1.map(dataByDataType => {
//                         let tmpStartDate = dateFns.toDate(Date.parse(startDate))
//                         let tmpEndDate = dateFns.addMinutes(tmpStartDate, 10)

//                         const tmpData = []
//                         while (dateFns.compareAsc(tmpEndDate, Date.parse(currentDate)) < 1) {
//                             // console.log("tmpEndData: ", dateFns.format(tmpEndDate, "yyyy-MM-dd HH:mm:ss:SS"), dateFns.format(Date.parse(endDate), "yyyy-MM-dd HH:mm:ss:SS"))
//                             const dataBetween = dataByDataType.d.filter(v => dateFns.compareAsc(/*Date.parse(*/v.ts/*)*/, tmpStartDate) > -1 && dateFns.compareAsc(/*Date.parse(*/v.ts/*)*/, tmpEndDate) < 1)
//                             const sumData = dataBetween.reduce((r, c) => r + c.value, 0)
//                             const count = dataBetween.reduce((r, c) => c.value > 0 ? r + 1 : r, 0)
//                             const divider = count > 0 ? count : 1
//                             const subtractSecond = 1
//                             const value = (sumData / divider).toFixed(2) * 1 //changed
//                             tmpData.push({
//                                 ts: dateFns.format(kumoDate.GmtDate(dateFns.subSeconds(tmpEndDate, subtractSecond), true), "HH:mm"), //yyyy-MM-dd HH:mm
//                                 // ts: dateFns.format(dateFns.subSeconds(tmpEndDate, subtractSecond), "yyyy-MM-dd HH:mm"),
//                                 value: value,
//                                 // count: tmpData.length+1
//                             })

//                             tmpStartDate = dateFns.addMinutes(tmpStartDate, 1)
//                             tmpEndDate = dateFns.addMinutes(tmpStartDate, 10)
//                         }
//                         return ({ dataType: dataByDataType.dataType, data: tmpData })

//                     })

//                     return resultedData

//                 })
//                 .catch(error => {
//                     throw error
//                 })
//             // return groupedData
//         }
//     }).catch(error => {
//         console.log("error: ", error)
//         throw new Error(error)
//     })

// }

module.exports.runPlantOverviewRawData = (oldPlantOverviewData, chillerOverviewData, currentTime) => {
    console.log("Running plant overview data ", currentTime)
    // console.log({ oldPlantOverviewData, chillerOverviewData })
    try {
        const oldPlantOverviewData01 = oldPlantOverviewData ? oldPlantOverviewData.plantOverview : {}
        const oldPlantOverviewData1AllSites = {}

        const siteKeysTmp1 = Object.keys(oldPlantOverviewData01)
        const siteKeysTmp2 = chillerOverviewData.reduce((r, c) => {
            if (!r.includes(c.siteId) && !siteKeysTmp1.includes(c.siteId))
                return [...r, c.siteId]
            return r
        }, [])
        const siteKeys = [...siteKeysTmp1, ...siteKeysTmp2]

        for (siteId of siteKeys) {
            const oldPlantOverviewData1 = oldPlantOverviewData01[siteId] ? oldPlantOverviewData01[siteId] : []

            const dataTypeNonZeroCount = {}
            const chillerOverviewDataSum = chillerOverviewData.filter(v => v.siteId == siteId).reduce((rr, c) => {
                const r = { ...rr }
                delete c.deviceId
                delete c.deviceTypeName
                delete c.deviceType
                delete c.brand
                delete c.model
                delete c.serialNumber
                delete c.tonnage
                delete c.refrigeratorType
                delete c.equipId
                delete c.siteId
                // console.log("c: ", c, "\nr: ", r)     

                const newData = Object.keys(c).reduce((r11, k1) => {
                    const r1 = { ...r11 }
                    // console.log(r1,"r1:", k1 )
                    if (c[k1] > 0) { // read non zero count
                        if (dataTypeNonZeroCount[k1]) dataTypeNonZeroCount[k1] += 1;
                        else dataTypeNonZeroCount[k1] = 1
                    }
                    if (r1[k1]) { // sum of values to related data type
                        r1[k1] += (isNaN(c[k1]) || c[k1] === null) ? 0 : c[k1]
                        return r1
                    } else { // first value of data type
                        r1[k1] = (isNaN(c[k1]) || c[k1] === null) ? 0 : c[k1]
                        return r1
                    }
                }, { ...r })
                // console.log(newData,'newDasta')
                return newData
            }, {})

            // console.log("chillerOverviewDataSum: ", chillerOverviewDataSum)

            const chillerOverviewDataAvg = Object.keys(chillerOverviewDataSum).reduce((r1, k) => {
                const r = { ...r1 }
                if (!k.toLowerCase().includes("kw") && dataTypeNonZeroCount[k] > 0) r[k] = chillerOverviewDataSum[k] / dataTypeNonZeroCount[k]
                else r[k] = chillerOverviewDataSum[k]
                return r
            }, {})

            // console.log("chillerOverviewDataAvg: ", chillerOverviewDataAvg)

            chillerOverviewDataAvg.ts = currentTime

            // console.log("OC::: ",oldPlantOverviewData1, currentTime)
            if (oldPlantOverviewData1.length > 0) {
                const oldTime = oldPlantOverviewData1[0].ts.split(":");
                const newTime = currentTime.split(":")

                const oldMinute = parseInt(oldTime[0]) * 60 + parseInt(oldTime[1])
                const newMinute = parseInt(newTime[0]) * 60 + parseInt(newTime[1])
                if ((newMinute - oldMinute) >= 60 || oldPlantOverviewData1.length >= 60) {
                    oldPlantOverviewData1.shift()
                    oldPlantOverviewData1.push(chillerOverviewDataAvg)
                } else {
                    oldPlantOverviewData1.push(chillerOverviewDataAvg)
                }
            } else {
                oldPlantOverviewData1.push(chillerOverviewDataAvg)
            }
            oldPlantOverviewData1AllSites[siteId] = [...oldPlantOverviewData1]
        }

        // console.log("oldPlantOverviewData1: ", oldPlantOverviewData1)
        return new Promise((resolve, reject) => resolve(oldPlantOverviewData1AllSites))
    }
    catch (error) {
        console.log("RunPlantOverviewDataError:", error)
        return new Promise((resolve, reject) => reject("RunPlantOverviewDataError:" + error))
    }
}

module.exports.saveDeviceDatainRedis = async () => {

    redisService.saveRunningScheduler({ schedulerRunning: true })

    let endDate = /*'2020-05-05 05:00:00'*/ dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:00") // HH:mm
    let startDate = dateFns.format(dateFns.subMinutes(Date.parse(endDate), 70), "yyyy-MM-dd HH:mm:00")
    const periodTypeArr = ["prevDay", "sevenDay", "prevMonth"]
    //const selectors = "deviceId as equipId,dataType as parameter,ieee,tableName,columnName"
    // const condition = "where dataType is not null"
    // const equipmentMappingData = await this.getEquipmentMappings(selectors, condition)
    const equipmentMappingData = await this.getDeviceInfoBySiteId()
    for (let i = 0; i < equipmentMappingData.length; i++) {
        const d = equipmentMappingData[i]
        for (let j = 0; j < periodTypeArr.length; j++) {
            const periodType = periodTypeArr[j]

            const frequency = periodType === "prevDay" ? 60
                : periodType === "sevenDay" ? 1440
                    : periodType === "prevMonth" ? 1440
                        : 10
            const incrementMinute = periodType === "prevDay" ? 60
                : periodType === "sevenDay" ? 1440
                    : periodType === "prevMonth" ? 1440
                        : 10
            switch (periodType) {
                case "prevDay":
                    endDate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd 00:00:00") // HH:mm
                    startDate = dateFns.format(dateFns.subDays(Date.parse(endDate), 1), "yyyy-MM-dd 00:00:00")
                    break;
                case "sevenDay":
                    endDate = dateFns.format(dateFns.subDays(kumoDate.Date(), 1), "yyyy-MM-dd 00:00:00") // HH:mm
                    startDate = dateFns.format(dateFns.subDays(Date.parse(endDate), 7), "yyyy-MM-dd 00:00:00")
                    break;
                case "prevMonth":
                    endDate = dateFns.format(kumoDate.Date(), "yyyy-MM-01 00:00:00") // HH:mm
                    startDate = dateFns.format(dateFns.subMonths(Date.parse(endDate), 1), "yyyy-MM-dd 00:00:00")
                    break;
            }
            //console.log(startDate,endDate,"prev")
            //const columnName =  `${d.tableName == "pm"? `${d.columnName}/1000 `: d.columnName} as ${d.columnName}`
            const condition = `WHERE ts BETWEEN '${startDate}' AND '${endDate}' AND ieee='${d.ieee}' order by ts asc`
            const selectors = `ts, ${d.columnName}`

            const rawDataRows = await mgmtdb.getRawData(selectors, "iotdata." + d.tableName, condition)
            //console.log(rawDataRows[0].length)
            const rawData = rawDataRows[0].map(v => ({ ts: dateFns.format(Date.parse(v.ts), "yyyy-MM-dd HH:mm"), value: v[d.columnName] }))
            let tmpStartDate = dateFns.toDate(Date.parse(startDate))
            let tmpEndDate = dateFns.addMinutes(tmpStartDate, frequency)
            const tmpData = []
            while (dateFns.compareAsc(tmpEndDate, Date.parse(endDate)) < 1) {
                // console.log("tmpEndData: ", dateFns.format(tmpEndDate, "yyyy-MM-dd HH:mm:ss:SS"), dateFns.format(Date.parse(endDate), "yyyy-MM-dd HH:mm:ss:SS"))
                const dataBetween = rawData.filter(v => dateFns.compareAsc(Date.parse(v.ts), tmpStartDate) > -1 && dateFns.compareAsc(Date.parse(v.ts), tmpEndDate) < 1)
                const sumData = dataBetween.reduce((r, c) => r + (c.value ? c.value : 0), 0)
                const count = dataBetween.reduce((r, c) => c.value > 0 ? r + 1 : r, 0)
                const divider = count > 0 ? count : 1
                const subtractSecond = (periodType === "prevDay" || periodType === "prevMonth") ? 1 : 0
                const value = (sumData / divider).toFixed(2) * 1
                // const ts = dateFns.format( kumoDate.GmtDate(dateFns.subSeconds(tmpEndDate, subtractSecond), true), "yyyy-MM-dd'T'HH:mm:00X" )
                tmpData.push({ //TODO
                    ts: dateFns.format(dateFns.subSeconds(tmpEndDate, subtractSecond), "yyyy-MM-dd HH:mm"),
                    // ts, //: dateFns.format( kumoDate.GmtDate(dateFns.subSeconds(tmpEndDate, subtractSecond), true), "yyyy-MM-dd HH:mm" ),
                    value: value,
                    // count: tmpData.length+1
                })

                tmpStartDate = dateFns.addMinutes(tmpStartDate, incrementMinute)
                tmpEndDate = dateFns.addMinutes(tmpStartDate, frequency)
            }
            const key = `${periodType}_${d.deviceId}_${d.dataType}_${d.siteId}`
            await redisService.savePreviousData(key, tmpData)
            // console.log(key)
        }
    }
    redisService.saveRunningScheduler({ schedulerRunning: false })
    return console.log("Saved device-data in redis..")
}

module.exports.saveDeviceDatainRedisRealtime = async () => {
    // console.log("device-data-realtime in redis..")

    let endDate = /*'2020-05-05 05:00:00'*/ dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:00") // HH:mm
    let startDate = dateFns.format(dateFns.subMinutes(Date.parse(endDate), 70), "yyyy-MM-dd HH:mm:00")

    // console.log("SE: ", startDate, endDate)

    //const selectors = "deviceId as equipId,dataType as parameter,ieee,tableName,columnName"
    //const condition = "where dataType is not null"
    // const equipmentMappingData = await this.getEquipmentMappings(selectors, condition)
    const equipmentMappingData = await this.getDeviceInfoBySiteId()
    for (let i = 0; i < equipmentMappingData.length; i++) {
        try {
            const d = equipmentMappingData[i]
            const periodType = "realtime"
            // console.log(".")

            const frequency = 10
            const incrementMinute = 1;

            // const columnName = `${d.tableName == "pm"? `${d.columnName}/1000 `: d.columnName} as ${d.columnName}`
            const condition = `WHERE ts BETWEEN '${startDate}' AND '${endDate}' AND ieee='${d.ieee}' order by ts asc`
            const selectors = `ts, ${d.columnName}`
            // console.log( `SELECT ${selectors} FROM ${d.tableName} ${condition}`)
            const rawDataRows = await mgmtdb.getRawData(selectors, d.tableName, condition)
            const rawData = rawDataRows[0].map(v => ({ ts: dateFns.format(Date.parse(v.ts), "yyyy-MM-dd HH:mm"), value: v[d.columnName] }))
            let tmpStartDate = dateFns.toDate(Date.parse(startDate))
            let tmpEndDate = dateFns.addMinutes(tmpStartDate, frequency)
            const tmpData = []
            // if(d.equipId==2 && d.parameter==='kw') {
            //     console.log(`>>>> SELECT ${selectors} FROM ${d.tableName} ${condition} | `, rawDataRows, rawData)
            // }
            while (dateFns.compareAsc(tmpEndDate, Date.parse(endDate)) < 0) {
                // console.log("tmpEndData: ", dateFns.format(tmpEndDate, "yyyy-MM-dd HH:mm:ss:SS"), dateFns.format(Date.parse(endDate), "yyyy-MM-dd HH:mm:ss:SS"))
                const dataBetween = rawData.filter(v => dateFns.compareAsc(Date.parse(v.ts), tmpStartDate) > -1 && dateFns.compareAsc(Date.parse(v.ts), tmpEndDate) < 1)
                const sumData = dataBetween.reduce((r, c) => r + (c.value ? c.value : 0), 0)
                const count = dataBetween.reduce((r, c) => c.value > 0 ? r + 1 : r, 0)
                const divider = count > 0 ? count : 1
                const subtractSecond = (periodType === "prevDay" || periodType === "prevMonth") ? 1 : 0
                const value = (sumData / divider).toFixed(2) * 1
                //  if(d.equipId == 2 && d.parameter == "kw"){
                //     console.log("sumData:", sumData,"count:",count,"value:",value)
                //  }
                // const ts = dateFns.format( kumoDate.GmtDate(dateFns.subSeconds(tmpEndDate, subtractSecond), true), "yyyy-MM-dd'T'HH:mm:00X" )
                tmpData.push({ //TODO
                    ts: dateFns.format(dateFns.subSeconds(tmpEndDate, subtractSecond), "yyyy-MM-dd HH:mm"),
                    // ts, //: dateFns.format( kumoDate.GmtDate(dateFns.subSeconds(tmpEndDate, subtractSecond), true), "yyyy-MM-dd HH:mm" ),
                    value: value,
                    // count: tmpData.length+1
                })

                tmpStartDate = dateFns.addMinutes(tmpStartDate, incrementMinute)
                tmpEndDate = dateFns.addMinutes(tmpStartDate, frequency)
            }
            const key = `${periodType}_${d.deviceId}_${d.dataType}_${d.siteId}`
            //  console.log(key, tmpData)
            await redisService.savePreviousData(key, tmpData)

        } catch (error) {
            console.log("error: ", error)
        }
    }
    console.log("Saved device-data-realtime in redis..")
}


module.exports.getSpChillerOverviewMinutely = async (id) => {

    try {
        const deviceList = await aimgmtdb.getDeviceForChiller()
        let chillerList = deviceList[0]
        if (id) {
            chillerList = chillerList.filter(d => d.deviceId == id)
        }
        const rawData = await aimgmtdb.getChillerOverviewMinutely()
        console.log(rawData[0])
        const result = await chillerList.map(d => {
            const rawList = rawData[0].filter(raw => raw.deviceId == d.deviceId)
            const dataTypeList = rawList.reduce((r, c) => {
                //console.log(c.value,"value",c.dataType)
                return ({ ...r, [c.dataType]: c.value > 0 ? parseFloat(c.value.toFixed(2)) : 0 })
            }, {})
            return ({ ...d, ...dataTypeList })
        })
        return result
    }
    catch (error) {
        throw error.toString()
    }
}

//sp plant overviews

module.exports.getSpPlantOverviewHourly = async () => {

    try {
        const rawData = await aimgmtdb.getPlantOverviewHourly()
        const result = rawData[0].reduce((r, c) => {
            const R = [...r]
            const index = R.findIndex(v => v.dataType == c.dataType)
            if (index == -1) {
                R.push({ dataType: c.dataType, data: [{ value: c.value > 0 ? parseFloat(c.value.toFixed(2)) : 0, ts: dateFns.format(c.ts, "HH:mm") }] })
            }
            else {
                R[index].data.push({ value: c.value > 0 ? parseFloat(c.value.toFixed(2)) : 0, ts: dateFns.format(c.ts, "HH:mm") })
            }
            return R
        }, [])
        return result
    }
    catch (error) {
        throw error.toString()
    }
}

module.exports.getDeviceAndParameterMapping = (siteId) => {
    return aimgmtdb.getDeviceAndParameterMapping(siteId).then(data => {
        let dataWithDelta = data[0].length == 0 ? [] :
            data[0].reduce((r, c, i) => {
                let deviceId = c.deviceParameter.split(":")[0];
                let devParam = c.deviceParameter.split(":")[1];
                let equipId = c.deviceIdParameter.split(":")[0];
                let R = [...r];
                let indexChw = R.findIndex((a) => a.deviceIdParameter == `${equipId}:chwdelta_temp`)
                let indexCw = R.findIndex((a) => a.deviceIdParameter == `${equipId}:cwdelta_temp`)
                if ((indexChw == -1 && (devParam == 'chwr_temp' || devParam == 'chws_temp'))
                    || (indexCw == -1 && (devParam == 'cwr_temp' || devParam == 'cws_temp'))) {
                    R.push({
                        equipId: parseInt(equipId),
                        deviceParameter: (devParam == 'chwr_temp' || devParam == 'chws_temp') ?
                            `${deviceId}:chwdelta_temp` : `${deviceId}:cwdelta_temp`,
                        deviceIdParameter: (devParam == 'chwr_temp' || devParam == 'chws_temp') ?
                            `${equipId}:chwdelta_temp` : `${equipId}:cwdelta_temp`,
                        siteId: c.siteId
                    })
                }
                if (indexCw == -1 && (devParam == 'cwr_temp' || devParam == 'cws_temp')) {
                    R.push({
                        equipId: parseInt(equipId),
                        deviceParameter: `${deviceId}:cwdelta_temp`,
                        deviceIdParameter: `${equipId}:cwdelta_temp`,
                        siteId: c.siteId
                    })
                }
                return R;
            }, data[0])
        //console.log("delta",dataWithDelta)
        return dataWithDelta
    }).catch(error => {
        throw error
    })
}

//get count for each device
module.exports.saveRawCount = async (siteId) => {
    // console.log(dateFns.format(kumoDate.Date(),"yyyy-MM-dd HH:mm:ss"))
    const endDate = "2020-07-01 11:00:00"//dateFns.format(kumoDate.Date(),"yyyy-MM-dd HH:mm:ss")
    const startDate = dateFns.format(dateFns.subMinutes(new Date(endDate), 10), "yyyy-MM-dd HH:mm:ss")
    console.log("saveRawCount: startDate", startDate, " endDate:", endDate)
    const mappings = await aimgmtdb.getMappingForEachDeviceId(siteId)
    const mappingArr = mappings[0]
    let query = ""
    for (let i = 0; i < mappingArr.length; i++) {
        const mappingData = mappingArr[i]
        query += `select count(*) as count from ${mappingData.tableName} where ieee = '${mappingData.ieee}' and ts between '${startDate}' and '${endDate}';`
    }
    const rawCountForEachDevice = await mgmtdb.getRawCountForEachDevice(query)
    const result = rawCountForEachDevice[0].map((v, k) => {
        return ({
            siteId: mappingArr[k].siteId, deviceId: mappingArr[k].deviceId, equipId: mappingArr[k].equipId,
            dataType: mappingArr[k].dataType, startDate: startDate, endDate: endDate, count: v[0].count
        })
    })
    return result
}

module.exports.getDeviceSpecification = async ({ siteId,equipId }) => {
    const DeviceSpecificationList = await aimgmtdb.getDeviceSpec(siteId,equipId)
    // console.log("DeviceSpecificationList : ", DeviceSpecificationList[0])
    return DeviceSpecificationList[0]
}


// Helper methods
const groupColumnNamesAndIEEEsTableName = (data) => data.reduce((r1, d1) => {
    const R = { ...r1 }
    if (!R[d1.tableName]) R[d1.tableName] = { tableName: d1.tableName, columnNames: [], ieees: [] }
    if (R[d1.tableName].columnNames.findIndex(v => v === d1.columnName) === -1)
        R[d1.tableName].columnNames.push(d1.columnName)
    if (R[d1.tableName].ieees.findIndex(v => v === d1.ieee) === -1)
        R[d1.tableName].ieees.push(d1.ieee)
    return R
}, {})

const commaSeparatedString = (stringArray) => {
    return stringArray.reduce((r, c, i) => {
        if (i === 0) return c
        else return `${r},${c}`
    }, "")
}

const commaSeparatedStringWithQuote = (stringArray) => {
    return stringArray.reduce((r, c, i) => {
        if (i === 0) return `'${c}'`
        else return `${r},'${c}'`
    }, "")
}