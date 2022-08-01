const redis = require("redis")
const redisData = require('../constant/redisdata')
const moment = require('moment')
const uuidv1 = require('uuid/v1');
const anomalyService = require("./anomaly.service")
const dateFns = require("date-fns")
const dateFnsZone = require("date-fns-tz")
const ibpemdb = require("../db/aimgmt.db")

// client library for the redis server with port 6379

// #combine_chiller_ml
const redisClient = null
// const redisClient = redis.createClient({ host: 'localhost', port: 6379, password: 'root' })//206.189.80.23

//anomalies
const getAnomailesData = (startDate, endDate, callback) => {
    redisClient.hgetall(redisData.ANOMALIES, (error, data) => {
        if (!data) {
            return callback(null, [])
        }
        if (data !== null) {
            const dataJson = Object.values(data).map(v => JSON.parse(v))
            if (startDate === undefined && endDate === undefined) {
                return callback(null, dataJson)
            }
            else {
                const result = dataJson.filter(d => {
                    const sdate = moment(d.startDate).format('YYYY-MM-DD')
                    const edate = moment(d.endDate).format('YYYY-MM-DD')
                    return moment(sdate).isSameOrAfter(startDate) && moment(edate).isSameOrBefore(endDate)
                })
                return callback(null, result)
            }
        }
    })
}


//update anomalies
const updateAnomaliesData = (requestId, data, callback) => {
    const data1 = {
        id: requestId,
        faultType: data.faultType,
        severity: data.severity,
        sensorSignal: data.sensorSignal,
        startDate: data.startDate,
        endDate: data.endDate,
        user: data.user,
        additionalGraphs: data.additionalGraphs,
        anomalyState: data.anomalyState,
        remark: data.remark,
        deviceType: data.deviceType,
        deviceId: data.deviceId,
        deleted: false,
        building: data.building,
        createdTs: data.createdTs,
    }
    redisClient.hgetall(redisData.ANOMALIES, (error, anomalie) => {
        if (anomalie != null) {
            const anomalieData = Object.values(anomalie).map(v => JSON.parse(v)).filter(d => d.id === requestId)
            if (anomalieData.length > 0) {
                const v1 = anomalieData[0]
                const updatedTs = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss")
                const resultData = {
                    id: v1.id, additionalGraphs: v1.additionalGraphs, anomalyState: v1.anomalyState, remark: v1.remark,
                    startDate: v1.startDate, endDate: v1.endDate, building: v1.building,
                    equipmentType: v1.deviceType, deviceId: v1.deviceId,
                    time: v1.createdTs, label: [v1.faultType[0], v1.severity[0], v1.sensorSignal[0]], labeledBy: v1.user,
                    updatedTs: updatedTs
                }
                redisClient.hset(redisData.EDIT_HISTORY, `${v1.id}_${updatedTs}`, JSON.stringify(resultData), (error1, data2) => {
                    if (error1) return callback(error1, null)
                    else {
                        redisClient.hset(redisData.ANOMALIES, `${v1.id}`, JSON.stringify(data1), (error, result) => {
                            if (error) return callback(error, null)
                            else if (result === 0) {
                                return callback(null, data1)
                            }
                            else return callback(null, [])
                        })
                    }
                })

            }
            else return callback("id not exist", null)
        }
        else return callback("data not exist", null)
    })
}

//save history 
const saveHistoryData = (building, equipmentType, time, label, labeledBy, callback) => {
    const id = uuidv1();
    const data = {
        id: id, building: building, equipmentType: equipmentType, time: time, label: label, labeledBy: labeledBy
    }
    redisClient.hset(redisData.HISTORY_DATA, `${id}`, JSON.stringify(data), (error, data1) => {
        if (error) return callback(error, null)
        else return callback(null, data)
    })
}
//get history
const getHistoryData = (callback) => {
    redisClient.hgetall(redisData.ANOMALIES, (error, anomalies) => {
        if (anomalies !== null) {
            redisClient.hgetall(redisData.EDIT_HISTORY, (error, history) => {
                const dataJson = Object.values(anomalies).map(v => JSON.parse(v)).map(v1 => {
                    if (history !== null) {
                        const allHistoryData = Object.values(history).map(v => JSON.parse(v))
                        const historyRemark = allHistoryData.filter(d => d.id === v1.id).map(c => {
                            return { labeledBy: c.labeledBy, remark: c.remark, updatedTs: c.updatedTs }
                        })
                        return ({
                            id: v1.id, labeledBy: v1.user, label: [v1.faultType[0], v1.severity[0], v1.sensorSignal[0]],
                            additionalGraphs: v1.additionalGraphs[0], startDate: v1.startDate, endDate: v1.endDate, remark: v1.remark, deviceId: v1.deviceId,
                            anomalyState: v1.anomalyState, deviceType: v1.deviceType, building: v1.building, createdTs: v1.createdTs,
                            previousRemark: historyRemark,
                        })
                    }
                    else {
                        return ({
                            id: v1.id, labeledBy: v1.user, label: [v1.faultType[0], v1.severity[0], v1.sensorSignal[0]],
                            additionalGraphs: v1.additionalGraphs[0], startDate: v1.startDate, endDate: v1.endDate, remark: v1.remark, deviceId: v1.deviceId,
                            deviceType: v1.deviceType, anomalyState: v1.anomalyState, building: v1.building, createdTs: v1.createdTs,
                            previousRemark: []
                        })
                    }
                })
                return callback(null, dataJson)
            })
        }
        else return callback(null, [])
    })
}


//eight days data 
const eightDaysData = (dataType, callback) => {
    redisClient.hgetall(redisData.EIGHT_DAYS_DATA, (error1, data) => {
        if (data !== null) {
            let dataJson = Object.values(data).map(v => JSON.parse(v))
            const data1 = dataJson[0]

            return anomalyService.getAnomalyData({ dataType })
                .then(anomalies => {
                    const resultData = data1/*.filter(d=>d.year==="2019")*/.map(yd => {
                        const d = yd.data.map(wd => {
                            const anoDataLength = anomalies.filter(v => {
                                const sdate = Date.parse(v.startDate) // moment(v.startDate).format("YYYY-MM-DD")
                                const edate = Date.parse(v.endDate) // moment(v.endDate).format("YYYY-MM-DD")
                                const wsdate = Date.parse(wd.startDate)
                                const wedate = Date.parse(wd.endDate)
                                return (
                                    dateFns.compareAsc(sdate, wsdate) >= 0 && dateFns.compareAsc(edate, wedate) <= 0
                                )
                                /*(moment(sdate).isSameOrAfter(wd.startDate) &&
                                    moment(edate).isSameOrBefore(wd.endDate))*/
                            })
                            const normalDataLength = wd.count - anoDataLength.length
                            const dataState = [
                                { stateId: 0, dataCount: normalDataLength },
                                { stateId: 1, dataCount: anoDataLength.length }
                            ]

                            return ({ ...wd, dataState: dataState })
                        })
                        return ({ ...yd, data: d })
                    })
                    return callback(null, resultData)
                })
                .catch(error => {
                    return callback(error, [])
                })
        }
        else return callback(error1, [])
    })
}

const anomalies = (callback) => {
    redisClient.hgetall(redisData.ANOMALIES, (error, data) => {
        if (data !== undefined && data !== null) {
            const dataJson = Object.values(data).map(v => JSON.parse(v))
            return callback(null, dataJson)
        }
        else {
            return callback(error, [])
        }
    })
}

const delEditHistoryById = (id, callback) => {
    redisClient.hgetall(redisData.EDIT_HISTORY, (error, data) => {
        if (error) return callback(error, null)
        else {
            if (data !== null) {
                const dataJson = Object.values(data).map(v => JSON.parse(v)).filter(d => d.id === id)
                if (dataJson.length > 0) {
                    dataJson.map(v => {
                        redisClient.hdel(redisData.EDIT_HISTORY, `${v.id}_${v.updatedTs}`, (error1, data1) => {
                            if (error) return callback(error1, null)
                            else return callback(null, data1)
                        })
                    })
                }
                else return callback(null, "anomlie_id is deleted but id with that edit history is not exist")
            }
            else return callback(null, "all edit history data is null")
        }
    })
}

const delEditHistory = (callback) => {
    redisClient.del(redisData.EDIT_HISTORY, (error, data) => {
        if (error) return callback(error, null)
        else return callback(null, [])
    })
}

//save chillerOverView 
const saveChillerOverviewData = async (chillerOverviewArray) => {
    redisClient.hset(redisData.REALTIME_OVERVIEW, redisData.CHILLER_LAST_UPDATED, dateFns.format(new Date(), "yyyy-MM-dd HH:mm:ss"))
    return redisClient.hset(redisData.REALTIME_OVERVIEW, redisData.CHILLER, JSON.stringify(chillerOverviewArray))
}

//save chillerOverView 
const getChillerOverviewData = async () => {
    // redisClient.hset(redisData.REALTIME_OVERVIEW, redisData.CHILLER_LAST_UPDATED, dateFns.format(new Date(), "yyyy-MM-dd HH:mm:ss"))
    return new Promise((resolve, reject) => {
        return redisClient.hgetall(redisData.REALTIME_OVERVIEW, (error, data) => {
            if (error) return reject(error)
            else {
                if (!data) return resolve(null)
                return resolve({
                    chillerOverview: data[redisData.CHILLER] ? JSON.parse(data[redisData.CHILLER]) : [],
                    lastUpdated: data[redisData.CHILLER_LAST_UPDATED]
                })
            }
        })
    })
}

//save Plant OverView 
const savePlantOverviewData = async (plantOverviewArray) => {
    redisClient.hset(redisData.REALTIME_OVERVIEW, redisData.PLANT_LAST_UPDATED, dateFns.format(new Date(), "yyyy-MM-dd HH:mm:ss"))
    return redisClient.hset(redisData.REALTIME_OVERVIEW, redisData.PLANT, JSON.stringify(plantOverviewArray))
}

//save chillerOverView 
const getPlantOverviewData = async () => {
    // redisClient.hset(redisData.REALTIME_OVERVIEW, redisData.CHILLER_LAST_UPDATED, dateFns.format(new Date(), "yyyy-MM-dd HH:mm:ss"))
    return new Promise((resolve, reject) => {
        return redisClient.hgetall(redisData.REALTIME_OVERVIEW, (error, data) => {
            if (error) return reject(error)
            else {
                if(!data) return resolve(null)
                return resolve({ 
                    plantOverview: data[redisData.PLANT] ? JSON.parse(data[redisData.PLANT]) : [], 
                    lastUpdated: data[redisData.PLANT_LAST_UPDATED] 
                })
            }
        })
    })
}

const createUserSession = async (key,userData, expireTime) => {
    redisClient.hset(redisData.SESSION, key, expireTime)
    return redisClient.hset(redisData.SESSION,key+key, JSON.stringify(userData))
}

const getUserExpriyTime = async (token) => {
    return new Promise((resolve, reject) => {
        return redisClient.hget(redisData.SESSION, token, (error, data) => {
            if (error) return reject(error)
            else {
                if (!data) return resolve(null)
                return resolve(data)
            }
        })
    })
}

const getUserDetail = async (token) => {
    return new Promise((resolve, reject) => {
        return redisClient.hget(redisData.SESSION, token+token, (error, data) => {
            if (error) return reject(error)
            else {
                if (!data) return resolve(null)
                return resolve(JSON.parse(data))
            }
        })
    })
}

//for prevDay,sevenDay, prevMonth
const savePreviousData = async (key,data) => {
    redisClient.hset(redisData.PREVIOUS_DATA, key, JSON.stringify(data))
}

const getPreviousData=async (periodType,dataType,deviceId,siteId) =>{
     
    if( false && periodType=="realtime"){
        try{
        const realTimeData= await ibpemdb.getChillerOverviewHourly(deviceId,dataType)
        const result = realTimeData[0].map(d=>({...d,ts:dateFns.format(d.ts,"yyyy-MM-dd HH:mm")}))
        return result
        }
        catch(error){
            throw error.toString()
        }
     }

     else{
         const key = `${periodType}_${deviceId}_${dataType}_${siteId}`
    //  console.log("key: ", key)
     return new Promise((resolve,reject)=>{
      return redisClient.hget(redisData.PREVIOUS_DATA,key,(error,data)=>{
          if(error) return reject(error)
          else{
              if(!data) return resolve([])
              return resolve(JSON.parse(data))
          }
      })
     })
    }
}

const getRunningScheduler = async () => {
    const key = "schedulerRunning"
    return new Promise((resolve, reject) => {
         return redisClient.hget(redisData.RUNNING_SCHEDULER, key, (error, data) => {
             if (error) return reject(false)
             else {
                 if (!data) return resolve(false)
                 return resolve(data==="true" ? true : false)
             }
         })
    })
}

const saveRunningScheduler = async ({ schedulerRunning=false }) => {
    // const runningScheduler = await getRunningScheduler()
    const key = "schedulerRunning"
    return await redisClient.hset(redisData.RUNNING_SCHEDULER, key, schedulerRunning)
}

const deleteRunningScheduler = async ({ schedulerRunning = false }) => {
    // const runningScheduler = await getRunningScheduler()
    const key = "schedulerRunning"
    return await redisClient.hdel(redisData.RUNNING_SCHEDULER, key)
}


module.exports = {
    redisClient,
    getAnomailesData, updateAnomaliesData,
    saveHistoryData, getHistoryData, eightDaysData,
      delEditHistory, delEditHistoryById,
    createUserSession,getUserExpriyTime,getUserDetail,savePreviousData,
    getPreviousData,

    // nayhtet
    saveChillerOverviewData,
    getChillerOverviewData,
    savePlantOverviewData,
    getPlantOverviewData,

    getRunningScheduler,
    saveRunningScheduler,
    deleteRunningScheduler,
    
}