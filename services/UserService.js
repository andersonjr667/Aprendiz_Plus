const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

class UserService {
    static async findByEmail(email) {
        try {
            if (!email) {
                console.log('⚠️ [DB] Email não fornecido');
                return null;
            }
            
            email = email.toLowerCase();
            console.log('🔍 [DB] Buscando usuário:', email);

            const user = await User.findOne({ email })
                .select('+password') // Garantir que o campo password seja incluído
                .exec();
            
            if (!user) {
                console.log('❌ [DB] Usuário não encontrado:', email);
                return null;
            }
            
            console.log('✅ [DB] Usuário encontrado:', email);
            console.log('📦 [DB] Dados do usuário:', {
                id: user._id,
                email: user.email,
                type: user.type,
                hasPassword: !!user.password
            });
            return user;
        } catch (error) {
            console.error('[ERROR] Erro ao buscar usuário:', error);
            throw error;
        }
    }

    static async findByCPF(cpf) {
        try {
            if (!cpf) return null;
            return await User.findOne({ cpf }).exec();
        } catch (error) {
            console.error('Erro ao buscar usuário por CPF:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            if (!id) return null;
            if (!mongoose.Types.ObjectId.isValid(id)) return null;
            return await User.findById(id).exec();
        } catch (error) {
            console.error('Erro ao buscar usuário por ID:', error);
            throw error;
        }
    }

    static async create(userData) {
        try {
            console.log('[DEBUG] Criando usuário no MongoDB');
            const user = new User(userData);
            await user.save();
            console.log('[DEBUG] Usuário criado com sucesso no MongoDB');
            return user;
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error('ID de usuário inválido');
            }

            const user = await User.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            ).exec();

            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            return user;
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    }

    static async comparePassword(user, candidatePassword) {
        if (!user || !candidatePassword) {
            console.log('⚠️ [AUTH] Dados inválidos para comparação de senha');
            return false;
        }

        if (!user.password) {
            console.log('⚠️ [AUTH] Usuário não tem senha definida:', user.email);
            return false;
        }

        try {
            console.log('🔐 [AUTH] Comparando senha para:', user.email);
            
            // Se o usuário é um documento do Mongoose
            if (user.constructor.modelName === 'User') {
                console.log('🔄 [AUTH] Usando método do modelo Mongoose');
                const isValid = await user.comparePassword(candidatePassword);
                console.log('✅ [AUTH] Resultado da comparação (modelo):', isValid);
                return isValid;
            }

            // Se é um objeto plano
            console.log('🔄 [AUTH] Usando bcrypt.compare diretamente');
            const isValid = await bcrypt.compare(candidatePassword, user.password);
            console.log('✅ [AUTH] Resultado da comparação (bcrypt):', isValid);
            return isValid;
        } catch (error) {
            console.error('[ERROR] Erro ao comparar senhas:', error);
            return false;
        }
    }
}

module.exports = UserService;