const fs = require("fs")
const redisService = require('../service/redis.service')
const chillerService = require('../service/chiller.service')
const response = require('../config/response')
const reportService = require("../service/reportService")

module.exports.getChillerOverviewRawData = async (req,res)=> {
    const id = req.params.id
    const siteId = req.query.siteId
    if(!siteId){
        return res.json(response({
            success:false,
            error :"Please provide siteId"
        }))
    }
    return chillerService.getChillerOverviewRawData(id,siteId).then(data => {
        if(data.length === 0){
          res.json(response({
              payload:[]
          }))
        }
        else if(data.length ===1){
            res.json(response({
                payload:data[0]
            })) 
        }
        else{
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

module.exports.getDeviceMappings = (req,res)=> {
    return chillerService.getDeviceMappings()
    .then(data => {
        if(data.length === 0){
          res.json(response({
              payload:[]
          }))
        }
        else{
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

module.exports.getDevices = (req, res) => {
    return chillerService.getDevices()
    .then(data => {
        if(data.length === 0){
          res.json(response({
              payload:[]
          }))
        }
        else{
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

module.exports.getAllDataTypes = (req,res)=> {
    const siteId = req.query.siteId 

    if(!siteId){
        return res.json(response({
            success:false,
            error:"Please provide siteId"
        }))
    }
    return chillerService.getAllDataTypes(siteId)
    .then(data => {
        if(data.length === 0){
          res.json(response({
              payload:[]
          }))
        }
        else{
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

module.exports.getDeviceData = (req, res) => {
    const dataType = req.query.dataType
    const deviceId = req.query.deviceId
    const siteId = req.query.siteId
    const periodType = req.query.periodType || "minute" // realtime, prevDay, sevenDay, prevMonth
    
    if(!dataType || !deviceId || !siteId) 
        return res.json(response({
            success: false,
            error: "Provide requied parameters!"
        }))
    
    console.log("DeviceData ")

    // controller.chiller.getPreviousDatainRedis
    //return chillerService.getDeviceData(dataType, deviceId, periodType)
    return redisService.getPreviousData(periodType, dataType, deviceId,siteId)
    .then(data => {
        return  res.json(response({
            success: true,
            payload: data,
            error: null
        }))
    })
    .catch(error => {
        console.log(error)
        return res.json(response({
            success: false,
            error: error
        }))
    })
 
}

module.exports.getPlantOverviewRawData = (req,res)=> {
    const siteId = req.query.siteId
    const clientId = req.query.clientId
    if(!siteId || !clientId) {
        return res.json(response({
            success: false,
            error: "Please provide siteId and clientId"
        }))
    }
    // console.log("siteId:: ", siteId)
    return chillerService.getPlantOverviewRawData(clientId, siteId.trim())
    .then(data => {
        if(data.length === 0){
          res.json(response({
              payload:[]
          }))
        }
        else{
            
            return res.json(response({
                payload: data.reduce((r,c) => {
                    // console.log("c: ", c)
                    const ts = c.ts
                    delete c.ts
                    return Object.keys(c).reduce((r1, k1) => {
                        const prevVIndex = r1.findIndex(v => v.dataType===k1)
                        if(prevVIndex>=0) {
                            r1[prevVIndex].data.push({ ts: ts, value: c[k1] ? c[k1].toFixed(2)*1 : c[k1] })
                        } else {
                            r1.push({ dataType: k1, data: [{ ts: ts, value: c[k1] ? c[k1].toFixed(2)*1 : c[k1] }] })
                        }
                        return r1
                    }, [...r])
                    
                }, [])
            }))
        }
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

//test to save sevenday data in redis
module.exports.saveDeviceDatainRedis = async (req,res)=> {
    const runningScheduler = await redisService.getRunningScheduler()
    if(runningScheduler) {
        return res.json(response({
            payload: "Sorry.. Another scheduler is running! Please try again about 1 minutes later!"
        }))
    } else {
        chillerService.saveDeviceDatainRedis()

        return res.json(response({
            payload: "Successfully running in background."
        }))
    }
}

module.exports.getPreviousDatainRedis = (req,res)=> {
    const periodType=req.query.periodType
    const dataType=req.query.dataType
    const deviceId=req.query.deviceId
    if(!periodType && !dataType && !deviceId ){
        res.json(response({
            success: false,
            error: "Please provide required parameters"
        }))
    }
    return redisService.getPreviousData(periodType,dataType,deviceId)
    .then(data => {
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


module.exports.getChillerOverview=(req,res)=>{
   return chillerService.runChillerOverviewRawData().then(data=>{
       res.json(response({
           success:true,
           payload:[]
       }))
   }).catch(error=>{
       res.json(response({
           success:false,
           error:error
       }))
   })
}

// for sp  chiller overview minuterly
module.exports.getSpChillerOverviewMinutely=(req,res)=>{
       const id =req.params.id
    return chillerService.getSpChillerOverviewMinutely(id).then(data=>{
        res.json(response({
            success:true,
            payload:data.length==1?data[0]:data
        }))
    }).catch(error=>{
        res.json(response({
            success:false,
            error:error
        }))
    })
 }

 // for sp  chiller overview minuterly
module.exports.getSpPlantOverviewHourly=(req,res)=>{
 return chillerService.getSpPlantOverviewHourly().then(data=>{
     res.json(response({
         success:true,
         payload:data
     }))
 }).catch(error=>{
     res.json(response({
         success:false,
         error:error
     }))
 })
}

module.exports.getDeviceAndParameterMapping = (req,res)=>{
    const siteId = req.query.siteId 

    if(!siteId){
        return res.json(response({
            success:false,
            error:"Please provide siteId"
        }))
    }
    return chillerService.getDeviceAndParameterMapping(siteId).then(data=>{
         res.json(response({
             payload :data
         }))
    }).catch(error=>{
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

module.exports.getRawCountForEachDevice = (req,res)=>{
    const siteId = req.query.siteId || "cl_tao"
    return chillerService.saveRawCount(siteId).then(data=>{
        res.json(response({
            payload :data
        }))
   }).catch(error=>{
       res.json(response({
           success: false,
           error: error.toString()
       }))
   })
}

module.exports.generateDataQualityReport = (req, res) => {
    try {
        const siteId = req.query.siteId
        const dateFor = req.query.dateFor
        const execute = req.query.execute
        if (!siteId || !dateFor) throw Error("Please provide both siteId and dateFor query!")

        return reportService.generateDataQualityReport({ siteId, dateFor, execute })
            .then(data => {
                // console.log("data: ", data)
                const file = fs.createReadStream(data.path);
                const stat = fs.statSync(data.path);
                // res.setHeader("Accept-Ranges", "bytes")
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'filename='+data.fileName);
                const stream = file.pipe(res)
                stream.on("finish", () => res.end())
                // return res.json(response({
                //     payload: data
                // }))
            })
            .catch(error => {
                return res.json(response({
                    success: false,
                    error: error.toString()
                }))
            })

    } catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

module.exports.getdeviceSpecification = async (req, res) => {
    const equipId = req.query.equipId
    const siteId = req.query.siteId

    if (!siteId || !equipId) {
        return res.json({
            success: false,
            error: "Please provide siteId and equipId!"
        })
    }

    try {
        const data = await chillerService.getDeviceSpecification({ equipId, siteId})
        return res.json(response({
            payload: data
        }))
    }
    catch (error) {
        return res.json(response({
            success: false,
            error: error
        }))
    }
}

