import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, BookOpen, Network, Laptop, Search, User, LogOut, BarChart3, Menu, X, FileSearch, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

const navItems = [
  { path: '/', label: '首页', icon: Brain },
  { path: '/dashboard', label: '智慧大屏', icon: BarChart3 },
  { path: '/analyze', label: '论文分析', icon: BookOpen },
  { path: '/graph', label: '知识图谱', icon: Network },
  { path: '/workbench', label: '研究工作台', icon: Laptop },
  { path: '/search', label: '论文搜索', icon: Search },
  { path: '/similarity', label: '论文查重', icon: FileSearch },
  { path: '/trends', label: '趋势分析', icon: TrendingUp }
];

function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateArrows); ro.disconnect(); };
  }, [ref]);

  const onMouseDown = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    ref.current.scrollLeft = scrollLeftStart.current - (x - startX.current);
  };

  const onMouseUp = () => {
    isDragging.current = false;
    if (ref.current) {
      ref.current.style.cursor = 'grab';
      ref.current.style.userSelect = '';
    }
  };

  const scrollBy = (dx: number) => {
    ref.current?.scrollBy({ left: dx, behavior: 'smooth' });
  };

  return { onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp, canScrollLeft, canScrollRight, scrollBy };
}

export const Header = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout, isProcessingPaper, processingPaper } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const drag = useDragScroll(navRef);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const active = el.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) {
      const left = active.offsetLeft - el.offsetLeft - (el.clientWidth - active.clientWidth) / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  }, [location.pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              ResearchMind
            </span>
          </Link>

          <div className="hidden md:flex items-center relative flex-1 mx-6 min-w-0">
            {drag.canScrollLeft && (
              <button
                onClick={() => drag.scrollBy(-200)}
                className="absolute left-0 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border border-slate-200 shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              ref={navRef}
              onMouseDown={drag.onMouseDown}
              onMouseMove={drag.onMouseMove}
              onMouseUp={drag.onMouseUp}
              onMouseLeave={drag.onMouseLeave}
              className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 px-1"
              style={{ cursor: 'grab', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link key={item.path} to={item.path} data-active={isActive ? 'true' : undefined}>
                    <motion.div
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all duration-300 select-none ${
                        isActive
                          ? 'text-blue-600 bg-blue-50 font-bold'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {drag.canScrollRight && (
              <button
                onClick={() => drag.scrollBy(200)}
                className="absolute right-0 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border border-slate-200 shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

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

          <div className="flex items-center space-x-4 shrink-0">
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
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
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all duration-300 font-medium"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 font-medium"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-blue-600 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
          >
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-slate-100 pt-3 mt-3">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span>{user?.username}</span>
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>退出</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      登录
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-4 py-3 mt-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium"
                    >
                      注册
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
