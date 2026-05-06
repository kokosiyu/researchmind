import { authService } from '../services/authService.js';

describe('Auth Service', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'test123';
      const hashed = await authService.hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(10);
    });

    it('should hash different passwords differently', async () => {
      const password1 = 'password1';
      const password2 = 'password2';
      
      const hashed1 = await authService.hashPassword(password1);
      const hashed2 = await authService.hashPassword(password2);
      
      expect(hashed1).not.toBe(hashed2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'test123';
      const hashed = await authService.hashPassword(password);
      
      const result = await authService.comparePassword(password, hashed);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'test123';
      const hashed = await authService.hashPassword(password);
      
      const result = await authService.comparePassword('wrongpassword', hashed);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' };
      const token = authService.generateToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('extractUserFromToken', () => {
    it('should extract user info from valid token', () => {
      const user = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' };
      const token = authService.generateToken(user);
      
      const extracted = authService.extractUserFromToken(token);
      
      expect(extracted).toBeDefined();
      expect(extracted.id).toBe(user.id);
      expect(extracted.username).toBe(user.username);
      expect(extracted.email).toBe(user.email);
      expect(extracted.role).toBe(user.role);
    });

    it('should return null for invalid token', () => {
      const result = authService.extractUserFromToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // 测试过期token（设置过期时间为过去）
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE1OTk5OTk5OTl9.5fAeG6nZ8tK5fN9n5fAeG6nZ8tK5fN9n5fAeG6nZ8tK';
      const result = authService.extractUserFromToken(expiredToken);
      expect(result).toBeNull();
    });
  });
});