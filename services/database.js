const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = path.join(__dirname, '..', 'data', 'db.json');

const useMongo = (process.env.MONGO_ENABLED || 'false').toLowerCase() === 'true';

// Configuração do retry
const RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelay: 1000,  // 1 segundo
    maxDelay: 5000,      // 5 segundos
    backoffFactor: 2     // dobra o delay a cada tentativa
};

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

if (useMongo) {
    // Quando Mongo Atlas está habilitado, usamos os modelos Mongoose
    const mongooseService = require('./mongoose');
    const User = require('../models/User');
    const Job = require('../models/Job');
    const News = require('../models/News');
    // Comentários e AuditLog podem ser tratados pelos mesmos modelos ou por collections simples

    // Conectar imediatamente (é seguro chamar várias vezes)
    mongooseService.connect().catch(err => {
        console.error('Falha ao conectar ao MongoDB Atlas:', err.message || err);
    });

    const UserService = {
        async findByEmail(email) {
            if (!email) return null;
            email = email.toLowerCase();

            // Se db.json estiver disponível, tentar primeiro nele
            const db = await readDB();
            if (db) {
                const localUser = db.users.find(u => u.email && u.email.toLowerCase() === email);
                if (localUser) return localUser;
            }

            // Se db.json não disponível ou usuário não encontrado, e MongoDB ativo, usar Mongo
            if (useMongo) {
                try {
                    const result = await retryOperation(async () => {
                        const m = await User.findOne({ email }).lean();
                        if (m) {
                            if (!m.id && m._id) m.id = m._id.toString();
                            return m;
                        }
                        return null;
                    }, `buscar usuário por email ${email}`);
                    return result;
                } catch (e) {
                    console.error('MongoDB findByEmail error após retries:', e.message);
                    if (!isJsonDbAvailable) {
                        throw e; // Re-throw se não tiver fallback
                    }
                }
            }
            return null;
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
            
            // Se existir no arquivo local, retornar
            if (localUser) {
                return localUser;
            }

            // Se não existir no arquivo local e MongoDB estiver habilitado, buscar no Mongo
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

            // Se db.json disponível, tentar salvar primeiro nele
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

            // Se MongoDB ativo OU db.json indisponível, usar Mongo com retry
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

            // Retornar versão do db.json se MongoDB falhou
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
            // Se db.json disponível, tentar atualizar primeiro nele
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

            // Se MongoDB ativo OU db.json indisponível/falhou, usar Mongo com retry
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
            // quando usamos mongo, user vem do banco (tem password)
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
        _usingMongo: true
    };

} else {
    // Fallback: arquivo JSON (comportamento anterior)

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
            const target = (email || '').toString().toLowerCase();
            return db.users.find(user => (user.email || '').toString().toLowerCase() === target);
        },

        async findByCPF(cpf) {
            const db = await readDB();
            const target = (cpf || '').toString().replace(/\D/g, '');
            return db.users.find(user => (user.cpf || '').toString().replace(/\D/g, '') === target);
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
        CommentService,
        _usingMongo: false
    };
}