const dotenv = require("dotenv")
const express = require('express')
const app = express();

require('./db/conn.js')
require('./model/userSchema.js')
app.use(express.json())
app.use(require('./router/auth'))


dotenv.config({path:'./config.env'})
PORT = process.env.PORT;

const middleware = (req,res,next) =>{
    console.log(`Hello from middleware`);
    next();
}


app.listen(PORT,()=>{
    console.log(`Listening to port number ${PORT}`)
})