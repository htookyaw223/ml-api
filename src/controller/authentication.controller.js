const authService = require('../service/authentication.service')
const response = require('../config/response')

const signup = (req, res) => {
    const username = req.body.username
    const email = req.body.email
    const password = req.body.password
    const mobileNo = req.body.mobileNo
    let role = req.body.role
    role = (role == 1) ? "ADMIN" : "USER"
    if (!(username && email && password && mobileNo && role)) {
        return res.json(response({
            success: false,
            error: "Please provide inputs completely"
        }))
    }
    authService.signup(username, email, password, mobileNo, role).then(data => {
        if (data[0].affectedRows === 1) {
            const id = data[0].insertId
            return res.json(response({
                success: true,
                payload: { id, username, email, role,mobileNo }
            }))
        }


    }).catch(error => {
        const err1 = error.code === 'ER_DUP_ENTRY' ? 'Email already exists' : error.toString()
        return res.json(response({
            success: false,
            error: err1
        }))
    })
}

const login = (req, res) => {
    const email = req.body.email
    const password = req.body.password
    if (!(email && password)) {
        return res.json(response({
            success: false,
            error: 'Please provide email and password'
        }))
    }
    return authService.login(email, password, (error, data) => {
        if (error) {
            return res.json(response({
                success: false,
                error: error.toString()
            }))
        }
        else {
            return res.json(response({
                payload: data
            }))
        }
    })
}



module.exports = {
    signup, login

}