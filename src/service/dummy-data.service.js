const aimgmtdb = require('../db/aimgmt.db')
const redisService = require("../service/redis.service")
const chillerService = require('../service/chiller.service')
const anomalyService = require('../service/anomaly.service')
const siteService = require("../service/site.service")
const mgmtdb = require('../db/iotmgmt.db')
const redisData = require('../constant/redisdata')
const dateFns = require('date-fns')
const dateFnsZone = require('date-fns-tz')
const kumoDate = require("../config/kumoDate")
const { data } = require('../config/generalAlertConfig')

module.exports.loadDummyData = async (dataType, deviceId, startDate, endDate) => {
    const diffInMinutes = dateFns.differenceInMinutes(Date.parse(endDate), Date.parse(startDate))
    // console.log(dateFns.differenceInMinutes)
    try {
        const conditionMap = `where dataType='${dataType}' and deviceId='${deviceId}'`
        const selectorsMap = `columnName , tableName, ieee`
        const data1 = await chillerService.getDeviceMappings(selectorsMap, conditionMap)
        // console.log(data1)
        if (data1.length === 0) return []
        const columnNameMap = data1[0].columnName;
        const selectors = `${columnNameMap},ts`
        const tableName = data1[0].tableName
        const ieee = data1[0].ieee

        const condition = `where ts between '${startDate}' and '${endDate}' and ieee='${ieee}' and ${columnNameMap} is not null order by ts asc`
        // console.log("condition: ", condition)

        const data = await mgmtdb.getRawData(selectors, tableName, startDate ? condition : "")
        if (data[0].length === 0) return []
        // let resultedRawData = data[0].map(v => ({ ts: dateFns.format(dateFnsZone.utcToZonedTime(dateFnsZone.zonedTimeToUtc(v.ts, kumoDate.utcZone), kumoDate.timeZone), kumoDate.dateFormatNoSec), value: v[columnNameMap] || 0 }))
        let resultedRawData = data[0].map(v => ({ ts: dateFns.format(/*kumoDate.GmtToUtc*/(v.ts), kumoDate.dateFormatNoSec), value: v[columnNameMap] || 0 }))
        return resultedRawData.length > 1000 ? resultedRawData.filter((r, i) => i % 5 === 0) : resultedRawData
    } catch (error) {
        throw error
    }
}

module.exports.loadDummyDataInner = async (dataType, deviceId, startDate, endDate) => {
    const numOfHour = dateFns.differenceInHours(Date.parse(endDate), Date.parse(startDate))
    const condition = `where dataType='${dataType}' and deviceId='${deviceId}'`
    const selectors = `columnName , tableName, ieee`
    const data1 = await chillerService.getDeviceMappings(selectors, condition)//.then(data1 => {
    if (data1.length === 0) return []
    else {
        const selectors = `${data1[0].columnName},ts`
        const tableName = data1[0].tableName
        const condition = `where ts between '${startDate}' and '${endDate}' and ${data1[0].columnName}>0 and ieee in('${data1[0].ieee}') order by ts asc`
        const data = await mgmtdb.getRawData(selectors, tableName, startDate ? condition : "")//.then(data => {
        // console.log("Length: " + data[0].length)
        if (data[0].length === 0) return []
        let resultedRawData = data[0].map(v => ({ ts: Date.parse(v.ts), value: v[data1[0].columnName] || 0 }))
        if (numOfHour >= 1) {
            resultedRawData = resultedRawData.filter((r, i) => i % 5 == 0)
        }
        return resultedRawData
    }
}


module.exports.eightDaysData = async (year1, year2) => {
    // return new Promise((resolve, reject) => {
    try {
        console.log("start: ", new Date())

        try {
            await redisService.saveRunningScheduler({ schedulerRunning: true })
        } catch(error) {
            console.log("Exception : Running scheduler( schedulerRunning: true ). eightDaysData")
        }

        aimgmtdb.deleteYealyEightDay({ year1, year2 })
            .then(r => console.log("Deleted yearly 8 days! ", r))

        //for year 1
        let start = dateFns.startOfYear(Date.parse(year1))
        let end = dateFns.endOfYear(Date.parse(year2))

        const resultedData = []

        let tmpStart = dateFns.startOfDay(start)
        while (dateFns.compareAsc(tmpStart, end) < 1) {
            let tmpEnd = dateFns.endOfDay(dateFns.addDays(tmpStart, 7))
            const year = dateFns.getYear(tmpStart)
            const tmpEndYear = dateFns.getYear(tmpEnd)
            if (year < tmpEndYear) tmpEnd = dateFns.endOfYear(tmpStart)

            if (resultedData.findIndex(d => d.year === year.toString()) === -1) resultedData.push({ year: year.toString(), data: [] })
            const yearIndex = resultedData.findIndex(d => d.year === year.toString())

            resultedData[yearIndex].data.push({
                startDate: tmpStart,
                endDate: tmpEnd,
                // count: count,
                // dataType: data.key,
                // deviceId: data.deviceId
            })

            tmpStart = dateFns.toDate(dateFns.addSeconds(tmpEnd, 1))

            tmpStart = dateFns.toDate(dateFns.addSeconds(tmpEnd, 1))

        }


        const dataLists = await aimgmtdb.getAllDeviceAndEquipmentAd()//await chillerService.getAllDataTypes()
        const dataList = dataLists[0]
        // console.log(dataList,"dadtaList")
        for (let i1 = 0; i1 < dataList.length; i1++) {
            const data = dataList[i1]
            //console.log("running data : ", data.equipId + " : " + data.key)

            // const anomalyData = await anomalyService.
            //     getAnomalyDataInner({ dataType: data.key,deviceId: data.equipId, startDate: dateFns.format(start, "yyyy-MM-dd HH:mm:ss"), endDate: dateFns.format(end, "yyyy-MM-dd HH:mm:ss") })

            const dummyData = await this.loadDummyDataInner(data.key, data.deviceId, dateFns.format(start, "yyyy-MM-dd HH:mm:ss"), dateFns.format(end, "yyyy-MM-dd HH:mm:ss")) // chws_temp

            const resultedDataKeys = Object.keys(resultedData)
            for (let i2 = 0; i2 < resultedDataKeys.length; i2++) {
                const resultedDataForYear = resultedData[resultedDataKeys[i2]]
                const resultedDataForYearData = resultedDataForYear.data

                for (let i3 = 0; i3 < resultedDataForYearData.length; i3++) {
                    const resultDataForPeriod = resultedDataForYearData[i3]
                    const dataForDate = dummyData.filter(v => dateFns.compareAsc(v.ts, resultDataForPeriod.startDate) >= 0 && dateFns.compareAsc(v.ts, resultDataForPeriod.endDate) <= 0)
                    //const anomalyDataForDate = anomalyData.filter(v => dateFns.compareAsc(v.startDate, resultDataForPeriod.startDate) >= 0 && dateFns.compareAsc(v.endDate, resultDataForPeriod.endDate) <= 0)
                    const count = dataForDate.length
                    resultDataForPeriod.count = count
                    resultDataForPeriod.anomalyCount = 0
                    resultDataForPeriod.dataType = data.key
                    resultDataForPeriod.deviceId = data.deviceId
                    resultDataForPeriod.siteId = data.siteId
                    console.log("Result is ", resultDataForPeriod.siteId, ":", resultDataForPeriod.deviceId, ":", resultDataForPeriod.dataType)
                    await aimgmtdb.saveYealyEightDay({
                        year: resultedDataForYear.year,
                        deviceId: resultDataForPeriod.deviceId,
                        dataType: resultDataForPeriod.dataType,
                        count: resultDataForPeriod.count,
                        startDate: dateFns.format(resultDataForPeriod.startDate, "yyyy-MM-dd"),
                        endDate: dateFns.format(resultDataForPeriod.endDate, "yyyy-MM-dd"),
                        anomalyCount: resultDataForPeriod.anomalyCount,
                        siteId: resultDataForPeriod.siteId,
                    })
                        .then(data => null)
                        .catch(error => console.error(error.toString()))
                }
            }

        }
        console.log("done: ", new Date())
        try {
            await redisService.saveRunningScheduler({ schedulerRunning: false })
        } catch(error) {
            console.log("Exception : Running scheduler( schedulerRunning: false ). eightDaysData")
        }
        return resultedData
    } catch (error) {
        console.log("error: ", error.stack)
        throw error
    }
}


module.exports.readEightDayDataWithAnomaly = async ({ dataType, deviceId, algo_id, siteId }) => {
    console.log(deviceId, dataType)
    try {
        //const yearlyEightDayData = await ibpemdb.loadYearlyEightDayData({ dataType, deviceId,algo_id })
        const yearlyEightDayData = await aimgmtdb.getEightDaysData({ dataType, deviceId, algo_id, siteId })
        // console.log("eight day data :", yearlyEightDayData[0].map(v => v))
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

module.exports.readEightDayDataWithAnomaly1 = async ({ dataType, deviceId, algo_id }) => {
    console.log(deviceId, dataType)
    try {
        const yearlyEightDayData = await aimgmtdb.loadAnomalyYearlyEightDayData({ dataType, deviceId, algo_id })
        //console.log("eight day data :", yearlyEightDayData[0].map(v => v.year ))
        const data = yearlyEightDayData[0].reduce((r, c) => {
            const R = [...r]
            const index = r.findIndex(v => v.year == c.year)
            const indexx = index === -1 ? R.length : index
            if (index === -1) R[indexx] = { year: c.year, data: [] }
            R[indexx].data.push({
                startDate: dateFns.format(Date.parse(c.startDate), "yyyy-MM-dd"),
                endDate: dateFns.format(Date.parse(c.endDate), "yyyy-MM-dd"),
                count: parseInt(c.count),
                dataState: [
                    { stateId: 0, dataCount: parseInt(c.count) - parseInt(c.anomalyCount) },
                    { stateId: 1, dataCount: parseInt(c.anomalyCount) },
                ]
            })
            return R
        }, [])
        return data
    } catch (error) {

        throw error
    }
}

module.exports.readEightDayDataWithFdd = async ({ deviceId, algo_id, siteId }) => {
    //console.log(deviceId, algo_id)
    try {
        //const yearlyEightDayData = await ibpemdb.loadFddYearlyEightDayData({ deviceId,algo_id })
        //console.log("eight day data :", yearlyEightDayData[0].map(v => v.year ))
        const yearlyEightDayData = await aimgmtdb.getFddEightDaysData({ deviceId, algo_id, siteId })
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


//eight days for anomaly detection
module.exports.eightDaysDataforAnomalyDetection = async ({ year, algoId, siteId }) => {
    try {
        console.log("start: ", new Date(), year)
        const startDate = dateFns.format(dateFns.startOfYear(Date.parse(year)), "yyyy-MM-dd HH:mm:ss")
        const endDate = dateFns.format(dateFns.endOfYear(Date.parse(year)), "yyyy-MM-dd HH:mm:ss")

        const dataList = await chillerService.getAllDataTypesAnomaly(siteId)
        let resultedData = []
        for (let i = 0; i < dataList.length; i++) {
            result = dataList[i]
            let start = dateFns.startOfYear(Date.parse(year))
            let end = dateFns.endOfYear(Date.parse(year))
            let tmpStart = dateFns.startOfDay(start)
            const rawDataCount = await mgmtdb.getRawCountforAnomaly(result.tableName, result.ieee, startDate, endDate)
            while (dateFns.compareAsc(tmpStart, end) < 1) {
                let tmpEnd = dateFns.endOfDay(dateFns.addDays(tmpStart, 7))
                const year = dateFns.getYear(tmpStart)
                const tmpEndYear = dateFns.getYear(tmpEnd)
                if (year < tmpEndYear) tmpEnd = dateFns.endOfYear(tmpStart)
                const rawCount = rawDataCount[0].
                    filter(d => dateFns.compareAsc(d.ts, tmpStart) >= 0 && dateFns.compareAsc(d.ts, tmpEnd) <= 0)
                    .reduce((r, c) => r + parseInt(c.count), 0)
                resultedData.push({
                    siteId: siteId,
                    deviceId: result.deviceId,
                    dataType: result.key,
                    year: year.toString(),
                    startDate: dateFns.format(tmpStart, "yyyy-MM-dd"),
                    endDate: dateFns.format(tmpEnd, "yyyy-MM-dd"),
                    count: rawCount,
                    anomalyCount: 0
                })

                tmpStart = dateFns.toDate(dateFns.addSeconds(tmpEnd, 1))

                tmpStart = dateFns.toDate(dateFns.addSeconds(tmpEnd, 1))

            }
        }

        const values = resultedData.map(v => Object.values(v))
        //console.log(values,"vales")
        await aimgmtdb.eightDaysDataforAnomalyDetection({ values })
            .then(data => null)
            .catch(error => console.log(error.toString(), "eightdays ad save error"))
        return []

    }
    catch (error) {
        console.log("error: ", error)
        throw error.toString()
    }

}

//eight days for fault detection
module.exports.eightDaysDataforFaultDetection = async ({ year, algoId, siteId,month }) => {
    try {
        console.log("start: ", new Date(), year)
        const startDate = dateFns.format(dateFns.startOfYear(Date.parse(year)), "yyyy-MM-dd HH:mm:ss")
        const endDate = dateFns.format(dateFns.endOfYear(Date.parse(year)), "yyyy-MM-dd HH:mm:ss")

        //console.log("startDate endDate",startDate,endDate)

        const allDataList = await aimgmtdb.getAllDeviceAndEquipment(siteId)
        const dataList = allDataList[0]
        const deviceAndIeeeList = (await aimgmtdb.getFddDeviceMapping(siteId))[0]
        let resultedData = []
        for (let i = 0; i < dataList.length; i++) {
            result = dataList[i]
            let start = dateFns.startOfYear(Date.parse(year))
            let end = dateFns.endOfYear(Date.parse(year))
            let tmpStart = dateFns.startOfDay(start)
            let query = ""
            const fddDevice = deviceAndIeeeList.filter(d => d.equipId == result.equipId)
            //console.log("fddDevice is ",fddDevice)
            for (let i = 0; i < fddDevice.length; i++) {
                const tableName = fddDevice[i].tableName
                const ieeeList = fddDevice[i].ieee
                // query += (i == fddDevice.length - 1) ? `select count(*) as count,date(ts) as ts from iotmgmt.${tableName} where
                //         ts between '${startDate}' and '${endDate}' and ieee in (${ieeeList}) group by date(ts) union all 
                //         select count(*) as count,date(ts) as ts from iotdata.${tableName} where
                //         ts between '${startDate}' and '${endDate}' and ieee in (${ieeeList}) group by date(ts) ` :
                //     `select count(*) as count,date(ts) as ts from iotmgmt.${tableName} where 
                //         ts between '${startDate}' and '${endDate}' and ieee in (${ieeeList}) group by date(ts) union all
                //         select count(*) as count,date(ts) as ts from iotdata.${tableName} where
                //         ts between '${startDate}' and '${endDate}' and ieee in (${ieeeList}) group by date(ts) union all `
         
                const tblMonth=month?`${tableName}_${month}`:tableName;

                query += (i == fddDevice.length - 1) ? `select count(*) as count,date(ts) as ts from dataPlatform${year}.${tblMonth} where
                        ts between '${startDate}' and '${endDate}' and name in (${ieeeList}) group by date(ts) union all 
                        select count(*) as count,date(ts) as ts from dataPlatform${year}.${tblMonth} where 
                        siteId!=1000 and
                        ts between '${startDate}' and '${endDate}' and name in (${ieeeList}) group by date(ts) ` :
                    `select count(*) as count,date(ts) as ts from dataPlatform${year}.${tblMonth} where 
                        siteId!=1000 and
                        ts between '${startDate}' and '${endDate}' and name in (${ieeeList}) group by date(ts) union all
                        select count(*) as count,date(ts) as ts from dataPlatform${year}.${tblMonth} where
                        ts between '${startDate}' and '${endDate}' and name in (${ieeeList}) group by date(ts) union all `
           
            }
            console.log(query)
            const rawDataCount = await mgmtdb.getRawCount(query)
            //console.log(result.equipId,rawDataCount[0])
            while (dateFns.compareAsc(tmpStart, end) < 1) {
                let tmpEnd = dateFns.endOfDay(dateFns.addDays(tmpStart, 7))
                const year = dateFns.getYear(tmpStart)
                const tmpEndYear = dateFns.getYear(tmpEnd)
                if (year < tmpEndYear) tmpEnd = dateFns.endOfYear(tmpStart)
                const rawCount = rawDataCount[0].
                    filter(d => dateFns.compareAsc(d.ts, tmpStart) >= 0 && dateFns.compareAsc(d.ts, tmpEnd) <= 0)
                    .reduce((r, c) => r + parseInt(c.countt), 0)
                //console.log(rawCount,"date",tmpStart,tmpEnd)

                resultedData.push({
                    algoId: algoId,
                    equipId: result.equipId,
                    deviceId: result.deviceId,
                    year: year.toString(),
                    startDate: dateFns.format(tmpStart, "yyyy-MM-dd 00:00:00"),
                    endDate: dateFns.format(tmpEnd, "yyyy-MM-dd 23:59:59"),
                    count: rawCount,
                    anomalyCount: 0,
                    siteId: siteId
                })

                tmpStart = dateFns.toDate(dateFns.addSeconds(tmpEnd, 1))

                // tmpStart = dateFns.toDate(dateFns.addSeconds(tmpEnd, 1))

            }
        }
        // console.log(resultedData)
        const values = resultedData.map(v => Object.values(v))
        // console.log("values: ", values)
        await aimgmtdb.eightDaysDataforFaultDetection({ values })
            .then(data => null)
            .catch(error => console.log(error.toString(), "eightdays fdd save error"))
        return []

    }
    catch (error) {
        console.log("error: ", error)
        throw error.toString()
    }
}



module.exports.getAnomalyEightDaysRealTime = async () => {
    try {
        console.log("update ad eight day raw count is start", new Date())
        const endDate = dateFns.format(kumoDate.UtcToGmt(Date.now()), "yyyy-MM-dd HH:mm:ss")
        const startDate = dateFns.format(dateFns.subHours(Date.parse(endDate), 1), "yyyy-MM-dd HH:mm:ss")
        const sdate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
        const adDatas = (await aimgmtdb.eightDaysAdDataForRealTime(sdate))[0]
        const deviceList = await chillerService.getAllDataTypesAnomaly()
        let resultedData = ""
        for (let i1 = 0; i1 < adDatas.length; i1++) {
            const adData = adDatas[i1]
            const result = deviceList.filter(d => d.deviceId == adData.deviceId && d.key == adData.dataType && d.siteId == adData.siteId)
            //console.log(adData.deviceId,adData.siteId,adData.dataType,"ad")
            if (result.length > 0) {
                const rawCount = await mgmtdb.getRawCountforAnomaly(result[0].tableName, result[0].ieee, startDate, endDate)
                const totalCount = rawCount[0].length > 0 ? rawCount[0][0].count + parseInt(adData.count) : 0 + parseInt(adData.count)
                //console.log("Count :",totalCount)
                resultedData += (i1 == adDatas.length - 1) ? `(${adData.id},${totalCount})` : `(${adData.id},${totalCount}),`
            }
        }
        //console.log("result is",resultedData)
        await aimgmtdb.updateAdRealTimeCount(resultedData)
        console.log("update ad eight day raw count is done", new Date())
    }
    catch (error) {
        console.log("Realtime eight days anomaly update error:", error)
    }


}

module.exports.spForAnomalyEightDaysYearly = (year) => {
    return aimgmtdb.spForAnomalyEightDaysYearly(year).then(data => {
        return data
    }).catch(error => {
        throw error.toString()
    })
}

module.exports.getRawData = async (startDate, endDate, dataType, deviceType, returnType, parameter, siteId) => {
    try {
        let deviceId = null
        let condition = ``
        let delTaArr = [];
        const deltaTemps = "delta_temp"
        const deviceList = (await aimgmtdb.selectQueryComplex(`SELECT id, equipId from aimgmt.device where siteId='${siteId}'`))[0]

        const deviceParameter = parameter.split(",").reduce((r,c)=> {
            let param = c.split(":")[1]
            const equipId = deviceList.reduce((r,c1)=> c1.id==c.split(":")[0] ? c1.equipId : r, null) 
            if(param.includes(deltaTemps)) {
                let newParam = param.replace(deltaTemps, "")
                param = `${newParam}r_temp-${newParam}s_temp AS ${param}`
            }
            return ([...r, { deviceId: c.split(":")[0], param, oparam: c.split(":")[1], equipId }])
        }, [])
        const siteInfo = (await siteService.getSiteInfo({ siteId }))[0]
        // console.log("siteInfo: ", siteInfo, deviceList, deviceParameter)
        const rawOffset = kumoDate.offsetZone(siteInfo.raw_timezone)

        let query = "";
        
        let metaDataQuery="SHOW COLUMNS FROM aimgmt.sensor_real_time"
        const metaData = (await aimgmtdb.selectQueryComplex(metaDataQuery))[0];
        const metaDataCol=metaData.length?metaData.map(m=>m.Field):null;
        
        for(let dp of deviceParameter) {
            const equipId = deviceList.reduce((r,c)=> c.id==dp.deviceId ? c.equipId : r, null)
            if(equipId && (metaDataCol.find(f=>f===dp.param)) || dp.param.includes("AS"))
                query += `SELECT CONVERT_TZ(ts, '${rawOffset}', '+00:00') AS ts, ${dp.param} from aimgmt.sensor_real_time WHERE site_id='${siteId}' and equip_id='${equipId}' and CONVERT_TZ(ts, '${rawOffset}', '+00:00') between '${startDate}' and '${endDate}';
` 
        }
        const rawDataPre = (await aimgmtdb.selectQueryComplex(query))[0]
        if(rawDataPre.length===0) return ([{ 
            deviceId: deviceId, data: [] 
        }])
        const rawData =  deviceParameter.length>1 ? rawDataPre : [rawDataPre]
        const rawDataLength = rawData.length
        // console.log("rawData.length: ", rawDataLength)
        const returnResultedData = [];
        if (returnType) {
            for(let i=0; i<rawDataLength; i++) {
                const r = rawData[i]
                const c = deviceParameter[i]
                const rLength = r.length
                const tmpData = []
                for(let j=0; j<rLength; j++) {
                    const tmpC = r[j]
                    tmpData.push([
                        dateFns.format(new Date(tmpC.ts), "yyyy-MM-dd HH:mm"),
                        tmpC[c.oparam] ? parseFloat(tmpC[c.oparam].toFixed(2)) : 0
                    ])
                }
                returnResultedData.push({
                    data: tmpData,
                    deviceId: parseInt(c.deviceId),
                    equipId: c.equipId,
                    dataType: c.oparam
                })
            }
        } else {
            for(let i=0; i<rawDataLength; i++) {
                const r = rawData[i]
                const c = deviceParameter[i]
                const rLength = r.length
                const tmpData = []
                for(let j=0; j<rLength; j++) {
                    const tmpC = r[j]
                    tmpData.push({
                        ts: dateFns.format(new Date(tmpC.ts), "yyyy-MM-dd HH:mm"),
                        value: tmpC[c.param] ? parseFloat(tmpC[c.param].toFixed(2)) : 0
                    })
                }
                returnResultedData.push({
                    data: tmpData,
                    deviceId: parseInt(c.deviceId),
                    equipId: c.equipId,
                    dataType: c.oparam
                })
            }
        }
        return returnResultedData
    } catch (error) {
        console.error(error)
        return ([{ data: [] }])
    }
}

module.exports.getRawDataOld = async (startDate, endDate, dataType, deviceType, returnType, parameter, siteId) => {
    try {
        console.log({ startDate, endDate })
        let deviceId = null
        let condition = ``
        let delTaArr = [];
        if (!parameter) {
            condition += dataType ? `dataType ='${dataType}'` : ``
            condition += deviceType ? ` and device.deviceType ='${deviceType}'` : ``
            condition += siteId ? ` and device.siteId ='${siteId}'` : ``
        }
        else {
            const devInfos = parameter.split(",").filter(d => d.split(":")[1].trim() != "cwdelta_temp" && (d.split(":")[1].trim() != "chwdelta_temp"))
            for (let i1 = 0; i1 < devInfos.length; i1++) {
                const devInfo = devInfos[i1]
                const devId = parseInt(devInfo.split(":")[0].trim())
                deviceId = devId
                const dType = (devInfo.split(":")[1]).trim()
                condition += (i1 == devInfos.length - 1) ? ` deviceId = ${devId} and dataType ='${dType}' and device.siteId='${siteId}'`
                    : ` deviceId = ${devId} and dataType ='${dType}' and device.siteId='${siteId}' or `
            }
            // }


            const delInfo = parameter.split(",").filter(d => d.split(":")[1].trim() == "cwdelta_temp" || d.split(":")[1].trim() == "chwdelta_temp")

            for (let i1 = 0; i1 < delInfo.length; i1++) {
                const devInfo = delInfo[i1]
                const devId = parseInt(devInfo.split(":")[0].trim())
                const dType = (devInfo.split(":")[1]).trim()
                delTaArr.push({
                    returnCondition: ` deviceId = ${devId} and dataType ='${dType === "chwdelta_temp" ? "chwr_temp" : "cwr_temp"}' and device.siteId='${siteId}' `,
                    supplyCondition: ` deviceId = ${devId} and dataType ='${dType === "chwdelta_temp" ? "chws_temp" : "cws_temp"}' and device.siteId='${siteId}' `,
                    deviceId: devId,
                    dataType: dType
                })
            }
            // for condenser and chilled water temperature delta temp
            for (let d = 0; d < delTaArr.length; d++) {

                let deltaInfo = delTaArr[d];
                if (!condition.trim().includes(deltaInfo.returnCondition.trim())) {
                    condition += devInfos.length>0 || d!=0 ?" or ":""
                    condition += deltaInfo.returnCondition;
                }

                if (!condition.trim().includes(deltaInfo.supplyCondition.trim())) {
                    condition += " or "
                    condition += deltaInfo.supplyCondition
                }
            }

        }

        const rawInfoDatas = await aimgmtdb.getRawInfoData(condition)
        if (rawInfoDatas[0].length == 0) return ([{ deviceId: deviceId, data: [] }])
        const rawInfoData = rawInfoDatas[0] /*devInfos.length > 1 ? rawInfoDatas[0] : [rawInfoDatas[0]]*/
        //console.log(rawInfoData,"rawInfoData")

        const forSite = await siteService.getSiteInfo({ siteId })
        if (forSite.length === 0) return ([{ data: [] }])
        const site = forSite[0] // New done by nayhtet

        //console.log("Offset: ", site.raw_timezone, " :: ", kumoDate.offsetZone(site.raw_timezone))
        const rawOffset = kumoDate.offsetZone(site.raw_timezone)
        const offset = kumoDate.offsetZone(site.timezone)
        //console.log(rawOffset,"rawOffset")
        let query = ""
        for (let i = 0; i < rawInfoData.length; i++) {
            const infoData = rawInfoData[i]
            //console.log("rawInfoData[i]: ", rawInfoData[i])
            // query += `SELECT ts, ${infoData.columnName}
            //    from ${infoData.tableName} where ieee= '${infoData.ieee}' 
            //    and ts between '${startDate}' and '${endDate}' and ${infoData.columnName} is not null order by ts asc;`

            query += `SELECT * 
                FROM (
                    SELECT CONVERT_TZ(ts, '${rawOffset}', '+00:00') as ts, ${infoData.columnName}
                    from iotmgmt.${infoData.tableName} where ieee= '${infoData.ieee}' 
                    and ts between CONVERT_TZ('${startDate}', '+00:00', '${rawOffset}') and CONVERT_TZ('${endDate}', '+00:00', '${rawOffset}') and ${infoData.columnName} is not null
                    UNION 
                    SELECT CONVERT_TZ(ts, '${rawOffset}', '+00:00') as ts, ${infoData.columnName}
                    from iotdata.${infoData.tableName} where ieee= '${infoData.ieee}' 
                    and ts between CONVERT_TZ('${startDate}', '+00:00', '${rawOffset}') and CONVERT_TZ('${endDate}', '+00:00', '${rawOffset}') and ${infoData.columnName} is not null
                ) t
                order by ts asc; `
        }
        console.log("query::::",query)
        const results = await mgmtdb.getParameterBasedRawData(query)
        const result = rawInfoData.length > 1 ? results : [[results[0]]]
        // return {}        

        // fill fake data 
        let resultedData = []
        const increment = dateFns.differenceInSeconds(new Date(endDate), new Date(startDate)) / 100
         resultedData=result[0]
        // for (let i = 0; i < result[0].length; i++) {
        //     const data1 = result[0][i]
        //     if (data1.length === 0) {
        //         const dataFake = Array(100).fill({}).map((v, k) => ({
        //             ts: dateFns.format(dateFns.addSeconds(new Date(startDate), increment * k), "yyyy-MM-dd HH:mm"),
        //             value: 0
        //         }))
        //         resultedData.push(dataFake)
        //     }
        //     else {
        //         const increment = (data1.length > 1)
        //             ? dateFns.differenceInSeconds(new Date(data1[1].ts), new Date(data1[0].ts))
        //             : (dateFns.differenceInSeconds(new Date(endDate), new Date(startDate)) / 100)
        //         while (dateFns.isBefore(new Date(startDate), new Date(data1[0].ts)) /*dateFns.format(Date.parse(data1[0].ts), "yyyy-MM-dd HH:mm") > startDate*/)
        //             {
        //                 console.log("hello ");
        //                 data1.unshift({ ts: dateFns.subSeconds(new Date(data1[0].ts), Math.floor(increment)), value: 0 
                        
        //                 })}
        //         while (dateFns.isBefore(new Date(data1[data1.length - 1].ts), new Date(endDate)) /* dateFns.format(Date.parse(data1[data1.length - 1].ts), "yyyy-MM-dd HH:mm") < endDate*/)
        //             data1.push({ ts: dateFns.addSeconds(new Date(data1[data1.length - 1].ts), Math.floor(increment)), value: 0 })

        //         // console.log("2 => i: ", i, increment)
        //         resultedData.push(data1)
        //     }

        // }
        // console.log(resultedData)
        
        const returnResultedData = [];
        const resultedDataLength = resultedData.length
        if (returnType) {
            /* returnResultedData = resultedData.map((r, i) =>{ */
            for(let i=0; i<resultedDataLength; i++) {
                const r = resultedData[i]
                const rLength = r.length
                const tmpData = []
                for(let j=0; j<rLength; j++) {
                    const tmpC = r[j]
                    tmpData.push([
                        dateFns.format(new Date(tmpC.ts), "yyyy-MM-dd HH:mm"),
                        tmpC[rawInfoData[i].columnName] ? parseFloat(tmpC[rawInfoData[i].columnName].toFixed(2)) : 0
                    ])
                }
                returnResultedData.push({
                    data: tmpData,
                    deviceId: rawInfoData[i].deviceId ? rawInfoData[i].deviceId : deviceId,
                    equipId: rawInfoData[i].equipId,
                    dataType: rawInfoData[i].dataType
                })
                /*return ({
                    data: r.length > 1000
                        ? r.map(c => [
                            dateFns.format(new Date(c.ts), "yyyy-MM-dd HH:mm"),
                            c[rawInfoData[i].columnName] ? parseFloat(c[rawInfoData[i].columnName].toFixed(2)) : 0
                        ]).filter((v, i) => i % 5 === 0)
                        : r.map(c => [
                            dateFns.format(new Date(c.ts), "yyyy-MM-dd HH:mm"),
                            c[rawInfoData[i].columnName] ? parseFloat(c[rawInfoData[i].columnName].toFixed(2)) : 0
                        ]),
                    deviceId: rawInfoData[i].deviceId ? rawInfoData[i].deviceId : deviceId,
                    equipId: rawInfoData[i].equipId,
                    dataType: rawInfoData[i].dataType
                })*/
            }    
            // })
            // console.log(returnResultedData.length, returnResultedData)
        }
        else {
            for(let i=0; i<resultedDataLength; i++) {
                const r = resultedData[i]
                const rLength = r.length
                const tmpData = []
                for(let j=0; j<rLength; j++) {
                    const tmpC = r[j]
                    tmpData.push({
                        ts: dateFns.format(new Date(tmpC.ts), "yyyy-MM-dd HH:mm"),
                        value: tmpC[rawInfoData[i].columnName] ? parseFloat(tmpC[rawInfoData[i].columnName].toFixed(2)) : 0
                    })
                }
                returnResultedData.push({
                    data: tmpData,
                    deviceId: rawInfoData[i].deviceId ? rawInfoData[i].deviceId : deviceId,
                    equipId: rawInfoData[i].equipId,
                    dataType: rawInfoData[i].dataType
                })
            }
            /*returnResultedData = resultedData.map((r, i) => ({
                data: r.length > 1000 ? r.map(v => ({
                    ts: dateFns.format(new Date(v.ts), "yyyy-MM-dd HH:mm"),
                    value: v[rawInfoData[i].columnName] ? parseFloat(v[rawInfoData[i].columnName].toFixed(2)) : 0
                })).filter((v, i) => i % 5 === 0)
                    : r.map(v => ({
                        ts: dateFns.format(new Date(v.ts), "yyyy-MM-dd HH:mm"),
                        value: v[rawInfoData[i].columnName] ? parseFloat(v[rawInfoData[i].columnName].toFixed(2)) : 0
                    })),
                deviceId: rawInfoData[i].deviceId ? rawInfoData[i].deviceId : deviceId,
                equipId: rawInfoData[i].equipId,
                dataType: rawInfoData[i].dataType
            }))*/
        }
        // console.log("done-- parameter based api")
        // return returnResultedData

        const resDel = returnResultedData 
        const resDelLength = delTaArr.length
        for(let i=0; i<resDelLength; i++) {
            const c = delTaArr[i]
            if (resDel.filter(rr => rr.dataType == c.dataType && c.deviceId == rr.deviceId)) {
                let returnData = [];
                let supplyData = [];
                if (c.dataType == "chwdelta_temp") {
                    returnData = resDel.filter(rd => rd.dataType == "chwr_temp" && c.deviceId == rd.deviceId);
                    supplyData = resDel.filter(rd => rd.dataType == "chws_temp" && c.deviceId == rd.deviceId);
                }
                else {
                    returnData = resDel.filter(rd => rd.dataType == "cwr_temp" && c.deviceId == rd.deviceId);
                    supplyData = resDel.filter(rd => rd.dataType == "cws_temp" && c.deviceId == rd.deviceId);
                }
                // console.log("returnData: ", JSON.stringify(returnData, null, 2))
                let deltaData = returnData.length > 0 ? returnData[0].data.map((v, i) => {
                    if(returnType) {
                        let tempData = supplyData.length > 0 ? supplyData[0].data.filter(sd => sd[0] === v[0]).reduce((r, c) => c[1], 0) : 0;
                        return [v[0], parseFloat((parseFloat(v[1]) - parseFloat(tempData)).toFixed(2))]
                    } else {
                        let tempData = supplyData.length > 0 ? supplyData[0].data.filter(sd => sd.ts === v.ts).reduce((r, c) => c.value, 0) : 0;
                        return ({ ts: v.ts, value: parseFloat((parseFloat(v.value) - parseFloat(tempData)).toFixed(2)) })
                    }
                }) : []
                c.equipId = returnData.length > 0 ?
                    returnData[0].equipId
                    : supplyData.length > 0 ?
                        supplyData[0].equipId
                        : ''
                c.data = deltaData

                delete c.returnCondition;
                delete c.supplyCondition;

                // console.log("deltaData : ", c.dataType)

                resDel.push(c)
            } 
        }

        /*const resDel = delTaArr.reduce((r, c) => {
            let R = [...r]
            if (R.filter(rr => rr.dataType == c.dataType && c.deviceId == rr.deviceId)) {
                let returnData = [];
                let supplyData = [];
                if (c.dataType == "chwdelta_temp") {
                    returnData = R.filter(rd => rd.dataType == "chwr_temp" && c.deviceId == rd.deviceId);
                    supplyData = R.filter(rd => rd.dataType == "chws_temp" && c.deviceId == rd.deviceId);
                }
                else {
                    returnData = R.filter(rd => rd.dataType == "cwr_temp" && c.deviceId == rd.deviceId);
                    supplyData = R.filter(rd => rd.dataType == "cws_temp" && c.deviceId == rd.deviceId);
                }
                let deltaData = returnData.length > 0 ? returnData[0].data.map((v, i) => {
                    let tempData = supplyData.length > 0 ? supplyData[0].data.filter(sd => sd[0] === v[0]).reduce((r, c) => c[1], 0) : 0;
                    return [v[0], parseFloat((parseFloat(v[1]) - parseFloat(tempData)).toFixed(2))]
                }) : []
                c.equipId = returnData.length > 0 ?
                    returnData[0].equipId
                    : supplyData.length > 0 ?
                        supplyData[0].equipId
                        : ''
                c.data = deltaData

                delete c.returnCondition;
                delete c.supplyCondition;
                R.push(c)
            }
            return R;
        }, returnResultedData); */

        console.log("done-- parameter based api")
        
        return resDel;

    }
    catch (error) {
        console.error(error)
        return ([{ data: [] }])
    }
}



// module.exports.getRawData = async (startDate, endDate, dataType, deviceType, returnType, parameter, siteId) => {
//     try {
//         console.log({ startDate, endDate })
//         let deviceId = null
//         let condition = ``
//         if (!parameter) {
//             condition += dataType ? `dataType ='${dataType}'` : ``
//             condition += deviceType ? ` and device.deviceType ='${deviceType}'` : ``
//             condition += siteId ? ` and device.siteId ='${siteId}'` : ``
//         }
//         else {
//             const devInfos = parameter.split(",")
//             for (let i1 = 0; i1 < devInfos.length; i1++) {
//                 const devInfo = devInfos[i1]
//                 const devId = parseInt(devInfo.split(":")[0].trim())
//                 deviceId = devId
//                 const dType = (devInfo.split(":")[1]).trim()
//                 condition += (i1 == devInfos.length - 1) ? ` deviceId = ${devId} and dataType ='${dType}' and device.siteId='${siteId}'`
//                     : ` deviceId = ${devId} and dataType ='${dType}' and device.siteId='${siteId}' or `
//             }
//         }
//         const rawInfoDatas = await aimgmtdb.getRawInfoData(condition)
//         if (rawInfoDatas[0].length == 0) return ([{ deviceId: deviceId, data: [] }])
//         const rawInfoData = rawInfoDatas[0] /*devInfos.length > 1 ? rawInfoDatas[0] : [rawInfoDatas[0]]*/
//         //console.log(rawInfoData,"rawInfoData")

//         const forSite = await siteService.getSiteInfo({ siteId })
//         if (forSite.length === 0) return ([{ data: [] }])
//         const site = forSite[0] // New done by nayhtet

//         //console.log("Offset: ", site.raw_timezone, " :: ", kumoDate.offsetZone(site.raw_timezone))
//         const rawOffset = kumoDate.offsetZone(site.raw_timezone)
//         const offset = kumoDate.offsetZone(site.timezone)
//         //console.log(rawOffset,"rawOffset")
//         let query = ""
//         for (let i = 0; i < rawInfoData.length; i++) {
//             const infoData = rawInfoData[i]
//             //console.log("rawInfoData[i]: ", rawInfoData[i])
//             // query += `SELECT ts, ${infoData.columnName}
//             //    from ${infoData.tableName} where ieee= '${infoData.ieee}' 
//             //    and ts between '${startDate}' and '${endDate}' and ${infoData.columnName} is not null order by ts asc;`

//             query += `SELECT * 
//                 FROM (
//                     SELECT CONVERT_TZ(ts, '${rawOffset}', '+00:00') as ts, ${infoData.columnName}
//                     from iotmgmt.${infoData.tableName} where ieee= '${infoData.ieee}' 
//                     and ts between CONVERT_TZ('${startDate}', '+00:00', '${rawOffset}') and CONVERT_TZ('${endDate}', '+00:00', '${rawOffset}') and ${infoData.columnName} is not null
//                     UNION 
//                     SELECT CONVERT_TZ(ts, '${rawOffset}', '+00:00') as ts, ${infoData.columnName}
//                     from iotdata.${infoData.tableName} where ieee= '${infoData.ieee}' 
//                     and ts between CONVERT_TZ('${startDate}', '+00:00', '${rawOffset}') and CONVERT_TZ('${endDate}', '+00:00', '${rawOffset}') and ${infoData.columnName} is not null
//                 ) t
//                 order by ts asc; `
//         }
//         // console.log("query::::",query)
//         const results = await mgmtdb.getParameterBasedRawData(query)
//         const result = rawInfoData.length > 1 ? results : [[results[0]]]
//         // return {}        

//         // fill fake data 
//         const resultedData = []
//         const increment = dateFns.differenceInSeconds(new Date(endDate), new Date(startDate)) / 100

//         for (let i = 0; i < result[0].length; i++) {
//             const data1 = result[0][i]
//             if (data1.length === 0) {
//                 const dataFake = Array(100).fill({}).map((v, k) => ({
//                     ts: dateFns.format(dateFns.addSeconds(new Date(startDate), increment * k), "yyyy-MM-dd HH:mm"),
//                     value: 0
//                 }))
//                 resultedData.push(dataFake)
//             }
//             else {
//                 const increment = (data1.length > 1)
//                     ? dateFns.differenceInSeconds(new Date(data1[1].ts), new Date(data1[0].ts))
//                     : (dateFns.differenceInSeconds(new Date(endDate), new Date(startDate)) / 100)
//                 while (dateFns.isBefore(new Date(startDate), new Date(data1[0].ts)) /*dateFns.format(Date.parse(data1[0].ts), "yyyy-MM-dd HH:mm") > startDate*/)
//                     data1.unshift({ ts: dateFns.subSeconds(new Date(data1[0].ts), Math.floor(increment)), value: 0 })
//                 while (dateFns.isBefore(new Date(data1[data1.length - 1].ts), new Date(endDate)) /* dateFns.format(Date.parse(data1[data1.length - 1].ts), "yyyy-MM-dd HH:mm") < endDate*/)
//                     data1.push({ ts: dateFns.addSeconds(new Date(data1[data1.length - 1].ts), Math.floor(increment)), value: 0 })

//                 // console.log("2 => i: ", i, increment)
//                 resultedData.push(data1)
//             }

//         }

//         if (returnType) {
//             return resultedData.map((r, i) => ({
//                 // data: r.map(c => [dateFns.format(c.ts, "yyyy-MM-dd HH:mm").getTime(), parseFloat(c[rawInfoData[i].columnName].toFixed(2))]),
//                 data: r.length > 1000
//                     ? r.map(c => [
//                         dateFns.format(new Date(c.ts), "yyyy-MM-dd HH:mm"),
//                         c[rawInfoData[i].columnName] ? parseFloat(c[rawInfoData[i].columnName].toFixed(2)) : 0
//                     ]).filter((v, i) => i % 5 === 0)
//                     : r.map(c => [
//                         dateFns.format(new Date(c.ts), "yyyy-MM-dd HH:mm"),
//                         c[rawInfoData[i].columnName] ? parseFloat(c[rawInfoData[i].columnName].toFixed(2)) : 0
//                     ]),
//                 deviceId: rawInfoData[i].deviceId ? rawInfoData[i].deviceId : deviceId,
//                 equipId: rawInfoData[i].equipId,
//                 dataType: rawInfoData[i].dataType
//             }))
//         }
//         else {
//             return resultedData.map((r, i) => ({
//                 data: r.length > 1000 ? r.map(v => ({
//                     ts: dateFns.format(new Date(v.ts), "yyyy-MM-dd HH:mm"),
//                     value: v[rawInfoData[i].columnName] ? parseFloat(v[rawInfoData[i].columnName].toFixed(2)) : 0
//                 })).filter((v, i) => i % 5 === 0)
//                     : r.map(v => ({
//                         ts: dateFns.format(new Date(v.ts), "yyyy-MM-dd HH:mm"),
//                         value: v[rawInfoData[i].columnName] ? parseFloat(v[rawInfoData[i].columnName].toFixed(2)) : 0
//                     })),
//                 deviceId: rawInfoData[i].deviceId ? rawInfoData[i].deviceId : deviceId,
//                 equipId: rawInfoData[i].equipId,
//                 dataType: rawInfoData[i].dataType
//             }))
//         }

//     }
//     catch (error) {
//         console.error(error)
//         return ([{ data: [] }])
//     }
// }
