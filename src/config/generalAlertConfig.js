
module.exports.operator = {
    lessThan: "LESS_THAN",
    greaterThan: "GREATER_THAN",
    between: "BETWEEN",
}

module.exports.frequencyType = {
    hour: "HOUR",
    minute: "MINUTE"
}

module.exports.priority = {
    low: "LOW",
    high: "HIGH",
    info: "INFO"
}

module.exports.data = [   
    {
         "id": -3,
        "dataType": "chws_temp",
        "deviceType": "CHILLER",
        "deviceName": "Chiller1",
        "message": "Chiller 1 Supply Temperature is below 9.C",
        "operator": "LESS_THAN",
        "priority": "LOW",
        "frequencyType": "MINUTE",
        "frequencyValue": 5,
        "active": true,
        "clientId": 13,
        "siteId": "cl_tao",
        "deviceId": 1,
        "value1": 9,
        "value2": null,
        "consecutiveMinute": 1
      },
    {
        "id": -3,
        "dataType": "chws_temp",
        "deviceType": "CHILLER",
        "deviceName": "Chiller1",
        "message": "Chiller 3 Supply Temperature is below 9.C",
        "operator": "LESS_THAN",
        "priority": "LOW",
        "frequencyType": "MINUTE",
        "frequencyValue": 5,
        "active": true,
        "clientId": 13,
        "siteId": "cl_tao",
        "deviceId": 3,
        "value1": 9,
        "value2": null,
        "consecutiveMinute": 1
    },
]