const db = require('../db/aimgmt.db')
const reportService = require('./reportService')

module.exports.getSiteInfo = ({ siteId, siteCode }) => {
    return db.getSiteInfo({ siteId, siteCode}).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.getClientInfo = () => {
    return db.getClientInfo().then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.saveClientInfo = (createdDate, name, email, mobileNo) => {
    return db.saveClientInfo(createdDate, name, email, mobileNo).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.saveSiteInfo = (siteId, siteName, buildingName, countryName, timezone, clientId, createdDate, reportEnable, reportReady, siteCode) => {
    return db.saveSiteInfo(siteId, siteName, buildingName, countryName, timezone, clientId, createdDate, reportEnable, reportReady, siteCode).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.getClientId = (clientName) => {
    return db.getClientId(clientName).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.saveDqReport = (siteId,configData={site_id,database_name, database_ip, port, username, password}) => {
    return reportService.createDqConfigList(siteId,configData).then(data=>{
        return data
    }).catch(error=>{
        throw error
    })
}

module.exports.getSiteByClientId = (clientId) => {
    return db.getSiteByClientId(clientId).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.getDqReport = async (clientId) => {
    try {
        const siteDatas = await this.getSiteByClientId(clientId)
        const reportDatas = await reportService.getDqConfigList()
         //console.log("respotDatas: ", reportDatas)
        const results = []
        // console.log("siteDatas: ", siteDatas)
        for( d of siteDatas) {
            const reportData = reportDatas.find(v => v.siteIdML == d.site_id)
            // console.log("reportData: ", reportData)
            const dqConfig = {}
            dqConfig.siteCode = d.site_code
            dqConfig.siteName = d.site_name
            dqConfig.clientId = d.client_id
            dqConfig.siteId = d.site_id
            dqConfig.dqConfig = reportData || null
            results.push(dqConfig)
        }
        // console.log("RESULTS: ", results)
        return results
    }
    catch (error) {
        throw error
    }

}

module.exports.updateDqReport = (siteId,configData={site_id,database_name, database_ip, port, username, password}) => {
    // console.log("incoming: ", { siteId, configData})
    return reportService.updateDqConfigList(siteId,configData).then(data=>{
        // console.log("result1: ", data)
          return data
    }).catch(error=>{
        throw error
    })
}


module.exports.deleteDqReport = (siteId) => {
    return reportService.deleteDqConfigList(siteId).then(data=>{
          return data
    }).catch(error=>{
        throw error
    })
}