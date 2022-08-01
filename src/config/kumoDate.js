const dateFns = require('date-fns')
const dateFnsZone = require('date-fns-tz')

var tzOffset = require("tz-offset")

module.exports.offsetZone = (timeZone) => {
    const minutes = tzOffset.offsetOf(timeZone);
    let h = Math.abs(minutes / 60)
    let m = minutes%60

    if(h===0) h = `00`
    else if(h<10) h = `0${h}`

    if (m === 0) m = `00`
    else if (m < 10) m = `0${m}` 

    return `+${h}:${m}`
}

module.exports.Date = (timeZone) => {
    // return dateFnsZone.utcToZonedTime(new Date(), timeZone || 'Asia/Singapore')
    return dateFnsZone.utcToZonedTime(new Date(), timeZone || this.utcZone)
}

module.exports.UtcDate = (dateString) => {
    return dateFnsZone.utcToZonedTime(dateString ? dateFnsZone.zonedTimeToUtc(Date.parse(dateString), this.timeZone) : new Date(), "America/Danmarkshavn")
}

module.exports.GmtDate = (dateString, dateObj=false) => {
    return dateFnsZone.utcToZonedTime(
        dateString 
        ? dateObj 
            ? dateFnsZone.zonedTimeToUtc(dateString,  "America/Danmarkshavn")
            : dateFnsZone.zonedTimeToUtc(Date.parse(dateString), "America/Danmarkshavn") : new Date(), this.timeZone)
}

module.exports.UtcToGmt = (dateString) => {
    return dateFnsZone.utcToZonedTime(
        dateFnsZone.zonedTimeToUtc(dateString, this.timeZone),
        this.utcZone
    )
}

module.exports.GmtToUtc = (dateString) => {
    return dateFnsZone.utcToZonedTime(
        dateFnsZone.zonedTimeToUtc(dateString, this.utcZone),
        this.timeZone
    )
}

module.exports.timeZone = "Asia/Singapore"

module.exports.utcZone = "America/Danmarkshavn"

module.exports.dateFormat = "yyyy-MM-dd HH:mm:ss"

module.exports.dateFormatNoSec = "yyyy-MM-dd HH:mm"