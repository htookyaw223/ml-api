
const redisService = require('../service/redis.service')
const response = require('../config/response')
const anomalyService = require("../service/anomaly.service")
const fddService = require("../service/fdd.service")
const fadService = require("../service/fad.service")
const calmService = require("../service/calm.service")
const db = require('../db/aimgmt.db')
const dateFns = require('date-fns')
const kumoDate = require('../config/kumoDate')
const aimgmtdb = require("../db/aimgmt.db")

const getAnomaliesData = async (req, res) => {
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    const dataType = req.query.dataType
    const deviceId = req.query.deviceId || undefined
    const siteId = req.query.siteId
    const detectId = req.query.detectId

    if (!dataType || !siteId) {
        return res.json(response({
            success: false,
            error: "Please provide dataType and siteId"
        }))
    }
    try {
        let start_time = null
        let end_time = null
        let alreadyReviewed = false
        let sdate = null
        let edate = null
        let data = await anomalyService.getAnomalyData1({ startDate, endDate, dataType, deviceId, notForHistory: true, siteId, detectId })
        if (detectId) {
            const result = data.findIndex(v => v.detectId == detectId)
            if (result == -1) {
                const tableName = "dtd_anomaly"
                const checkReviewedResult = await db.checkReviewedResult(detectId, tableName)
                if (checkReviewedResult[0].length > 0) alreadyReviewed = true
                //detectId not have in dtd_anomaly
                else {
                    alreadyReviewed = true
                    sdate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
                    const currentInterval = await db.getCurrentEightDaysInterval(sdate)
                    start_time = dateFns.format(currentInterval[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
                    end_time = dateFns.format(currentInterval[0][0].endDate, "yyyy-MM-dd 23:59:59")
                    data = await anomalyService.getAnomalyData1({ startDate: start_time, endDate: end_time, dataType, deviceId, notForHistory: true, siteId })
                    return res.json(response({ payload: { data, alreadyReviewed, startDate: start_time, endDate: end_time } }))
                }
                // detectId already reviewed
                sdate = dateFns.format(checkReviewedResult[0][0].start_time, "yyyy-MM-dd HH:mm:ss")
                const selectedDate = await db.getCurrentEightDaysInterval(sdate)
                start_time = dateFns.format(selectedDate[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
                end_time = dateFns.format(selectedDate[0][0].endDate, "yyyy-MM-dd 23:59:59")
                const startDate = start_time
                const endDate = end_time
                data = await anomalyService.getAnomalyData1({ startDate, endDate, dataType, deviceId, notForHistory: true, siteId })
                return res.json(response({ payload: { data, alreadyReviewed, startDate: start_time, endDate: end_time } }))
            }
            //detectId not reviewed
            const selectedData = data[result]
            const selectedDate = await db.getCurrentEightDaysInterval(selectedData.startDate)
            start_time = dateFns.format(selectedDate[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
            end_time = dateFns.format(selectedDate[0][0].endDate, "yyyy-MM-dd 23:59:59")
            const startDate = start_time
            const endDate = end_time
            data = await anomalyService.getAnomalyData1({ startDate, endDate, dataType, deviceId, notForHistory: true, siteId })
            return res.json(response({ payload: { data, alreadyReviewed, startDate: start_time, endDate: end_time } }))
        }
        else if (data.length == 0 && startDate && endDate) {
            sdate = dateFns.format(new Date(startDate), "yyyy-MM-dd 00:00:00") //dateFns.format(Date.now(), "yyyy-MM-dd HH:mm:ss")
            const currentInterval = await db.getCurrentEightDaysInterval(sdate)
            start_time = dateFns.format(currentInterval[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
            end_time = dateFns.format(currentInterval[0][0].endDate, "yyyy-MM-dd 23:59:59")
            return res.json(response({ payload: { data, alreadyReviewed, startDate: start_time, endDate: end_time } }))
        }
        else if (data.length == 0) {
            sdate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
            const currentInterval = await db.getCurrentEightDaysInterval(sdate)
            start_time = dateFns.format(currentInterval[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
            end_time = dateFns.format(currentInterval[0][0].endDate, "yyyy-MM-dd 23:59:59")
            return res.json(response({ payload: { data, alreadyReviewed, startDate: start_time, endDate: end_time } }))
        }
        else {
            // console.log("last condition: ", data[0].startDate, data[data.length - 1].endDate)
            sdate = dateFns.format(new Date(data[0].startDate), "yyyy-MM-dd HH:mm:ss")
            edate = dateFns.format(new Date(data[data.length - 1].endDate), "yyyy-MM-dd HH:mm:ss")
            const selectedDate = await db.getSelectedStartAndEndDate(sdate, endDate ? edate : null)
            //console.log(selectedDate[0])
            start_time = dateFns.format(selectedDate[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
            end_time = dateFns.format(selectedDate[0][0].endDate, "yyyy-MM-dd 23:59:59")
            res.json(response({
                payload: {
                    data: data.filter(v => 
                        dateFns.isWithinInterval(new Date(v.startDate), { start: new Date(start_time), end: new Date(end_time) }) && 
                        dateFns.isWithinInterval(new Date(v.endDate), { start: new Date(start_time), end: new Date(end_time) })  ),  
                    alreadyReviewed, startDate: start_time, endDate: end_time
                }
            }))
        }
        // else {
        //     console.log("hello")
        //     sdate = dateFns.format(new Date(data[0].startDate), "yyyy-MM-dd HH:mm:ss")
        //     edate = dateFns.format(new Date(data[0].endDate), "yyyy-MM-dd HH:mm:ss")
        //     const selectedDate = await db.getSelectedStartAndEndDate(sdate, edate)
        //     start_time = dateFns.format(selectedDate[0][0].startDate, "yyyy-MM-dd HH:mm:ss")
        //     end_time = dateFns.format(selectedDate[0][0].endDate, "yyyy-MM-dd 23:59:59")
        //     console.log("DATA ==> ",data.length)
        //     res.json(response({
        //         payload: {
        //             data: data.filter(d => (dateFns.isAfter(new Date(d.startDate), new Date(start_time))
        //                 || dateFns.isEqual(new Date(d.startDate), new Date(start_time)))
        //                 &&
        //                 (dateFns.isBefore(new Date(d.endDate), new Date(end_time))
        //                     || dateFns.isEqual(new Date(d.endDate), new Date(end_time)))
        //             ), alreadyReviewed, startDate: start_time, endDate: end_time
        //         }
        //     }))
        // }
        //End  #combine_chiller_ml for chiller ================

    }
    catch (error) {
        console.error(error)
        res.json(response({ success: false, error: error.toString() }))
    }

}


const updateAnomailesData = (req, res) => {

    const requestId = req.params.id
    const data = req.body
    // const requestStartDate = req.query.startDate
    // const requestEndDate = req.query.endDate
    if (!requestId) {
        res.json(response({
            success: false,
            error: "Please enter id"
        }))
    }
    return anomalyService.updateAnomaliesData(requestId, data, (error, data1) => {
        if (error) {
            res.json(response({
                success: false,
                error: error.toString()
            }))
        }
        else {
            res.json(response({
                payload: data1
            }))
        }
    })
}


const getAnomaliesCount = (req, res) => {
    const startDate = req.query.startDate  //|| '2019-01-01 00:00:00'
    const endDate = req.query.endDate  //|| '2019-12-31 23:59:59'
    const dataType = req.query.dataType
    const verified = req.query.labeled
    const onlyReject = req.query.onlyReject
    const detectionType = req.query.detectionType || null
    const deviceId = req.query.deviceId || null
    const siteId = req.query.siteId

    if (!siteId) {
        return res.json(response({
            success: false,
            error: "please provide siteId"
        }))
    }

    return anomalyService.getAnomalyCount({ onlyReject, detectionType, startDate, endDate, dataType, verified, deviceId, siteId }).then(data => {
        res.json(response({
            payload: data[0][0]
        }))
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

const recoverAnomalyDetection = async (req, res) => {
    const id = req.params.id
    //#combine_chiller_ml : for chiller only
    const userId = req.body.userId
    //------------------------------------
    try {
        const result = await anomalyService.getAlogId(id)
        const algoId = result[0].algo_id.trim()
        // save in Label Log 
        aimgmtdb.saveLabelLog({
            detectId: id,
            // updatedBy: req.loggedUser.userId,
            updatedBy:userId,
            remark: "Recovered",
            detectionType: algoId==="ad_v1" ? 1 : algoId==="fdd_v1" ? 2 : algoId==="fad_v1" ? 3 : 0,
            labelType: "recover"
        })

        if (algoId == "ad_v1") {
            const data = await anomalyService.recoverAnomalyDetection(id)
            if (data[0][0].changedRows > 0) {
                return res.json(response({
                    success: true,
                    payload: "success"
                }))
            }

            else {
                return res.json(response({
                    success: false,
                    error: "no change on detection"
                }))

            }
        }
        else if (algoId == "fdd_v1") {
            const data = await fddService.recoverFaultDetection(id)
            if (data.changedRows > 0) {
                return res.json(response({
                    success: true,
                    payload: "success"
                }))
            }
            else {
                return res.json(response({
                    success: false,
                    error: "no change on detection"
                }))

            }

        }
        else if (algoId == "fad_v1") {
            const data = await fadService.recoverFalseAlarmDetection(id)
            if (data.changedRows > 0) {
                return res.json(response({
                    success: true,
                    payload: "success"
                }))
            }
            else {
                return res.json(response({
                    success: false,
                    error: "no change on detection"
                }))

            }
        }
        else if (algoId == "calm_v1") {
            const data = await calmService.recoverCalmDetection(id)
            if (data.changedRows > 0) {
                return res.json(response({
                    success: true,
                    payload: "success"
                }))
            }
            else {
                return res.json(response({
                    success: false,
                    error: "no change on detection"
                }))

            }
        }
    }
    catch (error) {
        console.error("catcccH",error)
        return res.json(response({
            success: false,
            error: error.toString()
        }))

    }
}

const getUnreviewCount = async (req, res) => {
    try {
        const detectionType = req.query.detectionType
        const clientId = req.query.clientId
        const siteId = req.query.siteId
        const deviceId = req.query.deviceId
        if (!clientId && !siteId) {
            return res.json(response({
                success: false,
                error: "provide clientId siteId"
            }))
        }
        const data = await anomalyService.getUnreviewCount(detectionType, clientId, siteId, deviceId)
        return res.json({
            success: true,
            payload: data[0]
        })
    }
    catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }

}

const postProcessing = (req,res)=>{
    const startDate = req.body.startDate
    const endDate = req.body.endDate
    const siteId = req.body.siteId
    const dataType = req.body.dataType
    // console.log("coming postProcessing")
    if(!startDate || !endDate || !siteId){
        return res.json(response({
            success :"false",
            error :"please provide startDate,endDate,siteId"
        }))
    }
    return anomalyService.postProcessing({startDate,endDate,siteId,dataType}).then(data=>{
        return res.json({
            success:true,
            payload:data
        })
    }).catch(error=>{
        return res.json({
            success:false,
            error:error
        })
    })
}

const createNewAnomaly = async (req, res) => {
    try {

        const data = req.body
        const siteId = data.siteId
        const parameter = data.dataType
        const equipId = data.equipId
        const fault = data.faultType.length > 0 ? data.faultType[0] : null
        const severity = data.severity.length > 0 ? data.severity[0] : null
        const labeledBy = data.user
        const remark = data.remark
        const timestamp = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
        const anomalyState = data.anomalyState
        const startDate = data.startDate
        const endDate = data.endDate
        const resultedData = await anomalyService.createNewAnomaly({
            siteId, parameter, equipId, fault, severity, labeledBy, remark,
            timestamp, anomalyState, startDate, endDate
        })

        return res.json(response({
            success:true,
             payload:resultedData
        }))
    }
    catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

const getPostProcessingDefinition = async (req, res) => {
    try {
        const query = req.query
        const siteId = query.siteId
        const enabled = query.enabled
        if(!siteId){
            return res.json(response({
                success :"false",
                error :"please provide siteId"
            }))
        }
        const resultedData = await anomalyService.getPostProcessingDefinition({ siteId, enabled })
        return res.json(response({
            success:true,
             payload:resultedData
        }))
    
    } catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

const createPostProcessingDefinition = async (req, res) => {
    try {
        const body = req.body
        const siteId = body.siteId
        const name = body.name
        const userId = body.userId
        const comments = body.comments
        const parameter = body.parameter
        const expr = body.expr
        const enabled = body.enabled

        if(!siteId || !name || !userId || !comments || !parameter || !expr || (enabled===null || enabled===undefined || enabled==="")){
            return res.json(response({
                success :"false",
                error :"please provide all fields(siteId, name, userId, comments, parameter, expr, enabled) in body!"
            }))
        }
        const resultedData = await anomalyService.createPostProcessingDefinition({ siteId, name, userId, comments, parameter, expr, enabled })
        return res.json(response({
            success:true,
             payload:resultedData
        }))
    
    } catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

const updatePostProcessingDefinition = async (req, res) => {
    try {
        const body = req.body
        const id = req.params.id
        const name = body.name
        const comments = body.comments
        const parameter = body.parameter
        const expr = body.expr
        const enabled = body.enabled

        if(!id) {
            return res.json(response({
                success :"false",
                error :"please provide path param id!"
            }))
        }
        if(!name && !comments && !parameter && !expr && (enabled===null || enabled===undefined || enabled==="")){
            return res.json(response({
                success :"false",
                error :"please provide a field (name, comments, parameter, expr, enabled) in body!"
            }))
        }
        const resultedData = await anomalyService.updatePostProcessingDefinition({ id, name, comments, parameter, expr, enabled })
        return res.json(response({
            success:true,
            payload:resultedData
        }))
    
    } catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

module.exports = {
    getAnomaliesData, updateAnomailesData,
    getAnomaliesCount, recoverAnomalyDetection,
    createNewAnomaly,
    // new apis
    getUnreviewCount,postProcessing,
    getPostProcessingDefinition,
    createPostProcessingDefinition,
    updatePostProcessingDefinition,

}