const { UserService } = require('../services/database');

async function seed() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Admin';
    const force = process.env.SEED_FORCE === 'true';

    if (!email || !password) {
        console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment to seed admin');
        process.exit(1);
    }

    try {
        const existing = await UserService.findByEmail(email);
        if (existing && !force) {
            console.log('Admin already exists. To overwrite, set SEED_FORCE=true');
            return;
        }

        if (existing && force) {
            // update existing to be admin
            await UserService.update(existing.id, { type: 'admin', name });
            console.log('Existing user promoted to admin');
            return;
        }

        const admin = await UserService.create({
            name,
            email,
            password,
            cpf: '',
            birthdate: new Date().toISOString(),
            type: 'admin'
        });

        console.log('Admin user created:', admin.email);
    } catch (e) {
        console.error('Error seeding admin:', e);
        process.exit(1);
    }
}

seed();
