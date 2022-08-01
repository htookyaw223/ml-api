const endPoint = require("../api/endpoint.js")
const fetch = require("node-fetch")
const response = require('../config/response')

const checkAuthentication = (req, res, next) => {
    const authorization = req.headers['x-auth-token']
    console.log("Incoming...", req.url)

    if (!authorization) {
        return res.json(response({
            success: false,
            error: "Not authorized user!"
        }))
    }
    else if (!authorization.split(" ")[1]) {
        return res.json(response({
            success: false,
            error: "Not authorized user!"
        }))
    }
    else {
        const authToken = `${authorization.split(" ")[1]}`
        return this.checkAuth(authToken, res, next)
    }

}

module.exports.checkAuth = (authToken, res, next) => {
    const url = endPoint.checkAuth;
    fetch(url, {
        headers: {
            "X-AUTH-TOKEN": `Bearer ${authToken}`,
            "Content-Type": "application/json"
        },
    })
        .then(async response => {
            const responseData = await response.json();
            console.log(responseData)
            if (responseData && responseData.status) {
                return next();
            }
            else
                throw res.json({
                    error:responseData.message,
                    status:false
                })
        })
        .catch(err => {
            throw err
        })
}

module.exports = {
    checkAuthentication,
}