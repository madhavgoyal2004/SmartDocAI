const mongoose = require('mongoose')
const mongodb = require('mongodb');

function dbconnect (){
    try {
        mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-chat', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        })
        console.log("mogodb connected Successfully")
        
    } catch (error) {
        console.log("Database Not connected");
    }
}

module.exports = dbconnect;
