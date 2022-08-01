const svgEvaMapService =require('../service/svgEvaMap.service')
const response = require('../config/response')

module.exports.getSvgEvaMapData=(req,res)=>{
    const siteId = req.query.siteId
    const clientId = req.query.clientId
    if(!siteId) {
        res.json(response({
            success: false,
            error: "Please provide siteId and clientId!"
        }))
    }
    return svgEvaMapService.getEavMapData(siteId, clientId).then(data=>{
        res.json(response({
            payload:data
        }))
    }).catch(error=>{
        res.json(response({
            success:false,
            error:error
        }))
    })
}


