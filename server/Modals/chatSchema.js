const mongoose = require('mongoose') 

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  files: [{
    filename: String,
    s3Key: String,
    s3Url: String,
    contentType: String,
    uploadDate: Date
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;