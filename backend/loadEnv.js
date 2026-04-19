import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 固定从 backend/.env 加载环境变量
const backendEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(backendEnvPath)) {
  console.log('加载 backend/.env 环境变量');
  dotenv.config({ path: backendEnvPath });
}

// 可选读项目根/.env 作补充（不覆盖已有变量）
const rootEnvPath = path.join(process.cwd(), '..', '.env');
if (fs.existsSync(rootEnvPath)) {
  console.log('加载 项目根/.env 环境变量（补充）');
  const rootEnv = dotenv.parse(fs.readFileSync(rootEnvPath));
  // 只添加不存在的环境变量
  Object.keys(rootEnv).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = rootEnv[key];
    }
  });
}

console.log('环境变量加载完成');
