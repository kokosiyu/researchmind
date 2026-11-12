
import { Link, useLocation } from 'react-router-dom';
import { Brain, BookOpen, Network, Laptop, Search, User, LogOut, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

const navItems = [
  { path: '/', label: '首页', icon: Brain },
  { path: '/dashboard', label: '智慧大屏', icon: BarChart3 },
  { path: '/analyze', label: '论文分析', icon: BookOpen },
  { path: '/graph', label: '知识图谱', icon: Network },
  { path: '/workbench', label: '研究工作台', icon: Laptop },
  { path: '/search', label: '论文搜索', icon: Search }
];

export const Header = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout, isProcessingPaper, processingPaper } = useAppStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ResearchMind
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center space-x-2 transition-all duration-300 ${
                      isActive
                        ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* 论文处理状态指示器 */}
          {isProcessingPaper && processingPaper && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center space-x-2 z-10"
            >
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span>{processingPaper.title}: {processingPaper.status}</span>
            </motion.div>
          )}

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-slate-700 hover:text-blue-600 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">{user?.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">退出</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all duration-300 font-medium"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

