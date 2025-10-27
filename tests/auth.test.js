const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus_test');
  await User.deleteMany();
});

afterAll(async () => {
  await mongoose.connection.close();
});

test('register and login', async () => {
  const email = 'testuser@example.com';
  const res1 = await request(app).post('/api/auth/register').send({ name: 'Test', email, password: '123456' });
  expect(res1.statusCode).toBe(200);
  const res2 = await request(app).post('/api/auth/login').send({ email, password: '123456' });
  expect(res2.statusCode).toBe(200);
  expect(res2.body.ok).toBe(true);
});
