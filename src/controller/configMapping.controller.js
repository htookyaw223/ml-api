const configMappingService = require('../service/configMapping.service')
const response = require('../config/response')

module.exports.tDeviceMapping=(req,res)=>{
    return configMappingService.tDeviceMapping().then(data=>{
        res.json(response({
            //payload:
        }))
    }).catch(error=>{
        res.json(response({
           success:false,
           error:error.toString()
        }))
    })
}