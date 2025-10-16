const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: {
        type: [String],
        required: true
    },
    benefits: {
        type: [String],
        default: []
    },
    salary: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['aprendiz', 'estagio'],
        required: true
    },
    category: {
        type: String,
        required: true
    },
    skills: {
        type: [String],
        required: true
    },
    status: {
        type: String,
        enum: ['aberta', 'fechada', 'pausada'],
        default: 'aberta'
    },
    applications: [{
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pendente', 'aprovado', 'rejeitado'],
            default: 'pendente'
        },
        resumeUrl: String,
        appliedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

// Índices para melhorar a performance das buscas
jobSchema.index({ title: 'text', description: 'text', skills: 'text' });
jobSchema.index({ status: 1, expiresAt: 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ type: 1 });

module.exports = mongoose.model('Job', jobSchema);