const siteService = require("../service/site.service")
const path = require("path")
const fs = require("fs")
const exec = require('child_process').exec;

const reportDir = path.join(__dirname, '..', "..", "ibpem-start-script.sh")


module.exports.checkReportUtils = (onFinished) => {
    // read site info here
    // if site enabled report feature
    this.initializeReportUtils(() => {
        console.log("Report checking is done.")
        onFinished()
    })
}

module.exports.initializeReportUtils = (onFinished) => {
    console.log("=================================\n")
      return onFinished()
    const reportCheckingProcess = exec("bash "+reportDir)
    reportCheckingProcess.stdout.on("data", data => {
        console.log(data)
        if (data.includes("Checking finished.")) {
            console.log("=================================\n")
            return onFinished()
        }
    })
    reportCheckingProcess.on("error", error => {
        console.log("error: ", error)
        return onFinished()
    })

    reportCheckingProcess.on("message", message => {
        console.log("message: ", message)
    })
    // reportCheckingProcess.stderr.on("error", error => {})
    /*
        if (error) {
            console.log("error: ", error)
            return onFinished()
        }
        try {
            console.log(stdout)
            if (stdout.includes("Checking finished.")) {
                console.log("=================================\n")
                return onFinished()
            }
        } catch (error) {
            return onFinished()
        }
    */


}