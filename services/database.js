const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');

// Função auxiliar para ler o banco de dados
async function readDB() {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Se o arquivo não existir, cria um novo
            const initialData = { users: [], news: [], jobs: [], comments: [], auditLogs: [] };
            await fs.writeFile(dbPath, JSON.stringify(initialData, null, 2));
            return initialData;
        }
        throw error;
    }
}

// Função auxiliar para salvar no banco de dados
async function writeDB(data) {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

// Gerar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Funções do User
const UserService = {
    async findByEmail(email) {
        const db = await readDB();
        return db.users.find(user => user.email === email);
    },

    async findByCPF(cpf) {
        const db = await readDB();
        return db.users.find(user => user.cpf === cpf);
    },

    async findById(id) {
        const db = await readDB();
        return db.users.find(user => user.id === id);
    },

    async create(userData) {
        const db = await readDB();
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const newUser = {
            id: generateId(),
            ...userData,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        await writeDB(db);
        
        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    },

    async update(id, updateData) {
        const db = await readDB();
        const index = db.users.findIndex(user => user.id === id);
        
        if (index === -1) return null;
        
        db.users[index] = { ...db.users[index], ...updateData };
        await writeDB(db);
        
        const { password, ...userWithoutPassword } = db.users[index];
        return userWithoutPassword;
    },

    async comparePassword(user, password) {
        return bcrypt.compare(password, user.password);
    }
};

// Funções do News
const NewsService = {
    async findAll(page = 1, limit = 10) {
        const db = await readDB();
        const start = (page - 1) * limit;
        const end = start + limit;
        
        return {
            news: db.news.slice(start, end),
            total: db.news.length,
            page,
            totalPages: Math.ceil(db.news.length / limit)
        };
    },

    async create(newsData) {
        const db = await readDB();
        const newNews = {
            id: generateId(),
            ...newsData,
            createdAt: new Date().toISOString()
        };

        db.news.push(newNews);
        await writeDB(db);
        return newNews;
    },

    async findById(id) {
        const db = await readDB();
        return db.news.find(news => news.id === id);
    }
};

// Funções do Jobs
const JobService = {
    async findAll(filters = {}) {
        const db = await readDB();
        let jobs = db.jobs;

        if (filters.status) {
            jobs = jobs.filter(job => job.status === filters.status);
        }

        if (filters.type) {
            jobs = jobs.filter(job => job.type === filters.type);
        }

        return jobs;
    },

    async create(jobData) {
        const db = await readDB();
        const newJob = {
            id: generateId(),
            ...jobData,
            applications: [],
            createdAt: new Date().toISOString()
        };

        db.jobs.push(newJob);
        await writeDB(db);
        return newJob;
    },

    async findById(id) {
        const db = await readDB();
        return db.jobs.find(job => job.id === id);
    }
};

    // Funções do Comment
    const CommentService = {
        async findByNews(newsId) {
            const db = await readDB();
            return db.comments.filter(c => c.news === newsId && !c.parentComment).map(c => ({ ...c }));
        },

        async findReplies(parentId) {
            const db = await readDB();
            return db.comments.filter(c => c.parentComment === parentId).map(c => ({ ...c }));
        },

        async create(commentData) {
            const db = await readDB();
            const newComment = {
                id: generateId(),
                ...commentData,
                likes: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.comments.push(newComment);
            await writeDB(db);
            return newComment;
        },

        async findById(id) {
            const db = await readDB();
            return db.comments.find(c => c.id === id);
        },

        async update(id, updateData) {
            const db = await readDB();
            const idx = db.comments.findIndex(c => c.id === id);
            if (idx === -1) return null;
            db.comments[idx] = { ...db.comments[idx], ...updateData, updatedAt: new Date().toISOString() };
            await writeDB(db);
            return db.comments[idx];
        },

        async delete(id) {
            const db = await readDB();
            db.comments = db.comments.filter(c => c.id !== id && c.parentComment !== id);
            await writeDB(db);
            return true;
        },

        async toggleLike(id, userId) {
            const db = await readDB();
            const c = db.comments.find(c => c.id === id);
            if (!c) return null;
            const idx = c.likes.indexOf(userId);
            if (idx === -1) c.likes.push(userId); else c.likes.splice(idx, 1);
            await writeDB(db);
            return c.likes.length;
        }
    };

module.exports = {
    UserService,
    NewsService,
    JobService,
    CommentService
};