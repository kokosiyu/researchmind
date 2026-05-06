import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { authRoutes } from '../routes/auth.js';
import { setupTestDatabase, cleanupTestDatabase } from './testSetup.js';

describe('Auth API', () => {
  let app;
  let db;

  beforeAll(async () => {
    db = await setupTestDatabase();
    app = express();
    app.use(cors({ origin: '*' }));
    app.use(express.json());
    app.use('/api/auth', (req, res, next) => {
      req.db = db;
      next();
    }, authRoutes);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'test123'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('注册成功');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.token).toBeDefined();
    });

    it('should reject registration with existing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser', // 已存在
          email: 'another@example.com',
          password: 'test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名已存在');
    });

    it('should reject registration with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'anotheruser',
          email: 'test@example.com', // 已存在
          password: 'test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('邮箱已存在');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test',
          // 缺少 email 和 password
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'test123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('登录成功');
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'test123'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'test123'
        });
      token = loginResponse.body.token;
    });

    it('should get current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('未提供认证令牌');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('无效的认证令牌');
    });
  });
});