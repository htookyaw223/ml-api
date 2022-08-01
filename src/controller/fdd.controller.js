const redisService = require('../service/redis.service')
const response = require('../config/response')
const fddService = require("../service/fdd.service")
const kumoDate = require("../config/kumoDate")
const dateFns = require("date-fns")

module.exports.getFddData = async (req, res) => {
    let startDate = req.query.startDate
    let endDate = req.query.endDate
    const dataType = req.query.dataType
    const page = req.query.page || 1
    const deviceId = req.query.deviceId || undefined
    const siteId = req.query.siteId
    const detectId = req.query.detectId

    endDate = endDate? endDate + " 23:59:59":endDate

    const rowPerPage = 15

    // console.log({ detectId, siteId, startDate, endDate, dataType, deviceId, page, rowPerPage })

    try {
        const data = await fddService.getFaultDetections({ detectId, siteId, startDate, endDate, dataType, deviceId, page, rowPerPage })
        return res.json(response({ payload: data }))
    } catch (error) {
        console.log(error)
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

module.exports.acceptFddData = async (req, res) => {
    const accept = req.params.acceptReject === "accept" ? true : false
    const detectionId = req.params.detectionId
    const userId = req.query.userId
    const remark = req.body.remark 
    const newStartTs = req.body.newStartTs
    const newEndTs = req.body.newEndTs

    /*console.log("acceptFddData: ", detectionId, accept, userId, newStartTs, newEndTs)
    return res.json(response({ payload: "Fault Detection is updated." }))*/

    if(!accept && !detectionId && !userId){
        return res.json({
            success : false,
            error :"please provide accept,userId,detectionId"
        })
    }
    try {
        const data = await fddService.acceptFaultDetection({ detectionId, accept, userId,remark, newStartTs, newEndTs })
        return res.json(response({ payload: data.changedRows > 0 ? "Fault Detection is updated." : "No changes on detection!" }))
    }
    catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

//for fdd count
module.exports.getFddEightDaysHistory = (req, res) => {
    const year = req.query.year
    const siteId = req.query.siteId
    if (!year || !siteId) {
        return res.json(response({
            success: false,
            error: 'please provide year'
        }))
    }
    return fddService.getFddEightDaysHistory(year,siteId).then(data => {
        res.json(response({
            success: true,
            payload: data//"eight days data count is added"
        }))
    })
}

module.exports.getFddEightDaysRealTime = (req, res) => {
    return fddService.getFddEightDaysRealTime().then(data => {
        res.json(response({
            success: true,
            payload: "eight days data count is added"
        }))
    })
}

module.exports.getFddEnergyWastage = (req, res) => {
    const siteId = req.query.siteId
    const equipId = req.query.equipId
    if (!siteId) {
        return res.json(response({
            success: false,
            error: 'Please provide siteId!'
        }))
    }
    return fddService.getFddEnergyWastage({siteId, equipId}).then(data => {
        res.json(response({
            success: true,
            payload: data
        }))
    })
    .catch(error =>{
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}
