const dummyService = require("../service/dummy-data.service.js")
const redisService = require("../service/redis.service")
const response = require('../config/response')

const moment = require('moment')
const { format, set } = require('date-fns')
const anomalyService = require("../service/anomaly.service")
const dateFns = require("date-fns")

module.exports.getDummyData = (req, res) => {
    const dataType = req.query.dataType
    const deviceId = req.query.deviceId
    let sDate = req.query.startDate
    let eDate = req.query.endDate

    // console.log(dataType,deviceId)
    if (!(dataType && deviceId) || (dataType == " ") || (deviceId == " ")) {
        return res.json(response({
            success: false,
            error: 'Please provide dataType and deviceId startDate and endDate'
        }))
    }

    const date1 = moment(sDate)
    const date2 = moment(eDate)

    const result1 = date1.get("hours") == 0 && date1.get("minutes") == 0
    const result2 = date2.get("hours") == 0 && date2.get("minutes") == 0
    if (result1 && result2) {
        //console.log("enter this")
        sDate = format(set(new Date(sDate), { hours: 00, minutes: 00, seconds: 00 }), "yyyy-MM-dd HH:mm:ss")
        eDate = format(set(new Date(eDate), { hours: 23, minutes: 59, seconds: 59 }), "yyyy-MM-dd HH:mm:ss")
    }
    return dummyService.loadDummyData(dataType, deviceId, sDate, eDate).then(data => {
        const increment = dateFns.differenceInSeconds(new Date(eDate), new Date(sDate)) / 100
        //console.log(increment)
        if (data.length === 0) {
            const dataFake = Array(100).fill({}).map((v, k) => ({
                ts: dateFns.format(dateFns.addSeconds(new Date(sDate), increment * k), "yyyy-MM-dd HH:mm"),
                value: 0
            }))
            res.json(response({
                payload: dataFake
            }))
        } else {
            //console.log(data,"first")
            const increment = (data.length > 1) ? dateFns.differenceInSeconds(new Date(data[1].ts), new Date(data[0].ts))
                : (dateFns.differenceInSeconds(new Date(eDate), new Date(sDate)) / 100)
            while (data[0].ts > sDate)
                data.unshift({ ts: dateFns.format(dateFns.subSeconds(new Date(data[0].ts), Math.floor(increment)), "yyyy-MM-dd HH:mm"), value: 0 })
            while (data[data.length - 1].ts < eDate)
                data.push({ ts: dateFns.format(dateFns.addSeconds(new Date(data[data.length - 1].ts), Math.floor(increment)), "yyyy-MM-dd HH:mm"), value: 0 })
            res.json(response({
                payload: data
            }))
        }
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })

}


//to save in redis server
module.exports.redisEightDaysData = async (req, res) => {
    console.log("cron-app.redisEightDaysData: ", 1)
    let runningScheduler = false
    try {
        runningScheduler = await redisService.getRunningScheduler()
    } catch(error) {
        console.log("No Redis Error : redisEightDaysData. ")
    }
    console.log("cron-app.redisEightDaysData: ", 2)
    if (runningScheduler) {
        return res.json(response({
            payload: "Sorry.. Another scheduler is running! Please try again about 1 minutes later!"
        }))
    } else {
        const startYear = req.query.startYear
        const endYear = req.query.endYear
        const siteId = req.query.siteId //"cl_pb"
        if (!(startYear && endYear)) {
            res.json(response({
                success: false,
                error: 'Please provide startYear and endYear'
            }))
        }
        console.log("cron-app.redisEightDaysData: ", siteId, startYear, endYear)
        dummyService.eightDaysData(startYear, endYear,siteId)
        return res.json(response({
            payload: "Successfully running in background."
        }))
    }
}

//from redis to ui
module.exports.fiveDaysData = async (req, res) => {

    try {
        const dataType = req.query.dataType || undefined // || "chw_flowrate"
        const deviceId = req.query.deviceId || undefined // || 3
        const algo_id = "ad_v1"
        const siteId = req.query.siteId
        if(!siteId){
            return res.json(response({
                success : false,
                error:"please provide siteId"
            }))
        }
        const data = await dummyService.readEightDayDataWithAnomaly({ dataType, deviceId, algo_id,siteId })
        res.json(response({
            payload: data
        }))
    } catch (error) {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}


module.exports.eightDaysDataforAnomalyDetection = async (req, res) => {

    try {
        const year = req.query.year
        const algoId = req.query.algoId || "ad_v1"
        const siteId = req.query.siteId
        if (!(year && siteId)) {
            res.json(response({
                success: false,
                error: "Please provide input."
            }))
        }
        const data = await dummyService.eightDaysDataforAnomalyDetection({ year,algoId,siteId })
        res.json(response({
            payload: data
        }))
    } catch (error) {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    }

}

module.exports.eightDaysDataforFaultDetection = async (req, res) => {

    try {
       
        const year = req.query.year
        const algoId = req.query.algoId || "fdd_v1"
        const siteId = req.query.siteId
        const month= req.query.month;
        if (!(year && siteId)) {
            res.json(response({
                success: false,
                error: "Please provide year and siteId."
            }))
        }

        if(year && (!month || month=="")){
            res.json(response({
                success: false,
                error: "Please provide month."
            }))
        }
        
        const data = await dummyService.eightDaysDataforFaultDetection({ year,algoId,siteId,month })
        res.json(response({
            payload: data
        }))
    } catch (error) {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    }

}

// to run sp for anomaly eight days with year
module.exports.spForAnomalyEightDaysYearly = (req, res) => {
    const year = req.query.year
    if (!year) {
        res.json(response({
            success: false,
            error: "please provide year"
        }))
    }
    return dummyService.spForAnomalyEightDaysYearly(year).then(data => {
        res.json(response({
            success: true,
            payload: "insert yearly data....."
        }))
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

//use sp anomaly
module.exports.eigthDaysWithAnomaly = async (req, res) => {
    try {
        const dataType = req.query.dataType || undefined // || "chw_flowrate"
        const deviceId = req.query.deviceId || undefined // || 3
        const algo_id = req.query.algoId
        const data = await dummyService.readEightDayDataWithAnomaly1({ dataType, deviceId, algo_id })
        res.json(response({
            payload: data
        }))
    } catch (error) {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

//use for fdd
module.exports.eigthDaysWithFdd = async (req, res) => {
    try {
        const deviceId = req.query.deviceId || undefined // || 3
        const algo_id = "fdd_v1"
        const siteId = req.query.siteId
        if(!siteId){
            return res.json(response({
                success :false,
                error :"Please provide siteId"
            }))
        }
        const data = await dummyService.readEightDayDataWithFdd({ deviceId, algo_id ,siteId})
        res.json(response({
            payload: data
        }))
    } catch (error) {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}



module.exports.getAnomalyRealTime = (req, res) => {
    return dummyService.getAnomalyEightDaysRealTime().then(data => {
        res.json(response({
            success: true,
            payload: "realtime anomlay update"
        }))
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

module.exports. getParameterBasedData = async (req, res) => {
    let sDate = req.query.startDate
    let eDate = req.query.endDate
    const dataType = req.query.dataType
    const deviceType = req.query.deviceType
    const returnType = req.query.returnType
    const parameter = req.query.parameter
    const siteId = req.query.siteId

    console.log(sDate,eDate,parameter)


  if ( (!sDate && !eDate) ||  !parameter  || !siteId) {
        return res.json(response({
            success: false,
            error: "Please provide  dataType or parameter,siteId"
        }))
    }
    const date1 = moment(sDate,"YYYY-MM-DD HH:mm:ss")
    const date2 = moment(eDate,"YYYY-MM-DD HH:mm:ss")

    const result1 = date1.get("hours") == 0 && date1.get("minutes") == 0
    const result2 = date2.get("hours") == 0 && date2.get("minutes") == 0
    if (result1 && result2) {
        //console.log("enter this")
        sDate = format(set(new Date(sDate), { hours: 00, minutes: 00, seconds: 00 }), "yyyy-MM-dd HH:mm:ss")
        eDate = format(set(new Date(eDate), { hours: 23, minutes: 59, seconds: 59 }), "yyyy-MM-dd HH:mm:ss")
    }
    return dummyService.getRawData(sDate, eDate, dataType,deviceType,returnType,parameter,siteId).then(data=>{
        res.json(response({
            success: true,
            payload: data
        }))
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}



