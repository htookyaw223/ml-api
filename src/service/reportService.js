const path = require("path")
const fs = require("fs")
const exec = require('child_process').exec;
const findFiles = require("file-regex");
const { resolve } = require("path");

const reportDir = path.join(__dirname, '..', '..', '..', 'dq-report')

module.exports.getDqReportDir = () => {
    return reportDir + "/report"
}

module.exports.getDqConfigList = async () => {
    if(fs.existsSync(reportDir)) {
        const configFiles = await findFiles(reportDir, /(config_)(\w+)\.txt$/g)
        const result = []
        //console.log({configFiles})
        for(f of configFiles) {
            const file = f.dir + "/" + f.file
            const data = fs.readFileSync(file, { encoding: "utf-8", flag: "r" })
            
            // console.log("resultedDatda",data.split("\n").filter(v => v.match(/^((?!#).)*$/)));
            const da = data.split("\n")
                .filter(v => v.match(/^((?!#).)*$/))
                .filter(v => v.match(/(site_id)/) || v.match(/(database_name)/) || v.match(/(database_ip)/) || v.match(/(port)/) || v.match(/(username)/) || v.match(/(password)/) )
                .map(v => v.trim().replace(/\s/g, ''))
            const dao = da.reduce( (r, c) => {
                return ({ ...r, [ko[0]] : ko[1].replace(",", "") })
            }, {})
            const siteIdML = f.file.replace("config_", "").replace(".txt", "")
            result.push({...dao, siteIdML})
        }
        // console.log("RESULT: ", result)
        return result
    } else {
        return []
    }
}

module.exports.createDqConfigList = async (siteId, configData = {}) => {
    console.log(configData,"config")
    const configFileTemplate = "config_dq.txt"
    const fileTemplate = path.join(__dirname, configFileTemplate)
    
    const configFile = "config_" + siteId + ".txt"
    const file = reportDir + "/" + configFile

    // if (fs.existsSync(fileTemplate)) {
        const data = fs.readFileSync(fileTemplate, { encoding: "utf-8", flag: "r" })
        
         const da = data.split("\n")
            .filter(v => v.match(/^((?!#).)*$/))
            .filter(v => v.match(/(site_id)/) || v.match(/(database_name)/) || v.match(/(database_ip)/) || v.match(/(port)/) || v.match(/(username)/) || v.match(/(password)/))
            .map(v => v.trim().replace(/\s/g, ''))
        const dao = da.reduce((r, c) => {
            const ko = c.split("=")
            return ({ ...r, [ko[0]]: ko[1].replace(",", "") })
        }, {})
        const result = []
        Object.keys(configData).map(k => {
            const da1 = "@"+k
            const da2 = configData[k]
            return result.push({ da1, da2 })
        })
        // console.log("result: ", result)
        if (result.length > 0) {
            const dataNew = data.split("\n").map(v => result.reduce( (r,c) => 
            r.replace(c.da1, c.da2), v)).join("\n") //result.reduce((r, c) => r.replace(c.da1, c.da2), data)
            fs.writeFileSync(file, dataNew, { encoding: "utf-8" })
            return this.getDqConfigList()
        }
        return []
    // } else {
    //     return []
    // }
}

module.exports.updateDqConfigList = async (siteId, configData={}) => {
    const configFile = "config_" + siteId + ".txt"
    const file = reportDir + "/" + configFile

    return this.createDqConfigList(siteId, configData)

    if (fs.existsSync(file)) {        
        const data = fs.readFileSync(file, { encoding: "utf-8", flag: "r" })
        const da = data.split("\n")
            .filter(v => v.match(/^((?!#).)*$/))
            .filter(v => v.match(/(site_id)/) || v.match(/(database_name)/) || v.match(/(database_ip)/) || v.match(/(port)/) || v.match(/(username)/) || v.match(/(password)/))
            .map(v => v.trim().replace(/\s/g, ''))        
        const dao = da.reduce((r, c) => {
            const ko = c.split("=")
            return ({ ...r, [ko[0]]: ko[1].replace(",", "") })
        }, {})
        const result = []
        Object.keys(configData).map(k => {
            const da1 = data.split("\n").find(v => v.includes(k) && v.includes(dao[k]))
            if(da1 && dao[k]!=configData[k]) {
                const da2 = da1.replace(dao[k], configData[k])
                return result.push({ da1, da2 })
            } 
        })
        if(result.length>0) {
            const dataNew = result.reduce((r,c) => r.replace(c.da1, c.da2),data)
            fs.writeFileSync(file, dataNew, { encoding: "utf-8" })
            return this.getDqConfigList()
        }
        return []
    } else {
        return this.createDqConfigList(siteId, configData)
    }
}

module.exports.deleteDqConfigList = async (siteId) => {
    const configFile = "config_" + siteId + ".txt"
    const file = reportDir + "/" + configFile

    if (fs.existsSync(file)) {
        try {
            fs.unlinkSync(file)
            return this.getDqConfigList()
        } catch(error) {
            return []
        }
    } else {
        return []
    }
}

test = async () => {
    //const dqConfigList = await this.getDqConfigList()    
    //console.log("getDqConfigList: ", dqConfigList)

    // const dqConfigUpdated = await this.updateDqConfigList("cltao", { site_id: 10, database_name: "reportplatform" })
    // console.log("dqConfigUpdated: ", dqConfigUpdated)

    // const dqConfigCreated = await this.createDqConfigList("cl", { site_id: '15',database_name: 'reportDemo',database_ip: 'localhost',port: '3306',username: 'eco', password: 'eco'})
    // console.log("dqConfigCreated: ", dqConfigCreated)

    // const dqConfigDeleted = await this.deleteDqConfigList("cltao2")
    // console.log("dqConfigDeleted: ", dqConfigDeleted)
}

//test()

module.exports.initReportFiles = () => {
    console.log("Create Folder : ", reportDir)
    fs.mkdirSync(reportDir)
}

module.exports.execDQReport = ({ siteId, dateFor, execute }, onSuccess, onError) => {
    const fileName = siteId+"_"+dateFor
    const configFile = "config_"+siteId+".txt"
    const reportExec = "cd "+reportDir+" && ./app-linux --fn "+fileName+" --cfg "+configFile+" --dt "+ dateFor

    const fileLocation = reportDir+"/report/"+fileName+".pdf"
    
    // check already exists, if yes not run again
    if(!execute && fs.existsSync(fileLocation)) {      
        return onSuccess(fileName+".pdf")
    } 

    exec(reportExec, (error, stdout, stderr) => {
        if(error) {
            return onError(error)
        }
        try {
            if (stdout.includes("success: true"))
                return onSuccess(fileName+".pdf")
            else 
                return onError(stdout)
        } catch(error) {
            return onError(error)
        }
    })
    
}

module.exports.generateDataQualityReport = ({ siteId, dateFor, execute=false }) => {
    
    if(!fs.existsSync(reportDir)) {
        this.initReportFiles()
    }
    return new Promise((resolve, reject) => {
        this.execDQReport({ siteId, dateFor, execute }, (fileName) => {
            resolve({ 
                path: this.getDqReportDir() + "/" + fileName,
                fileName: fileName,
            })
        }, error => {
            reject("Error : "+ error)
        })
        
    })
}

