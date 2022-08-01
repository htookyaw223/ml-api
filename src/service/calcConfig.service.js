const { raw } = require('body-parser')
const aimgmtdb = require('../db/aimgmt.db')

const CALM = "calm"
const CHM_FAULTY_PERCENT = "chm_faulty_percent"
const CHM_FAULTY_INCREASED_RATE = "chm_faulty_increase_rate"
const CHM_SEVERITY_DAY_COUNT = "chm_severity_day_count"
const CHM_INEFFICIENT_PERCENT = "chm_inefficient_percent"

const ES_COST_PER_KW = "es_cost_per_kw"

module.exports.loadChillerHealthMeterCalc = async () => {
    const query = `SELECT * FROM aimgmt.cal_config 
        WHERE enabled=1 AND key1='${CALM}' AND key2 in ('${CHM_SEVERITY_DAY_COUNT}', '${CHM_FAULTY_PERCENT}', '${CHM_FAULTY_INCREASED_RATE}', '${CHM_INEFFICIENT_PERCENT}')
        ORDER BY priority ASC`
    const rawResults = await aimgmtdb.selectQuery(query)
    const results = rawResults[0]
    const data = {
        severityDayCount: [],
        faultyPercent: [],
        faultyIncreasedRate: [],
        inefficientPercent: []
    }
    for(const c of results) {
        if(c.key2===CHM_SEVERITY_DAY_COUNT) {
            data.severityDayCount.push(c)
        } else if(c.key2===CHM_FAULTY_PERCENT) {
            data.faultyPercent.push(c)
        } else if(c.key2===CHM_FAULTY_INCREASED_RATE) {
            data.faultyIncreasedRate.push(c)
        } else if(c.key2===CHM_INEFFICIENT_PERCENT) {
            data.inefficientPercent.push(c)
        }
    }
    return data
}

module.exports.loadEnergySavingCalc = async () => {
    const query = `SELECT * FROM aimgmt.cal_config 
        WHERE enabled=1 AND key1='${CALM}' AND key2 in ('${ES_COST_PER_KW}', '${CHM_INEFFICIENT_PERCENT}')
        ORDER BY priority ASC`
        
    const rawResults = await aimgmtdb.selectQuery(query)
    const results = rawResults[0]
    const data = {
        inefficientPercent: [],
        costPerKW: { value : 21.43 } // default value 21.43
    }

    for(const c of results) {
        if(c.key2===CHM_INEFFICIENT_PERCENT) {
            data.inefficientPercent.push(c)
        } else if(c.key2===ES_COST_PER_KW) {
            data.costPerKW = c
        }
    }

    return data
}

// test
const test = async () => {
    console.log("DateTime.start: ", Date.now()/1000)

    // const chmCalcConfig = await this.loadChillerHealthMeterCalc()
    // console.log("loadChillerHealthMeterCalc:result: ", chmCalcConfig)

    // const costPerKW = await this.loadEnergySavingCalc()
    console.log("costPerKW: ", costPerKW)

    console.log("DateTime.end: ", Date.now()/1000)
}

// test()
