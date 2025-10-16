const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    cpf: {
        type: String,
        required: true,
        unique: true
    },
    birthdate: {
        type: Date,
        required: true
    },
    profileImage: {
        type: String
    },
    // Campos específicos para candidatos
    candidateProfile: {
        education: [{
            institution: String,
            course: String,
            degree: String,
            startDate: Date,
            endDate: Date,
            current: Boolean
        }],
        experience: [{
            company: String,
            position: String,
            description: String,
            startDate: Date,
            endDate: Date,
            current: Boolean
        }],
        skills: [String],
        interests: [String],
        resumeUrl: String,
        phone: String,
        address: {
            street: String,
            number: String,
            complement: String,
            neighborhood: String,
            city: String,
            state: String,
            zipCode: String
        }
    },
    // Campos específicos para empresas
    companyProfile: {
        cnpj: {
            type: String,
            unique: true,
            sparse: true
        },
        description: String,
        website: String,
        phone: String,
        address: {
            street: String,
            number: String,
            complement: String,
            neighborhood: String,
            city: String,
            state: String,
            zipCode: String
        },
        industry: String,
        size: String,
        linkedin: String
    },
    type: {
        type: String,
        enum: ['candidato', 'empresa', 'admin'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash da senha antes de salvar
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);