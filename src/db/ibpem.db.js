 const mysql = require("mysql2")
const { produceToken } = require('../security/token')
const bcrypt = require('bcrypt')
const redisService = require('../service/redis.service')
const redisData = require('../constant/redisdata')
const dateFns = require('date-fns')


module.exports.con = mysql.createPool({
  host: 'ibpemserv.emscloud.net',
  port: '47506',
  user: 'eco', //EvercommSG
  password: 'ECO4ever', //ECO4sg
  database: 'ibpem_db',
  waitForConnections: false,
  connectionLimit: 100,
  queueLimit: 0,
  debug: false,
  multipleStatements: true,
  connectTimeout: 120000,
})

//maythu mysql
// const con = mysql.createPool({
//   host: 'localhost',
//   port: '3306',
//   user: 'root',
//   password: 'root',
//   database: 'ibpem_db',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// })


module.exports.loadDumyDatas = (startDate, endDate) => {
  const sdate = startDate.trim()
  const edate = endDate.trim()
  return this.con.promise().query(`SELECT ts,efficiency,evaInput,evaOutput FROM calculated_data FORCE INDEX (calculated_data_clientId_siteId_chillerId_ts_index) where clientId=11 and siteId=7 and chillerId=27 and ts between '${sdate}' and '${edate}' order by ts asc`)
}

// module.exports.fiveDaysData = () => {
//   return this.con.promise().query(`SELECT ts,efficiency,evaInput,evaOutput FROM calculated_data FORCE INDEX (calculated_data_clientId_siteId_chillerId_ts_index) where clientId=11 and siteId=7 and chillerId=27 and ts between '2019-01-01' and '2020-12-31' order by ts asc`)
// }

module.exports.signup = (username, email, password, mobileNo, role) => {
  const hash = bcrypt.hashSync(password, 10);
  // console.log("pass",hash)
  return this.con.promise().query(`INSERT INTO user (username,email,password,mobileNo,role,active) VALUES (?,?,?,?,?,?)`, [username, email, hash, mobileNo, role, true])
}

module.exports.login = (email, password, callback) => {
  this.con.promise().query(`SELECT * from user where email='${email}'`, (error, results, fields) => {
    if (error) return callback(error, null)
    else if (!(results.length && bcrypt.compareSync(password, results[0].password))) {
      return callback("Email and password does not match.", null)
    }
    this.con.releaseConnection(this.con) // release connection
    const payload = {
      username: results[0].username,
      email: results[0].email,
      role: results[0].role
    }
    const token = produceToken(payload);
    const data = {
      token: token,
      userId: results[0].id,
      username: results[0].username,
      email: results[0].email,
      mobileNo: results[0].mobileNo,
      role: results[0].role,
      clientIdList: [],
      expiryTimeInMillis: 1200000,
      active: results[0].active == 1 ? true : false,
      clientId: results[0].clientId
    }

    const time = dateFns.format(dateFns.addMinutes(new Date(), 1), "yyyy-MM-dd HH:mm:ss")
    try {
      redisService.createUserSession(token, data, time)
    }
    catch (error) {
      throw error
    }
    return callback(null, data)
  })
}


module.exports.getAllLabels = () => {
  const q = this.con.promise().query(`select * from label`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.saveLabel = (faultType, severity, sensorSignal) => {
  if (faultType !== undefined && faultType !== null) {
    const q = this.con.promise().query(`insert into label(faultType) values(?)`, [faultType])
    this.con.releaseConnection(this.con) // release connection
    return q
    // return this.con.promise().query(`insert into label(faultType) values(?)`, [faultType])
  }
  if (severity !== undefined && severity !== null) {
    const q = this.con.promise().query(`insert into label(severity) values(?)`, [severity])
    this.con.releaseConnection(this.con) // release connection
    return q
  }
  if (sensorSignal !== undefined && sensorSignal !== null) {
    const q = this.con.promise().query(`insert into label(sensorSignal) values(?)`, [sensorSignal])
    this.con.releaseConnection(this.con) // release connection
    return q
  }

}

module.exports.deleteLabelByName = async (faultType, severity, sensorSignal) => {

  const labels = await getAllLabels().then(data => {
    this.con.releaseConnection(this.con) // release connection
    return data
  }).catch(error1 => {
    console.log("error", +error1)
    this.con.releaseConnection(this.con) // release connection
  })

  if (faultType === undefined && severity === undefined && sensorSignal === undefined) {
    const q = this.con.promise().query(`delete from label`)
    this.con.releaseConnection(this.con) // release connection
    return q
  }

  if (faultType !== undefined) {
    const faultTypeResult = labels[0].filter(d => d.faultType === faultType)
    if (faultTypeResult.length > 0) {
      const q = this.con.promise().query(`delete from label where faultType='${faultType}'`)
      this.con.releaseConnection(this.con) // release connection
      return q
    }
    else {
      this.con.releaseConnection(this.con) // release connection
      return "Error"
    }
  }
  if (severity !== undefined) {
    const severityResult = labels[0].filter(d => d.severity === severity)
    if (severityResult.length > 0) {
      const q = this.con.promise().query(`delete from label where severity='${severity}'`)
      this.con.releaseConnection(this.con) // release connection
      return q
    }
    else {
      this.con.releaseConnection(this.con) // release connection
      return "Error"
    }
  }

  if (sensorSignal !== undefined) {
    const sensorSignalResult = labels[0].filter(d => d.sensorSignal === sensorSignal)
    if (sensorSignalResult.length > 0) {
      const q = this.con.promise().query(`delete from label where sensorSignal='${sensorSignal}'`)
      this.con.releaseConnection(this.con) // release connection
      return q
    }
    else {
      this.con.releaseConnection(this.con) // release connection
      return "Error"
    }
  }

}

// nayhtet
// Chiller database nayhtet
module.exports.getDevices = (condition = "") => {
  const q = this.con.promise().query(`select * from ibpem_db.device ${condition}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceMappings = (selectors = '*', condition) => {
  //console.log(`select ${selectors || '*'} from device_mapping ${condition}`)
  const q = this.con.promise().query(`select ${selectors} from device_mapping ${condition}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getDataType = () => {
  const q = this.con.promise().query(`SELECT distinct dataTypeName ,dataType FROM ibpem_db.device_mapping where dataTypeName !='some data'`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getUser = () => {
  const q = this.con.promise().query(`SELECT * FROM user`)
  this.con.releaseConnection(this.con) // release connection
  return q
}



module.exports.getAllDataTypes = (condition) => {
  const q = this.con.promise().query(`
    SELECT dm.unit as unit, dm.deviceId as deviceId, dm.deviceDesc as deviceDesc, dm.dataType as dataType, d.equipId as equipId 
    FROM device_mapping dm 
    LEFT JOIN device d on d.id=dm.deviceId
    where dataType in (${condition})`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

// maythu
module.exports.saveDevice = (deviceType, deviceTypeName) => {
  const q = this.con.promise().query(`insert into device(deviceType,deviceTypeName) values(?,?)`, [deviceType, deviceTypeName])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.saveDeviceMapping = (unit, ieee, deviceDesc, deviceId, tableName, columnName, dataType, deviceTypeId, deviceType) => {
  const q = this.con.promise().query(`insert into device_mapping(unit,ieee,deviceDesc,deviceId,tableName,columnName,dataType,deviceTypeId,deviceType) values(?,?,?,?,?,?,?,?,?)`, [unit, ieee, deviceDesc, deviceId, tableName, columnName, dataType, deviceTypeId, deviceType])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceIdBydeviceType = (deviceType) => {
  //console.log(deviceType,"db")
  const q = this.con.promise().query(`select id from device where deviceTypeName='${deviceType}'`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceMappingByDeviceIdAndDataType = (deviceId, dataType) => {
  //console.log(deviceType,"db")
  const q = this.con.promise().query(`select * from device_mapping where deviceId=${deviceId} AND dataType='${dataType}'`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.deleteDeviceMapping = () => {
  const q = this.con.promise().query(`delete from  device_mapping`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDataTypeName = () => {
  const q = this.con.promise().query(`SELECT distinct dataType FROM ibpem_db.device_mapping `)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceTypeName = () => {
  const q = this.con.promise().query(`SELECT distinct equipId FROM ibpem_db.device`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

//==================================

module.exports.saveYealyEightDay = ({ year, deviceId, dataType, count, startDate, endDate, anomalyCount, siteId }) => {
  // console.log("data: ", { year, deviceId, dataType, count, startDate, endDate,siteId })
  const q = this.con.promise()
    .query(`INSERT INTO yearly_eight_day(year,deviceId,dataType, count, anomalyCount, startDate, endDate,siteId) VALUES (?,?,?,?,?,?,?,?)`,
      [year, deviceId, dataType, count, anomalyCount, startDate, endDate, siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.loadYearlyEightDayData = ({ deviceId, dataType, algo_id }) => {
  let condition = dataType ? ` and dataType = '${dataType}'` : ''
  condition += deviceId ? ` and deviceId = ${deviceId}` : ''
  condition += algo_id ? ` and algo_id = '${algo_id}'` : ''

  const query = `select year, startDate, endDate, sum(count) as count, sum(anomalyCount) as anomalyCount
    from yearly_eight_day
    where true ${condition}
    group by startDate, endDate, year
    order by startDate asc`
  console.log("loadYearlyEightDayData: ", query);
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.loadAnomalyYearlyEightDayData = ({ deviceId, dataType, algo_id }) => {
  let condition = dataType ? ` and dataType = '${dataType}'` : ''
  condition += deviceId ? ` and deviceId = ${deviceId}` : ''
  condition += algo_id ? ` and algo_id = '${algo_id}'` : ''

  const query = `select year, startDate, endDate, sum(count) as count, sum(anomalyCount) as anomalyCount
    from eight_days_ad
    where true ${condition}
    group by startDate, endDate, year
    order by startDate asc`
  // console.log("query: ", query);
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.loadFddYearlyEightDayData = ({ deviceId, algo_id }) => {

  let condition = deviceId ? ` and deviceId = ${deviceId}` : ''
  condition += algo_id ? ` and algo_id = '${algo_id}'` : ''
  const query = `select year, startDate, endDate, sum(count) as count, sum(fddCount) as fddCount
  from eight_days_fdd
  where true ${condition}
  group by startDate, endDate, year
  order by startDate asc`
  // console.log("query: ", query);
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.deleteYealyEightDay = ({ year1, year2 }) => {
  // console.log("data: ", { year, deviceId, dataType, count, startDate, endDate })
  const q = this.con.promise()
    .query(`delete from yearly_eight_day where year>=? and year<=?`,
      [year1, year2])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.deleteYearlyEightDayData = ({ deviceId, dataType }) => {
  const query = `select * from yearly_eight_day where dataType='${dataType}' and deviceId=${deviceId} order by startDate asc`
  // console.log("query: ", query);
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


///  nayhtet
module.exports.selectRawQuery = (selectors, tableName, condition) => {
  const query = `SELECT ${selectors} FROM ${tableName} ${condition}`
  //console.log(query, "chiler")
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.selectQueryComplex = (query) => {
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.insertRawQuery = (columns, tableName, values) => {
  const query = `INSERT INTO ${tableName} ${columns} values ${values}`
  //console.log("insertQuery: ",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateNotification = (id, ts, startDate, endDate, read) => {
  const query = `UPDATE notification set ts=?,startDate=?,endDate=?,read=? where id=?`
  // console.log(query)
  const q = this.con.promise().query(query, [ts, startDate, endDate, read, id])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateRawQuery = (column, tableName, value, condition) => {
  const query = `UPDATE ${tableName} set ${column}=${value} ${condition}`
  // console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

// module.exports.eightDaysDataforAnomalyDetection = ({ values }) => {
//   const q = this.con.promise()
//     .query(`INSERT INTO eight_days_ad(algo_id,equipId,deviceId,dataType,year,startDate,endDate,count,anomalyCount) values ?`,
//       [values])
//   this.con.releaseConnection(this.con) // release connection
//   return q
// }

module.exports.eightDaysDataforFaultDetection = ({ values }) => {
  const q = this.con.promise()
    .query(`INSERT INTO eight_days_fdd(algo_id,equipId,deviceId,year,startDate,endDate,count,fddCount,siteId) values ?`,
      [values])
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.eightDaysDataforFasleAlarmDetection = ({ values }) => {
  const q = this.con.promise()
    .query(`INSERT INTO eight_days_fad(algo_id,equipId,deviceId,year,startDate,endDate,count,fadCount) values ?`,
      [values])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getAllDeviceAndEquipment = () => {
  const q = this.con.promise().query(`
    SELECT deviceId , equipId,siteId FROM ibpem_db.device_mapping left join device on 
    device.id=device_mapping.deviceId where device.equipId is not null group by deviceId`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.spForAnomalyEightDaysYearly = (year) => {
  console.log(year)
  let sql = `CALL spForEightDaysWithAnomaly('${year}')`;
  this.con.query(sql, true, (error, results, fields) => {
    if (error) {
      this.con.releaseConnection(this.con) // release connection
      return console.error(error.message);
    }
    this.con.releaseConnection(this.con) // release connection
    console.log(results[0]);
  })
}


module.exports.getChillerOverviewHourly = (deviceId, dataType) => {
  const query = ` select * from chiller_overview_hourly where deviceId= ${deviceId} and dataType= '${dataType}'`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getEightDaysData = ({ dataType, deviceId, algo_id, siteId }) => {
  const query = ` select yd.deviceId, yd.year, yd.startDate, yd.endDate, sum(yd.count) as count,
   sum(yd.anomalyCount) as anomalyCount, sum(if(dm.detect_id is null OR ano.verified is not null, 0, 1)) as anoCount, 
   group_concat(distinct (dm.detect_id)) as master_ids, group_concat(distinct (ano.detect_id)) as dtd_ids, group_concat(ano.verified)
 from ibpem_db.yearly_eight_day yd
   left join ibpem_db.device dd on dd.id=yd.deviceId
   left join iotdata.detection_master dm 
     on dm.equip_id=dd.equipId and dm.algo_id='ad_v1' and dm.parameter = yd.dataType
       and ((dm.start_time between yd.startDate and date_add(yd.endDate, interval 1 day)) OR (dm.end_time between yd.startDate and date_add(yd.endDate, interval 1 day)))
   left join iotmgmt.dtd_anomaly ano on ano.detect_id=dm.detect_id
 where yd.siteId = '${siteId}'
 ${dataType ? "and yd.dataType ='" + dataType + "'" : ""} 
 ${deviceId ? "and yd.deviceId = " + deviceId : ""}
 group by yd.startDate, yd.endDate, yd.year
 order by yd.startDate asc`

  console.log(query)

  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getFddEightDaysData = ({ deviceId, algo_id, siteId }) => {
  const query = ` select yd.deviceId, yd.year, yd.startDate, yd.endDate, 
  sum(yd.count) as count, sum(yd.fddCount) as anomalyCount, 
  sum(if(dm.detect_id is null OR ano.verified is not null, 0, 1)) as anoCount, 
  group_concat(distinct (dm.detect_id)) as master_ids, 
  group_concat(distinct (ano.detect_id)) as dtd_ids, group_concat(ano.verified)
  from ibpem_db.eight_days_fdd yd
    left join ibpem_db.device dd on dd.id=yd.deviceId
    left join iotdata.detection_master dm 
      on dm.equip_id=dd.equipId and dm.algo_id='fdd_v1'
        and ((dm.start_time between yd.startDate and yd.endDate) OR (dm.end_time between yd.startDate and yd.endDate))
    left join iotmgmt.dtd_fdd ano on ano.detect_id=dm.detect_id
  where yd.siteId = '${siteId}'
   ${deviceId ? "and yd.deviceId =" + deviceId : ""} 
  group by yd.startDate, yd.endDate, yd.year
  order by yd.startDate asc`
  //console.log("query: ",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getFadEightDaysData = ({ deviceId, algo_id }) => {
  const query = ` select yd.deviceId, yd.year, yd.startDate, yd.endDate, 
  sum(yd.count) as count, sum(yd.fddCount) as anomalyCount, 
  sum(if(dm.detect_id is null OR ano.verified is not null, 0, 1)) as anoCount, group_concat(distinct (dm.detect_id)) as master_ids, group_concat(distinct (ano.detect_id)) as dtd_ids, group_concat(ano.verified)
  from ibpem_db.eight_days_fdd yd
    left join ibpem_db.device dd on dd.id=yd.deviceId
    left join iotdata.detection_master dm 
      on dm.equip_id=dd.equipId and dm.algo_id='fad_v1'
        and ((dm.start_time between yd.startDate and yd.endDate) OR (dm.end_time between yd.startDate and yd.endDate))
    left join iotmgmt.dtd_fdd ano on ano.detect_id=dm.detect_id
  where true ${deviceId ? "and deviceId =" + deviceId : ""} 
  group by yd.startDate, yd.endDate, yd.year
  order by yd.startDate asc`

  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.eightDaysFddData = (year) => {
  const query = `SELECT * FROM eight_days_fdd where year='${year}'`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q

}

module.exports.getFddDeviceMapping = () => {
  const query = `SELECT group_concat("'",ieee,"'") as ieee ,tableName,deviceId,siteId FROM ibpem_db.device_mapping 
  left join device on device.id=device_mapping.deviceId
  group by deviceId, tableName `
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateFddCount = (startDate, endDate, deviceId, totalCount) => {
  const query = ` update eight_days_fdd set count=${totalCount} where 
  deviceId=${deviceId} and startDate='${startDate}' and endDate='${endDate}'`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.eightDaysFddDataForRealTime = (startDate, endDate) => {
  const query = `SELECT * FROM ibpem_db.eight_days_fdd where '${startDate}' >=startDate and '${endDate}'<=endDate`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateFddRealTimeCount = (startDate, endDate, deviceId, totalCount) => {
  const query = ` update eight_days_fdd set count=count + ${totalCount} where 
  deviceId=${deviceId} and startDate='${startDate}' and endDate='${endDate}'`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.eightDaysAnomalyDataForRealTime = (startDate, endDate) => {
  const query = `SELECT * FROM ibpem_db.yearly_eight_day where '${startDate}' >=startDate and '${endDate}'<date_add(endDate,interval 1 day)`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getAnomalyDeviceMapping = () => {
  const query = ` SELECT tableName,dataType,deviceId,ieee,equipId FROM ibpem_db.device_mapping left join device 
  on  device.id=device_mapping.deviceId where device.equipId is not null group by deviceId,dataType  `
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateAnomalyRealTimeCount = (startDate, endDate, deviceId, dataType, totalCount) => {
  const query = ` update yearly_eight_day set count=count + ${totalCount} where 
  deviceId=${deviceId} and dataType = '${dataType}' and startDate='${startDate}' and endDate='${endDate}'`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getRawInfoData = (condition) => {
  const query = ` select ieee,deviceId,columnName,tableName,equipId,dataType from ibpem_db.device_mapping left join device on 
   device.id = device_mapping.deviceId where ${condition}`
  // console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getEquipmentMappings = (selectors = "*", condition) => {
  // console.log(query)
  const q = this.con.promise().query(`SELECT ${selectors} from ibpem_db.device_mapping ${condition}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceAndParameterMapping = (siteId) => {
  const query = `SELECT dm.deviceId as equipId, 
  lower(concat(d.equipId,":", dm.datatype)) as deviceParameter,lower(concat(dm.deviceId,":", dm.dataType)) 
    as deviceIdParameter, d.siteId as siteId 
    FROM ibpem_db.device_mapping dm left join ibpem_db.device d on d.id=dm.deviceId where d.equipId is not null 
    and dm.dataType is not null and d.siteId='${siteId}'`
  //  console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getEquipmentAlias = () => {
  const q = this.con.promise().query(`SELECT equipId as equipAlias,deviceTypeName as equipTypeName,id as equipId FROM ibpem_db.device where equipId is not null`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getMappingForEachDeviceId = (siteId) => {
  const query = `SELECT siteId,deviceId,dataType, ieee,tableName,equipId,dm.deviceType FROM ibpem_db.device_mapping dm
  left join device d on d.id = dm.deviceId where d.equipId is not null and dm.dataType is not null
   and d.equipId is not null and d.siteId='${siteId}' and dm.enabled =1 group by deviceId,dataType`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getSiteInfo = () => {
  // const query = `select * from site_info`
  const query = `SELECT s.*, count(d.equipId) as numberOfChillers FROM ibpem_db.site_info s left join ibpem_db.device d on d.siteId=s.site_id and d.deviceType='CH'`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.saveSiteInfo = (siteId, siteName, buildingName, countryName, timezone, clientId, createdDate, reportEnable, reportReady, siteCode) => {
  const query = `insert into site_info(site_id,site_name,building_name,country_name,timezone,client_id,createdDate,report_enable,report_ready,site_code) values (?,?,?,?,?,?,?,?,?,?)`
  const q = this.con.promise().query(query, [siteId, siteName, buildingName, countryName, timezone, clientId, createdDate, reportEnable, reportReady, siteCode])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getClientInfo = () => {
  const query = `select * from client_info`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.saveClientInfo = (createdDate, name, email, mobileNo) => {
  const query = `insert into client_info(createdDate,name,email,mobileNo) values (?,?,?,?)`
  const q = this.con.promise().query(query, [createdDate, name, email, mobileNo])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getClientId = (name) => {
  const query = `select * from client_info where name =?`
  const q = this.con.promise().query(query, [name])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getSiteByClientId = (clientId) => {
  const query = `select * from site_info where client_id =?`
  const q = this.con.promise().query(query, [clientId])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceInfoBySiteId = () => {
  const query = `SELECT d.siteId,dm.deviceId,dm.dataType,dm.deviceType,dm.tableName,dm.columnName, dm.ieee,dm.deviceDesc, dm.dataTypeName 
  FROM ibpem_db.device_mapping dm left join device d on d.id = dm.deviceId where dm.dataType is not null `
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.checkDuplicatedId = (id) => {
  const query = `select * from notification where id =?`
  const q = this.con.promise().query(query, [id])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getStartAndEndDate = (startDate, endDate, tableName) => {
  const query = `SELECT min(startDate) as startDate,max(endDate) as endDate FROM ${tableName} where '${startDate}' >=startDate and '${endDate}'<=endDate`
  console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getSelectedStartAndEndDate = (startDate, endDate) => {
  const query = `SELECT min(startDate) as startDate,max(endDate) as endDate FROM yearly_eight_day where '${startDate}' >=date_format(startDate,'%Y-%m-%d 00:00:00') and 
  '${endDate}'<=date_format(endDate,'%Y-%m-%d 23:59:59') `
  //console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}



module.exports.getCurrentEightDaysInterval = (startDate) => {
  const query = `SELECT startDate , endDate FROM yearly_eight_day where '${startDate}' between date_format(startDate,'%Y-%m-%d 00:00:00') and 
  date_format(endDate,'%Y-%m-%d 23:59:59') limit 1`
  //console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getCurrentEightDaysIntervalFdd = (startDate) => {
  const query = `SELECT startDate , endDate FROM eight_days_fdd where '${startDate}' between startDate and endDate limit 1`
  //console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getParameter1 = (siteId) => {
  const query = `SELECT lower(dm.dataType) as 'key', d.equipId as equipId, concat(d.equipId, ' : ',upper(dm.dataType)) as 'name',
      d.deviceTypeName as equipName, d.id as deviceId,d.siteId as siteId,
      dm.ieee as ieee, dm.unit as unit,dm.tableName,dm.columnName from device_mapping dm
      left join device d on d.id = dm.deviceId where dm.dataType is not null
      ${siteId ? ` and d.siteId = '${siteId}'` : ''}`
  //console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.eightDaysDataforAnomalyDetection = ({ values }) => {
  //console.log(values)
  const q = this.con.promise()
    .query(`INSERT INTO eight_days_ad(siteId,algoId,equipId,deviceId,dataType,year,startDate,endDate,count,anomalyCount) values ?`,
      [values])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateAdRawCount = (resultedValues) => {
  const query =
    `INSERT INTO eight_days_ad(algoId,siteId,deviceId,equipId,dataType,count,year,startDate,endDate)
  values ${resultedValues} ON DUPLICATE KEY UPDATE count=VALUES(count) `
  //console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}






// module.exports.getSiteList = () => {
//   const query = `SELECT distinct siteId FROM ibpem_db.device`
//   const q = this.con.promise().query(query)
//   this.con.releaseConnection(this.con) // release connection
//   return q
// }














