const { verifyToken } = require("../security/token")
const response = require('../config/response')
const redisService = require('../service/redis.service')
const dateFns = require("date-fns")

const authenticationMiddleware = (req, res, next) => {
    // const authorization = req.headers['authorization']
    const authorization = req.headers['x-auth-token']

    console.log("Incoming...", req.url)

    if (req.url === "/notify-realtime" || req.url === "/login") return next()
    if (req.path === "/dq-report") {
        const authToken = req.query.aut
        if (!authToken) {
            return res.json(response({
                success: false,
                error: "Not authorized user!"
            })) 
        }
        return this.checkAuth(authToken, res, next)
    }
    
    if (!authorization) {
        return res.json(response({
            success: false,
            error: "Not authorized user!"
        }))
    }
    else if (!authorization.split(" ")[1]) {
       return  res.json(response({
            success: false,
            error: "Not authorized user!"
        }))
    }
    else {
        const authToken = `${authorization.split(" ")[1]}`
        return this.checkAuth(authToken, req, res, next)
    }
}

module.exports.checkAuth = (authToken, req, res, next) => {
    return verifyToken(authToken, async (error, data) => {
        if (error) {
            return res.json(response({
                success: false,
                error: error.message
            }))
        }
        else {
            // const authToken = token
            const time = await redisService.getUserExpriyTime(authToken)
            const userData = await redisService.getUserDetail(authToken)
            //console.log({userData})
            if (!time) {
                return res.json(response({
                    success: false,
                    error: "You are logged out, please login to continue"
                }))
            }
            //console.log(time,"middleware")
            if (dateFns.compareAsc(Date.parse(time), new Date()) < 0) {
                return res.json(response({
                    success: false,
                    error: "Your token expired, please login to continue"
                }))
            }
            //if(req.url == "/report-info" && userData.role !="ADMIN") return res.json(response({success:false,error:"Permission Denied"}))
            // const updateTime = dateFns.addMilliseconds(dateFns.toDate(Date.now()), 120000)
            const updateTime = dateFns.format(dateFns.addMinutes(new Date(), 60), "yyyy-MM-dd HH:mm:ss")
            try {
                redisService.createUserSession(authToken, userData, updateTime)

            }
            catch (error) {
                console.log("error1:  ", error)
                return res.json(response({
                    success: false,
                    error: error.toString()
                }))
            }
            // console.log("userData: ", userData)
            req.loggedUser = { userId: userData.userId, username: userData.username, role: userData.role, clientId: userData.clientId, email: userData.email, mobileNo: userData.mobileNo }
            return next()
        }
    })
}

module.exports = {
    authenticationMiddleware,
}
