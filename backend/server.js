const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { v2: cloudinary } = require('cloudinary');

const app = express();
const PORT = 5000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dvuardntf',
  api_key: '981417274371449',
  api_secret: 'GcARlGtsUFA6nQhJL-HJPIy9ag0'
});

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'studygroup.db'));

// Drop the existing files table if it exists and recreate it with the correct schema
db.exec(`
  DROP TABLE IF EXISTS files
`);

// Create tables with the correct schema
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    originalname TEXT NOT NULL,
    mimetype TEXT,
    groupId TEXT,
    uploadedBy TEXT,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    cloudinaryUrl TEXT,
    cloudinaryPublicId TEXT
  )
`);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cloudinary upload endpoint
app.post('/api/cloudinary/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: req.body.folder || 'study-group-uploads',
      resource_type: 'auto'
    });

    // Delete the temporary file
    fs.unlinkSync(req.file.path);

    // Store file metadata in database
    const stmt = db.prepare(`
      INSERT INTO files (filename, originalname, mimetype, groupId, uploadedBy, cloudinaryUrl, cloudinaryPublicId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const dbResult = stmt.run(
      path.basename(req.file.path),
      req.file.originalname,
      req.file.mimetype,
      req.body.groupId || null,
      req.body.uploadedBy || null,
      result.secure_url,
      result.public_id
    );

    res.json({
      id: dbResult.lastInsertRowid,
      originalname: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      ...result
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Try to delete the temporary file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to upload file to Cloudinary',
      details: error.message
    });
  }
});

// Get files for a group
app.get('/api/files/:groupId', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM files WHERE groupId = ?');
    const files = stmt.all(req.params.groupId);
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Delete file (both from Cloudinary and local database)
app.delete('/api/files/:fileId', async (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from Cloudinary if publicId exists
    if (file.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId);
    }

    // Delete from local database
    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.fileId);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Add a status endpoint for health checks
app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'online', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Cloudinary configuration: ${cloudinary.config().cloud_name}`);
});
