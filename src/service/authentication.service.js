const aimgmtdb=require('../db/aimgmt.db')

const signup=(username,email,password,mobileNo,role)=>{
    return aimgmtdb.signup(username,email,password,mobileNo,role)
}

const login = (email,password,callback) => {
    return aimgmtdb.login(email, password,(error,data)=>{
        if(error) callback(error,null)
        else callback(null,data)
    })
        
}

module.exports={
    signup,login
    
}