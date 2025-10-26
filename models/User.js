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
        required: true,
        select: false // Não incluir por padrão nas queries
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
        education: {
            degree: {
                type: String,
                enum: [
                    'Ensino Fundamental - Cursando',
                    'Ensino Fundamental - Completo',
                    'Ensino Médio - 1º Ano',
                    'Ensino Médio - 2º Ano',
                    'Ensino Médio - 3º Ano',
                    'Ensino Médio - Completo',
                    'Ensino Técnico - Cursando',
                    'Ensino Técnico - Completo'
                ],
                required: true
            },
            currentCourse: {
                hasCourse: {
                    type: Boolean,
                    default: false
                },
                institution: String,
                courseName: String,
                status: {
                    type: String,
                    enum: ['Em Andamento', 'Concluído', 'Trancado']
                },
                expectedEndYear: Number
            }
        },
        experience: [{
            company: String,
            position: String,
            description: String,
            startDate: Date,
            endDate: Date,
            current: Boolean
        }],
        skills: [String],
        areaInteresse: {
            type: String,
            enum: [
                'Administração',
                'Logística',
                'Vendas',
                'Tecnologia',
                'Produção',
                'Finanças',
                'Recursos Humanos',
                'Marketing',
                'Atendimento',
                'Outros'
            ]
        },
        disponibilidade: {
            type: String,
            enum: [
                'Integral',
                'Meio Período - Manhã',
                'Meio Período - Tarde',
                'Noturno',
                'Flexível'
            ]
        },
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
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'pending'
    },
    permissions: [{
        type: String,
        enum: [
            'manage_users',
            'manage_jobs',
            'manage_companies',
            'manage_news',
            'view_logs',
            'manage_settings'
        ]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash da senha antes de salvar
userSchema.pre('save', async function(next) {
    try {
        console.log('[DEBUG] pre-save middleware - campos do documento:', Object.keys(this._doc));
        console.log('[DEBUG] pre-save middleware - tem senha?', !!this.password);
        console.log('[DEBUG] pre-save middleware - senha foi modificada?', this.isModified('password'));
        
        if (!this.isModified('password')) {
            console.log('[DEBUG] Senha não modificada, pulando hash');
            return next();
        }
        console.log('[DEBUG] Gerando hash para nova senha');
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('[DEBUG] Hash gerado com sucesso');
        console.log('[DEBUG] Nova senha hasheada:', this.password.substring(0, 10) + '...');
        next();
    } catch (error) {
        console.error('[ERROR] Erro ao gerar hash da senha:', error);
        next(error);
    }
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        console.log('[DEBUG] Model.comparePassword - Iniciando comparação de senha');
        console.log('[DEBUG] Model.comparePassword - Tem senha definida?', !!this.password);
        console.log('[DEBUG] Model.comparePassword - Senha hasheada atual:', this.password ? (this.password.substring(0, 10) + '...') : 'nenhuma');
        
        if (!this.password) {
            console.log('[DEBUG] Model.comparePassword - Usuário não tem senha definida');
            return false;
        }
        
        console.log('[DEBUG] Model.comparePassword - Comparando senhas...');
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        console.log('[DEBUG] Model.comparePassword - Resultado da comparação:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('[ERROR] Erro ao comparar senhas no modelo:', error);
        return false;
    }
};

module.exports = mongoose.model('User', userSchema);