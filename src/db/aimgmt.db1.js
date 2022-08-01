const mysql = require("mysql2")
const bcrypt = require('bcrypt')
const { produceToken } = require("../security/token")
const dateFns = require('date-fns')
const redisService = require('../service/redis.service')
const kumoDate = require('../config/kumoDate')


// module.exports.con = mysql.createPool({
//   host: 'ibpemserv.emscloud.net',
//   port: '47506',
//   user: 'eco',
//   password: 'ECO4ever',
//   database: 'aimgmt',
//   waitForConnections: false,
//   connectionLimit: 20,
//   queueLimit: 0,
//   debug: false,
//   multipleStatements: true,
//   connectTimeout: 120000
// })

// module.exports.con = mysql.createPool({
//   host: '220.135.89.159',
//   port: '47506',
//   user: 'eco',
//   password: 'ECO4ever',
//   database: 'aimgmt',
//   waitForConnections: false,
//   connectionLimit: 20,
//   queueLimit: 0,
//   debug: false,
//   multipleStatements: true,
//   connectTimeout: 120000
// })

// #combine_chiller_ml
module.exports.con = mysql.createPool({
  host: 'pb.emscloud.net',
  port: '45201',
  user: 'ecoml',
  password: 'ECO4ml20',
  database: 'aimgmt',
  waitForConnections: false,
  connectionLimit: 10,
  queueLimit: 0,
  debug: false,
  multipleStatements: true,
  connectTimeout: 120000
})




module.exports.getFaultType = () => {
  const q = this.con.promise().query(`SELECT fault_id as 'key',fault_name as 'label', severity_id as 'severity_id', parameters FROM aimgmt.fault_master`)
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getSeverityType = () => {
  const q = this.con.promise().query(`SELECT severity_id as 'key',severity_name as 'label' FROM aimgmt.severity_master`)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getAlgorithmName = () => {
  const q = this.con.promise().query(`SELECT * FROM aimgmt.algo_master`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getAlarmType = () => {
  const q = this.con.promise().query(`SELECT * FROM aimgmt.alarm_master`)
  this.con.releaseConnection(this.con) // release connection
  return q
}


// nayhtet
module.exports.updateQuery = ({ tableName, columns, data, condition }) => {

  const columnString = columns.reduce((r, c) => {
    return r.length === 0 ? `${c}=?` : `${r}, ${c}=?`
  }, "")
  const query = `update aimgmt.${tableName} set ${columnString} where ${condition}`
  // console.log(query,"anomaly update")
  const q = this.con.promise().query(query, data)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.insertQuery = ({ tableName, columns, values }) => {

  const query = `insert into aimgmt.${tableName} ${columns} values ${values}`
  // console.log("insertquery" + query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q

}

// new api for anomaly
module.exports.getDataDetectionMaster2 = ({ onlyReject, siteId, detectionType, deviceId, dataType, startDate, endDate, page, rowPerPage, latestFirst = false, onlyAnomaly = false, notForHistory = false, detectId = null }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  // console.log("detectionType: ", detectionType, onlyReject, notForHistory)

  //const dateConditon = (startDate && endDate) ? ` AND start_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const dateConditon = (startDate && endDate) ? `AND (start_time between'${startDate}' AND '${endDate}') ` : ``
  const limit = (page && page > 0) ? ` LIMIT ${(page - 1) * rowPerPage}, ${rowPerPage}` : `` // limit 0,10 ( row 1 to 10 ) // limit 10, 10 (row 11 to 20)
  // console.log(limit, startDate, endDate, detectId)
  const query = `
     SELECT 
      dm.detect_id AS detectId,
      dm.value,
      dm.end_time AS createdTs,
      dm.start_time AS startDate,
      dm.end_time AS endDate,
      dm.algo_id,
      dm.parameter AS dataType,
      dm.equip_id AS deviceId,
      ano.anomaly,
      fdd.is_fault AS fault,
      /*ano.updated_by AS userId,*/
      u.id as userId,
      ano.remark AS remark,
      fdd.remark AS fddRemark,
      fad.remark AS fadRemark,
      calm.remark AS calmRemark,
      fault_id AS faultId,
      calm.severity_id AS severityId,
      equ.deviceTypeName AS deviceType,
      equ.siteId AS siteId,
      equ.equipId as equipId,
      u.username as username,
      am.algo_id as algoId,
      fad.suppressed,
      fad.alarm_id,
      fad.alarm_type as alarmType,
      fad.alarm_type_prev as prevAlarmType,
      fad.alarm_type = fad.alarm_type_prev as fadAckReject,
      am.algo_name as detectionType,
      group_concat(log.updated_by, "_><_", log.updated_ts, "_><_",  log.remark, "_><_",  log.label_type separator  "_<>_" ) as labelingLog
    FROM aimgmt.detection_master dm
    LEFT JOIN aimgmt.dtd_anomaly ano on ano.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_fad fad on fad.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_calm calm on calm.detect_id=dm.detect_id
    LEFT JOIN aimgmt.device equ on equ.equipId=dm.equip_id and equ.siteId=dm.site_id
    LEFT JOIN aimgmt.user u on (u.id=ano.updated_by or u.id=fdd.updated_by or u.id=calm.updated_by or u.id=fad.updated_by)
    LEFT JOIN aimgmt.algo_master am on am.key=dm.algo_id
    LEFT JOIN aimgmt.label_log log on log.detect_id=dm.detect_id
    WHERE true 
      ${detectionType ? " AND am.algo_id=" + detectionType : ""}
      ${(dataType && detectionType != 2) ? " AND parameter='" + dataType + "'" : ""}
      ${deviceId ? " AND equ.id=" + deviceId + "" : ""}
      ${siteId ? " AND equ.siteId='" + siteId + "'" : ""} 
      ${dateConditon}
      ${(onlyReject == "true" && detectionType == 1) ? " AND ano.anomaly = 0 " : ""}
      ${(onlyReject == "true" && detectionType == 2) ? " AND fdd.is_fault = 0 " : ""}
      ${(onlyReject == "true" && detectionType == 3) ? " AND fad.verified = 1 and fad.alarm_type <> fad.alarm_type_prev " : ""}
      ${(onlyReject == "true" && detectionType == 4) ? " AND calm.verified = 1" : ""}
      ${(onlyReject == "true" && !detectionType) ? "AND ano.anomaly = 0 OR fdd.is_fault = 0  OR fad.verified is not null OR calm.verified is not null" : ""}
      ${onlyAnomaly ? " AND anomaly!=0" : !notForHistory ? " and (ano.anomaly is not null OR fdd.is_fault is not null OR fad.verified is not null OR calm.verified is not null )" : ""}
      ${notForHistory ? " AND ano.verified is null" : ""}
      ${!notForHistory ? " and ( ano.verified is not null OR fdd.verified is not null OR fad.verified is not null OR calm.verified is not null)" : "" /*" and ( ano.verified is null OR fdd.verified is null )"*/}
      group by dm.detect_id
      ${latestFirst ? ' Order BY createdTs desc' : ''}
      ${limit}
     
     
  `
  // where ${siteId ? " AND dm.site_id='" + siteId + "'" : ""}  changed by Hk to equ.siteId

  // WHERE dm.algo_id = 'ad_v1'

  // ORDER BY timestamp DESC
  console.log("dection_master2  ",query) 
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

//////////modified
module.exports.getCountDataDetectionMaster2 = ({ onlyReject, siteId, detectionType, deviceId, dataType, startDate, endDate, latestFirst = false, onlyAnomaly = false, verified, notForHistory = false }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  //console.log("hello",{notForHistory,onlyAnomaly})
  const dateConditon = (startDate && endDate) ? ` AND start_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const query = `
           SELECT 
            count(*) as count
          FROM aimgmt.detection_master dm
          LEFT JOIN aimgmt.dtd_anomaly ano on ano.detect_id=dm.detect_id
          LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id
          LEFT JOIN aimgmt.dtd_fad fad on fad.detect_id=dm.detect_id
          LEFT JOIN aimgmt.dtd_calm calm on calm.detect_id=dm.detect_id
          LEFT JOIN aimgmt.device equ on equ.equipId=dm.equip_id and dm.site_id=equ.siteId
          LEFT JOIN aimgmt.user u on (u.id=ano.updated_by or u.id=fdd.updated_by or u.id=fad.updated_by or u.id = calm.updated_by)
          LEFT JOIN aimgmt.algo_master am on am.key=dm.algo_id
          WHERE true 
            ${detectionType ? " AND am.algo_id=" + detectionType : ""}
            ${(dataType && detectionType != 2) ? " AND parameter='" + dataType + "'" : ""}
            ${deviceId ? " AND equ.id=" + deviceId + "" : ""}
            ${dateConditon}
            ${siteId ? " AND dm.site_id='" + siteId + "'" : ""}
            ${(onlyReject == "true" && detectionType == 1) ? " AND ano.anomaly = 0 " : ""}
            ${(onlyReject == "true" && detectionType == 2) ? " AND fdd.is_fault = 0 " : ""}
            ${(onlyReject == "true" && detectionType == 3) ? " AND fad.verified = 1" : ""}
            ${(onlyReject == "true" && detectionType == 4) ? " AND calm.verified = 1" : ""}
            ${(onlyReject == "true" && !detectionType) ? "AND ano.anomaly = 0 OR fdd.is_fault = 0  OR fad.verified is not null OR calm.verified is not null" : ""}
            ${onlyAnomaly ? " AND anomaly!=0" : !notForHistory ? " and (ano.anomaly is not null OR fdd.is_fault is not null OR fad.verified is not null OR calm.verified is not null)" : ""}
            ${notForHistory ? " AND ano.verified is null" : ""}
            ${!notForHistory ? " and ( ano.verified is not null OR fdd.verified is not null OR fad.verified is not null OR calm.verified is not null )" : "" /*" and ( ano.verified is null OR fdd.verified is null )"*/}
        `
  // ORDER BY timestamp DESC
  //  console.log("dection_master2_count  ",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

// FDD
//===========================================================================================

// new api for fdd
module.exports.getFDDdata = ({ siteId, deviceId, dataType, startDate, endDate, page, rowPerPage, latestFirst = true, verified = false, fault = null }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  const dateConditon = (startDate && endDate) ? //`AND start_time >='${startDate}' AND end_time<='${endDate}'`:``
    ` AND (start_time between'${startDate}' AND '${endDate}') ` : ``
  const limit = (page && page > 0) ? ` LIMIT ${(page - 1) * rowPerPage}, ${rowPerPage}` : ``
  // console.log("startDate,end", (limit && startDate && endDate) ? "ture" : "false") // limit 0,10 ( row 1 to 10 ) // limit 10, 10 (row 11 to 20)
  const query = `
     SELECT 
      dm.detect_id AS detectId,
      dm.value,
      dm.end_time AS createdTs,
      dm.start_time AS startDate,
      dm.end_time AS endDate,
      dm.algo_id,
      dm.parameter AS dataType,
      /*dm.equip_id AS deviceId,*/
      ano.anomaly,
      fdd.is_fault AS fault,
      /*ano.updated_by AS userId,*/
      fdd.updated_by AS userId,
      ano.remark AS remark,
      fdd.fault_id AS faultId,
      calm.severity_id AS severityId1,
      equ.deviceTypeName AS deviceType,
      equ.siteId AS siteId,
      equ.equipId as equipId,
      equ.id as deviceId,
      u.username as username,
      fm.comments as comments,
      case when ew.wastage_energy is null then fm.impact else  concat(fm.impact, " - ", ROUND(ew.wastage_energy, 2), ' kWh') end as impact,
      fm.situation as situation,
      fm.recomm as recomm,
      fm.severity_id as severityId,
      ew.eff_offset as wastage_energy_formula

    FROM aimgmt.detection_master dm
    LEFT JOIN aimgmt.dtd_anomaly ano on ano.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_calm calm on calm.detect_id=dm.detect_id
    LEFT JOIN aimgmt.device equ on equ.equipId=dm.equip_id and dm.site_id=equ.siteId
    LEFT JOIN aimgmt.user u on u.id=fdd.updated_by
    LEFT JOIN aimgmt.fault_master fm on fm.fault_id=fdd.fault_id
    LEFT JOIN aimgmt.detection_energy_wastage ew on ew.detect_id=dm.detect_id
    WHERE dm.algo_id='fdd_v1' 
      ${siteId ? " AND dm.site_id='" + siteId + "'" : ""}
      ${dataType ? " AND parameter='" + dataType + "'" : ""}
      ${deviceId ? " AND equ.id=" + deviceId + "" : ""}
      ${dateConditon}
      ${verified ? ' AND fdd.verified is not null ' : ' AND fdd.verified is null '}
      ${(fault !== null && fault) ? ' AND fault=1 ' : (fault !== null && !fault) ? ' AND fault=0 ' : ''}
      ${latestFirst ? 'Order BY createdTs desc' : ''}
      ${limit}
      /*${(!limit && !startDate && !endDate) ? ' limit 10' : ''}*/
  `
  console.log("sql ==> ",query)
  /* ${ onlyAnomaly ? " AND anomaly!=0" : !notForHistory ? " and anomaly is not null" : ""} */
  // ORDER BY timestamp DESC
  // console.log("getFDDdata  ",query) 
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.setAcceptFDD = ({ detectionId, accept, userId, remark, newStartTs, newEndTs }) => {
  const updated_ts = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
  this.con.promise().query(`insert into aimgmt.detection_master_history 
  select detect_id,value,timestamp,start_time,end_time,algo_id,parameter,site_id,equip_id
  from aimgmt.detection_master where detect_id=${detectionId}`)
  const setTimesQuery = []
  if(newStartTs) setTimesQuery.push(`start_time='${newStartTs}'`)
  if(newEndTs) setTimesQuery.push(`end_time='${newEndTs}'`)
  if(setTimesQuery.length>0) {
    this.con.promise().query(`update aimgmt.detection_master set ${setTimesQuery.join(",")} where detect_id=${detectionId}`)
  }
  const query = `
    UPDATE aimgmt.dtd_fdd 
    SET verified=1, is_fault=${accept ? 1 : 0}, updated_by=${userId}, remark='${remark}',updated_ts='${updated_ts}'
    WHERE detect_id=${detectionId}
  `
  // console.log("AcceptFddQuery: ", query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connectio
  return q
}

module.exports.recoverAnomalyDetection = (id) => {
  const updated_ts = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
  const q = this.con.promise().query(`
  update aimgmt.dtd_anomaly set anomaly=null ,verified=null, updated_by=null, updated_ts='${updated_ts}', remark=null where detect_id=${id};
  update aimgmt.detection_master dm
  left join aimgmt.detection_master_history dmh on dmh.detect_id = dm.detect_id 
  set dm.start_time = ifnull(dmh.start_time, dm.start_time), dm.end_time = ifnull(dmh.end_time, dm.end_time)
  where dm.detect_id=${id};
  delete from detection_master_history where detect_id=${id};
  delete from dtd_fdd where detect_id=${id};
  delete from dtd_calm where detect_id=${id}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.recoverFaultDetection = (id) => {
  const updated_ts = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
  this.con.promise().query(`update aimgmt.detection_master dm
  left join aimgmt.detection_master_history dmh on dmh.detect_id = dm.detect_id 
  set dm.start_time = ifnull(dmh.start_time, dm.start_time), dm.end_time = ifnull(dmh.end_time, dm.end_time)
  where dm.detect_id=${id};
  delete from detection_master_history where detect_id=${id};`)
  const q = this.con.promise().query(`update aimgmt.dtd_fdd set is_fault=null ,verified=null, updated_by=null, updated_ts='${updated_ts}',remark=null where detect_id=${id}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.recoverFalseAlarmDetection = (id) => {
  const updated_ts = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
  const q = this.con.promise().query(`update aimgmt.dtd_fad set alarm_type=alarm_type_prev, alarm_type_prev=null, verified=null, updated_by=null, updated_ts='${updated_ts}' ,remark=null where detect_id=${id}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}



// module.exports.getRawCount = (dataQuery) => {
//   const query = `select sum(count) as countt from (${dataQuery})t2 `
//   // console.log("query",query)
//   const q = this.con.promise().query(query)
//   this.con.releaseConnection(this.con) // release connection
//   return q
// }

// module.exports.getRawCountforAnomaly = (tableName, startDate, endDate, ieee) => {
//   const query = `select count(*) as count from ${tableName} where ieee ='${ieee}' 
//    and ts between '${startDate}' and '${endDate}' `
//   // console.log("query",query)
//   const q = this.con.promise().query(query)
//   this.con.releaseConnection(this.con) // release connection
//   return q
// }

module.exports.getFADdata = ({ siteId, deviceId, dataType, alarm_id, verified = false, startDate, endDate, sortBy, rowPerPage, page }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  const dateConditon = (startDate && endDate) ? ` AND start_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const limit = (page && page > 0) ? ` LIMIT ${(page - 1) * rowPerPage}, ${rowPerPage}` : `` // limit 0,10 ( row 1 to 10 ) // limit 10, 10 (row 11 to 20)
  const query = `
     SELECT 
      dm.detect_id AS detectId,
      dm.value,
      dm.end_time AS createdTs,
      dm.start_time AS startDate,
      dm.end_time AS endDate,
      dm.algo_id,
      dm.parameter AS dataType,
      ano.anomaly,
      fad.updated_by AS userId,
      ano.remark AS remark,
      fad.alarm_id AS alarmId,
      fad.alarm_type AS alarmType,
      fad.suppressed AS suppressed,
      calm.severity_id AS severityId,
      equ.deviceTypeName AS deviceType,
      equ.siteId AS siteId,
      equ.equipId as equipId,
      equ.id as deviceId,
      u.username as username,
      am.comments as comments,
      am.alarm_name as alarmName,
      am.impact as impact,
      am.situation as situation,
      am.recomm as recomm

    FROM aimgmt.detection_master dm
    LEFT JOIN aimgmt.dtd_anomaly ano on ano.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_fad fad on fad.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_calm calm on calm.detect_id=dm.detect_id
    LEFT JOIN aimgmt.device equ on equ.equipId=dm.equip_id and dm.site_id=equ.siteId
    LEFT JOIN aimgmt.user u on u.id=fad.updated_by
    LEFT JOIN aimgmt.alarm_master am on am.alarm_id=fad.alarm_id

    WHERE dm.algo_id='fad_v1' and equ.equipId is not null
      ${dataType ? " AND parameter='" + dataType + "'" : ""}
      ${siteId ? " AND dm.site_id='" + siteId + "'" : ""}
      ${deviceId ? " AND equ.id=" + deviceId + "" : ""}
      ${alarm_id ? " AND am.alarm_id=" + alarm_id : ""}
      ${dateConditon}
      ${verified ? ' AND fad.verified is not null ' : ' AND fad.verified is null '}
      ${(sortBy && sortBy == "Latest") ? 'Order BY createdTs desc' : ''}
      ${(sortBy && sortBy == "Earliest") ? 'Order BY createdTs asc' : ''}
      ${(!sortBy) ? 'Order BY createdTs desc' : ''}
      ${limit}
  `
  // console.log("getFadata  ", query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.setAcceptFAD = ({ detectionId, accept, userId, remark }) => {
  const updated_ts = dateFns.format(kumoDate.Date(), "yyyy-MM-dd HH:mm:ss")
  const query = `
    UPDATE aimgmt.dtd_fad 
    SET verified=1, alarm_type_prev=alarm_type, alarm_type=${accept ? 'alarm_type' : '1-alarm_type'},updated_by=${userId} 
    , remark ='${remark}',updated_ts='${updated_ts}'
    WHERE detect_id=${detectionId};
  `
  // console.log("AcceptFddQuery: ", query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getFadCount = (siteId) => {
  const query = `select * from aimgmt.dtd_fad fad left join aimgmt.detection_master dm on dm.detect_id=fad.detect_id 
  left join aimgmt.device d on d.equipId=dm.equip_id and dm.site_id=d.siteId where dm.site_id ='${siteId}' and dm.algo_id="fad_v1"`
  //console.log("fad count",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

// module.exports.getParameterBasedRawData = (dataQuery) => {
//   //console.log(dataQuery)
//   const q = this.con.promise().query(dataQuery)
//   this.con.releaseConnection(this.con) // release connection
//   return q
// }

module.exports.getUnreviewCount = (detectionType, clientId, siteId, deviceId = null) => {
  const query = `
     SELECT 
      count(*) as count

    FROM aimgmt.detection_master dm
    LEFT JOIN aimgmt.dtd_anomaly ano on ano.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_fdd fdd on fdd.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_fad fad on fad.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_calm calm on calm.detect_id=dm.detect_id
    LEFT JOIN aimgmt.device equ on equ.equipId=dm.equip_id and dm.site_id=equ.siteId
    LEFT JOIN aimgmt.algo_master am on am.key = dm.algo_id
    LEFT JOIN aimgmt.site_info site on site.site_id = dm.site_id
    LEFT JOIN aimgmt.client_info client on client.id=site.client_id
    WHERE dm.site_id = '${siteId}'  and client.id = ${clientId}
    ${deviceId ? ` and (dm.equip_id='${deviceId}' OR equ.id=${deviceId})` : `` }
    ${detectionType && detectionType == 1 ? ` and am.algo_id=${detectionType} and ano.verified is null` : ``}
    ${detectionType && detectionType == 2 ? ` and am.algo_id=${detectionType} and fdd.verified is null` : ``}
    ${detectionType && detectionType == 3 ? ` and am.algo_id=${detectionType} and fad.verified is null` : ``}
    ${detectionType && detectionType == 4 ? ` and am.algo_id=${detectionType} and calm.verified is null` : ``}
    ${!detectionType ? "and (ano.verified is null or fdd.verified is null or fad.verified is null or calm.verified is null)" : ""}
  `

  
  
  // console.log("unreview count",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q

}


module.exports.getSeverityInCalm = (siteId, clientId) => {
  // const query = `SELECT count(*) as count,calm.severity_id,severity_name FROM iotmgmt.dtd_calm  calm left join severity_master sm 
  // on calm.severity_id=sm.severity_id group by calm.severity_id`
  //  console.log(query)
  const query = `SELECT 
   severity_id, sum(detectionCount) as detectionCount, group_concat(equip_id) as equipIds, 
     group_concat(deviceId) as deviceIds, count(severity_id) as count, severity_name as severityName
 FROM (
   SELECT count(c.detect_id) as detectionCount, c.detect_id, c.severity_id, dm.equip_id, d.id as deviceId, s.severity_name
   FROM aimgmt.dtd_calm c
   LEFT JOIN aimgmt.detection_master dm on dm.detect_id = c.detect_id
   LEFT JOIN aimgmt.site_info site on site.site_id = dm.site_id
   LEFT JOIN aimgmt.client_info client on client.id=site.client_id
  LEFT JOIN aimgmt.device d on d.equipId=dm.equip_id
  LEFT JOIN aimgmt.severity_master s on s.severity_id=c.severity_id
   WHERE c.verified is null and dm.equip_id is not null and dm.algo_id='calm_v1' and dm.site_id = '${siteId}'
   and client.id = ${clientId}
   GROUP BY c.severity_id, dm.equip_id
 ) t1
 GROUP BY t1.severity_id`
  //console.log("query",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDetectionType = (algoId) => {
  const query = "SELECT algo_id as detectionType FROM aimgmt.algo_master where `key` ='" + algoId + "'"
  //console.log("query",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getCalmdata = ({ clientId, siteId, deviceId, startDate, endDate, page, rowPerPage, latestFirst = true, verified = false, fault = null, severity }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  const dateConditon = (startDate && endDate) ? ` AND start_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const limit = (page && page > 0) ? ` LIMIT ${(page - 1) * rowPerPage}, ${rowPerPage}` : `` // limit 0,10 ( row 1 to 10 ) // limit 10, 10 (row 11 to 20)
  const query = `
     SELECT 
      dm.detect_id AS detectId,
      dm.value,
      dm.end_time AS createdTs,
      dm.start_time AS startDate,
      dm.end_time AS endDate,
      dm.algo_id,
      dm.parameter AS dataType,
      ano.anomaly,
      ano.remark AS remark,
      calm.updated_by AS userId,
      calm.severity_id AS severityId,
      equ.deviceTypeName AS deviceType,
      equ.siteId AS siteId,
      equ.equipId as equipId,
      equ.id as deviceId,
      u.username as username,
      sm.severity_name,
      client.id as clientId,
      site.site_id as siteId
    FROM aimgmt.detection_master dm
    LEFT JOIN aimgmt.dtd_anomaly ano on ano.detect_id=dm.detect_id
    LEFT JOIN aimgmt.dtd_calm calm on calm.detect_id=dm.detect_id
    LEFT JOIN aimgmt.device equ on equ.equipId=dm.equip_id
    LEFT JOIN aimgmt.user u on u.id=calm.updated_by
    LEFT JOIN aimgmt.severity_master sm on sm.severity_id=calm.severity_id
    LEFT JOIN aimgmt.site_info site on site.site_id = dm.site_id
    LEFT JOIN aimgmt.client_info client on client.id=site.client_id
    WHERE dm.algo_id='calm_v1' and client.id = ${clientId}
      ${siteId ? " AND dm.site_id='" + siteId + "'" : ""}
      ${deviceId ? " AND equ.id=" + deviceId + "" : ""}
      ${dateConditon}
      ${verified ? ' AND calm.verified is not null ' : ' AND calm.verified is null '}
        ${severity ? ` AND calm.severity_id=${severity}` : ''}
      ${limit}
      ${latestFirst ? 'Order BY createdTs desc' : ''}
    
  `
  //console.log("calmQuery:  ", query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateCalm = ({ id, updatedBy }) => {
  //console.log(id, updatedBy)
  const query = `update aimgmt.dtd_calm set verified =? , updated_by=? where detect_id=?`
  //console.log("calmQuery:  ",query) 
  const q = this.con.promise().query(query, [1, updatedBy, id])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.setAcceptCalm = ({ detectionId, accept, userId }) => {
  const query = `
    UPDATE aimgmt.dtd_calm 
    SET verified=1, updated_by=${userId}
    WHERE detect_id=${detectionId}
  `
  //console.log("AcceptCalmQuery: ", query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.recoverCalmDetection = (id) => {
  const q = this.con.promise().query(`update aimgmt.dtd_calm set verified=null where detect_id=${id}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getCalmDetailCountList = (deviceId, siteId, startDate, endDate) => {
  const query = `SELECT count(*) as count,dm.algo_id as algoId from detection_master dm 
  left join algo_master am on dm.algo_id=am.key 
  left join dtd_anomaly ano on ano.detect_id=dm.detect_id and ano.verified is null
  left join dtd_fad fad on fad.detect_id=dm.detect_id and fad.verified is null
  left join dtd_fdd fdd on fdd.detect_id=dm.detect_id and fdd.verified is null
  where true ${deviceId ? `and dm.equip_id='${deviceId}'` : ``}
  ${(startDate && endDate) ? ` and dm.start_time >= '${startDate}' and dm.end_time <='${endDate}' ` :
      startDate ? `and dm.start_time >='${startDate}'` : endDate ? `and dm.end_time <='${endDate}'` : ``}
  group by dm.algo_id;
SELECT count(*) as calmCount,sm.severity_id as severityId FROM dtd_calm calm 
left join detection_master dm on dm.detect_id = calm.detect_id and dm.site_id ='${siteId}'
left join severity_master sm on sm.severity_id= calm.severity_id where calm.verified is null
${deviceId ? ` and dm.equip_id='${deviceId}'` : ``}
${(startDate && endDate) ? ` and dm.start_time >= '${startDate}' and dm.end_time <='${endDate}' ` :
      startDate ? `and dm.start_time >='${startDate}'` : endDate ? `and dm.end_time <='${endDate}'` : ``} group by sm.severity_id;
`
  // console.log("fad", query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q

}
module.exports.getEfficiencyForecast = ( siteId,startDate, endDate, equipId, key) => {
  const query = `SELECT ts, UNIX_TIMESTAMP(ts)*1000 as time, ${key}, ${key}_lower, ${key}_upper, ${key}_pred
  FROM aimgmt.forecast where ts between '${startDate}' and '${endDate}' and equip_id='${equipId}' order by ts asc`
  //console.log('efficiency query: ', query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


///=============ibpem==================================
module.exports.loadDumyDatas = (startDate, endDate) => {
  const sdate = startDate.trim()
  const edate = endDate.trim()
  return this.con.promise().query(`SELECT ts,efficiency,evaInput,evaOutput FROM calculated_data FORCE INDEX (calculated_data_clientId_siteId_chillerId_ts_index) where clientId=11 and siteId=7 and chillerId=27 and ts between '${sdate}' and '${edate}' order by ts asc`)
}

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
module.exports.getDevices = (condition) => {
  const q = this.con.promise().query(`select * from aimgmt.device ${condition ? condition : ""}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceMappings = (selectors = '*', condition) => {
  //console.log(`select ${selectors || '*'} from device_mapping ${condition}`)
  const q = this.con.promise().query(`select ${selectors} from device_mapping ${condition}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getDataType = (siteId) => {
  const q = this.con.promise().query(`SELECT distinct dataTypeName ,
  dataType FROM aimgmt.device_mapping dm left join device d on d.id=dm.deviceId
   where dm.dataTypeName !='some data' and dm.dataType is not null and d.siteId=?`, [siteId])
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
  const q = this.con.promise().query(`delete from device_mapping`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDataTypeName = () => {
  const q = this.con.promise().query(`SELECT distinct dataType FROM aimgmt.device_mapping `)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceTypeName = () => {
  const q = this.con.promise().query(`SELECT distinct equipId FROM aimgmt.device`)
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
  // console.log("loadYearlyEightDayData: ", query);
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.loadAnomalyYearlyEightDayData = ({ deviceId, dataType, algo_id }) => {
  let condition = dataType ? ` and dataType = '${dataType}'` : ''
  condition += deviceId ? ` and deviceId = ${deviceId}` : ''
  condition += algo_id ? ` and algo_id = '${algo_id}'` : ''

  const query = `select year, startDate, endDate, sum(count) as count, sum(anomalyCount) as anomalyCount
    from yearly_eight_day
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

module.exports.eightDaysDataforAnomalyDetection = ({ values }) => {
  //console.log(values)
  const q = this.con.promise()
    .query(`INSERT INTO yearly_eight_day(siteId,deviceId,dataType,year,startDate,endDate,count,anomalyCount) values ?`,
      [values])
  this.con.releaseConnection(this.con) // release connection
  return q
}

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

module.exports.getAllDeviceAndEquipmentAd = () => {
  const q = this.con.promise().query(`
    SELECT deviceId , equipId,siteId,dataType as 'key' FROM aimgmt.device_mapping left join device on 
    device.id=device_mapping.deviceId where device.equipId is not null group by deviceId,dataType`)
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getAllDeviceAndEquipment = (siteId) => {
  const q = this.con.promise().query(`
    SELECT deviceId , equipId,siteId FROM aimgmt.device_mapping left join device on 
    device.id=device_mapping.deviceId where device.equipId is not null 
    and device.siteId='${siteId}'
    group by deviceId`)
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
  const query = ` select yd.deviceId, yd.year, yd.startDate, yd.endDate, sum(yd.count) as count, sum(yd.anomalyCount) as anomalyCount, sum(if(dm.detect_id is null OR ano.verified is not null, 0, 1)) as anoCount, group_concat(distinct (dm.detect_id)) as master_ids, group_concat(distinct (ano.detect_id)) as dtd_ids, group_concat(ano.verified)
 from aimgmt.yearly_eight_day yd
   left join aimgmt.device dd on dd.id=yd.deviceId and dd.siteId=yd.siteId
   left join aimgmt.detection_master dm 
     on dm.equip_id=dd.equipId and dm.algo_id='ad_v1' and dm.parameter = yd.dataType
       and (dm.start_time between yd.startDate and date_add(yd.endDate, interval 1 day))
   left join aimgmt.dtd_anomaly ano on ano.detect_id=dm.detect_id
 where yd.siteId = '${siteId}'
 ${dataType ? "and yd.dataType ='" + dataType + "'" : ""} 
 ${deviceId ? "and yd.deviceId = " + deviceId : ""}
 group by yd.startDate, yd.endDate, yd.year
 order by yd.startDate asc`
  //console.log(query)
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
  from aimgmt.eight_days_fdd yd
    left join aimgmt.device dd on dd.id=yd.deviceId
    left join aimgmt.detection_master dm 
      on dm.equip_id=dd.equipId and dm.algo_id='fdd_v1' and yd.siteId=dm.site_id
       and (dm.start_time between yd.startDate and yd.endDate) 
    left join aimgmt.dtd_fdd ano on ano.detect_id=dm.detect_id
  where yd.siteId = '${siteId}'
   ${deviceId ? "and yd.deviceId =" + deviceId : ""} 
  group by yd.startDate, yd.endDate, yd.year
  order by yd.startDate asc`
  console.log("query: ",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getFadEightDaysData = ({ deviceId, algo_id }) => {
  const query = ` select yd.deviceId, yd.year, yd.startDate, yd.endDate, 
  sum(yd.count) as count, sum(yd.fddCount) as anomalyCount, 
  sum(if(dm.detect_id is null OR ano.verified is not null, 0, 1)) as anoCount, group_concat(distinct (dm.detect_id)) as master_ids, group_concat(distinct (ano.detect_id)) as dtd_ids, group_concat(ano.verified)
  from aimgmt.eight_days_fdd yd
    left join aimgmt.device dd on dd.id=yd.deviceId
    left join aimgmt.detection_master dm 
      on dm.equip_id=dd.equipId and dm.algo_id='fad_v1'
        and ((dm.start_time between yd.startDate and yd.endDate) OR (dm.end_time between yd.startDate and yd.endDate))
    left join aimgmt.dtd_fdd ano on ano.detect_id=dm.detect_id
  where true ${deviceId ? "and deviceId =" + deviceId : ""} 
  group by yd.startDate, yd.endDate, yd.year
  order by yd.startDate asc`

  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.eightDaysFddData = (year, siteId) => {
  const query = `SELECT * FROM eight_days_fdd where year='${year}' and siteId='${siteId}'`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q

}

module.exports.getFddDeviceMapping = (siteId) => {
  const query = `SELECT group_concat("'",ieee,"'") as ieee ,tableName,deviceId,equipId,siteId FROM aimgmt.device_mapping 
  left join device on device.id=device_mapping.deviceId
   ${siteId ? `where device.siteId ='${siteId}'` : ''} group by siteId, deviceId, tableName `
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateFddCount = (startDate, endDate, deviceId, totalCount, siteId) => {
  const query = ` update aimgmt.eight_days_fdd set count=${totalCount} where siteId='${siteId}'
  and deviceId=${deviceId} and startDate='${startDate}' and endDate='${endDate}'`
  //console.log("query ",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.eightDaysFddDataForRealTime = (startDate) => {
  const query = `SELECT * FROM aimgmt.eight_days_fdd where '${startDate}' between startDate and endDate`
  // console.log(query);
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.eightDaysAdDataForRealTime = (startDate) => {
  const query = `SELECT * FROM aimgmt.yearly_eight_day where '${startDate}' between 
  date_format(startDate,'%Y-%m-%d 00:00:00') and date_format(endDate,'%Y-%m-%d 23:59:59')`
  // console.log(query);
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateFddRealTimeCount = (result) => {
  const query = `INSERT INTO eight_days_fdd(id,count) 
  values ${result} ON DUPLICATE KEY UPDATE count=VALUES(count)`
  //console.log(query,"query")
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.updateAdRealTimeCount = (result) => {
  const query = `INSERT INTO yearly_eight_day(id,count) 
  values ${result} ON DUPLICATE KEY UPDATE count=VALUES(count)`
  //console.log(query,"query")
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.eightDaysAnomalyDataForRealTime = (startDate, endDate) => {
  const query = `SELECT * FROM aimgmt.yearly_eight_day where '${startDate}' >=startDate and '${endDate}'<date_add(endDate,interval 1 day)`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getAnomalyDeviceMapping = () => {
  const query = ` SELECT tableName,siteId,dataType,deviceId,ieee,equipId FROM aimgmt.device_mapping left join device 
  on  device.id=device_mapping.deviceId where device.equipId is not null group by siteId, deviceId,dataType  `
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
  const query = ` select ieee,deviceId,columnName,tableName,equipId,dataType from aimgmt.device_mapping left join device on 
   device.id = device_mapping.deviceId where ${condition}`
  // console.log("query====>",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getEquipmentMappings = (selectors = "*", condition) => {
  // console.log(query)
  const q = this.con.promise().query(`SELECT ${selectors} from aimgmt.device_mapping ${condition}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceAndParameterMapping = (siteId) => {
  const query = `SELECT dm.deviceId as equipId, 
  lower(concat(d.equipId,":", dm.datatype)) as deviceParameter,lower(concat(dm.deviceId,":", dm.dataType)) 
    as deviceIdParameter, d.siteId as siteId 
    FROM aimgmt.device_mapping dm left join aimgmt.device d on d.id=dm.deviceId where d.equipId is not null 
    and dm.dataType is not null and d.siteId='${siteId}'`
   console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getEquipmentAlias = (siteId) => {
  const q = this.con.promise().query(`SELECT equipId as equipAlias,deviceTypeName as equipTypeName,id as equipId FROM aimgmt.device 
  where equipId is not null and siteId=?`, [siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getMappingForEachDeviceId = (siteId) => {
  const query = `SELECT siteId,deviceId,dataType, ieee,tableName,equipId,dm.deviceType FROM aimgmt.device_mapping dm
  left join device d on d.id = dm.deviceId where d.equipId is not null and dm.dataType is not null
   and d.equipId is not null and d.siteId='${siteId}' and dm.enabled =1 group by deviceId,dataType`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getSiteInfo = ({ siteId, siteCode }) => {
  // const query = `select * from site_info`
  let extraCondition = " true "
  if (siteId) extraCondition += ` AND site_id='${siteId}'`
  if (siteCode) extraCondition += ` AND site_code=${siteCode}`
  const query = `SELECT s.*, count(d.equipId) as numberOfChillers FROM aimgmt.site_info s left join aimgmt.device d on d.siteId=s.site_id and d.deviceType='CH' WHERE ${extraCondition}`
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
  FROM aimgmt.device_mapping dm left join device d on d.id = dm.deviceId where dm.dataType is not null `
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

module.exports.getStartAndEndDate = (startDate, endDate) => {
  const query = `SELECT min(startDate) as startDate,max(endDate) as endDate FROM yearly_eight_day where ('${startDate}' between startDate and 
  endDate) OR ('${endDate}' between startDate and endDate)`
  console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getSelectedStartAndEndDate = (startDate, endDate) => {
  const query = endDate ? `SELECT min(startDate) as startDate,max(endDate) as endDate FROM yearly_eight_day where ('${startDate}' between date_format(startDate,'%Y-%m-%d 00:00:00') and 
    date_format(endDate,'%Y-%m-%d 23:59:59')) OR ('${endDate}' between date_format(startDate,'%Y-%m-%d 00:00:00') and 
    date_format(endDate,'%Y-%m-%d 23:59:59')) `
  
    :`SELECT min(startDate) as startDate,max(endDate) as endDate 
    FROM yearly_eight_day 
    where ('${startDate}' between date_format(startDate,'%Y-%m-%d 00:00:00') and date_format(endDate,'%Y-%m-%d 23:59:59')) 
    OR (date_format(DATE_SUB('${startDate}', INTERVAL 14 DAY), '%Y-%m-%d 00:00:00') between date_format(startDate,'%Y-%m-%d 00:00:00') and 
    date_format(endDate,'%Y-%m-%d 23:59:59')) `
  console.log("getSelectedStartAndEndDate: ", query)
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
module.exports.checkReviewedResult = (detectId, tableName) => {
  const query = `select * from ${tableName} dtd left join aimgmt.detection_master dm 
  on dm.detect_id= dtd.detect_id
  where dtd.detect_id = ${detectId} and dtd.verified=1`
  //console.log("query: ", query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

//=============iotdata===========

module.exports.getDataDetectionMasterAD = ({ siteId, deviceId, dataType, startDate, endDate, page }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  const dateConditon = (startDate && endDate) ? ` AND start_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const rowPerPage = 10
  const limit = (page && page > 0) ? ` LIMIT ${(page - 1) * rowPerPage}, ${rowPerPage}` : `` // limit 0,10 ( row 1 to 10 ) // limit 10, 10 (row 11 to 20)
  const query = `
    SELECT 
      detect_id as id, end_time as createdTs, start_time as startDate, end_time as endDate, algo_id as algoId, parameter as dataType, site_id as siteId, equip_id as deviceId
    FROM
    aimgmt.detection_master
    WHERE
      algo_id = 'ad_v1'
          AND parameter = '${dataType}'
          AND site_id = '${siteId}'
          AND equip_id = '${deviceId}'
          ${dateConditon}
    ${limit}
  `
  // group by id
  // AND timestamp>='2019-01-01'

  // ORDER BY timestamp DESC
  // console.log("detection_master :",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getAnomalyDataAllBetweenStartDateAndEndDate = ({ startDate, endDate }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  //const dateConditon = (startDate && endDate) ? `end_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const dateConditon = (startDate && endDate) ? `convert_tz(timestamp,"+08:00","+00:00") between '${startDate}' and '${endDate}'` : ``
  const query = `
    SELECT 
      detect_id as id, end_time as createdTs, start_time as startDate, end_time as endDate, algo_id as algoId, parameter as dataType, site_id as siteId, equip_id as deviceId
    FROM
    aimgmt.detection_master
    WHERE
          ${dateConditon}
      ORDER BY end_time DESC
  `
  // ORDER BY timestamp DESC
  console.log(query, "for new detection")
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDataDetectionMasterAllByCreatedTime = ({ startDate, endDate }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  const dateConditon = (startDate && endDate) ? ` AND end_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const query = `
    SELECT 
      detect_id as id, end_time as createdTs, start_time as startDate, end_time as endDate, algo_id as algoId, parameter as dataType, site_id as siteId, equip_id as deviceId
    FROM
    aimgmt.detection_master
    WHERE
      algo_id = 'ad_v1'
          ${dateConditon}
      ORDER BY end_time DESC
  `
  // ORDER BY timestamp DESC
  // console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getRawData = (selectors, tableName, condition) => {
  const query = `SELECT ${selectors} FROM ${tableName} ${condition}`
  // console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.selectQuery = (query) => {
  if (query.length === 0) return new Promise((resolve) => resolve([[]]))
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getParameter = (siteId) => {
  // const query = "SELECT lower(dm.parameter) as `key`, dm.equip_id as equipId, concat(dm.equip_id, ' : ', upper(dm.parameter)) as `name`," +
  //   " e.equipTypeName as equipName, e.equipId as deviceId," +
  //   " em.ieee as ieee, em.unit as unit" +
  //   " FROM(SELECT distinct lower(parameter) as parameter, equip_id as equip_id FROM iotdata.detection_master where algo_id='ad_v1') dm " +
  //   " left join iotmgmt.equipment e on e.equipAlias = dm.equip_id" +
  //   " left join iotmgmt.equipment_mapping em on em.equipId = e.equipId and em.parameter = dm.parameter" 

  const query = `SELECT lower(dm.parameter) as 'key', dm.equip_id as equipId, concat(dm.equip_id, ' : ',upper(dm.parameter)) as 'name',
      d.deviceTypeName as equipName, d.id as deviceId,d.siteId as siteId,
      em.ieee as ieee, em.unit as unit
      FROM(SELECT distinct lower(parameter) as parameter, equip_id as equip_id FROM aimgmt.detection_master where algo_id='ad_v1') dm
      left join aimgmt.device d on d.equipId = dm.equip_id 
      left join aimgmt.device_mapping em on em.deviceId = d.id and em.dataType = dm.parameter
       ${siteId ? `where d.siteId = '${siteId}'` : ''}`

  //console.log("query:",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
  // const q = this.con.promise().query(`SELECT distinct equip_id, LOWER(parameter) as parameter FROM iotdata.detection_master`)
}

module.exports.getParameter1 = (siteId) => {
  const query = `SELECT lower(dm.dataType) as 'key', d.equipId as equipId, concat(d.equipId, ' : ',upper(dm.dataType)) as 'name',
      d.deviceTypeName as equipName, d.id as deviceId,d.siteId as siteId,dm.tableName,dm.columnName,
      dm.ieee as ieee, dm.unit as unit from device_mapping dm
      left join aimgmt.device d on d.id = dm.deviceId where dm.dataType is not null and d.equipId is not null and dm.tableName != 'deviceStatus'
      ${siteId ? `and d.siteId = '${siteId}'` : ''}`
  //console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDataDetectionMasterHistory = ({ siteId, deviceId, dataType, startDate, endDate, page = 0 }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  const dateConditon = (startDate && endDate) ? ` AND start_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const rowPerPage = 10
  const limit = page > 0 ? ` LIMIT ${(page - 1) * rowPerPage}, ${rowPerPage}` : `` // limit 0,10 ( row 1 to 10 ) // limit 10, 10 (row 11 to 20)
  const query = `
    SELECT 
      detect_id as id, end_time as createdTs, start_time as startDate, end_time as endDate, algo_id as algoId, parameter as dataType, site_id as siteId, equip_id as deviceId
    FROM
    aimgmt.detection_master
    WHERE
      algo_id = 'ad_v1'
          ${dataType ? ("AND parameter = '" + dataType + "'") : ""}
          AND site_id = '${siteId}'
          ${deviceId ? "AND equip_id = '" + deviceId + "'" : ""}
          ${dateConditon}
        ORDER BY createdTs DESC
    ${limit} 
    
  `
  // ORDER BY timestamp DESC
  // console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDataDetectionMasterHistoryCountInSameAPI = ({ siteId, deviceId, dataType, startDate, endDate, page = 0 }) => { // if pagination want ? page must be greater than 0 ( 1, 2, 3 )
  const dateConditon = (startDate && endDate) ? ` AND start_time>='${startDate}' AND end_time<='${endDate}'` : ``
  const rowPerPage = 10
  // const limit = page > 0 ? ` LIMIT ${(page - 1) * rowPerPage}, ${rowPerPage}` : `` // limit 0,10 ( row 1 to 10 ) // limit 10, 10 (row 11 to 20)
  const query = `
    select count(*) as count from (
    SELECT 
      detect_id as id
    FROM
    aimgmt.detection_master
    WHERE
      algo_id = 'ad_v1'
          ${dataType ? ("AND parameter = '" + dataType + "'") : ""}
          AND site_id = '${siteId}'
          ${deviceId ? "AND equip_id = '" + deviceId + "'" : ""}
          ${dateConditon}
      ) t1    
  `
  // ORDER BY timestamp DESC
  // console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getAlgoId = (id) => {
  const q = this.con.promise().query(`SELECT algo_id FROM aimgmt.detection_master where detect_id=${id}`)
  this.con.releaseConnection(this.con) // release connection
  return q

}

module.exports.getDeviceListForEfficiency = (siteId) => {
  const q = this.con.promise().query(`select dm.ieee,dm.dataType,dm.tableName,dm.columnName,d.id as deviceId, 
  d.equipId,d.deviceTypeName,dm.dataTypeName from device d  
  left join  device_mapping dm on dm.deviceId=d.id and dm.dataTypeName='efficiency' 
  where d.siteId = ? and d.deviceType='CH'`, [siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceListForPlantEfficiency = (siteId) => {
  const q = this.con.promise().query(`select dm.ieee, dm.tableName, dm.columnName, dm.deviceId from aimgmt.device_mapping dm where dm.dataType='plant_efficiency';`)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceListForDeviceStatus = (siteId) => {
  const query = `select dm.ieee,dm.dataType,dm.tableName,dm.columnName,d.equipId,
  d.id as deviceId,d.deviceTypeName,dm.dataTypeName 
  from device d  
  left join device_mapping dm 
  on dm.deviceId=d.id and dm.dataType='start_stop' 
  where d.siteId =? and d.deviceType='CH'`
  console.log(query)
  const q = this.con.promise().query(query, [siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getDeviceListForPower = (siteId) => {
  const q = this.con.promise().query(`select dm.ieee,dm.dataType,dm.tableName,dm.columnName,d.equipId,
  d.id as deviceId,d.deviceTypeName,dm.dataTypeName 
  from device d  
  left join device_mapping dm 
  on dm.deviceId=d.id and dm.dataType='kwh' 
  where d.siteId =? and d.deviceType='CH'`, [siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getDeviceStatusIeeeList = (siteId) => {
  const q = this.con.promise().query(`select group_concat("'",ieee,"'") as ieee, dm.dataType, dm.tableName, dm.columnName
  from device_mapping dm 
  left join device d
  on dm.deviceId=d.id and dm.dataType='start_stop' 
  where d.siteId =? and d.deviceType='CH'`, [siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.updateDetectionMaster = (detect_id, startDate, endDate) => {
  console.log("startDate", startDate, endDate)
  const query = `update detection_master set start_time='${startDate}',end_time='${endDate}'
  where detect_id=${detect_id}`
  //console.log(query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.insertDetectionMasterHistory = (detect_id) => {
  const query = `insert into 
  detection_master_history(detect_id,value,timestamp,start_time,end_time,algo_id,parameter,site_id,equip_id) 
  select detect_id,value,timestamp,start_time,end_time,algo_id,parameter,site_id,equip_id from detection_master where detect_id=${detect_id} limit 1`
  // console.log(query,"query")
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getDeviceStatusIeee = (siteId) => {
  const q = this.con.promise().query(`SELECT ieee,equipId ,dm.deviceId FROM aimgmt.device_mapping dm left join device d on d.id=dm.deviceId
  where dm.dataType='start_stop' and dm.deviceType='CH' and d.siteId=?`, [siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getLastDetectId = () => {
  const query = `select max(detect_id) as detect_id from detection_master`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getFlowRateIeee = (siteId) => {
  const q = this.con.promise().query(`SELECT dataType,equipId,deviceId,ieee,d.siteId FROM aimgmt.device_mapping dm left join device d on d.id=dm.deviceId
  where dm.dataType in ('chwr_temp','chw_flowrate','cws_temp')
  and dm.deviceType='CH'and deviceId=1 and d.siteId=?`, [siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getDeviceList = (siteId, dataType) => {
  const q = this.con.promise().query(`SELECT distinct(dataType) FROM aimgmt.device_mapping dm left join device d on d.id=dm.deviceId
  where dm.dataType in ('${dataType}')
  and dm.deviceType='CH' and d.siteId=?`, [siteId])
  this.con.releaseConnection(this.con) // release connection
  return q
} // 'chwr_temp','chw_flowrate','cws_temp'

module.exports.saveDmData = ({ siteId, detectId, algoId, parameter, equipId, timestamp, startDate, endDate }) => {
  const q = this.con.promise().query(`insert into 
  detection_master(detect_id,timestamp,start_time,end_time,algo_id,parameter,site_id,equip_id,data_from) 
  values (?,?,?,?,?,?,?,?,?)`, [detectId, timestamp, startDate, endDate, algoId, parameter, siteId, equipId, 0])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.saveAnomalyData = ({ detectId, anomalyState, verified, labeledBy, remark, timestamp }) => {
  const q = this.con.promise().query(`insert into 
  dtd_anomaly(detect_id,anomaly,verified,updated_by,updated_ts,remark) 
  values (?,?,?,?,?,?)`, [detectId, anomalyState, verified, labeledBy, timestamp, remark])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getLatestDetectId = () => {
  const q = this.con.promise().query(`SELECT max(detect_id) as detect_id FROM aimgmt.detection_master `)
  // this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getAnoCountWithDates = (data) => {
  const q = this.con.promise().query(`select count(*) as count from aimgmt.detection_master 
    where algo_id='ad_v1' and ((start_time between ? and ?) OR (end_time between ? and ?))`,
    [data.start_time, data.end_time, data.start_time, data.end_time])
  q.then(qd => {
    if(qd.count>0) {
      this.con.releaseConnection(this.con) // release connection
      console.log("Close Connection : getAnoCountWithDates : ", data)
    }
  })
  
  return q
}
module.exports.saveInDetectionMaster = (data, detectId) => {
  const q = this.con.promise().query(`insert into detection_master(detect_id,timestamp,start_time,end_time,
    algo_id,parameter,site_id,equip_id,data_from) values (?,utc_timestamp(),?,?,?,?,?,?,?)`,
    [detectId, data.start_time, data.end_time, "ad_v1", data.parameter, data.siteId, data.equipId, data.data_from])
  // this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.saveInDtdAnomaly = (detectId) => {
  const q = this.con.promise().query(`insert into dtd_anomaly(detect_id,algo_id) values (?,?)`,
    [detectId, "ad_v1"])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.saveFddData = ({ detectId, fault, verified, labeledBy, remark, timestamp }) => {
  const q = this.con.promise().query(`insert into 
  dtd_fdd(detect_id,fault_id,verified,updated_by,updated_ts,remark) 
  values (?,?,?,?,?,?)`, [detectId, fault, verified, labeledBy, timestamp, remark])
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.saveCalmData = ({ detectId, severity, verified, labeledBy, remark, timestamp }) => {
  const q = this.con.promise().query(`insert into 
  dtd_calm(detect_id,severity_id,verified,updated_by,updated_ts,remark) 
  values (?,?,?,?,?,?)`, [detectId, severity, verified, labeledBy, timestamp, remark])
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.saveLabelLog = ({ detectId, updatedBy, remark, detectionType, labelType }) => { // labelType=accept|reject|recover
  const query = `insert into aimgmt.label_log(detect_id, updated_by, remark, detection_type, label_type) 
  values(${detectId}, ${updatedBy}, '${remark}', ${detectionType}, '${labelType}')`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.readLabelLog = ({ } = {}) => {
  const query = `select * from aimgmt.label_log`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

//================================

// Helper methods
const commaSeparatedString = (stringArray) => {
  return stringArray.reduce((r, c, i) => {
    if (i === 0) return c
    else return `${r},${c}`
  }, "")
}

const commaSeparatedStringWithQuote = (stringArray) => {
  return stringArray.reduce((r, c, i) => {
    if (i === 0) return `'${c}'`
    else return `${r},'${c}'`
  }, "")
}

module.exports.getInefficientDefinition = (query) => {
  if (query.length === 0) return new Promise((resolve) => resolve([[]]))
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.updateInefficientDefinition = ({ tableName, columns, data, condition }) => {
  const columnString = columns.reduce((r, c) => {
    return r.length === 0 ? `${c}=?` : `${r}, ${c}=?`
  }, "")
  const query = `update aimgmt.${tableName} set ${columnString} where ${condition}`
  // console.log(query,"Inefficien")
  const q = this.con.promise().query(query, data)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getDeviceSpec = ( siteId,equipId) => {
  const query = `select * from aimgmt.device_spec where site_id='${siteId}' and equip_id = '${equipId}' limit 1;`
  console.log('query: ', query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

