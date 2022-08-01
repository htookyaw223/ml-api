// const labelService = require('../service/label.service')
const response = require('../config/response')
const notificationService = require("../service/notification.service")
const dateFns = require('date-fns')
const kumoDate = require('../config/kumoDate')

module.exports.getAllNotification = async (req, res) => {
    try {
        const queryParams = req.query
        const page = queryParams.page || 1
        const equipment = queryParams.equipment
        const dataType = queryParams.dataType
        const detectionType = queryParams.detectionType
        const unRead = queryParams.unRead || null
        const siteId = req.query.siteId

        if (!siteId) {
            return res.json(response({
                success: false,
                error: "Please provide siteId"
            }))
        }

        const data = await notificationService.getNotification({ siteId, page, equipment, dataType, detectionType, unRead })

        return res.json(response({ payload: data }))
    } catch (error) {
        return res.json(response({ success: false, error: error.toString() }))
    }
}

module.exports.getUnreadNotificationCount = async (req, res) => {
    try {
        const detectionType = req.query.detectionType
        const equip = req.query.equip
        const dataType = req.query.dataType
        const startDate = req.query.startDate || dateFns.format(kumoDate.Date(), "yyyy-MM-dd 00:00:00")
        const endDate = req.query.endDate || dateFns.format(kumoDate.Date(), "yyyy-MM-dd 23:59:59")
        const siteId = req.query.siteId

        if(!siteId){
            return res.json(response({success:false,error:"Please provide siteId"}))
        }

        const data = await notificationService.getUnreadNotificationCount({ siteId, detectionType, equip, dataType, startDate, endDate })

        return res.json(response({ payload: data }))
    } catch (error) {
        return res.json(response({ success: false, error: error.toString() }))
    }
}


module.exports.setReadNotification = async (req, res) => {
    try {
        const notiId = req.params.notiId
        if (!notiId) throw new Error("Please provide notiId params")
        const data = await notificationService.setReadNotification({ notiId })
        return res.json(response({ payload: data }))
    } catch (error) {
        return res.json(response({ success: false, error: error.toString() }))
    }
}
