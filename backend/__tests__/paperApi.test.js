import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { paperRoutes } from '../routes/paper.js';
import { authRoutes } from '../routes/auth.js';
import { setupTestDatabase, cleanupTestDatabase } from './testSetup.js';

describe('Paper API', () => {
  let app;
  let db;
  let token;

  beforeAll(async () => {
    db = await setupTestDatabase();
    
    app = express();
    app.use(cors({ origin: '*' }));
    app.use(express.json());
    
    app.use('/api/auth', (req, res, next) => {
      req.db = db;
      next();
    }, authRoutes);
    
    app.use('/api/papers', (req, res, next) => {
      req.db = db;
      next();
    }, paperRoutes);

    // 先注册一个测试用户
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'paperuser',
        email: 'paper@example.com',
        password: 'test123'
      });
    token = registerResponse.body.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe('POST /api/papers', () => {
    it('should create a paper successfully', async () => {
      const response = await request(app)
        .post('/api/papers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Paper Title',
          authors: 'John Doe, Jane Smith',
          abstract: 'This is a test paper abstract.',
          journal: 'Test Journal',
          year: 2024,
          doi: '10.1234/test.2024',
          keywords: ['AI', 'Machine Learning']
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Test Paper Title');
      expect(response.body.authors).toBe('John Doe, Jane Smith');
      expect(response.body.userId).toBeDefined();
    });

    it('should reject creating paper without authorization', async () => {
      const response = await request(app)
        .post('/api/papers')
        .send({
          title: 'Unauthorized Paper',
          authors: 'Test Author',
          abstract: 'Test abstract'
        });

      expect(response.status).toBe(401);
    });

    it('should reject paper without required fields', async () => {
      const response = await request(app)
        .post('/api/papers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Missing Authors'
          // 缺少 authors 和 abstract
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/papers', () => {
    it('should get papers for authenticated user', async () => {
      // 先创建几篇论文
      await request(app)
        .post('/api/papers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Paper 1',
          authors: 'Author A',
          abstract: 'Abstract 1'
        });

      await request(app)
        .post('/api/papers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Paper 2',
          authors: 'Author B',
          abstract: 'Abstract 2'
        });

      const response = await request(app)
        .get('/api/papers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/papers');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/papers/:id', () => {
    let paperId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/papers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Single Paper Test',
          authors: 'Test Author',
          abstract: 'Test abstract'
        });
      paperId = createResponse.body.id;
    });

    it('should get a single paper by id', async () => {
      const response = await request(app)
        .get(`/api/papers/${paperId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Single Paper Test');
    });

    it('should return 404 for non-existent paper', async () => {
      const response = await request(app)
        .get('/api/papers/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/papers/:id', () => {
    let paperId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/papers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Original Title',
          authors: 'Original Author',
          abstract: 'Original abstract'
        });
      paperId = createResponse.body.id;
    });

    it('should update a paper successfully', async () => {
      const response = await request(app)
        .put(`/api/papers/${paperId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          year: 2025
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.year).toBe(2025);
    });

    it('should reject update without authorization', async () => {
      const response = await request(app)
        .put(`/api/papers/${paperId}`)
        .send({ title: 'Hacked Title' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/papers/:id', () => {
    let paperId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/papers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'To Be Deleted',
          authors: 'Test Author',
          abstract: 'Will be deleted'
        });
      paperId = createResponse.body.id;
    });

    it('should delete a paper successfully', async () => {
      const response = await request(app)
        .delete(`/api/papers/${paperId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('论文已删除');
    });

    it('should return 404 for deleted paper', async () => {
      const response = await request(app)
        .get(`/api/papers/${paperId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});