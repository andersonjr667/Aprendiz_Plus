const bcrypt = require('bcryptjs');

class AuthService {
    static async comparePassword(user, candidatePassword) {
        if (!user || !user.password || !candidatePassword) {
            console.log('[DEBUG] Dados inválidos para comparação de senha');
            return false;
        }

        try {
            // Se o usuário vier do Mongoose, usar o método do modelo
            if (user.comparePassword) {
                return await user.comparePassword(candidatePassword);
            }

            // Caso contrário, comparar diretamente com bcrypt
            const match = await bcrypt.compare(candidatePassword, user.password);
            console.log('[DEBUG] Resultado da comparação de senha:', match);
            return match;
        } catch (error) {
            console.error('[ERROR] Erro ao comparar senhas:', error);
            return false;
        }
    }
}

module.exports = AuthService;