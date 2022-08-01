const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")

// comment this line 
// #combine_chiller_ml
// const redisService = require('./src/service/redis.service')

const realtimeGlobalReponse = require('./src/config/realtimeGlobalReponse')

const uuid = require("uuid")

const controller = require("./src/controller")

const app = express()
// const port = 3004
// #combine_chiller_ml
const port = 5012

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
    // app.use(router)

    console.log(`Worker ${process.pid} started`);

    app.get("/ping", (req, res, next) => {
        res.send("PONG")
    })

    app.get('/save-previous-data', controller.chiller.saveDeviceDatainRedis)

    app.get("/redis-eight-days", controller.dummyData.redisEightDaysData)

    app.get("/notify-realtime", (req, res, next) => {
        // console.log("----> 1")
        res.set({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            // enabling CORS
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
            "Origin, X-Requested-With, Content-Type, Accept",
        })
        // console.log("----> 2")
        
        req.id = uuid.v4()

        // console.log("----> 3")

        // console.log("UUID: ", uuid)

        realtimeGlobalReponse[req.id] = res
        
        console.log(Object.keys(realtimeGlobalReponse).map(r => r))

        // console.log("----> 4")
    
        res.write(`data: ${JSON.stringify({ newNoti: true })}\n\n`)

        // console.log("----> 5")
    
        // If client closes connection, stop sending events
        res.on('close', () => {
            console.log('client dropped me : '+req.id);
            // clearInterval(interValID);
            delete realtimeGlobalReponse[req.id]
            res.end();
        });
    })


    // comment redisService related things
    // #combine_chiller_ml
    // redisService.redisClient.on('ready', function () {
    //     console.log("Redis is Ready")
    // })
    // redisService.redisClient.on("error", function (err) {
    //     console.log("Error " + err);
    // });
    // redisService.redisClient.select(0, function (err) {
    //     console.log("Select db1")
    // })

    // const cronTask = require("./src/service/cronTask")

    app.listen(port, () => {
        //redisService.redisClient.flushdb()
        console.log(`IBPEM Cron&SSE app listening on port ${port}!`)

        
    })

    console.log("cron-pid: ", process.pid)

// }
