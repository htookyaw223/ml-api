const redisService = require('../service/redis.service')
const historyService = require('../service/history.service')
const response = require('../config/response')

const getHistoryData = (req, res) => {
    return redisService.getHistoryData((error, data) => {
        if (error) {
            res.json(response({
                success: false,
                error: error.toString()
            }))
        }
        else {
            res.json(response({
                payload: data
            }))
        }
    })
}

const delEditHistory = (req, res) => {
    return redisService.delEditHistory((error, data) => {
        if (error) {
            res.json(response({
                success: false,
                error: error.toString()
            }))
        }
        else {
            res.json(response({
                //payload:data
            }))
        }
    })
}

const getHistory = async (req, res) => {
    //    const dataType=req.query.dataType || "CHWR_Temp"
    //    const page=req.query.page || 1
    const queryParams = req.query
    const page = queryParams.page
    const deviceId = queryParams.equipment
    const dataType = queryParams.dataType
    const detectionType = queryParams.detectionType || null
    const labeledBy = queryParams.labeledBy
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    const onlyReject = req.query.onlyReject 
    const siteId =  req.query.siteId

   console.log(onlyReject == "true","ddd")

    if(!siteId){
        return res.json(response({
            success :false,
            error :"Please provide siteId"
        }))
    }

    const history = await historyService.getHistory({siteId,onlyReject,page, deviceId, dataType, detectionType, labeledBy, startDate, endDate })
     Promise.all(history).then(data=>{
         res.json(response({
             payload:{pageCount:data[0],data:data[1]}
         }))
     }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))

    })
    
}

const getHistoryFilterData = (req, res) => {
    const siteId =req.query.siteId
    if(!siteId){
        return res.json(response({
            success:false,
            error:"Please provide siteId"
        }))
    }
    return historyService.getHistoryFilterData(siteId).then(data => {
        res.json(response({
            success: true,
            payload: data
        }))
    }).catch(error => {
        console.log(error)
        res.json(response({
            success: false,
            error: error.toString()
        }))

    })
}

module.exports = {
    getHistoryData, delEditHistory, getHistory, getHistoryFilterData
}