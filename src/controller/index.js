const dummyDataController = require("./dummy-data.controller.js")
const anomaliesDataController = require("./anomalies.controller")
const historyController = require("./history.controller")
const authController = require('./authentication.controller')
const labelController = require('./label.controller')
const configMappingController=require('./configMapping.controller')
const chillerController = require('./chiller.controller')
const notificationController = require('./notification.controller')
const svgEvaMapControler = require('./svgEvaMap.controller')
const fddController = require("./fdd.controller")
const fadController = require("./fad.controller")
const calmController = require("./calm.controller")
const siteController = require("./site.controller")

module.exports = {
    dummyData: dummyDataController,
    anomalies: anomaliesDataController,
    histroy:historyController,
    auth:authController,
    label:labelController,
    chiller: chillerController,
    mapping:configMappingController,
    notification: notificationController,
    svgEvaMap: svgEvaMapControler,
    fdd: fddController,
    fad:fadController,
    calm:calmController,
    site:siteController
}