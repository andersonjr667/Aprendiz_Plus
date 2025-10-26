/*
Script: generate-migration-report.js

Gera um relatório JSON com todos os usuários no MongoDB e marca aqueles
com createdAt anteriores a uma data de corte (padrão: 2025-10-01).
Não altera o banco por padrão. Use --mark para marcar `needsPasswordReset: true` no DB.

Usage:
  node scripts/generate-migration-report.js [--cutoff YYYY-MM-DD] [--mark]
*/

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

async function main() {
  const args = process.argv.slice(2);
  let cutoffArg = '2025-10-01';
  let doMark = false;
  args.forEach((a, i) => {
    if (a === '--cutoff' && args[i+1]) cutoffArg = args[i+1];
    if (a === '--mark') doMark = true;
  });

  const cutoffDate = new Date(cutoffArg);
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('No MongoDB URI found in environment. Set MONGODB_URI or MONGO_URI.');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for migration report');

  const users = await User.find().lean();
  const report = [];
  for (const u of users) {
    const created = u.createdAt ? new Date(u.createdAt) : null;
    const older = created && created < cutoffDate;
    report.push({ id: u._id ? u._id.toString() : (u.id || null), email: u.email, createdAt: created, olderThanCutoff: !!older });
  }

  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `migration-report-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ cutoff: cutoffArg, generatedAt: new Date().toISOString(), total: users.length, report }, null, 2));
  console.log('Migration report written to', outPath);

  if (doMark) {
    console.log('Marking users older than cutoff with needsPasswordReset: true');
    const toMark = users.filter(u => u.createdAt && new Date(u.createdAt) < cutoffDate);
    for (const u of toMark) {
      try {
        await User.updateOne({ _id: u._id }, { $set: { needsPasswordReset: true } });
      } catch (err) {
        console.error('Error marking user', u.email, err.message || err);
      }
    }
    console.log('Marked', toMark.length, 'users');
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
