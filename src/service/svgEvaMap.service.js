
module.exports.getEavMapData = (siteId, clientId) => {
    const dataFiltered = {
        ChillerMapData: [
            {
                EvaporatorDevices: data.ChillerMapData[0].EvaporatorDevices.filter(v => v.forSiteId==siteId)
            }, 
            {
                CondenserDevices: data.ChillerMapData[1].CondenserDevices.filter(v => v.forSiteId == siteId),
            }
        ]
    }
    return new Promise((resolve, reject) => {
        return resolve(dataFiltered)
    })
}

const data = {
    "ChillerMapData": [
        {
            "EvaporatorDevices": [
                {
                    "forSiteId": "cl_tao",
                    "EvaporatorDevices": {
                        "ch1": {
                            "id": 1,
                            "anomaly": false,
                            "x": 100,
                            "y": 25,
                            "from": "ch1",
                            "to": "Pump-1",
                            "name": "Chiller-1",
                            "type": "ch",
                            "x1": 24.7,
                            "x2": 19,
                            "y1": 8.5,
                            "y2": 8.5,
                            "pipeColor": "#7392d2"
                        },
                        "ch2": {
                            "id": 2,
                            "anomaly": true,
                            "AnomalyCountNumber": "3",
                            "x": 100,
                            "y": 137,
                            "from": "ch2",
                            "to": "Pump-2",
                            "name": "Chiller-2",
                            "type": "ch",
                            "x1": 24.7,
                            "x2": 19,
                            "y1": 19.5,
                            "y2": 19.5,
                            "pipeColor": "#7392d2"
                        },
                        "ch3": {
                            "id": 3,
                            "anomaly": true,
                            "AnomalyCountNumber": "2",
                            "x": 100,
                            "y": 249,
                            "from": "ch3",
                            "to": "Pump-3",
                            "name": "Chiller-3",
                            "type": "ch",
                            "x1": 24.7,
                            "x2": 19,
                            "y1": 30.5,
                            "y2": 30.5,
                            "pipeColor": "#7392d2"
                        },
                        "ch4": {
                            "id": 4,
                            "anomaly": false,
                            "x": 610,
                            "y": 40,
                            "from": "ch4",
                            "to": "Pump-4",
                            "name": "Chiller-4",
                            "type": "ch",
                            "x1": 55.3,
                            "x2": 62,
                            "y1": 9.5,
                            "y2": 9.5,
                            "pipeColor": "#7392d2"
                        },
                        "ch5": {
                            "id": 5,
                            "anomaly": false,
                            "x": 610,
                            "y": 157,
                            "from": "ch4",
                            "to": "Pump-4",
                            "name": "Chiller-4",
                            "type": "ch",
                            "x1": 55.3,
                            "x2": 62,
                            "y1": 21.3,
                            "y2": 21.3,
                            "pipeColor": "#7392d2"
                        }
                    },
                    "Pump": {
                        "gen1": {
                            "x": 3,
                            "y": 6.5,
                            "to": "ct1",
                            "name": "Pump-1",
                            "type": "gen",
                            "x1": 28.3,
                            "x2": 33.5,
                            "y1": 8.5,
                            "y2": 8.5,
                            "pipeColor": "#f91037"
                        },
                        "gen2": {
                            "x": 3,
                            "y": 17.5,
                            "to": "ct2",
                            "name": "Pump-2",
                            "type": "gen",
                            "x1": 28.3,
                            "x2": 33.5,
                            "y1": 19.5,
                            "y2": 19.5,
                            "pipeColor": "#f91037"
                        },
                        "gen3": {
                            "x": 3,
                            "y": 28.5,
                            "to": "ct3",
                            "name": "Pump-3",
                            "type": "gen",
                            "x1": 28.3,
                            "x2": 33.5,
                            "y1": 30.5,
                            "y2": 30.5,
                            "pipeColor": "#f91037"
                        },
                        "gen4": {
                            "x": 4.95,
                            "y": 8,
                            "to": "ct4",
                            "name": "Pump-4",
                            "type": "gen",
                            "x2": 47.7,
                            "x1": 52.7,
                            "y1": 10,
                            "y2": 10,
                            "pipeColor": "#f91037"
                        },
                        "gen5": {
                            "x": 4.95,
                            "y": 18,
                            "to": "ch",
                            "name": "Pump-5",
                            "type": "gen",
                            "x2": 47.7,
                            "x1": 52.7,
                            "y1": 20,
                            "y2": 20,
                            "pipeColor": "#f91037"
                        }
                    },
                    "Lines": [
                        {
                            "x1": 45,
                            "y2": 30,
                            "x2": 45,
                            "y1": 40,
                            "type": "coolAirForChiller",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x2": 55,
                            "y1": 30,
                            "x1": 45.2,
                            "y2": 30,
                            "type": "coolAirForChiller",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 55,
                            "y2": 1,
                            "x2": 55,
                            "y1": 30,
                            "type": "coolAirForChiller",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x2": 25,
                            "y1": 1,
                            "x1": 54.7,
                            "y2": 1,
                            "type": "coolAirForChiller",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 25,
                            "y1": 1.3,
                            "x2": 25,
                            "y2": 35,
                            "type": "coolAirForChiller",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 57.8,
                            "x2": 53,
                            "y1": 16.1,
                            "y2": 16.1,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 58,
                            "x2": 58,
                            "y2": 16.1,
                            "y1": 20,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 58,
                            "x1": 62,
                            "y2": 20,
                            "y1": 20,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 58,
                            "x2": 58,
                            "y1": 8.2,
                            "y2": 5,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 63,
                            "x2": 58,
                            "y1": 8.5,
                            "y2": 8.5,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 28,
                            "x1": 20,
                            "y1": 29.5,
                            "y2": 29.5,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 28,
                            "x1": 20,
                            "y1": 18.5,
                            "y2": 18.5,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 28,
                            "x1": 20,
                            "y1": 7.5,
                            "y2": 7.5,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 57.8,
                            "x2": 53,
                            "y1": 5.05,
                            "y2": 5.05,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 28,
                            "y1": 3,
                            "x2": 28,
                            "y2": 35,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 28,
                            "y1": 3,
                            "x1": 53,
                            "y2": 3,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 53,
                            "y2": 3,
                            "x2": 53,
                            "y1": 27,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 33.8,
                            "y1": 5.4,
                            "x2": 33.8,
                            "y2": 35,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 34,
                            "y2": 35,
                            "x2": 42,
                            "y1": 35,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 42,
                            "y1": 35,
                            "x1": 42,
                            "y2": 40,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 34.2,
                            "y2": 5.38,
                            "x1": 47.5,
                            "y1": 5.38,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 47.55,
                            "y2": 5.4,
                            "x1": 47.55,
                            "y1": 27,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x": 27.4,
                            "y": 350,
                            "type": "pipeClose"
                        },
                        {
                            "x": 24.4,
                            "y": 350,
                            "type": "pipeClose"
                        },
                        {
                            "x": 52.4,
                            "y": 270,
                            "type": "pipeClose"
                        },
                        {
                            "x": 47,
                            "y": 270,
                            "type": "pipeClose"
                        }
                    ]
                },
                {
                    "forSiteId": 7,
                    "EvaporatorDevices": {
                        "ch1": {
                            "id": 1,
                            "anomaly": false,
                            "x": 440,
                            "y": 40,
                            "from": "ch1",
                            "to": "Pump-1",
                            "name": "Chiller-1",
                            "type": "ch",
                            "x1": 44.5,
                            "x2": 40.2,
                            "y1": 5.5,
                            "y2": 5.5,
                            "x4": 53.2,
                            "x3": 61.7,
                            "y3": 22,
                            "y4": 22,
                            "pipeColor": "#7392d2"
                        },
                        "ch2": {
                            "id": 2,
                            "anomaly": true,
                            "AnomalyCountNumber": "3",
                            "x": 440,
                            "y": 152,
                            "from": "ch2",
                            "to": "Pump-2",
                            "name": "Chiller-2",
                            "type": "ch",
                            "x1": 44.5,
                            "x2": 40.2,
                            "y1": 16.5,
                            "y2": 16.5,
                            "x4": 53.6,
                            "x3": 61.7,
                            "y3": 11,
                            "y4": 11,
                            "pipeColor": "#7392d2"
                        },
                        "ch3": {
                            "id": 3,
                            "anomaly": true,
                            "AnomalyCountNumber": "2",
                            "x": 440,
                            "y": 264,
                            "from": "ch3",
                            "to": "Pump-3",
                            "name": "Chiller-3",
                            "type": "ch",
                            "x1": 44.5,
                            "x2": 40.2,
                            "y1": 27.5,
                            "y2": 27.5,
                            "x4": 53.6,
                            "x3": 61.7,
                            "y3": 33,
                            "y4": 33,
                            "pipeColor": "#7392d2"
                        },
                        "ch4": {
                            "id": 4,
                            "anomaly": false,
                            "x": 440,
                            "y": 376,
                            "from": "ch4",
                            "to": "Pump-4",
                            "name": "Chiller-4",
                            "type": "ch",
                            "x1": 44.5,
                            "x2": 40.2,
                            "y1": 39,
                            "y2": 39,
                            "x4": 53.6,
                            "x3": 61.7,
                            "y3": 44.3,
                            "y4": 44.3,
                            "pipeColor": "#7392d2"
                        }
                    },
                    "Pump": {
                        "gen1": {
                            "x": 3.3,
                            "y": 6,
                            "to": "ct1",
                            "name": "Pump-1",
                            "type": "gen",
                            "x1": 28.3,
                            "x2": 33,
                            "y1": 8,
                            "y2": 8,
                            "x4": 44.5,
                            "x3": 34.7,
                            "y3": 7,
                            "y4": 7,
                            "x6": 27.6,
                            "x5": 19,
                            "y5": 7,
                            "y6": 7,
                            "pipeColor": "#f91037"
                        },
                        "gen2": {
                            "x": 3.3,
                            "y": 17,
                            "to": "ct2",
                            "name": "Pump-2",
                            "type": "gen",
                            "x1": 28.3,
                            "x2": 33,
                            "y1": 30,
                            "y2": 30,
                            "x4": 44.5,
                            "x3": 34.7,
                            "y3": 18,
                            "y4": 18,
                            "x6": 27.6,
                            "x5": 19,
                            "y5": 18,
                            "y6": 18,
                            "pipeColor": "#f91037"
                        },
                        "gen3": {
                            "x": 3.3,
                            "y": 28,
                            "to": "ct3",
                            "name": "Pump-3",
                            "type": "gen",
                            "x1": 28.3,
                            "x2": 33,
                            "y1": 19,
                            "y2": 19,
                            "x4": 44.5,
                            "x3": 34.7,
                            "y3": 29,
                            "y4": 29,
                            "x6": 27.6,
                            "x5": 19,
                            "y5": 29,
                            "y6": 29,
                            "pipeColor": "#f91037"
                        },
                        "gen4": {
                            "x": 3.3,
                            "y": 39.5,
                            "to": "ct4",
                            "name": "Pump-4",
                            "type": "gen",
                            "x1": 28.3,
                            "x2": 33,
                            "y1": 41.6,
                            "y2": 41.6,
                            "x4": 44.5,
                            "x3": 34.7,
                            "y3": 40.5,
                            "y4": 40.5,
                            "x6": 27.6,
                            "x5": 19,
                            "y5": 41,
                            "y6": 41,
                            "pipeColor": "#f91037"
                        },
                        "gen5": {
                            "x": 7,
                            "y": 7.9,
                            "to": "ch",
                            "name": "Pump-5",
                            "type": "gen",
                            "x1": 78.6,
                            "x2": 71.7,
                            "y1": 9,
                            "y2": 9,
                            "x4": 53.6,
                            "x3": 70,
                            "y3": 9.7,
                            "y4": 9.7,
                            "pipeColor": "#f91037"
                        },
                        "gen6": {
                            "x": 7,
                            "y": 18.9,
                            "to": "ch",
                            "name": "Pump-6",
                            "type": "gen",
                            "x1": 78.6,
                            "x2": 71.7,
                            "y1": 20,
                            "y2": 20,
                            "x4": 53.6,
                            "x3": 70,
                            "y3": 20.9,
                            "y4": 20.9,
                            "pipeColor": "#f91037"
                        },
                        "gen7": {
                            "x": 7,
                            "y": 30,
                            "to": "ch",
                            "name": "Pump-7",
                            "type": "gen",
                            "x1": 78.6,
                            "x2": 71.7,
                            "y1": 31,
                            "y2": 31,
                            "x4": 53.6,
                            "x3": 70,
                            "y3": 32,
                            "y4": 32,
                            "pipeColor": "#f91037"
                        },
                        "gen8": {
                            "x": 7,
                            "y": 41.5,
                            "to": "ch",
                            "name": "Pump-8",
                            "type": "gen",
                            "x1": 78.6,
                            "x2": 71.7,
                            "y1": 43.4,
                            "y2": 43.4,
                            "x4": 53.6,
                            "x3": 70,
                            "y3": 43.3,
                            "y4": 43.3,
                            "pipeColor": "#f91037"
                        }
                    },
                    "Lines": [
                        {
                            "x1": 24,
                            "y1": 44,
                            "x2": 24,
                            "y2": 5.6,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 40,
                            "y1": 44,
                            "x2": 23.6,
                            "y2": 44,
                            "mainLineColor": "#7392d2",
                            "type": "coolAirForCondenser"
                        },
                        {
                            "x1": 40,
                            "y1": 3,
                            "x2": 40,
                            "y2": 44.4,
                            "mainLineColor": "#7392d2",
                            "type": "coolAirForCondenser"
                        },
                        {
                            "x1": 85,
                            "y1": 3,
                            "x2": 62,
                            "y2": 3,
                            "mainLineColor": "#7392d2",
                            "type": "coolAirForChiller"
                        },
                        {
                            "x1": 62,
                            "y1": 2.65,
                            "x2": 62,
                            "y2": 44.65,
                            "mainLineColor": "#7392d2",
                            "type": "coolAirForChiller"
                        },
                        {
                            "x1": 28,
                            "y1": 3,
                            "x2": 28,
                            "y2": 41.95,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x1": 79,
                            "y1": 6,
                            "x2": 79,
                            "y2": 43.7,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x2": 79.4,
                            "y1": 6.4,
                            "x1": 85,
                            "y2": 6.4,
                            "mainLineColor": "#f91037",
                            "type": "ForPump"
                        },
                        {
                            "x": 27.4,
                            "y": 26,
                            "type": "pipeClose"
                        },
                        {
                            "x": 39.4,
                            "y": 26,
                            "type": "pipeClose"
                        }
                    ],
                    "CoolingTower": {
                        "ct11": {
                            "id": 11,
                            "x": 8,
                            "y": 2.5,
                            "name": "Cooling Tower 1",
                            "type": "ct",
                            "x1": 23.8,
                            "x2": 19,
                            "y1": 5.95,
                            "y2": 5.95,
                            "pipeColor": "#7392d2"
                        },
                        "ct12": {
                            "id": 12,
                            "x": 8,
                            "y": 13.7,
                            "name": "Cooling Tower 2",
                            "type": "ct",
                            "x1": 23.8,
                            "x2": 19,
                            "y1": 17,
                            "y2": 17,
                            "pipeColor": "#7392d2"
                        },
                        "ct13": {
                            "id": 13,
                            "x": 8,
                            "y": 24.9,
                            "name": "Cooling Tower 3",
                            "type": "ct",
                            "x1": 23.8,
                            "x2": 19,
                            "y1": 28,
                            "y2": 28,
                            "pipeColor": "#7392d2"
                        },
                        "ct14": {
                            "id": 14,
                            "x": 8,
                            "y": 36.1,
                            "name": "Cooling Tower 4",
                            "type": "ct",
                            "x1": 23.8,
                            "x2": 19,
                            "y1": 40,
                            "y2": 40,
                            "pipeColor": "#7392d2"
                        }
                    }
                }
            ]
        },
        {
            "CondenserDevices": [
                {
                    "forSiteId": "cl_tao",
                    "CondenserDevices": {
                        "ch1": {
                            "id": 1,
                            "anomaly": false,
                            "x": 100,
                            "y": 25,
                            "from": "ch1",
                            "to": "Pump-1",
                            "name": "Condenser-1",
                            "type": "ch",
                            "x1": 31.7,
                            "x2": 20,
                            "y1": 4.5,
                            "y2": 4.5,
                            "pipeColor": "#f91037"
                        },
                        "ch2": {
                            "id": 2,
                            "anomaly": true,
                            "AnomalyCountNumber": "3",
                            "x": 100,
                            "y": 137,
                            "from": "ch2",
                            "to": "Pump-2",
                            "name": "Condenser-2",
                            "type": "ch",
                            "x1": 31.7,
                            "x2": 20,
                            "y1": 15.5,
                            "y2": 15.5,
                            "pipeColor": "#f91037"
                        },
                        "ch3": {
                            "id": 3,
                            "anomaly": true,
                            "AnomalyCountNumber": "2",
                            "x": 100,
                            "y": 249,
                            "from": "ch3",
                            "to": "Pump-3",
                            "name": "Condenser-3",
                            "type": "ch",
                            "x1": 31.7,
                            "x2": 20,
                            "y1": 27,
                            "y2": 27,
                            "pipeColor": "#f91037"
                        },
                        "ch4": {
                            "id": 4,
                            "anomaly": false,
                            "x": 650,
                            "y": 40,
                            "from": "ch4",
                            "to": "Pump-4",
                            "name": "Condenser-4",
                            "type": "ch",
                            "x2": 65.5,
                            "x1": 56.2,
                            "y1": 5.5,
                            "y2": 5.5,
                            "pipeColor": "#f91037"
                        },
                        "ch5": {
                            "id": 5,
                            "anomaly": false,
                            "x": 650,
                            "y": 157,
                            "from": "ch4",
                            "to": "Pump-4",
                            "name": "Condenser-5",
                            "type": "ch",
                            "x2": 65.5,
                            "x1": 56.2,
                            "y1": 17,
                            "y2": 17,
                            "pipeColor": "#f91037"
                        }
                    },
                    "Pump": {
                        "gen1": {
                            "x": 4.4,
                            "y": 7,
                            "to": "ct1",
                            "name": "Pump-1",
                            "type": "gen",
                            "rotate": 90,
                            "x2": 34.7,
                            "x1": 20,
                            "y1": 5.5,
                            "y2": 5.5,
                            "pipeColor": "#7392d2"
                        },
                        "gen2": {
                            "x": 4.4,
                            "y": 13,
                            "to": "ct2",
                            "name": "Pump-2",
                            "type": "gen",
                            "rotate": 90,
                            "x2": 34.7,
                            "x1": 20,
                            "y1": 16.5,
                            "y2": 16.5,
                            "pipeColor": "#7392d2"
                        },
                        "gen3": {
                            "x": 4.4,
                            "y": 19,
                            "to": "ct3",
                            "name": "Pump-3",
                            "type": "gen",
                            "rotate": 90,
                            "x2": 34.7,
                            "x1": 20,
                            "y1": 28,
                            "y2": 28,
                            "pipeColor": "#7392d2"
                        },
                        "gen4": {
                            "x": 4.4,
                            "y": 25,
                            "to": "ct4",
                            "name": "Pump-4",
                            "type": "gen",
                            "rotate": 90,
                            "x1": 65.5,
                            "x2": 53.2,
                            "y1": 7,
                            "y2": 7,
                            "pipeColor": "#7392d2"
                        },
                        "gen5": {
                            "x": 4.4,
                            "y": 31,
                            "to": "ch",
                            "name": "Pump-5",
                            "type": "gen",
                            "rotate": 90,
                            "x1": 65.5,
                            "x2": 53.2,
                            "y1": 18.5,
                            "y2": 18.5,
                            "pipeColor": "#7392d2"
                        }
                    },
                    "Lines": [
                        {
                            "x1": 42,
                            "y2": 5.5,
                            "x2": 42,
                            "y1": 6.8,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 43,
                            "y2": 8.5,
                            "x2": 43,
                            "y1": 10.2,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "y2": 11.5,
                            "x2": 42,
                            "y1": 13,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 43,
                            "y2": 14,
                            "x2": 43,
                            "y1": 16,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "y2": 17.5,
                            "x2": 42,
                            "y1": 19,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 43,
                            "y2": 20,
                            "x2": 43,
                            "y1": 22,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "y2": 23.5,
                            "x2": 42,
                            "y1": 25,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 43,
                            "y2": 26,
                            "x2": 43,
                            "y1": 28,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "y2": 29.5,
                            "x2": 42,
                            "y1": 31,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 43,
                            "y2": 32,
                            "x2": 43,
                            "y1": 34,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "x2": 50,
                            "y1": 5.2,
                            "y2": 5.2,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "x2": 50,
                            "y1": 11.5,
                            "y2": 11.5,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "x2": 50,
                            "y1": 17.5,
                            "y2": 17.5,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "x2": 50,
                            "y1": 23.5,
                            "y2": 23.5,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 42,
                            "x2": 50,
                            "y1": 29.5,
                            "y2": 29.5,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 35,
                            "x2": 43,
                            "y1": 10.3,
                            "y2": 10.3,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 35,
                            "x2": 43,
                            "y1": 16.2,
                            "y2": 16.2,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 35,
                            "x2": 43,
                            "y1": 28,
                            "y2": 28,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 35,
                            "x2": 43,
                            "y1": 22,
                            "y2": 22,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 35,
                            "x2": 43,
                            "y1": 34.2,
                            "y2": 34.2,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 35,
                            "x2": 35,
                            "y1": 4,
                            "y2": 34.2,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x2": 35,
                            "x1": 53,
                            "y1": 4,
                            "y2": 4,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 50,
                            "x2": 50,
                            "y1": 5.3,
                            "y2": 38,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 53,
                            "x2": 53,
                            "y2": 4.1,
                            "y1": 22,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x2": 47,
                            "x1": 50,
                            "y1": 38,
                            "y2": 38,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x2": 47,
                            "x1": 47,
                            "y1": 38,
                            "y2": 44,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x2": 15,
                            "x1": 47,
                            "y1": 44.2,
                            "y2": 44.2,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 47.2,
                            "x2": 82,
                            "y1": 44.2,
                            "y2": 44.2,
                            "type": "coolAirForCondenser",
                            "mainLineColor": "#7392d2"
                        },
                        {
                            "x1": 32,
                            "x2": 32,
                            "y1": 2,
                            "y2": 36,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x2": 32,
                            "x1": 56,
                            "y1": 2,
                            "y2": 2,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 56,
                            "x2": 56,
                            "y2": 2,
                            "y1": 40,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 50,
                            "x2": 56,
                            "y2": 40,
                            "y1": 40,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 50,
                            "x2": 50,
                            "y2": 40,
                            "y1": 46,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 12,
                            "x2": 50,
                            "y2": 46.1,
                            "y1": 46.1,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 85,
                            "x2": 50,
                            "y2": 46.1,
                            "y1": 46.1,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 12,
                            "x2": 12,
                            "y2": 46.4,
                            "y1": 55,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 30,
                            "x2": 30,
                            "y2": 46.6,
                            "y1": 55,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 46,
                            "x2": 46,
                            "y2": 46.6,
                            "y1": 55,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 67,
                            "x2": 67,
                            "y2": 46.6,
                            "y1": 55,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x1": 85,
                            "x2": 85,
                            "y2": 46.4,
                            "y1": 55,
                            "mainLineColor": "#f91037",
                            "type": "FromCondenser"
                        },
                        {
                            "x": 52.4,
                            "y": 220,
                            "type": "pipeClose"
                        },
                        {
                            "x": 31.4,
                            "y": 360,
                            "type": "pipeClose"
                        }
                    ],
                    "CoolingTower": {
                        "ct11": {
                            "id": 11,
                            "x": 6,
                            "y": 50,
                            "name": "Cooling Tower 1",
                            "type": "ct",
                            "x1": 15,
                            "x2": 15,
                            "y1": 44,
                            "y2": 53,
                            "pipeColor": "#7392d2"
                        },
                        "ct12": {
                            "id": 12,
                            "x": 24,
                            "y": 50,
                            "name": "Cooling Tower 2",
                            "type": "ct",
                            "x1": 32,
                            "x2": 32,
                            "y1": 44,
                            "y2": 53,
                            "pipeColor": "#7392d2"
                        },
                        "ct13": {
                            "id": 13,
                            "x": 42,
                            "y": 50,
                            "name": "Cooling Tower 3",
                            "type": "ct",
                            "x1": 48,
                            "x2": 48,
                            "y1": 44,
                            "y2": 53,
                            "pipeColor": "#7392d2"
                        },
                        "ct14": {
                            "id": 14,
                            "x": 60,
                            "y": 50,
                            "name": "Cooling Tower 4",
                            "type": "ct",
                            "x1": 65,
                            "x2": 65,
                            "y1": 44,
                            "y2": 53,
                            "pipeColor": "#7392d2"
                        },
                        "ct15": {
                            "id": 14,
                            "x": 78,
                            "y": 50,
                            "name": "Cooling Tower 5",
                            "type": "ct",
                            "x1": 82,
                            "x2": 82,
                            "y1": 44,
                            "y2": 53,
                            "pipeColor": "#7392d2"
                        }
                    }
                }
            ]
        }
    ]
}