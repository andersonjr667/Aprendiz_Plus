const multer = require('multer');
const path = require('path');

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowedDocs = ['.pdf', '.docx', '.doc'];
  const allowedImages = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === 'profilePhoto' || file.fieldname === 'jobImage') {
    // For profile photos and job images, only allow images
    if (allowedImages.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (JPG, PNG, GIF, WEBP)'));
    }
  } else if (file.fieldname === 'resume') {
    // For resume, only allow documents
    if (allowedDocs.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas documentos são permitidos para currículo (PDF, DOC, DOCX)'));
    }
  } else {
    // Default: allow both images and documents
    if (allowedDocs.includes(ext) || allowedImages.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
}

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

module.exports = upload;
