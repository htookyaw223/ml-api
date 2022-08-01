const mysql = require("mysql2")


// module.exports.con = mysql.createPool({
//   host: 'ibpemserv.emscloud.net',
//   port: '47506',
//   user: 'eco',
//   password: 'ECO4ever',
//   database: 'iotmgmt',
//   waitForConnections: false,
//   connectionLimit: 10,
//   queueLimit: 0,
//   debug: false,
//   multipleStatements: true,
//   connectTimeout: 120000
// })

// #combine_chiller_ml

module.exports.con = mysql.createPool({
  host: 'stgsg.emscloud.net',
  port: '45201',
  user: 'ecoml',
  password: 'ECO4ml20',
  database: 'iotmgmt',
  waitForConnections: false,
  connectionLimit: 10,
  queueLimit: 0,
  debug: false,
  multipleStatements: true,
  connectTimeout: 120000
})


module.exports.selectQuery = (query) => {
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getTDevice = () => {
    const q = this.con.promise().query(`select * from TDevice`)
    this.con.releaseConnection(this.con) // release connection
    return q
  }

module.exports.getRawData = (selectors, tableName, condition) => {
  console.log("query: ", `SELECT ${selectors} FROM ${tableName} ${condition}`)
  const q = this.con.promise().query(`SELECT ${selectors} FROM ${tableName} ${condition}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getRawCount = (dataQuery) => {
  const query = `select sum(count) as countt,t2.ts from (${dataQuery})t2 group by t2.ts`
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getParameterBasedRawData = (dataQuery) => {
  //console.log(dataQuery)
  const q = this.con.promise().query(dataQuery)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getRawCountForEachDevice = (rawQuery) => {
  const q = this.con.promise().query(rawQuery)
  this.con.releaseConnection(this.con) // release connection
  return q
}

module.exports.getRawCountforFdd = (tableName, ieee, startDate, endDate) => {
  const query = `select count(*) as count from ? where ieee in (?)  and ts between ? and ?`
  const q = this.con.promise().query(query, [tableName, ieee, startDate, endDate])
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getRawCountforAnomaly = (tableName,ieee, startDate, endDate) => {
  const query = `select count(*) as count,date(ts) as ts from iotmgmt.${tableName} where ieee ='${ieee}' 
   and ts between '${startDate}' and '${endDate}' group by date(ts) union all 
   select count(*) as count,date(ts) as ts from iotdata.${tableName} where ieee ='${ieee}' 
   and ts between '${startDate}' and '${endDate}' group by date(ts) `
   //console.log("query",query)
  const q = this.con.promise().query(query)
  this.con.releaseConnection(this.con) // release connection
  return q
}


module.exports.getFlowRate= (flowRateQuery)=>{
  //console.log(flowRateQuery)
  const q =this.con.promise().query(`${flowRateQuery}`)
  this.con.releaseConnection(this.con) // release connection
  return q
}
module.exports.getSensorRealTimeData= (sqlQuery)=>{
  //console.log(sqlQuery)
  const q =this.con.promise().query(`${sqlQuery}`)
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
  
  
 


 
  