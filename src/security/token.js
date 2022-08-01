const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require("path")

const privateKey = fs.readFileSync(path.resolve(__dirname, 'private.key'))
const publicKey = fs.readFileSync(path.resolve(__dirname, 'public.pem'))


const produceToken = (payload) => {
    return jwt.sign(payload, privateKey, { algorithm: 'RS256'});
}

const verifyToken = (token, callback) => {
    jwt.verify(token, publicKey, (err, res) => {
        if (err) callback(err, null)
        else callback(null, res)
    })
}
module.exports = {produceToken,verifyToken};

