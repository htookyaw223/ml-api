// const redisService = require('../service/redis.service')
const response = require('../config/response')
const calmService = require('../service/calm.service')
const kumoDate = require("../config/kumoDate.js")
const dateFns = require('date-fns')

const customMem = require("../db/customMem.js")

module.exports.getSeverityInCalm = (req, res) => {
    const clientId = req.query.clientId
    const siteId = req.query.siteId

    if (!siteId || !clientId) {
        return res.json(response({
            success: false,
            error: "please provide siteId or clientId"
        }))
    }
    return calmService.getSeverityInCalm(siteId, clientId).then(data => {
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


module.exports.getCalmRawData = (req, res) => {
    const endDate = dateFns.format(kumoDate.UtcToGmt(Date.now()), "yyyy-MM-dd HH:mm:ss")
    const startDate = dateFns.format(dateFns.subMinutes(Date.parse(endDate), 60), "yyyy-MM-dd HH:mm:ss")
    const parameter = req.query.parameter
    console.log({ startDate, endDate })
    return calmService.getCalmRawData(startDate, endDate, parameter).then(data => {
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

module.exports.getCalmData = async (req, res) => {
    let startDate = req.query.startDate
    let endDate = req.query.endDate
    const page = req.query.page || 1
    const deviceId = req.query.deviceId || undefined
    const siteId = req.query.siteId
    const severity = req.query.severity
    const clientId = req.query.clientId

    endDate = endDate + " 23:59:59"

    // console.log("SE: ", startDate, endDate)

    if (!clientId || !siteId) {
        return res.json(response({
            success: false,
            error: "please provide clientId and siteId"
        }))
    }

    const rowPerPage = 15
    try {
        const data = await calmService.getCalmDetections({ clientId, siteId, startDate, endDate, deviceId, page, rowPerPage, severity })

        return res.json(response({ payload: data }))
    }
    catch (error) {
        return res.json(response({
            success: false,
            error: error
        }))
    }

}

module.exports.getChillerHealth = async (req, res) => {
    const siteId = req.query.siteId
    const clientId = req.query.clientId
    if (!siteId || !clientId) {
        return res.json(response({
            success: false,
            error: "Please provide siteId and clientId"
        }))
    }
    return calmService.getChillerHealthNew({ siteId, clientId }).then(data => {
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

module.exports.updateCalm = async (req, res) => {
    const id = req.params.id
    const updatedBy = req.query.user
    if (!id) {
        return res.json(response({
            success: false,
            error: "id is required"
        }))
    }
    return calmService.updateCalm({ id, updatedBy }).then(data => {
        if (data.changedRows == 1) {
            res.json(response({
                success: true,
                payload: "update success"
            }))
        }
        else {
            res.json(response({
                success: true,
                payload: "already updated"
            }))
        }
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

module.exports.acceptCalmData = async (req, res) => {
    const accept = req.params.acceptReject === "accept" ? true : false
    const detectionId = req.params.detectionId
    const userId = req.query.userId
    // console.log("acceptFddData: ", detectionId, accept, userId)

    if (!accept && !detectionId && !userId) {
        return res.json({
            success: false,
            error: "please provide accept,userId,detectionId"
        })
    }
    try {
        const data = await calmService.acceptCalmDetection({ detectionId, accept, userId })

        return res.json(response({ payload: data.changedRows > 0 ? "Calm Detection is updated." : "No changes on detection!" }))
    }
    catch (error) {
        return res.json(response({
            success: false,
            error: error.toString()
        }))
    }

}

module.exports.calmDetailCount = async (req, res) => {
    const deviceId = req.query.deviceId
    const siteId = req.query.siteId
    const startDate = req.query.startDate
    const endDate = req.query.endDate ? req.query.endDate + " 23:59:59" : req.query.endDate

    // console.log("dateStartAndEnd == > ",startDate,endDate)
    if (!siteId) {
        return res.json({
            success: false,
            error: "Please provide siteId"
        })
    }

    try {
        const data = await calmService.calmDetailCount(deviceId, siteId, startDate, endDate)
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

module.exports.getTrendGraphDataCalm = (req, res) => {
    const siteId = req.query.siteId
    const equipId = req.query.equipId
    const period = req.query.periodDays
    const faultId = req.query.faultId
    const periodType = req.query.periodType || "month" // ( "day" | "month" | "year" )

    let formatForPeriodType = "%Y-%m-%d"
    let dateFormat = "dd MMM, yyyy"
    if (periodType === "day") {
        formatForPeriodType = "%Y-%m-%d"
        dateFormat = "dd MMM, yyyy"
    } else if (periodType === "month") {
        formatForPeriodType = "%Y-%m-01"
        dateFormat = "MMM, yyyy"
    } else if (periodType === "year") {
        formatForPeriodType = "%Y-01-01"
        dateFormat = "yyyy"
    }

    if (!siteId || !equipId) {
        return res.json({
            success: false,
            error: "Please provide siteId and equipId!"
        })
    }
    return calmService.getTrendGraphDataCalm({ siteId, equipId, faultId, period, formatForPeriodType, dateFormat, periodType })
        .then(data => {
            return res.json(response({ payload: { data, dateFormat } }))
        })
        .catch(error => {
            return res.json({
                success: false,
                error: error.toString()
            })
        })

}

module.exports.getChillerHealthNewData = async (req, res) => {
    const siteId = req.query.siteId
    const clientId = req.query.clientId
    if (!siteId || !clientId) {
        return res.json(response({
            success: false,
            error: "Please provide siteId and clientId!"
        }))
    }
    return calmService.getChillerHealthNewData({ siteId, clientId }).then(data => {
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

module.exports.getEnergySavings = async (req, res) => {
    try {
        const siteId = req.query.siteId
        const clientId = req.query.clientId
        const period = req.query.period
        const toInsert = req.query.toInsert

        if (!siteId || !clientId)
            throw "Please provide siteId and clientId!"
        if (!(["year", "month"].includes(period)))
            throw "Query 'period' should be 'year' or 'month'!";
        
        if(toInsert && period=="month") {
            customMem.energySavingCalculationInProgress[siteId].loadingPlantEnergySavingMonth = true
        } else if(toInsert && period=="year") {
            console.log("hello")
            customMem.energySavingCalculationInProgress[siteId].loadingPlantEnergySavingYear = true
            customMem.energySavingCalculationInProgress[siteId].loadingPlantEnergySavingMonth = true
        }

        calmService.getEnergySavings({ siteId, clientId, period, toInsert: period=="month" ? undefined : toInsert })
            .then(data => {
                if(toInsert && period==="year") {
                    customMem.energySavingCalculationInProgress[siteId].loadingPlantEnergySavingYear = false
                }
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

        if(period=="month" && toInsert) {
            const cMi = new Date().getMonth()
            const cY = new Date().getFullYear()
            for(let i=0; i<=cMi; i++) {
                try {
                    // getEnergySavings({ siteId, clientId, period, toInsert })
                    await calmService.getEnergySavings({ siteId, clientId, toInsert: true, period, dateForMonth: `${cY}-${i<9 ? "0"+(i+1) : (i+1)}-01` })
                    console.log("Month: ", `${cY}-${i<9 ? "0"+(i+1) : (i+1)}-01`)
                    if(i==cMi) {
                        customMem.energySavingCalculationInProgress[siteId].loadingPlantEnergySavingMonth = false
                    }
                } catch (error) {
                    console.log("Energy saving calculation error in Month: ", `${cY}-${i<9 ? "0"+(i+1) : (i+1)}-01`)
                } 
            }
        } 
    } catch (error) {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

module.exports.calculateTrendGraphDataCalm = (req, res) => {
    try {
        const siteId = req.query.siteId
        const clientId = req.query.clientId
        const year = req.query.year

        if (!siteId || !clientId)
            throw "Please provide siteId and clientId!"
        if (!year)
            throw "Please provide query param 'year'"

        return calmService.calculateTrendGraphDataCalm({ siteId: siteId, year: year })
            .then(data => {
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
    } catch (error) {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    }
}

module.exports.getchillerPlantEfficiency = async (req, res) => {
    const deviceId = req.query.deviceId
    const siteId = req.query.siteId
    const equipId = req.query.equipId
    const health = req.query.health
    // const startDate = req.query.startDate
    // const endDate = req.query.endDate ? req.query.endDate + " 23:59:59" : req.query.endDate

// HK_TEST
    const endDate = dateFns.format(new Date(), "yyyy-MM-dd")
    const startDate = dateFns.format(dateFns.subMonths(Date.parse(endDate), 1), "yyyy-MM-dd")
console.log(startDate,endDate)
    if (!siteId) {
        return res.json({
            success: false,
            error: "Please provide siteId"
        })
    }

    let key = "eff"
    if(health) 
        key = "health"

    try {
        const data = await calmService.getEfficiencyForecast({ deviceId, siteId, startDate, endDate, equipId, key })
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

module.exports.getInefficientDefinition = async (req, res) => {
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
        const resultedData = await calmService.getInefficientDefinition({ siteId, enabled })
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

module.exports.updateInefficientDefinition = async (req, res) => {
    try {
        const query = req.query
        const body = req.body
        const id = req.params.id
        const parm = body.parm
        const operator = body.operator
        const value = body.value
        const value1 = body.value1
        const value2 = body.value2
        const result1 = body.result1
        const result2 = body.result2
        const priority = body.priority
        const enabled = body.enabled

        if(!id) {
            return res.json(response({
                success :"false",
                error :"please provide path param id!"
            }))
        }
        if(!parm && !operator && (value===null || value===undefined || value==="") && (value1===null || value1===undefined || value1==="") 
            && (value2===null || value2===undefined || value2==="") && !result1 && !result2 && !priority && (enabled===null || enabled===undefined || enabled==="")){
            return res.json(response({
                success :"false",
                error :"please provide a field (parm,operator,value1,value2,result1,result2,priority) in body!"
            }))
        }
        const resultedData = await calmService.updateInefficientDefinition({ id, parm,operator,value,value1,value2,result1,result2,priority, enabled })
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

module.exports.createInefficientDefinition = async (req, res) => {
    try {
        const body = req.body
        // const id = body.id
        const key1 = body.key1
        const key2 = body.key2
        const param = body.param
        const operator = body.operator
        const value = body.value
        const value1 = body.value1
        const value2 = body.value2
        const result1 = body.result1
        const result2 = body.result2
        const priority = body.priority
        const enabled = body.enabled
        const siteId = body.siteId
        

        if( !key1 || !key2 || !param || !operator || !value || !value1 || !value2 || !result1 || !result2 || !priority ||
             (enabled===null || enabled===undefined || enabled==="") || !siteId ){
            return res.json(response({
                success :"false",
                error :"please provide all fields(key1,key2,param,operator,value1,value2,result1,result2,priority,enabled,siteId) in body!"
            }))
        }
        const resultedData = await calmService.createInefficientDefinition({  key1,key2,param,operator,value,value1,value2,result1,result2,priority, enabled,siteId })
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

module.exports.getRunningEnergySaving = async (req, res) => {
    try {
        const query = req.query
        const siteId = query.siteId
        if(!siteId){
            return res.json(response({
                success :"false",
                error :"please provide siteId"
            }))
        }
        const resultedData = customMem.energySavingCalculationInProgress[siteId]
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