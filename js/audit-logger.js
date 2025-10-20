// Utilitário para registrar alterações no perfil
class AuditLogger {
    static async logChange(field, oldValue, newValue) {
        try {
            const response = await fetch('/api/audit/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    field,
                    oldValue,
                    newValue,
                    action: oldValue === undefined ? 'CREATE' : 
                            newValue === undefined ? 'DELETE' : 'UPDATE'
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Erro ao registrar alteração');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao registrar alteração:', error);
            // Não mostramos toast aqui para não interromper a experiência do usuário
            // O log é uma funcionalidade secundária
            return null;
        }
    }

    static compareAndLog(field, oldValue, newValue) {
        // Se os valores são iguais, não registra
        if (oldValue === newValue) return;

        // Se os valores são objetos, compara como JSON
        if (typeof oldValue === 'object' && typeof newValue === 'object') {
            const oldJson = JSON.stringify(oldValue);
            const newJson = JSON.stringify(newValue);
            if (oldJson === newJson) return;
        }

        // Registra a alteração
        return this.logChange(field, oldValue, newValue);
    }
}