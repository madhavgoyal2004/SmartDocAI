const multer = require('multer');
const storage = multer.memoryStorage();
const size = 10*1024*1024;
const upload = multer({ storage, size});

module.exports = upload.array('files', 5);