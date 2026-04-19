#!/bin/bash

# 修复 esbuild 权限问题
export npm_config_unsafe_perm=true

# 安装依赖
npm install --force

# 构建前端
npm run build
