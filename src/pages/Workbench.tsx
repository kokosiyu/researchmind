import { useState } from 'react';
import { motion } from 'framer-motion';
import { Laptop, Plus, Trash2, StickyNote, Calendar, Tag, Download } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import MarkdownEditor from '@uiw/react-markdown-editor';
import ReactMarkdown from 'react-markdown';
import ParticleAnimation from '../components/features/ParticleAnimation';

export default function Workbench() {
  const { papers, notes, addNote, deleteNote, deletePaper } = useAppStore();
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [newNote, setNewNote] = useState({ content: '', tags: '' });
  const [isAddingNote, setIsAddingNote] = useState(false);

  const filteredNotes = selectedPaper 
    ? notes.filter(note => note.paperId === selectedPaper)
    : notes;

  const selectedPaperData = selectedPaper 
    ? papers.find(p => p.id === selectedPaper)
    : null;

  const handleAddNote = () => {
    if (!selectedPaper || !newNote.content.trim()) return;
    
    addNote({
      paperId: selectedPaper,
      content: newNote.content,
      tags: newNote.tags.split(',').map(t => t.trim()).filter(t => t)
    });
    
    setNewNote({ content: '', tags: '' });
    setIsAddingNote(false);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 relative overflow-hidden">
      <ParticleAnimation />
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center space-x-3">
            <Laptop className="w-8 h-8 text-blue-600" />
            <span>研究工作台</span>
          </h1>
          <p className="text-lg text-slate-600">
            管理你的文献库和研究笔记
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-4">我的文献库</h2>
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                <div className="flex space-x-4 min-w-max">
                  {papers.map((paper) => (
                    <div
                      key={paper.id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedPaper === paper.id
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm'
                      } w-72`}
                      onClick={() => setSelectedPaper(selectedPaper === paper.id ? null : paper.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 text-sm mb-2 line-clamp-2">
                            {paper.title}
                          </h3>
                          <p className="text-xs text-slate-500">{paper.authors} · {paper.year}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('确定要删除这篇论文吗？此操作不可恢复！')) {
                              deletePaper(paper.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {papers.length === 0 && (
                    <div className="text-center py-12 text-slate-500 w-full">
                      <p>暂无文献</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-slate-200"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Laptop className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">研究统计</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-slate-500">总文献数</p>
                  <p className="text-xl font-bold text-blue-600">{papers.length}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-slate-500">总笔记数</p>
                  <p className="text-xl font-bold text-purple-600">{notes.length}</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <button 
                  onClick={() => alert('详细统计功能开发中，敬请期待！')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors"
                >
                  查看详细统计 →
                </button>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <StickyNote className="w-5 h-5 text-yellow-500" />
                  <span>
                    {selectedPaperData 
                      ? '论文笔记'
                      : '全部笔记'
                    }
                  </span>
                </h2>
                {selectedPaper && (
                  <button
                    onClick={() => setIsAddingNote(!isAddingNote)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加笔记</span>
                  </button>
                )}
              </div>

              {isAddingNote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 p-5 bg-white rounded-xl border border-slate-200 shadow-sm"
                >
                  <MarkdownEditor
                    value={newNote.content}
                    onChange={(value) => setNewNote({ ...newNote, content: value })}
                    placeholder="写下你的研究笔记..."
                    className="mb-4"
                    height="300px"
                  />
                  <div className="mt-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-2">
                      <input
                        type="text"
                        value={newNote.tags}
                        onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                        placeholder="请输入标签，多个标签用逗号分隔"
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex space-x-2 w-full sm:w-auto">
                        <button
                          onClick={handleAddNote}
                          className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingNote(false);
                            setNewNote({ content: '', tags: '' });
                          }}
                          className="flex-1 sm:flex-none px-6 py-3 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">示例：机器学习, 自然语言处理, 深度学习</p>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4">
                {filteredNotes.map((note) => {
                  const paper = papers.find(p => p.id === note.paperId);
                  
                  const handleDownload = () => {
                    const markdownContent = note.content;
                    const blob = new Blob([markdownContent], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `note-${note.id}.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  };
                  
                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          {!selectedPaper && paper && (
                            <p className="text-sm text-blue-600 font-medium mb-3">
                              {paper.title}
                            </p>
                          )}
                          <div className="text-slate-700 leading-relaxed">
                            <ReactMarkdown>{note.content}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={handleDownload}
                            className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                            title="下载Markdown"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('确定要删除这条笔记吗？此操作不可恢复！')) {
                                deleteNote(note.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            title="删除笔记"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                        {note.tags.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Tag className="w-4 h-4 text-slate-400" />
                            <div className="flex flex-wrap gap-2">
                              {note.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {filteredNotes.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <StickyNote className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>
                      {selectedPaper 
                        ? '这篇论文还没有笔记'
                        : '还没有笔记'
                      }
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
