const CronJob = require('cron').CronJob;
const dateFns = require("date-fns")
const kumoDate = require("../config/kumoDate")
const deepEqual = require('deep-equal')
const notiService = require('../service/notification.service')


const chillerService = require("./chiller.service")
const redisService = require("./redis.service")
const dummyDataService = require("./dummy-data.service")
const fddService = require('./fdd.service')

const aimgmtdb = require("../db/aimgmt.db")

const realtimeGlobalReponse = require("../config/realtimeGlobalReponse")

const cronRunEveryMinute = (callback) => new CronJob('0 */1 * * * *', async () => {

    const sgTime = dateFns.format(kumoDate.Date("Asia/Singapore"), "HH:mm")

    const sgTimeForPlant = dateFns.format(kumoDate.Date("Asia/Singapore"), "yyyy-MM-dd HH:mm:ss")

    const currentTime = dateFns.format(kumoDate.Date("Asia/Singapore"), "yyyy-dd-mm HH:mm:ss")

    const runningScheduler = await redisService.getRunningScheduler()

    console.log("running Scheduler: ", runningScheduler, !runningScheduler, typeof runningScheduler)
    if (sgTime === "00:01") { // Singapore midnight
        console.log("> 1 Every Midnight Run (Yearly 8-days) >>> ", dateFns.format(new Date(), "HH:mm:ss:SS"))
        chillerService.checkDetections()
        chillerService.saveDeviceDatainRedis()

    } else if (sgTime === "00:10") { // Singapore midnight
        console.log("> 2 Every Midnight Run (Yearly 8-days) >>> ", dateFns.format(new Date(), "HH:mm:ss:SS"))
       // dummyDataService.eightDaysData("2019", "2020")
      dummyDataService.getAnomalyEightDaysRealTime()

    } else if (!runningScheduler) {
        console.log("Every Minute Run (CH overview, Plant overview) >>> ", dateFns.format(new Date(), "HH:mm:ss:SS"))

        // Chiller overview data 
        chillerService.runChillerOverviewRawData()
            .then(async chillerOverviewDataOriginal => {
                const chillerOverviewData = await Promise.all(chillerOverviewDataOriginal)
                // console.log("chillerOverviewData: ", chillerOverviewData)
                const oldChillerOverviewData = await redisService.getChillerOverviewData()
                redisService.saveChillerOverviewData(chillerOverviewData)

                // Plant overview
                const oldPlantOverviewData = await redisService.getPlantOverviewData()
                chillerService.runPlantOverviewRawData(oldPlantOverviewData, chillerOverviewData, sgTimeForPlant)
                    .then(async plantOverviewData => {
                        // const oldPlantOverviewData = await redisService.getChillerOverviewData()
                        redisService.savePlantOverviewData(plantOverviewData)
                        // notify changes
                        if (!deepEqual(oldPlantOverviewData, plantOverviewData))
                            Object.values(realtimeGlobalReponse).map(v => v.write(`data: ${JSON.stringify({ newPlantOverview: true })}\n\n`))
                    })

                // notify changes
                // if (!deepEqual(oldChillerOverviewData, chillerOverviewData))
                console.log("notify new Chiller Overvier : true")
                Object.values(realtimeGlobalReponse).map(v => v.write(`data: ${JSON.stringify({ newChillerOverview: true })}\n\n`))
            })

        try {
            chillerService.saveDeviceDatainRedisRealtime()
        } catch (err) {
            console.log("err: ", err)
        }

        console.log("Saved Result <<<: Minutely Data")
    }
}, null, true, 'Asia/Singapore');

const cronRunEveryTenMinutes = (callback) => new CronJob('0 7/20 * * * *', async () => {
    try {
        console.log("Every Ten Minutes Scheduler is Running!========")
        await notiService.saveNewNoti()
    } catch(error) {
        console.log("Exception : Every Ten Minutes Scheduler ", error)
    }
}, null, true, 'America/Danmarkshavn')

const cronRunEveryOneHour = (callback) => new CronJob('0 0 */01 * * *', async () => {
    try {
        console.log("Every One Hour Scheduler is Running!========")
        await fddService.getFddEightDaysRealTime()
        await dummyDataService.getAnomalyEightDaysRealTime()
    } catch(error) {
        console.log("Exception : Every One Hour Scheduler ", error)
    }
}, null, true, 'America/Danmarkshavn')

const cronRunStartOfYear = (callback) => new CronJob('0 1 0 1 0 *', async () => {
    const currentYear = dateFns.format(kumoDate.Date("America/Danmarkshavn"), "yyyy")
    try {
        console.log("Every Start of Year Scheduler is Running!======== AD eight day")
        dummyDataService.eightDaysData(parseInt(currentYear), parseInt(currentYear))
    } catch(error) {
        console.log("Exception : Every Start of Year Scheduler AD eight day ", error)
    }
    try {
        console.log("Every Start of Year Scheduler is Running!======== FDD eight day")
        const sites = (await aimgmtdb.selectQueryComplex("select site_id from aimgmt.site_info"))[0]
        for(let s of sites) {
            dummyDataService.eightDaysDataforFaultDetection({ siteId: s.site_id, year: currentYear })
        }
    } catch(error) {
        console.log("Exception : Every Start of Year Scheduler FDD eight day ", error)
    }
}, null, true, 'America/Danmarkshavn')

cronRunEveryOneHour()

// comment this for non ibpem.com
// #combine_chiller_ml
// cronRunEveryMinute()

cronRunEveryTenMinutes()

cronRunStartOfYear()