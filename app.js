const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;
const path = require("path")

const conn = require("./src/db/aimgmt.db")

const customMem = require("./src/db/customMem.js")

// For test purpose only : run stored procedures
const test = () => {
    console.log("Started SP call")
    conn.con.query(
        `call spSensorDataByEquipmentDates("2020-01-01 00:00:00", date_sub("2020-02-01 00:00:00", interval 1 second));`,
        (error, results) => {
            if(error) {
                console.log("Finished SP call with ERROR ")
                console.error(error)
            } else {
                console.log("Finished SP call: ", results[0])
            }
        }
    )
}

const test1 = async () => {
    let startDate = new Date("2020-01-01 00:00:00");
    let endDate = new Date("2020-03-01 00:00:00");
    console.log(Date.now())
    let query="";
    do{
        let tmpDate = dateFns.addHours(startDate,6);
        try{
        query = `call spSensorDataByEquipWithDate('${dateFns.format(startDate,"yyyy-MM-dd HH:mm:ss")}', date_sub('${dateFns.format(tmpDate,"yyyy-MM-dd HH:mm:ss")}', interval 1 second),'site_ppssor');`
        const res = await conn.con.promise().query(query);
        // console.log(res[0][0],query)
        // console.log(query)
        }catch(err){
            console.log(err);
        }
        startDate = tmpDate;
    }while(startDate<endDate)
    console.log(Date.now(),query)
}
// test()

const exec = require('child_process').exec;

const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")

// const dateFns = require("date-fns")
// const dateFnsZone = require("date-fns-tz")

const router = require("./src/routes")

// remove this redisService related lines
// #combine_chiller_ml
// const redisService = require('./src/service/redis.service')

const app = express()
// const port = 3003
// #combine_chiller_ml
const port = 5011

// #combine_chiller_ml | command for chiller only
/* console.log("Kill 3003: ")
 exec('fuser -k 3003/tcp').stdout.pipe(process.stdout)
 console.log("Kill 3004: ")
 exec('fuser -k 3004/tcp').stdout.pipe(process.stdout)
*/

// app.use("/files", express.static(path.join(__dirname, "")))

const reportService = require("./src/service/reportService")

app.use("/dq-reports", express.static(reportService.getDqReportDir()))


// const t1 = "2020-06-02T04:50:00.000-00:00"
// console.log("1", new Date(t1).toISOString())
// console.log("2", dateFns.format(dateFnsZone.utcToZonedTime(new Date(t1), "Asia/Yangon"), "yyyy-MM-dd HH:mm:ss.SSS"))
// console.log("3", dateFnsZone.format(dateFnsZone.utcToZonedTime(new Date(t1), "Asia/Singapore"), "yyyy-MM-dd HH:mm:ss.SSS", { timeZone: "Asia/Yangon" }))
// console.log("0", new Date().toISOString())

// function parseDate(date) {
//     const parsed = Date.parse(date);
//     if (!isNaN(parsed)) {
//         return parsed;
//     }

//     return Date.parse(date.replace(/-/g, '/').replace(/[a-z]+/gi, ' '));
// }
// const d = parseDate('2020-06-02T04:50:00+0630')
// console.log(d, new Date(d), dateFns.format(d, "yyyy-MM-dd'T'HH:mm:ss"));  // 1486635738000 time in ms

// if (cluster.isMaster) {
//     console.log(`Master ${process.pid} is running (No CPU: ${numCPUs})`);

//     const cronTask = require("./src/service/cronTask")

//     redisService.redisClient.on('ready', function () {
//         console.log("Redis is Ready")
//     })
//     redisService.redisClient.on("error", function (err) {
//         console.log("Error " + err);
//     });
//     redisService.redisClient.select(0, function (err) {
//         console.log("Select db1")
//     })

//     // Fork workers.
//     for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     }
 
//     cluster.on('exit', (worker, code, signal) => {
//         console.log(`worker ${worker.process.pid} died`);
//     });


// } else {

    app.use((req, res, next) => {
        // console.log(`Pid: ${process.pid}`)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, *POST*, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        next();
    });

    app.use(cors())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())
    app.use(router)

    // console.log(`Worker ${process.pid} started`);

    app.get("/ping", (req, res, next) => {
        if(customMem.energySavingCalculationInProgress["cl_tao"].loadingPlantEnergySavingMonth)
            customMem.energySavingCalculationInProgress["cl_tao"].loadingPlantEnergySavingMonth=false
        else 
            customMem.energySavingCalculationInProgress["cl_tao"].loadingPlantEnergySavingMonth=true
        res.send("PONG")
    })

    app.get("/report", (req, res, next) => {
        res.send("PONG")
    })

    // app.get("/notify-realtime", (req, res, next) => {
    //     res.set({
    //         "Content-Type": "text/event-stream",
    //         "Cache-Control": "no-cache",
    //         Connection: "keep-alive",
    
    //         // enabling CORS
    //         "Access-Control-Allow-Origin": "*",
    //         "Access-Control-Allow-Headers":
    //         "Origin, X-Requested-With, Content-Type, Accept",
    //     })
        
    //     req.id = uuid.v4()

    //     // console.log("UUID: ", uuid)

    //     realtimeGlobalReponse[req.id] = res
    
    //     res.write(`data: ${JSON.stringify({ newNoti: true })}\n\n`)

    //     // console.log(Object.keys(realtimeGlobalReponse))
    
    //     // If client closes connection, stop sending events
    //     res.on('close', () => {
    //         console.log('client dropped me : '+req.id);
    //         // clearInterval(interValID);
    //         delete realtimeGlobalReponse[req.id]
    //         res.end();
    //     });
    // })

    // const cronTask = require("./src/service/cronTask")


    // remove this redisService related lines 
    // #combine_chiller_ml
    // redisService.redisClient.on('ready', function () {
    //     console.log("Redis is Ready")
    //     redisService.deleteRunningScheduler({ schedulerRunning: false })
    // })
    // redisService.redisClient.on("error", function (err) {
    //     console.log("Error " + err);
    // });
    // redisService.redisClient.select(0, function (err) {
    //     console.log("Select db1")
    // })
    
    // console.log(conn.con.config)
    conn.con.query("select 1+1", (error, results) => {
        if(error) {
            console.log("Cant start database errorrroror: ", error)
        } else {
            console.log("Connected : ", results, "\n", /*conn.con*/)
            conn.con.releaseConnection(conn.con)

            // report
            const util = require("./src/util")
            util.report.checkReportUtils(() => {
                app.listen(port, () => {
                    // redisService.redisClient.flushdb()
                    console.log(`IBPEM app listening on port ${port}!`)
                    exec('node ' + path.resolve(__dirname, 'app-cron.js')).stdout.pipe(process.stdout);

                    // exec('node app-cron.js').stdout.pipe(process.stderr);
                })

                console.log("app-pid: ", process.pid)
            })
            
        } 

    })

// }
