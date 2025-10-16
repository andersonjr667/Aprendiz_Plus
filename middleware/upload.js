const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar o armazenamento de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'uploads/';
        
        // Definir subpastas baseado no tipo de upload
        if (file.fieldname === 'profile') {
            uploadPath += 'profiles/';
        } else if (file.fieldname === 'news') {
            uploadPath += 'news/';
        } else if (file.fieldname === 'resume') {
            uploadPath += 'resumes/';
        }

        // Criar diretório se não existir
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Gerar nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtrar tipos de arquivos permitidos
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'resume') {
        // Permitir apenas PDF e DOC/DOCX para currículos
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, true);
        } else {
            cb(new Error('Formato de arquivo não suportado. Use PDF ou DOC/DOCX.'), false);
        }
    } else {
        // Permitir apenas imagens para outros uploads
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas.'), false);
        }
    }
};

// Configurar limites
const limits = {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
};

// Criar middleware do Multer
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: limits
});

module.exports = upload;