const labelService = require('../service/label.service')
const response = require('../config/response')

module.exports.getAllLabels = (req, res) => {
    return labelService.getAllLabels().then(data => {
        if(data.length === 0){
          res.json(response({
              payload:[]
          }))
        }
        else{
            res.json(response({
                payload: data
            }))
        }
    }).catch(error => {
        res.json(response({
            success: false,
            error: error.toString()
        }))
    })
}

module.exports.saveLabel = (req, res) => {
    const faultType = req.body.faultType
    const severity = req.body.severity
    const sensorSignal = req.body.sensorSignal

    console.log("Enter saveLabel")

    if (faultType && severity && sensorSignal ) {
         res.json(response({
            success: false,
            error: "Please enter faultType,severity and sensorSignal"
        }))
    }
   else {
        return labelService.saveLabel(faultType, severity, sensorSignal).then(data=> {
            res.json(response({
             //   payload:data
            }))
        }).catch(error => {
             res.json(response({
                success: false,
                error: error.toString()
            }))
        })
    }


}

module.exports.deleteLabelByName = (req, res) => {

    const faultType = req.query.faultType
    const severity = req.query.severity
    const sensorSignal = req.query.sensorSignal
    
    return labelService.deleteLabelByName(faultType, severity, sensorSignal).then(data => {
          if(data==="Error"){
            res.json(response({
                success:false,
                error:data
            }))
          }
          else {
            res.json(response({
               //payload:null
            })) 
          }
           
        }).catch(error => {
             res.json(response({
                success: false,
                error: error.toString()
            }))
        })

}