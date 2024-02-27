const mongoose = require('mongoose')

const password_resetSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    token:{
        type:String,
        required:true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
})

const Reset = mongoose.model('RESET',password_resetSchema);
module.exports = Reset;