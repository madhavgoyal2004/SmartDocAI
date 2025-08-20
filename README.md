# SmartDocAI 🚀

An intelligent document processing and chat application that leverages AI to analyze, process, and interact with documents. Built with React.js frontend and Node.js backend with MongoDB for data persistence and AWS S3 for file storage.

## ✨ Features

- 📄 **Document Upload & Processing**: Upload various document formats and process them intelligently
- 💬 **AI-Powered Chat**: Interactive chat interface with AI responses based on document content
- ☁️ **Cloud Storage**: Secure file storage using AWS S3
- 🔒 **User Management**: User-specific chat sessions and document management
- 📱 **Responsive Design**: Modern React-based frontend with Vite for fast development
- 🔄 **Real-time Updates**: Live chat functionality with persistent message history

## 🏗️ Architecture

```
SmartDocAI/
├── client/          # React.js Frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── assets/
│   ├── package.json
│   └── vite.config.js
├── server/          # Node.js Backend
│   ├── server.js
│   ├── Modals/
│   │   └── chatSchema.js
│   ├── Routes/
│   └── package.json
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** - Modern React with latest features
- **Vite 7.1.0** - Fast build tool and dev server
- **ESLint** - Code linting and formatting

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - Database for storing chat history and user data
- **Mongoose** - MongoDB object modeling
- **AWS S3** - Cloud file storage
- **Multer** - File upload middleware

### DevOps & Tools
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- AWS Account (for S3 storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartDocAI
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install express mongoose cors multer aws-sdk dotenv
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Setup**
   Create a `.env` file in the server directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/smartdocai
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   PORT=5000
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm start
   ```

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

## 📡 API Endpoints

### Chat Management
- `POST /api/chat` - Send message and get AI response
- `GET /api/chat/:userId` - Retrieve user's chat history

### File Management
- `POST /api/upload` - Upload documents to S3
- `GET /api/files/:userId` - Get user's uploaded files

## 🗄️ Database Schema

### Chat Collection
```javascript
{
  userId: String,           // User identifier
  message: String,          // User message
  response: String,         // AI response
  files: [{                // Associated files
    filename: String,
    s3Key: String,
    s3Url: String,
    contentType: String,
    uploadDate: Date
  }],
  timestamp: Date           // Message timestamp
}
```

## 🔧 Development

### Frontend Development
```bash
cd client
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Backend Development
```bash
cd server
npm start        # Start server
npm test         # Run tests (configure as needed)
```

## 📁 File Upload Configuration

- **Maximum file size**: 10MB
- **Supported formats**: PDF, DOC, DOCX, TXT, and more
- **Storage**: AWS S3 with secure access
- **Processing**: Documents are processed for AI analysis

## 🛡️ Security Features

- CORS configuration for secure cross-origin requests
- File size limits to prevent abuse
- Environment variable protection for sensitive data
- MongoDB connection with authentication support

## 🚀 Deployment

### Frontend (Netlify/Vercel)
```bash
cd client
npm run build
# Deploy the dist/ folder
```

### Backend (Heroku/AWS/Digital Ocean)
```bash
cd server
# Set environment variables in your hosting platform
# Deploy server.js as the entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Environment Variables

### Required Server Environment Variables
```env
MONGODB_URI=your_mongodb_connection_string
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_preferred_aws_region
PORT=5000
```

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection Error**: Ensure MongoDB is running and URI is correct
2. **AWS S3 Upload Fails**: Check AWS credentials and permissions
3. **CORS Issues**: Verify CORS configuration in server.js
4. **File Upload Errors**: Check file size limits and supported formats

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Built with ❤️ for intelligent document processing

## 🔮 Roadmap

- [ ] Advanced AI document analysis
- [ ] Multi-language support
- [ ] Real-time collaboration features
- [ ] Enhanced security features
- [ ] Mobile app development
- [ ] Integration with more cloud providers

---

For more information, issues, or feature requests, please visit our [GitHub repository](https://github.com/your-username/SmartDocAI).
