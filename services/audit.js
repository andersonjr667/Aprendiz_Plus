const fs = require('fs').promises;
const path = require('path');
const { readDB, writeDB, generateId } = require('./database');
const AuditLog = require('../models/AuditLog');

const AuditService = {
    async log(userId, action, field, oldValue, newValue) {
        const db = await readDB();
        
        const log = new AuditLog({
            id: generateId(),
            userId,
            action,
            field,
            oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue,
            newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue
        });

        db.auditLogs.push(log);
        await writeDB(db);
        return log;
    },

    async getLogsForUser(userId, limit = 50) {
        const db = await readDB();
        return db.auditLogs
            .filter(log => log.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }
};

module.exports = AuditService;