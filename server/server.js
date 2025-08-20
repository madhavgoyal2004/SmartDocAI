require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const AWS = require('aws-sdk');
const { spawn } = require('child_process');
const path = require('path');
const userRoute = require('./Routes/userRoute');
const dbconnect = require('./Database/database');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
dbconnect();

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Upload file to S3
const uploadToS3 = async (file, userId) => {
  const key = `uploads/${userId}/${Date.now()}-${file.originalname}`;
  
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private'
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      key: key,
      url: result.Location,
      filename: file.originalname,
      contentType: file.mimetype
    };
  } catch (error) {
    throw new Error(`S3 Upload Error: ${error.message}`);
  }
};

// Execute Python script
const executePythonScript = (inputData, filePaths = []) => {
  return new Promise((resolve, reject) => {
    const args = [JSON.stringify(inputData)];
    if (filePaths.length > 0) {
      args.push(JSON.stringify(filePaths));
    }

    const pythonProcess = spawn('python', ['script.py', ...args]);
    
    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          resolve({ response: output.trim() });
        }
      } else {
        reject(new Error(`Python script error: ${error}`));
      }
    });

    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python script timeout'));
    }, 30000); // 30 second timeout
  });
};

app.use('/', userRoute);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});