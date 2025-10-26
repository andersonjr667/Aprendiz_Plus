const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

class UserService {
    static async findByEmail(email) {
        try {
            if (!email) return null;
            email = email.toLowerCase();

            console.log('[DEBUG] Procurando usuário no MongoDB:', email);
            const user = await User.findOne({ email }).exec();
            
            if (!user) {
                console.log('[DEBUG] Usuário não encontrado no MongoDB');
                return null;
            }
            
            console.log('[DEBUG] Usuário encontrado no MongoDB');
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
            console.log('[DEBUG] Dados inválidos para comparação de senha');
            return false;
        }

        try {
            console.log('[DEBUG] Comparando senha para usuário:', user.email);
            
            // Se o usuário é um documento do Mongoose
            if (user.constructor.modelName === 'User') {
                console.log('[DEBUG] Usando método comparePassword do modelo');
                return await user.comparePassword(candidatePassword);
            }

            // Se é um objeto plano
            console.log('[DEBUG] Usando bcrypt.compare diretamente');
            const result = await bcrypt.compare(candidatePassword, user.password);
            console.log('[DEBUG] Resultado da comparação:', result);
            return result;
        } catch (error) {
            console.error('[ERROR] Erro ao comparar senhas:', error);
            return false;
        }
    }
}

module.exports = UserService;