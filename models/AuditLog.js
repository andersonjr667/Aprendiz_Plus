class AuditLog {
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.action = data.action;
        this.field = data.field;
        this.oldValue = data.oldValue;
        this.newValue = data.newValue;
        this.createdAt = data.createdAt || new Date().toISOString();
    }
}

module.exports = AuditLog;