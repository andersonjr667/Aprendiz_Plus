const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus_test');
  await User.deleteMany();
  await Job.deleteMany();
  const passwordHash = require('bcrypt').hashSync('123456', 10);
  const company = await User.create({ name: 'Comp', email: 'comp@test', passwordHash, type: 'empresa' });
  // create job directly
  await Job.create({ title: 'Dev', description: 'Teste', company: company._id });
});

afterAll(async () => {
  await mongoose.connection.close();
});

test('list jobs', async () => {
  const res = await request(app).get('/api/jobs');
  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});
