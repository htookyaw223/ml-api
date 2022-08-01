const endPoint = require("./endpoint.js")
const fetch = require("node-fetch")
const queryString = require("query-string")

module.exports.fetchGraphData = ({ token, clientId, siteId, chillerId, startDate, endDate }) => {
    const query = { clientId, siteId, chillerId, startDate, endDate }
    const url = queryString.stringifyUrl({url: endPoint.efficiencyGraph, query});
    return fetch(url, {
        headers: { 
            "X-AUTH-TOKEN": `Bearer ${token}`,
            "Content-Type": "application/json" 
        },
    })
    .then(res => res.json())
}