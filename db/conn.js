const mongoose = require('mongoose')
//DB connection
const user = "kalyankantihalder02";
const password = "BlackList";
const databaase_name = "agro";


const DB = `mongodb+srv://${user}:${password}@cluster0.ipvdpei.mongodb.net/${databaase_name}?retryWrites=true&w=majority`;
mongoose.connect(DB).then(()=>{
    console.log("Connection successful")
}).catch((err)=>console.log(err))
