const response = require('../config/response')
const fadService = require("../service/fad.service")


module.exports.getFadCount = async (req, res) => {
    const siteId = req.query.siteId
    if(!siteId){
        return res.json({
            success :false,
            error:"Please provide siteId"
        })
    }
    try {
        const data = await fadService.getFadCount(siteId)
        return res.json({
            success: true,
            payload: data
        })
    }
    catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

module.exports.getFadData = async (req, res) => {

    const deviceId = req.query.deviceId || null
    const dataType = req.query.dataType || null
    const alarm_id = req.query.alarm_id || null
    const startDate = req.query.startDate || null
    const endDate = req.query.endDate || null
    const sortBy = req.query.sortBy || null
    const page = req.query.page || 1
    const siteId = req.query.siteId
    const detectId = req.query.detectId


    if(!siteId) {
        return res.json(response({success:false,error:"please provide siteId"}))
    }

    try {
        const data = await fadService.getFadData({ detectId,siteId, deviceId, dataType, alarm_id, startDate, endDate, sortBy, page })
        return res.json({
            success: true,
            payload: data
        })
    }
    catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

module.exports.acceptFadData = async (req, res) => {
    console.log("hello")
    const accept = req.params.acceptReject === "accept" ? true : false
    const detectionId = req.params.detectionId
    const userId = req.query.userId
    const remark = req.body.remark
    // console.log("acceptFddData: ", detectionId, accept, userId)

    if(!accept && !detectionId && !userId){
        return res.json({
            success : false,
            error :"please provide accept,userId,detectionId"
        })
    }
    try {
        const data = await fadService.acceptFalseAlarmDetection({ detectionId, accept, userId,remark })
        
        return res.json(response({ payload: data.changedRows > 0 ? "False Alarm Detection is updated." : "No changes on detection!" }))
    }

    catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}



module.exports.eigthDaysWithFad = async (req, res) => {
    try {
        const deviceId = req.query.deviceId || undefined // || 3
        const algo_id = "fad_v1"
        const data = await fadService.readEightDayDataWithFad({ deviceId, algo_id })
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