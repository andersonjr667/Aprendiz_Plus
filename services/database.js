
const mongooseService = require('./mongoose');
require('dotenv').config();


// Configuração do MongoDB quando habilitado
let User, Job, News;
const useMongo = process.env.MONGO_ENABLED === 'true';
if (useMongo) {
    User = require('../models/User');
    Job = require('../models/Job');
    News = require('../models/News');
    mongooseService.connect().catch(err => {
        console.error('Falha ao conectar ao MongoDB Atlas:', err.message || err);
    });
}

// Helper para retry com backoff exponencial
async function retryOperation(operation, description) {
    if (!isJsonDbAvailable && useMongo) {
        let attempt = 1;
        let delay = RETRY_CONFIG.initialDelay;

        while (attempt <= RETRY_CONFIG.maxAttempts) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === RETRY_CONFIG.maxAttempts) {
                    throw new Error(`${description} falhou após ${attempt} tentativas: ${error.message}`);
                }

                console.warn(`Tentativa ${attempt} de ${RETRY_CONFIG.maxAttempts} para ${description} falhou. Retry em ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                delay = Math.min(delay * RETRY_CONFIG.backoffFactor, RETRY_CONFIG.maxDelay);
                attempt++;
            }
        }
    } else {
        return operation();
    }
}

// Flag para controlar disponibilidade do db.json
let isJsonDbAvailable = true;

// Helper para ler/escrever o arquivo local
async function readDB() {
    if (!isJsonDbAvailable) return null;

    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Se arquivo não existe ou tem erro de permissão/formato
        if (error.code === 'ENOENT' || error.code === 'EACCES' || error instanceof SyntaxError) {
            console.warn('Local db.json indisponível:', error.message);
            isJsonDbAvailable = false; // desativa uso do arquivo
            return null;
        }
        throw error;
    }
}

async function writeDB(data) {
    if (!isJsonDbAvailable) return false;

    try {
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.warn('Erro ao escrever db.json:', error.message);
        isJsonDbAvailable = false; // desativa uso do arquivo após erro
        return false;
    }
}

// Serviço de Usuário
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

const UserService = {
    async findByEmail(email) {
        if (!email) return null;
        email = email.toLowerCase();
        try {
            if (useMongo) {
                console.log('[DEBUG] Procurando usuário no MongoDB:', email);
                const user = await User.findOne({ email }).select('+password').exec();
                if (!user) {
                    console.log('[DEBUG] Usuário não encontrado no MongoDB');
                    return null;
                }
                console.log('[DEBUG] Usuário encontrado no MongoDB');
                return user;
            } else {
                const db = await readDB();
                if (!db) return null;
                return db.users.find(u => u.email && u.email.toLowerCase() === email);
            }
        } catch (error) {
            console.error('[ERROR] Erro ao buscar usuário:', error);
            throw error;
        }
    },
    async findByCPF(cpf) {
        try {
            const m = await User.findOne({ cpf }).lean();
            if (m) {
                if (!m.id && m._id) m.id = m._id.toString();
                return m;
            }
        } catch (e) {
            console.warn('Mongo findByCPF error, falling back to local DB:', e && e.message ? e.message : e);
        }
        const db = await readDB();
        return db.users.find(u => u.cpf === cpf) || null;
    },
    async findById(id) {
        // Tentar primeiro no arquivo local
        const db = await readDB();
        const localUser = db.users.find(u => u.id === id);
        if (localUser) {
            return localUser;
        }
        if (useMongo) {
            try {
                const m = await User.findById(id).lean();
                if (m) {
                    if (!m.id && m._id) m.id = m._id.toString();
                    return m;
                }
            } catch (e) {
                console.warn('Mongo findById error:', e && e.message ? e.message : e);
            }
        }
        return null;
    },
    async create(userData) {
        const userId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const timestamp = new Date().toISOString();
        const db = await readDB();
        if (db) {
            const newUser = {
                id: userId,
                ...userData,
                password: hashedPassword,
                createdAt: timestamp
            };
            db.users.push(newUser);
            await writeDB(db);
        }
        if (useMongo || !isJsonDbAvailable) {
            try {
                const result = await retryOperation(async () => {
                    const u = new User({
                        ...userData,
                        _id: userId,
                        createdAt: timestamp
                    });
                    await u.save();
                    const obj = u.toObject();
                    if (!obj.id && obj._id) obj.id = obj._id.toString();
                    delete obj.password;
                    return obj;
                }, `criar usuário ${userData.email}`);
                return result;
            } catch (e) {
                console.error('MongoDB create error após retries:', e.message);
                if (!isJsonDbAvailable) {
                    throw e; // Re-throw se não tiver fallback
                }
            }
        }
        if (db) {
            const saved = db.users.find(u => u.id === userId);
            if (saved) {
                const { password, ...userWithoutPassword } = saved;
                return userWithoutPassword;
            }
        }
        throw new Error('Falha ao criar usuário em ambos os storages');
    },
    async update(id, updateData) {
        const db = await readDB();
        if (db) {
            const userIndex = db.users.findIndex(u => u.id === id);
            if (userIndex !== -1) {
                const updatedUser = { ...db.users[userIndex], ...updateData };
                db.users[userIndex] = updatedUser;
                const wrote = await writeDB(db);
                if (wrote) {
                    const { password, ...userWithoutPassword } = updatedUser;
                    return userWithoutPassword;
                }
            }
        }
        if (useMongo || !isJsonDbAvailable) {
            try {
                const result = await retryOperation(async () => {
                    const updated = await User.findByIdAndUpdate(id, updateData, { new: true }).lean();
                    if (updated) {
                        if (!updated.id && updated._id) updated.id = updated._id.toString();
                        delete updated.password;
                        return updated;
                    }
                    return null;
                }, `atualizar usuário ${id}`);
                return result;
            } catch (e) {
                console.error('MongoDB update error após retries:', e.message);
                if (!isJsonDbAvailable) {
                    throw e; // Re-throw se não tiver fallback
                }
            }
        }
        return null;
    },
    async comparePassword(user, password) {
        return bcrypt.compare(password, user.password);
    }
};

const NewsService = {
        async findAll(page = 1, limit = 10) {
            const skip = (page - 1) * limit;
            try {
                const [items, total] = await Promise.all([
                    News.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                    News.countDocuments()
                ]);
                return { news: items, total, page, totalPages: Math.ceil(total / limit) };
            } catch (e) {
                console.warn('Mongo News findAll error, falling back to local DB:', e && e.message ? e.message : e);
                const db = await readDB();
                const start = (page - 1) * limit;
                return {
                    news: db.news.slice(start, start + limit),
                    total: db.news.length,
                    page,
                    totalPages: Math.ceil(db.news.length / limit)
                };
            }
        },
        async create(newsData) {
            try {
                const n = new News(newsData);
                await n.save();
                return n.toObject();
            } catch (e) {
                console.warn('Mongo News create error, falling back to local DB:', e && e.message ? e.message : e);
                const db = await readDB();
                const newNews = { id: Date.now().toString(36) + Math.random().toString(36).substr(2), ...newsData, createdAt: new Date().toISOString() };
                db.news.push(newNews);
                await writeDB(db);
                return newNews;
            }
        },
        async findById(id) {
            try {
                return News.findById(id).lean();
            } catch (e) {
                console.warn('Mongo News findById error, falling back to local DB:', e && e.message ? e.message : e);
                const db = await readDB();
                return db.news.find(n => n.id === id) || null;
            }
        }
    };

const JobService = {
        async findAll(filters = {}) {
            const query = {};
            if (filters.status) query.status = filters.status;
            if (filters.type) query.type = filters.type;
            try {
                return Job.find(query).lean();
            } catch (e) {
                console.warn('Mongo Job findAll error, falling back to local DB:', e && e.message ? e.message : e);
                const db = await readDB();
                let jobs = db.jobs;
                if (filters.status) jobs = jobs.filter(job => job.status === filters.status);
                if (filters.type) jobs = jobs.filter(job => job.type === filters.type);
                return jobs;
            }
        },
        async create(jobData) {
            try {
                const j = new Job(jobData);
                await j.save();
                return j.toObject();
            } catch (e) {
                console.warn('Mongo Job create error, falling back to local DB:', e && e.message ? e.message : e);
                const db = await readDB();
                const newJob = { id: Date.now().toString(36) + Math.random().toString(36).substr(2), ...jobData, applications: [], createdAt: new Date().toISOString() };
                db.jobs.push(newJob);
                await writeDB(db);
                return newJob;
            }
        },
        async findById(id) {
            try {
                return Job.findById(id).lean();
            } catch (e) {
                console.warn('Mongo Job findById error, falling back to local DB:', e && e.message ? e.message : e);
                const db = await readDB();
                return db.jobs.find(job => job.id === id) || null;
            }
        }
    };

const CommentService = {
        // Para compatibilidade mínima, deixamos stubs baseados em collections do mongoose
        async findByNews(newsId) {
            // implement apenas se houver model Comment, caso contrário retorna vazio
            return [];
        },
        async findReplies(parentId) {
            return [];
        },
        async create(commentData) {
            return null;
        },
        async findById(id) { return null; },
        async update(id, updateData) { return null; },
        async delete(id) { return true; },
        async toggleLike(id, userId) { return null; }
    };


module.exports = {
    UserService,
    NewsService,
    JobService,
    CommentService,
    _usingMongo: useMongo
};

// ...existing code...