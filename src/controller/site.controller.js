const siteService = require('../service/site.service')
const response = require('../config/response')
const dateFns = require('date-fns')
const kumoDate = require("../config/kumoDate.js")


module.exports.getSiteInfo = (req, res) => {
    return siteService.getSiteInfo({ ...req.query }).then(data => {
        res.json(response({
            payload: data
        }))
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

module.exports.getClientInfo = (req, res) => {
    return siteService.getClientInfo().then(data => {
        res.json(response({
            payload: data
        }))
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

module.exports.saveSiteInfo = async (req, res) => {
    const siteId = req.body.siteId
    const siteName = req.body.siteName
    const buildingName = req.body.buildingName
    const countryName = req.body.countryName
    const timezone = req.body.timezone
    const createdDate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
    const clientName = req.body.clientName
    const reportEnable = req.body.reportEnable
    const reportReady = req.body.reportReady
    const siteCode = req.body.siteCode
    try {
        const clientInfo = await siteService.getClientId(clientName)
        const clientId = clientInfo.id
        const data = await siteService.saveSiteInfo(siteId, siteName, buildingName, countryName, timezone, clientId, createdDate, reportEnable, reportReady,siteCode)
        res.json(response({
            payload: (data.affectedRows == 1) ? "success" : "insert not success"
        }))
    }
    catch (error) {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

module.exports.saveClientInfo = (req, res) => {
    const createdDate = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
    const name = req.body.name
    const email = req.body.email
    const mobileNo = req.body.mobileNo
    return siteService.saveClientInfo(createdDate, name, email, mobileNo).then(data => {
        res.json(response({
            payload: (data.affectedRows == 1) ? "success" : "insert not success"
        }))
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

module.exports.saveDqReport = (req, res) => {
    const siteId = req.body.siteId
    const database_name = req.body.databaseName
    const database_ip = req.body.databaseAddress
    const port = req.body.databasePort
    const username = req.body.username
    const password = req.body.password
    const site_id = req.body.siteCode

   return siteService.saveDqReport(siteId,configData={site_id,database_name, database_ip, port, username, password}).then(data=>{
       res.json(response({
           payload : data
       }))
   }).catch(error=>{
       res.json(response({
           success : false,
           error :error.toString()
       }))
   })
}

module.exports.getDqReport = (req, res) => {
    const clientId = req.query.clientId
    if(!clientId){
        return res.json(response({
            success : false,
            error :"Please provide clientId"
        }))
    }
   return siteService.getDqReport(clientId).then(data=>{
       res.json(response({
           payload : data
       }))
   }).catch(error=>{
       res.json(response({
           success : false,
           error :error.toString()
       }))
   })
}

module.exports.updateDqReport = (req, res) => {
    const siteId = req.params.siteId
    const database_name = req.body.databaseName
    const database_ip = req.body.databaseAddress
    const port = req.body.databasePort
    const username = req.body.username
    const password = req.body.password
    const site_id = req.body.siteCode

   return siteService.updateDqReport(siteId,configData={site_id,database_name, database_ip, port, username, password}).then(data=>{
        console.log(data ,"data")
        res.json(response({
                payload : data
            }))
        }).catch(error=>{
            res.json(response({
                success : false,
                error :error.toString()
            }))
    })
}

module.exports.deleteDqReport = (req, res) => {
    const siteId = req.params.siteId

   return siteService.deleteDqReport(siteId).then(data=>{
       res.json(response({
           payload : data
       }))
   }).catch(error=>{
       res.json(response({
           success : false,
           error :error.toString()
       }))
   })
}