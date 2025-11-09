const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  imageUrl: String,
  imageCloudinaryId: String, // ID do Cloudinary para a imagem
  category: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('News', NewsSchema);
