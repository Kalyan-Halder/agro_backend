const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    nid:{
        type:String,
        require:true
    },
    phone:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    location:{
        type:String,
        required:true
    },
    role:{
        type:String,
        required:true
    },
    is_verified: {
        type: Boolean,
        default: false 
    }
})

const User = mongoose.model('USER',userSchema);
module.exports = User;