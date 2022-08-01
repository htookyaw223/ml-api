const express = require("express")
const controller = require("../controller")
const { checkAuthentication } = require("./chiller.middleware")
const {authenticationMiddleware}=require('./middleware')

const router = express.Router()

router.use((req, res, next) => {
    console.log("Incoming...", req.url)
    next()
})

router.post('/signup',controller.auth.signup)
router.post('/login',controller.auth.login)

// router.use(authenticationMiddleware)
//used for Ibpem only

// for combine_chiller+ml
// router.use(checkAuthentication);

//for dummy-data
router.get("/dummy-data", controller.dummyData.getDummyData)


//for eight-days
router.get("/eight-days",controller.dummyData.fiveDaysData)

router.get("/eight-days-fdd",controller.dummyData.eigthDaysWithFdd)

//for anomalies
router.get("/anomalies",controller.anomalies.getAnomaliesData)

router.get("/detection-count",controller.anomalies.getAnomaliesCount)

router.put("/anomalies/:id",controller.anomalies.updateAnomailesData)

router.post("/anomalies",controller.anomalies.createNewAnomaly)


//for history
router.get("/history",controller.histroy.getHistory)

router.get("/filter-data",controller.histroy.getHistoryFilterData)


//router.delete("/history",controller.histroy.delEditHistory)

//for labels
router.get("/labels",controller.label.getAllLabels)

// for add custom 
router.post("/labels",controller.label.saveLabel)

router.delete('/labels',controller.label.deleteLabelByName)

// chiller APIs 
router.get("/chiller-overview-raws", controller.chiller.getChillerOverviewRawData)
router.get("/chiller-overview-raws/:id", controller.chiller.getChillerOverviewRawData)
router.get("/plant-overview-raws", controller.chiller.getPlantOverviewRawData)

//with sp chiller overview minut/plant-overview-rawsely
// router.get("/chiller-overview-raws", controller.chiller.getSpChillerOverviewMinutely)
// router.get("/chiller-overview-raws/:id", controller.chiller.getSpChillerOverviewMinutely)
// router.get("/plant-overview-raws", controller.chiller.getSpPlantOverviewHourly)


router.get("/chiller-device-mappings", controller.chiller.getDeviceMappings)
router.get("/chiller-data-types", controller.chiller.getAllDataTypes)
router.get("/device-data", controller.chiller.getDeviceData)
router.get("/devices", controller.chiller.getDevices)
router.put("/notifications/:notiId", controller.notification.setReadNotification)
router.get("/notifications", controller.notification.getAllNotification)
router.get("/unread-notification-count", controller.notification.getUnreadNotificationCount)

//to test
router.get('/previous-data',controller.chiller.getPreviousDatainRedis)

//to save data for device and deviceMapping table
router.get('/deviceMapping',controller.mapping.tDeviceMapping)

router.get('/evamap-data',controller.svgEvaMap.getSvgEvaMapData)

// For FDD APIs
router.get("/fdd", controller.fdd.getFddData)
router.post("/fdd/:detectionId/:acceptReject", controller.fdd.acceptFddData)

// recover api

router.put("/recover-anomaly/:id",controller.anomalies.recoverAnomalyDetection)


//for ad eight day
router.get("/eight-days-ad-yearly",controller.dummyData.eightDaysDataforAnomalyDetection)

//this api is only for test will run in scheduler every one hourt
router.get("/ad-eight-days-realtime-data",controller.dummyData.getAnomalyRealTime)



router.get("/eight-days-fdd-yearly",controller.dummyData.eightDaysDataforFaultDetection)

//router.get("/fdd-eight-days-history-data",controller.fdd.getFddEightDaysHistory)

//this api is only for test will run in scheduler every one hour
router.get("/fdd-eight-days-realtime-data",controller.fdd.getFddEightDaysRealTime)


//For Fad Apis


router.get("/fad",controller.fad.getFadData)

router.post("/fad/:detectionId/:acceptReject", controller.fad.acceptFadData)

router.get("/eight-days-fad",controller.fad.eigthDaysWithFad)

router.get("/fad-count",controller.fad.getFadCount)

router.get("/test1",controller.dummyData.getAnomalyRealTime)

router.get("/parameter-based-raw-data",controller.dummyData.getParameterBasedData)

router.get("/unreview-count",controller.anomalies.getUnreviewCount)

router.get("/device-parameter-maps",controller.chiller.getDeviceAndParameterMapping)

////// calm apis
router.get("/calm-severity-count",controller.calm.getSeverityInCalm)

router.get("/calm-parameter-based-data",controller.calm.getCalmRawData)

router.get("/calm",controller.calm.getCalmData)

router.get('/data-count',controller.chiller.getRawCountForEachDevice)

router.get("/chiller-health", controller.calm.getChillerHealth)

router.put("/calm/:id",controller.calm.updateCalm)//labelling

router.post("/calm/:detectionId/:acceptReject", controller.calm.acceptCalmData)

router.get("/calm-detail-count",controller.calm.calmDetailCount)

router.get("/calm/fault-trend-graph-data", controller.calm.getTrendGraphDataCalm)

router.post("/calm/fault-trend-graph-data", controller.calm.calculateTrendGraphDataCalm)

router.get("/chiller-health-new", controller.calm.getChillerHealthNewData)

router.get("/calm-energy-saving",controller.calm.getEnergySavings)


//////for report
router.get("/site-info", controller.site.getSiteInfo)

router.post("/site-info", controller.site.saveSiteInfo)

router.get('/client-info',controller.site.getClientInfo)

router.post('/client-info',controller.site.saveClientInfo)

router.get('/dq-report', controller.chiller.generateDataQualityReport)

router.get('/dq-report-config',controller.site.getDqReport)

router.post('/dq-report-config',controller.site.saveDqReport)

router.put('/dq-report-config/:siteId',controller.site.updateDqReport)

router.delete('/dq-report-config/:siteId',controller.site.deleteDqReport)

//test
router.post('/post-processing',controller.anomalies.postProcessing)

router.get("/plant-efficiency-health-forecast",controller.calm.getchillerPlantEfficiency)

router.get("/post_processing_definition", controller.anomalies.getPostProcessingDefinition)

router.post("/post_processing_definition", controller.anomalies.createPostProcessingDefinition)

router.put("/post_processing_definition/:id", controller.anomalies.updatePostProcessingDefinition)

router.get("/inefficient-definition", controller.calm.getInefficientDefinition)

router.put("/inefficient-definition/:id", controller.calm.updateInefficientDefinition)

router.post("/inefficient-definition", controller.calm.createInefficientDefinition)

router.get("/device-spec", controller.chiller.getdeviceSpecification)

router.get("/running-in-progress-energy-saving", controller.calm.getRunningEnergySaving)

router.get("/fdd-energy-wastage", controller.fdd.getFddEnergyWastage)

module.exports = router