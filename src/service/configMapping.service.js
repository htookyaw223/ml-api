const iotMgmtdb = require('../db/iotmgmt.db')
const ibpemdb = require('../db/aimgmt.db')


const deviceData = [
    { deviceType: 'CH', deviceTypeName: 'Chiller' },
    { deviceType: 'CT', deviceTypeName: 'CoolingTower' },
    { deviceType: 'CWP', deviceTypeName: 'ChilledWaterPump' },
    { deviceType: 'CHWP', deviceTypeName: 'ChilledWaterPump' },
]


module.exports.tDeviceMapping = () => {
    return iotMgmtdb.getTDevice().then(data => {
        // const saveDeviceData = saveDevice(deviceData)
        const saveDeviceMappingData = saveDeviceMapping(data[0])
        Promise.all([saveDeviceMappingData]).then(data => {
            return data
        }).catch(error => {
            throw error
        })
    })
}

const saveDevice = (data) => {
    return data.map(d => {
        return ibpemdb.saveDevice(d.deviceType, d.deviceTypeName)
    })
}

const getDeviceIdBydeviceType = (deviceTypeName) => {
    return ibpemdb.getDeviceIdBydeviceType(deviceTypeName).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

module.exports.getDeviceMappingByDeviceIdAndDataType = (deviceId, dataType) => {
    return ibpemdb.getDeviceMappingByDeviceIdAndDataType(deviceId, dataType).then(data => {
        return data[0]
    }).catch(error => {
        throw error
    })
}

const saveDeviceMapping = (data) => {
    return ibpemdb.deleteDeviceMapping().then(data1=>{
        //console.log(data1[0])
        let dataType = ' '
        return data.map(async d => {
            const devName = d.deviceDesc.split('-')
            const devId = devName[1].includes(':') ? devName[1].split(':') : devName[1].split(' ')
            const deviceTypeNameMap = devName[0].concat(devId[0])
            const deviceName = deviceTypeNameMap.trim()
            const deviceTypeName = (deviceName === "CH1") ? 'Chiller1' : (deviceName === "CH2") ? 'Chiller2'
                : (deviceName === "CH3") ? 'Chiller3' : (deviceName === "CH4") ? 'Chiller4'
                    : (deviceName === "CH5") ? 'Chiller5' : (deviceName === "CHWP1") ? 'ChilledWaterPump1'
                        : (deviceName === "CHWP2") ? 'ChilledWaterPump2' : (deviceName === "CHWP3") ? 'ChilledWaterPump3'
                            : (deviceName === "CHWP4") ? 'ChilledWaterPump4' : (deviceName === "CHWP5") ? 'ChilledWaterPump5'
                                : (deviceName === "CWP1") ? 'ChillerWaterPump1'
                                    : (deviceName === "CWP2") ? 'ChillerWaterPump2' : (deviceName === "CWP3") ? 'ChillerWaterPump3'
                                        : (deviceName === "CWP4") ? 'ChillerWaterPump4' : (deviceName === "CWP5") ? 'ChillerWaterPump5'
                                            : (deviceName === "CT1") ? 'CoolingTower1' : (deviceName === "CT2") ? 'CoolingTower2'
                                                : (deviceName === "CT3") ? 'CoolingTower3' : (deviceName === "CT4") ? 'CoolingTower4'
                                                    : (deviceName === "CT5") ? 'CoolingTower5' : null
    
            const deviceId = await getDeviceIdBydeviceType(deviceTypeName)
            const tableName = (d.deviceTypeId === 3) ? 'pm' : (d.deviceTypeId === 5) ? 'ultrasonicFlow2'
                : (d.deviceTypeId === 72 || d.deviceTypeId === 73) ? 'deviceStatus'
                    : (d.deviceTypeId === 74) ? 'dTemperature' : null
            const columnName = (tableName === 'pm') ? 'ch1Watt' : (tableName === 'ultrasonicFlow2') ? 'flowRate'
                : (tableName === 'deviceStatus') ? 'device_status' : (tableName === 'dTemperature') ? 'temp1' : null
            const dataTypeSplit = d.deviceDesc.includes(':') ? d.deviceDesc.substring(d.deviceDesc.indexOf(':') + 1) : d.deviceDesc.substring(d.deviceDesc.indexOf(' ') + 1)
            const devData = dataTypeSplit.trim()
    
            if (devData.startsWith("FAN")) {
                const index1 = devData.substring(devData.indexOf(' ') + 1)
                const index2 = (index1.substring(index1.indexOf(' ') + 1))
                dataType = index2.toLowerCase().replace( /\s+/g, "_")
            }
            else {
                dataType = devData.toLowerCase().replace( /\s+/g, "_")
            }
            const unit=columnName.includes('Watt')? 'kW': columnName.includes('temp')?'C':''
            return ibpemdb.saveDeviceMapping(unit,d.ieee, d.deviceDesc, deviceId[0].id, tableName, columnName, dataType, d.deviceTypeId, devName[0]).catch(error=>{
                throw error
            })
        })
     
    }).catch(error=>{
        throw error
    })
    
}

