const db = require('../db/aimgmt.db')

module.exports.getAllLabels = ()=>{
    return db.getAllLabels().then(data=>{
        if(data[0].length>0){
            const faultType=data[0].filter(d=>d.faultType !== null && d.faultType).map(c=>c.faultType)
            const severity =data[0].filter(d=>d.severity !== null).map(c=>c.severity)
            const sensorSignal=data[0].filter(d=>d.sensorSignal !== null).map(c=>c.sensorSignal)
            return ({faultType:faultType,severity:severity,sensorSignal:sensorSignal})
        }
        else{
           return []
        }
    }).catch(error=>{
        throw error
    })
}

module.exports.saveLabel=(faultType,severity,sensorSignal)=>{
    return db.saveLabel(faultType,severity,sensorSignal)
}


module.exports.deleteLabelByName=(faultType,severity,sensorSignal)=>{
    return db.deleteLabelByName(faultType,severity,sensorSignal)
}