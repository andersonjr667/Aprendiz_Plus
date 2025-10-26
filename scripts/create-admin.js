const { UserService } = require('../services/database');

(async function createAdmin() {
  try {
    const email = 'alsj1520@gmail.com';
    const password = '152070an';
    const name = 'Anderson';
    const company = 'Aprendiz plus';

    const existing = await UserService.findByEmail(email);
    if (existing) {
      console.log('Usuário já existe:', existing.email, '-> promovendo/atualizando para admin');
      const updates = { type: 'admin', name };
      if (existing.companyProfile || existing.type === 'empresa') {
        updates.companyProfile = existing.companyProfile || { nomeFantasia: company };
      } else {
        updates.company = company;
      }

      // Se o usuário veio do JSON local (não tem _id do Mongo), atualize o arquivo local diretamente
      if (!existing._id) {
        const fs = require('fs').promises;
        const path = require('path');
        const dbPath = path.join(__dirname, '..', 'data', 'db.json');
        const dbRaw = await fs.readFile(dbPath, 'utf8');
        const db = JSON.parse(dbRaw || '{}');
        db.users = db.users || [];
        const idx = db.users.findIndex(u => u.id === existing.id);
        if (idx !== -1) {
          db.users[idx] = { ...db.users[idx], ...updates, updatedAt: new Date().toISOString() };
          await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
          console.log('Usuário local atualizado para admin:', db.users[idx].email || db.users[idx].name, 'id=', db.users[idx].id);
          return;
        }
      }

      // Caso contrário, tente usar UserService.update (aplica para registros Mongo)
      try {
        const updated = await UserService.update(existing.id, updates);
        console.log('Usuário atualizado para admin:', updated.email || updated.name, 'id=', updated.id);
        return;
      } catch (e) {
        console.error('Falha ao atualizar usuário existente via UserService.update:', e && e.message ? e.message : e);
      }
    }

    const userData = {
      name,
      email,
      password,
      cpf: '',
      birthdate: new Date().toISOString(),
      type: 'admin',
      company
    };

    const created = await UserService.create(userData);
    console.log('Admin criado com sucesso:', created.email || created.name, 'id=', created.id);
  } catch (e) {
    console.error('Erro ao criar admin:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();