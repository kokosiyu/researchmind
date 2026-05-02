import express from 'express';
import { authService } from '../services/authService.js';

const router = express.Router();

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);
  const userInfo = authService.extractUserFromToken(token);

  if (!userInfo) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }

  req.user = userInfo;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
}

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: '用户名、邮箱和密码都是必填的' });
    }

    // 检查用户名是否已存在
    const existingUser = await req.db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    const existingEmail = await req.db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ message: '邮箱已存在' });
    }

    // 哈希密码
    const hashedPassword = await authService.hashPassword(password);

    // 创建用户
    const result = await req.db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // 获取新创建的用户
    const user = await req.db.get('SELECT id, username, email, role, createdAt FROM users WHERE id = ?', [result.lastID]);

    // 生成 token
    const token = authService.generateToken(user);

    res.status(201).json({
      message: '注册成功',
      user,
      token
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码都是必填的' });
    }

    // 查找用户
    const user = await req.db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    const passwordMatch = await authService.comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 生成 token
    const token = authService.generateToken(user);

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: '登录成功',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await req.db.get('SELECT id, username, email, role, createdAt, updatedAt FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户信息
router.put('/me', authenticate, async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username && !email) {
      return res.status(400).json({ message: '至少需要提供用户名或邮箱' });
    }

    if (username) {
      const existingUser = await req.db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.user.id]);
      if (existingUser) {
        return res.status(400).json({ message: '用户名已存在' });
      }
    }

    if (email) {
      const existingEmail = await req.db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
      if (existingEmail) {
        return res.status(400).json({ message: '邮箱已存在' });
      }
    }

    const updates = [];
    const params = [];
    
    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    
    updates.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(req.user.id);

    await req.db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updatedUser = await req.db.get('SELECT id, username, email, role, createdAt, updatedAt FROM users WHERE id = ?', [req.user.id]);

    res.json({
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除用户
router.delete('/me', authenticate, async (req, res) => {
  try {
    await req.db.run('DELETE FROM users WHERE id = ?', [req.user.id]);

    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取所有用户（仅管理员）
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await req.db.all('SELECT id, username, email, role, createdAt, updatedAt FROM users');

    res.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

export const authRoutes = router;
