require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Job = require('../models/Job');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus';

async function seed(){
  await mongoose.connect(MONGO_URI);
  console.log('Connected');
  await Promise.all([User.deleteMany(), Job.deleteMany()]);
  const password = await bcrypt.hash('password123', 10);
  const admin = await User.create({ name: 'Admin', email: 'admin@local', passwordHash: password, type: 'admin' });
  const companyA = await User.create({ name: 'Empresa A', email: 'a@empresa', passwordHash: password, type: 'empresa', companyProfile: { website: 'https://empresa-a.local' } });
  const companyB = await User.create({ name: 'Empresa B', email: 'b@empresa', passwordHash: password, type: 'empresa', companyProfile: { website: 'https://empresa-b.local' } });
  const c1 = await User.create({ name: 'Candidato 1', email: 'c1@local', passwordHash: password, type: 'candidato', candidateProfile: { skills: ['javascript','nodejs'] } });
  const c2 = await User.create({ name: 'Candidato 2', email: 'c2@local', passwordHash: password, type: 'candidato', candidateProfile: { skills: ['python','ml'] } });
  const c3 = await User.create({ name: 'Candidato 3', email: 'c3@local', passwordHash: password, type: 'candidato', candidateProfile: { skills: ['java','spring'] } });

  const j1 = await Job.create({ title: 'Desenvolvedor Node.js', description: 'Vaga para backend', requirements: ['nodejs','express'], company: companyA._id });
  const j2 = await Job.create({ title: 'Frontend React', description: 'Vaga frontend', requirements: ['react','javascript'], company: companyA._id });
  const j3 = await Job.create({ title: 'Engenheiro de Machine Learning', description: 'Dados e ML', requirements: ['python','ml'], company: companyB._id });
  const j4 = await Job.create({ title: 'Desenvolvedor Java', description: 'Backend Java', requirements: ['java','spring'], company: companyB._id });

  console.log('Seed done');
  process.exit(0);
}

seed().catch(err=>{ console.error(err); process.exit(1); });
