const express = require('express')
const User = require('../Modals/userSchema');
const Chat = require('../Modals/chatSchema');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const secret = process.env.SECRET;
const upload = require('../Middleware/upload.js');
router = express.Router();

router.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check for existing user by username or email (case-insensitive)
    const existingUser = await User.findOne({
      $or: [
        { email: new RegExp(`^${email}$`, 'i') },
        { username: new RegExp(`^${username}$`, 'i') }
      ]
    });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    // Hash password with salt rounds from env or default to 10
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    // Optionally, generate a JWT token on registration
    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: user._id,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/users/login', async (req, res) => {
  try {
    const {email, password } = req.body;

    // Allow login with either username or email
    const query = email ? { email } : { username };
    const existingUser = await User.findOne(query);

    if (!existingUser) {
      return res.status(401).json({ message: "Invalid username/email or password" });
    }

    // bcrypt.compare returns a promise, so await is correct here
    const isVerify = await bcrypt.compare(password, existingUser.password);

    if (isVerify) {
      // Generate JWT token for authentication
      const token = jwt.sign(
        { userId: existingUser._id, username: existingUser.username, email: existingUser.email },
        secret,
        { expiresIn: '7d' }
      );
      res.status(200).json({ message: 'User logged in successfully', userId: existingUser._id, username: existingUser.username, token });
    } else {
      res.status(401).json({ message: "Invalid username/email or password" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user info
router.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint with file upload
// Multer setup for file uploads


// Chat endpoint with file upload
router.post('/api/chat', upload, async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'UserId and message are required' });
    }

    let uploadedFiles = [];
    let filePaths = [];

    // Handle file uploads to S3
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await uploadToS3(file, userId);
          uploadedFiles.push({
            filename: uploadResult.filename,
            s3Key: uploadResult.key,
            s3Url: uploadResult.url,
            contentType: uploadResult.contentType,
            uploadDate: new Date()
          });
          
          // For Python script, we'll pass the S3 URLs
          filePaths.push(uploadResult.url);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
        }
      }
    }

    // Prepare data for Python script
    const inputData = {
      message: message,
      userId: userId,
      hasFiles: filePaths.length > 0
    };

    // Execute Python script
    const pythonResult = await executePythonScript(inputData, filePaths);
    const response = pythonResult.response || 'No response from model';

    // Save chat to database
    const chat = new Chat({
      userId,
      message,
      response,
      files: uploadedFiles
    });

    await chat.save();

    res.json({
      chatId: chat._id,
      message,
      response,
      files: uploadedFiles,
      timestamp: chat.timestamp
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat history
router.get('/api/chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const chats = await Chat.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalChats = await Chat.countDocuments({ userId });
    
    res.json({
      chats,
      totalPages: Math.ceil(totalChats / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete chat
router.delete('/api/chats/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Delete associated files from S3
    for (const file of chat.files) {
      try {
        await s3.deleteObject({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: file.s3Key
        }).promise();
      } catch (s3Error) {
        console.error('S3 deletion error:', s3Error);
      }
    }

    await Chat.findByIdAndDelete(req.params.chatId);
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download file from S3
router.get('/api/files/:userId/:filename', async (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    // Find the chat with this file
    const chat = await Chat.findOne({
      userId,
      'files.filename': filename
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = chat.files.find(f => f.filename === filename);
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3Key
    };
    
    const signedUrl = s3.getSignedUrl('getObject', {
      ...params,
      Expires: 3600 // 1 hour
    });
    
    res.json({ downloadUrl: signedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router