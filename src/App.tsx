import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Analyze from "./pages/Analyze";
import Graph from "./pages/Graph";
import Workbench from "./pages/Workbench";
import SearchPage from "./pages/Search";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const { loadPapers, loadNotes } = useAppStore();

  useEffect(() => {
    // 应用启动时加载数据
    const loadData = async () => {
      await loadPapers();
      await loadNotes();
    };
    loadData();
  }, [loadPapers, loadNotes]);

  console.log('App is rendering');
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/workbench" element={<Workbench />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
