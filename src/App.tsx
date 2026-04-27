/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, Component } from 'react';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Calendar,
  MapPin,
  User,
  Building2,
  MoreVertical,
  Download,
  Clock,
  ClipboardList,
  Users,
  BarChart3,
  Shield,
  Home,
  Eraser,
  PenTool,
  Hash,
  Camera,
  Image as ImageIcon,
  UserPlus,
  X,
  Menu,
  Eye,
  Edit2,
  Filter,
  TrendingUp,
  Briefcase,
  Activity,
  Skull,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Smartphone,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  db, 
  auth, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  query,
  orderBy,
  where,
  limit
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { APR, Risk, Employee, AccidentRecord } from './types';
import { COMMON_RISKS } from './constants';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const formatDateForDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const getMonthName = (monthStr: string, options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }) => {
  if (!monthStr || !monthStr.includes('-')) return monthStr || '';
  try {
    const [year, month] = monthStr.split('-');
    const y = parseInt(year);
    const m = parseInt(month);
    if (isNaN(y) || isNaN(m)) return monthStr;
    const date = new Date(y, m - 1, 1, 12, 0, 0);
    return date.toLocaleDateString('pt-BR', options);
  } catch (e) {
    return monthStr;
  }
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Ocorreu um erro inesperado.";
      let isQuota = false;
      
      try {
        const errObj = JSON.parse(this.state.error.message);
        if (errObj.error) {
          message = errObj.error;
          isQuota = message.includes('Limite diário') || message.includes('Quota');
        }
      } catch (e) {
        message = this.state.error.message || message;
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md w-full space-y-8">
            {/* Ícone Animado de Manutenção */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse"></div>
              <div className="relative flex items-center justify-center w-full h-full text-blue-600">
                <AlertTriangle size={48} />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Sistema está Fora do ar
              </h1>
              <p className="text-slate-600 text-lg font-medium">
                {isQuota ? 'Manutenção Temporária (Aguardando Reset de Cota)' : 'Ops! Identificamos um problema técnico.'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-4">
              <div className="flex items-start gap-4 text-left">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Por que isso aconteceu?</h3>
                  <p className="text-sm text-slate-500 leading-relaxed italic">
                    "O Google (nosso servidor) impõe um limite diário de uso no plano gratuito. Como o app foi muito acessado hoje, precisamos aguardar o próximo ciclo de créditos para processar os dados."
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50">
                <p className="text-xs text-slate-400">
                  O sistema voltará ao normal automaticamente amanhã cedo. Suas APRs e dados estão seguros!
                </p>
              </div>
            </div>

            {!isQuota && (
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95"
              >
                Tentar Recarregar
              </button>
            )}
            
            <p className="text-slate-400 text-xs">
              HC Soluções em Software • 2026
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dashboard Layout Component
const DashboardLayout = ({ 
  children, 
  view, 
  setView, 
  isReadOnly, 
  currentApr, 
  handleCreateNew, 
  handleSave,
  isAdmin,
  setIsAdmin,
  user,
  handleLogout,
  deferredPrompt,
  handleInstallClick,
  setShowInstallGuide
}: { 
  children: React.ReactNode;
  view: string;
  setView: (view: any) => void;
  isReadOnly: boolean;
  currentApr: APR | null;
  handleCreateNew: () => void;
  handleSave: () => void;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  user: any;
  handleLogout: () => void;
  deferredPrompt: any;
  handleInstallClick: () => void;
  setShowInstallGuide: (val: boolean) => void;
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuItems = [
    { id: 'list', label: 'APRs', icon: FileText },
    { id: 'employees', label: 'Funcionários', icon: Users },
    { id: 'statistics', label: 'Estatísticas', icon: BarChart3 },
  ];

  const handleViewChange = (newView: any) => {
    setView(newView);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        w-64 bg-[#1a2233] text-white flex flex-col fixed h-screen z-50 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="bg-[#ff7a1a] p-2 rounded-xl shadow-lg">
              <ClipboardList className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter">APR PRO</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                view === item.id || (item.id === 'list' && view === 'edit')
                ? 'bg-[#ff7a1a] text-white shadow-lg shadow-orange-500/20' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-gray-700/50">
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                isAdmin 
                ? 'bg-red-500/20 text-red-500 border border-red-500/50' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Shield size={20} />
              {isAdmin ? 'Modo ADM Ativo' : 'Entrar como ADM'}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-700/50 space-y-4">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-yellow-500 font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate"><span>{user.displayName || 'Usuário'}</span></p>
                <p className="text-[10px] text-gray-500 truncate"><span>{user.email}</span></p>
              </div>
            </div>
          )}
          <button 
            onClick={() => setShowInstallGuide(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-yellow-600 hover:bg-yellow-50 transition-all mt-2"
          >
            <Smartphone size={20} />
            Como instalar no Celular
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <X size={20} />
            Sair do Sistema
          </button>

          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              className="w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-xl font-bold bg-yellow-500 text-white hover:bg-yellow-600 transition-all shadow-lg animate-bounce"
            >
              <Plus size={20} />
              Instalar Aplicativo
            </button>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">© 2026</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Sistema desenvolvido</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Henrique Rodrigues</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full overflow-x-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 lg:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-base lg:text-lg font-bold text-gray-900 truncate max-w-[150px] sm:max-w-none">
              {view === 'list' && <span key="list">Histórico de APRs</span>}
              {view === 'edit' && <span key="edit">{isReadOnly ? 'Visualizar APR' : currentApr?.id ? 'Editar APR' : 'Nova APR'}</span>}
              {view === 'employees' && <span key="emp">Gestão de Equipe</span>}
              {view === 'statistics' && <span key="stats">Painel de Estatísticas</span>}
            </h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {view === 'list' && (
              <button 
                onClick={handleCreateNew}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 lg:px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm lg:text-base"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nova APR</span>
                <span className="sm:hidden">Nova</span>
              </button>
            )}
            {view === 'edit' && !isReadOnly && (
              <div className="flex items-center gap-2 lg:gap-3">
                <button 
                  onClick={() => setView('list')}
                  className="text-gray-500 hover:text-gray-700 px-2 lg:px-4 py-2 rounded-xl font-bold transition-colors text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">Cancelar</span>
                  <X size={20} className="sm:hidden" />
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 lg:px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm lg:text-base"
                >
                  <Save size={18} />
                  <span className="hidden sm:inline">Salvar APR</span>
                  <span className="sm:hidden">Salvar</span>
                </button>
              </div>
            )}
            {view === 'edit' && isReadOnly && (
              <button 
                onClick={() => setView('list')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 lg:px-6 py-2 rounded-xl font-bold transition-all text-sm lg:text-base"
              >
                Voltar
              </button>
            )}
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// Signature Pad Component
const SignaturePad = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolution internal buffer
    if (canvas.width !== 1200) {
      canvas.width = 1200;
      canvas.height = 600;
    }

    // Handle external value changes (like clearing or loading an edit)
    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1200, 600);
      };
      img.src = value;
    }
  }, [value]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent scrolling/sliding on touch
    if (e.cancelable) e.preventDefault();
    
    const pos = getCoordinates(e);
    if (!pos) return;

    setIsDrawing(true);
    lastPos.current = pos;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000';
      
      // Draw a small dot immediately for taps (pingos/acentos)
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Prepare for line drawing
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL());
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    // Prevent scrolling/sliding on touch
    if (e.cancelable) e.preventDefault();

    const pos = getCoordinates(e);
    if (!pos || !lastPos.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastPos.current = pos;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange('');
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL());
    }
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
      <h3 className="text-center font-bold text-gray-900 text-lg">Assine abaixo</h3>
      
      <div className="border-2 border-black rounded-xl bg-white overflow-hidden min-h-[300px] h-full shadow-md touch-none">
        <canvas 
          ref={canvasRef}
          width={1200}
          height={600}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="w-full h-full cursor-crosshair block touch-none"
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="flex gap-3">
        <button 
          onClick={clear}
          className="flex-1 bg-[#e74c3c] hover:bg-red-600 text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-lg"
        >
          <Eraser size={20} /> Limpar
        </button>
        <button 
          onClick={save}
          className="flex-1 bg-[#2ecc71] hover:bg-green-600 text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-lg"
        >
          <Check size={20} /> Salvar
        </button>
      </div>
    </div>
  );
};

// Landing Page Component
const HomePage = ({ setView }: { setView: (view: any) => void }) => (
  <div className="min-h-screen bg-[#1a2233] flex flex-col items-center justify-center p-4 text-white font-sans">
    <div className="max-w-5xl w-full flex flex-col items-center space-y-12">
      {/* Logo Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-[#ff7a1a] p-6 rounded-[2rem] shadow-lg">
          <ClipboardList className="w-20 h-20 text-white" />
        </div>
        <h1 className="text-7xl font-black tracking-tighter">APR</h1>
        <h2 className="text-3xl font-medium text-gray-100">Análise Preliminar de Risco</h2>
        <p className="text-center text-gray-400 max-w-lg leading-relaxed">
          Sistema profissional para gerenciamento de segurança e prevenção de riscos no ambiente de trabalho
        </p>
      </div>

      {/* Main Action */}
      <button 
        onClick={() => setView('list')}
        className="bg-[#ff7a1a] hover:bg-[#e66d17] text-white px-10 py-4 rounded-2xl font-bold text-xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl"
      >
        <ClipboardList size={24} />
        ABRIR APR
      </button>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-12">
        <div 
          onClick={() => setView('list')}
          className="bg-[#2d3748]/50 border border-gray-700 p-8 rounded-3xl space-y-4 hover:bg-[#2d3748]/70 transition-colors cursor-pointer"
        >
          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center">
            <FileText className="text-white w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Criar APRs</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Formulários completos e organizados por categoria de risco
          </p>
        </div>

        <div 
          onClick={() => setView('employees')}
          className="bg-[#2d3748]/50 border border-gray-700 p-8 rounded-3xl space-y-4 hover:bg-[#2d3748]/70 transition-colors cursor-pointer"
        >
          <div className="bg-green-600 w-12 h-12 rounded-xl flex items-center justify-center">
            <Users className="text-white w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Funcionários</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Cadastro de funcionários com assinaturas digitais
          </p>
        </div>

        <div 
          onClick={() => setView('statistics')}
          className="bg-[#2d3748]/50 border border-gray-700 p-8 rounded-3xl space-y-4 hover:bg-[#2d3748]/70 transition-colors cursor-pointer"
        >
          <div className="bg-purple-600 w-12 h-12 rounded-xl flex items-center justify-center">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Estatísticas</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Gestão mensal de acidentes e cálculo de HTT (8,48)
          </p>
        </div>

        <div className="bg-[#2d3748]/50 border border-gray-700 p-8 rounded-3xl space-y-4 hover:bg-[#2d3748]/70 transition-colors">
          <div className="bg-red-600 w-12 h-12 rounded-xl flex items-center justify-center">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Segurança</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            29 tipos de riscos organizados em 6 categorias
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Statistics Page Component
const StatisticsPage = ({ 
  employees, 
  accidentRecords, 
  onSaveRecord, 
  setView, 
  setCurrentStatRecord, 
  setStatDeleteConfirmId, 
  handleExportStatPDF,
  isAdmin
}: { 
  employees: Employee[];
  accidentRecords: AccidentRecord[];
  onSaveRecord: (record: AccidentRecord) => void;
  setView: (view: any) => void;
  setCurrentStatRecord: React.Dispatch<React.SetStateAction<AccidentRecord | null>>;
  setStatDeleteConfirmId: React.Dispatch<React.SetStateAction<string | null>>;
  handleExportStatPDF: (record: AccidentRecord, returnTo?: any) => void;
  isAdmin: boolean;
}) => {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [employeeCount, setEmployeeCount] = useState((employees || []).length || 0);
  const [workingDays, setWorkingDays] = useState(22);
  const [hoursPerDay, setHoursPerDay] = useState(8.48);
  const [accidentsWithLostTime, setAccidentsWithLostTime] = useState(0);
  const [accidentsWithoutLostTime, setAccidentsWithoutLostTime] = useState(0);
  const [fatalAccidents, setFatalAccidents] = useState(0);
  const [daysLost, setDaysLost] = useState(0);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const changeMonth = (delta: number) => {
    const [year, monthNum] = month.split('-').map(Number);
    const date = new Date(year, monthNum - 1 + delta, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setMonth(`${newYear}-${newMonth}`);
  };

  const handleSaveRecord = () => {
    const htt = employeeCount * workingDays * hoursPerDay;
    const frequencyRate = htt > 0 ? ((accidentsWithLostTime + fatalAccidents) * 1000000) / htt : 0;
    const severityRate = htt > 0 ? (daysLost * 1000000) / htt : 0;

    const record: AccidentRecord = {
      id: editingRecordId || generateId(),
      month,
      employeeCount,
      workingDays,
      hoursPerDay,
      accidentsWithLostTime,
      accidentsWithoutLostTime,
      fatalAccidents,
      daysLost,
      htt,
      frequencyRate,
      severityRate
    };

    onSaveRecord(record);
    setEditingRecordId(null);
    
    // Reset form
    setAccidentsWithLostTime(0);
    setAccidentsWithoutLostTime(0);
    setFatalAccidents(0);
    setDaysLost(0);
  };

  const handleEdit = (record: AccidentRecord) => {
    setEditingRecordId(record.id);
    setMonth(record.month);
    setEmployeeCount(record.employeeCount);
    setWorkingDays(record.workingDays);
    setHoursPerDay(record.hoursPerDay);
    setAccidentsWithLostTime(record.accidentsWithLostTime);
    setAccidentsWithoutLostTime(record.accidentsWithoutLostTime);
    setFatalAccidents(record.fatalAccidents || 0);
    setDaysLost(record.daysLost);
  };

  const handleViewReport = (record: AccidentRecord) => {
    setCurrentStatRecord(record);
    setView('stat-report');
  };

  const chartData = [...(accidentRecords || [])].reverse().map(r => ({
    name: getMonthName(r.month, { month: 'short', year: 'numeric' }),
    monthLabel: getMonthName(r.month, { month: 'short' }),
    TF: Number(r.frequencyRate.toFixed(2)),
    TG: Number(r.severityRate.toFixed(2)),
    HTT: Math.round(r.htt),
    Fatais: r.fatalAccidents || 0,
    Totais: (r.accidentsWithLostTime || 0) + (r.accidentsWithoutLostTime || 0) + (r.fatalAccidents || 0),
    DiasPerdidos: r.daysLost || 0
  }));

  return (
    <div className="space-y-8">
      {/* Dashboard Cards - Matching Image */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#3B82F6] p-6 rounded-xl shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-blue-100 mb-1">Total de Acidentes</p>
              <p className="text-4xl font-black text-white">
                {(accidentRecords || []).reduce((acc, r) => acc + (r.accidentsWithLostTime || 0) + (r.accidentsWithoutLostTime || 0) + (r.fatalAccidents || 0), 0)}
              </p>
            </div>
            <AlertTriangle className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-white/20 group-hover:scale-110 transition-transform" />
          </div>
          
          <div className="bg-[#EF4444] p-6 rounded-xl shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-red-100 mb-1">Acidentes Fatais</p>
              <p className="text-4xl font-black text-white">
                {(accidentRecords || []).reduce((acc, r) => acc + (r.fatalAccidents || 0), 0)}
              </p>
            </div>
            <Skull className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-white/20 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-[#F59E0B] p-6 rounded-xl shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-orange-100 mb-1">Taxa de Frequência (TF)</p>
              <p className="text-4xl font-black text-white">
                {(accidentRecords || []).length > 0 
                  ? (accidentRecords[0].frequencyRate || 0).toFixed(0) 
                  : 0}
              </p>
            </div>
            <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-white/20 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-[#A855F7] p-6 rounded-xl shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-purple-100 mb-1">Taxa de Gravidade (TG)</p>
              <p className="text-4xl font-black text-white">
                {(accidentRecords || []).length > 0 
                  ? (accidentRecords[0].severityRate || 0).toFixed(0) 
                  : 0}
              </p>
            </div>
            <Activity className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-white/20 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* Charts Grid - Matching Image */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Acidentes por Mês */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" /> Acidentes por Mês
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar dataKey="Fatais" fill="#EF4444" radius={[4, 4, 0, 0]} name="Fatais" />
                  <Bar dataKey="Totais" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Acidentes totais" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evolução TF e TG */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-600" /> Evolução TF e TG
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Line type="monotone" dataKey="TF" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} name="Taxa Frequência (TF)" />
                  <Line type="monotone" dataKey="TG" stroke="#A855F7" strokeWidth={2} dot={{ r: 4 }} name="Taxa Gravidade (TG)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Horas Homem Trabalhadas (HTT) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold mb-6 flex items-center gap-2">
              <Clock size={18} className="text-teal-600" /> Horas Homem Trabalhadas (HTT)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="HTT" fill="#14B8A6" radius={[4, 4, 0, 0]} name="HTT" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dias Perdidos por Mês */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold mb-6 flex items-center gap-2">
              <Users size={18} className="text-red-500" /> Dias Perdidos por Mês
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="DiasPerdidos" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Dias Perdidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Record Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold border-b border-gray-100 pb-2">Lançamento Mensal</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Mês/Ano Referência</label>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => changeMonth(-1)}
                      className="p-3 shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                      title="Mês Anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <input 
                      type="month" 
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="flex-1 min-w-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-purple-500/20 outline-none"
                    />
                    <button 
                      onClick={() => changeMonth(1)}
                      className="p-3 shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                      title="Próximo Mês"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Efetivo Médio</label>
                  <input 
                    type="number" 
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Dias Úteis</label>
                  <input 
                    type="number" 
                    value={workingDays}
                    onChange={(e) => setWorkingDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Horas/Dia</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Acidentes CPT</label>
                    <input 
                      type="number" 
                      value={accidentsWithLostTime}
                      onChange={(e) => setAccidentsWithLostTime(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Acidentes SPT</label>
                    <input 
                      type="number" 
                      value={accidentsWithoutLostTime}
                      onChange={(e) => setAccidentsWithoutLostTime(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Fatais</label>
                  <input 
                    type="number" 
                    value={fatalAccidents}
                    onChange={(e) => setFatalAccidents(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Dias Perdidos</label>
                  <input 
                    type="number" 
                    value={daysLost}
                    onChange={(e) => setDaysLost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl space-y-1">
                <div className="flex justify-between text-xs font-bold text-purple-600 uppercase">
                  <span>HTT Calculado</span>
                  <span><span>{(employeeCount * workingDays * hoursPerDay).toLocaleString()}</span>h</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveRecord}
                  className={`flex-1 ${editingRecordId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2`}
                >
                  {editingRecordId ? <Edit2 size={18} /> : <Plus size={18} />} 
                  {editingRecordId ? 'Atualizar' : 'Salvar'}
                </button>
                <button 
                  onClick={() => {
                    const htt = employeeCount * workingDays * hoursPerDay;
                    const frequencyRate = htt > 0 ? (accidentsWithLostTime * 1000000) / htt : 0;
                    const severityRate = htt > 0 ? (daysLost * 1000000) / htt : 0;
                    handleViewReport({
                      id: 'preview',
                      month,
                      employeeCount,
                      workingDays,
                      hoursPerDay,
                      accidentsWithLostTime,
                      accidentsWithoutLostTime,
                      fatalAccidents,
                      daysLost,
                      htt,
                      frequencyRate,
                      severityRate
                    });
                  }}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold transition-all flex items-center justify-center"
                  title="Prévia do Relatório"
                >
                  <FileText size={18} />
                </button>
              </div>
              {editingRecordId && (
                <button 
                  onClick={() => {
                    setEditingRecordId(null);
                    setAccidentsWithLostTime(0);
                    setAccidentsWithoutLostTime(0);
                    setDaysLost(0);
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-xl font-bold transition-all"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
          </div>

          {/* Records List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold">Histórico de Lançamentos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mês</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">HTT</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CPT/SPT</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">TF</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(accidentRecords || []).map(record => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">
                          {getMonthName(record.month)}
                        </div>
                        <div className="text-xs text-gray-500">{record.employeeCount} funcionários</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">
                        {Math.round(record.htt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-bold">{record.accidentsWithLostTime}</span>
                          <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-bold">{record.accidentsWithoutLostTime}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-600">
                        {record.frequencyRate.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleViewReport(record)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver Relatório"
                          >
                            <FileText size={18} />
                          </button>
                          <button 
                            onClick={() => handleExportStatPDF(record)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Exportar PDF"
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => handleEdit(record)}
                            className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={() => setStatDeleteConfirmId(record.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(accidentRecords || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

// APR Monthly Report Component
const APRMonthlyReport = ({ aprs, setView, reportMonth, setReportMonth }: { 
  aprs: APR[]; 
  setView: (view: any) => void;
  reportMonth: string;
  setReportMonth: (month: string) => void;
}) => {
  const filteredAprs = useMemo(() => (aprs || []).filter(apr => apr.date.startsWith(reportMonth)), [aprs, reportMonth]);
  
  const totalRisksCount = useMemo(() => filteredAprs.reduce((acc, apr) => acc + (apr.risks || []).length, 0), [filteredAprs]);
  const totalMeasuresCount = useMemo(() => filteredAprs.reduce((acc, apr) => acc + (apr.risks || []).reduce((sum, r) => sum + (r.measures || []).length, 0), 0), [filteredAprs]);
  
  const riskStats = useMemo(() => {
    if (filteredAprs.length === 0) return [];
    const counts: Record<string, number> = {};
    filteredAprs.forEach(apr => {
      const uniqueRisksInApr = new Set<string>((apr.risks || []).map(r => r.description.trim()));
      uniqueRisksInApr.forEach(risk => {
        if (risk) counts[risk] = (counts[risk] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / filteredAprs.length) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredAprs]);

  const measureStats = useMemo(() => {
    if (filteredAprs.length === 0) return [];
    const counts: Record<string, number> = {};
    filteredAprs.forEach(apr => {
      const uniqueMeasuresInApr = new Set<string>((apr.risks || []).flatMap(r => (r.measures || []).map(m => m.trim())));
      uniqueMeasuresInApr.forEach(measure => {
        if (measure) counts[measure] = (counts[measure] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / filteredAprs.length) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredAprs]);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const element = document.getElementById('apr-monthly-report-content');
    if (!element) return;
    
    const opt = {
      margin: 10,
      filename: `Relatorio_APR_${reportMonth}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // @ts-ignore
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium"
          >
            <ArrowLeft size={20} /> Voltar para Lista
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handlePrintReport}
              className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Printer size={18} /> Imprimir
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md"
            >
              <Download size={18} /> Exportar PDF
            </button>
          </div>
        </div>

        <div id="apr-monthly-report-content" className="bg-white p-6 sm:p-12 rounded-2xl shadow-xl border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-gray-900 pb-6 mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: '#eab308' }}>
                <ClipboardList className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter">Relatório Consolidado</h1>
                <p className="text-gray-500 font-medium">Análise de riscos e estatísticas de acidentes</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-400 uppercase">Período</p>
              <p className="text-xl font-black text-gray-900">
                {getMonthName(reportMonth).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total de APRs</p>
              <p className="text-3xl font-black text-gray-900">{filteredAprs.length}</p>
              <p className="text-[10px] text-gray-400 mt-1">Análises cadastradas</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Riscos Identificados</p>
              <p className="text-3xl font-black" style={{ color: '#ca8a04' }}>{totalRisksCount}</p>
              <p className="text-[10px] text-gray-400 mt-1">Total de incidências</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Medidas Aplicadas</p>
              <p className="text-3xl font-black" style={{ color: '#16a34a' }}>{totalMeasuresCount}</p>
              <p className="text-[10px] text-gray-400 mt-1">Total de aplicações</p>
            </div>
          </div>

          <div className="space-y-10">
            {/* Top Risks Section */}
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#fff5f5', borderColor: '#fee2e2' }}>
              <div className="p-4 border-b flex items-center gap-2" style={{ backgroundColor: '#fef2f2', borderColor: '#fee2e2' }}>
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <h2 className="text-sm font-black uppercase" style={{ color: '#7f1d1d' }}>Top 5 Riscos Mais Comuns</h2>
              </div>
              <div className="p-6 space-y-4">
                {riskStats.map((risk, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-gray-700">{risk.name}</span>
                        <span className="text-[10px] font-black text-gray-900">{risk.count} ({risk.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                        <div 
                          className="h-full rounded-full" 
                          style={{ width: `${risk.percentage}%`, backgroundColor: '#ef4444' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                {riskStats.length === 0 && (
                  <p className="text-center text-xs text-gray-400 italic py-4">Nenhum dado de risco disponível.</p>
                )}
              </div>
            </div>

            {/* Top Measures Section */}
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }}>
              <div className="p-4 border-b flex items-center gap-2" style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }}>
                <Shield size={18} style={{ color: '#22c55e' }} />
                <h2 className="text-sm font-black uppercase" style={{ color: '#14532d' }}>As 5 principais medidas de controle mais utilizadas</h2>
              </div>
              <div className="p-6 space-y-4">
                {measureStats.map((measure, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-gray-700">{measure.name}</span>
                        <span className="text-[10px] font-black text-gray-900">{measure.count} ({measure.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                        <div 
                          className="h-full rounded-full" 
                          style={{ width: `${measure.percentage}%`, backgroundColor: '#22c55e' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                {measureStats.length === 0 && (
                  <p className="text-center text-xs text-gray-400 italic py-4">Nenhuma medida de controle disponível.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-black uppercase border-l-4 border-yellow-500 pl-4">Detalhamento das Atividades</h2>
            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: '#111827' }}>
                    <th className="px-6 py-4 text-xs font-bold uppercase">Data</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase">OS</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase">Atividade</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase">Riscos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAprs.map(apr => (
                    <tr key={apr.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold">
                        {formatDateForDisplay(apr.date)}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono">{apr.osNumber}</td>
                      <td className="px-6 py-4 text-sm font-medium">{apr.task}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-lg font-bold" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>
                          {(apr.risks || []).length}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAprs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                        Nenhuma atividade registrada para este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-end">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Relatório gerado em</p>
              <p className="text-sm font-medium">{new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div className="text-right">
              <div className="w-48 border-b border-gray-900 mb-2"></div>
              <p className="text-xs font-bold text-gray-400 uppercase">Assinatura do Responsável</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Report Component
const StatReport = ({ record, setView }: { record: AccidentRecord; setView: (view: any) => void }) => {
  if (!record) return null;

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const element = document.getElementById('stat-report-content');
    if (!element) return;
    
    const opt = {
      margin: 10,
      filename: `Relatorio_Seguranca_${record.month}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // @ts-ignore
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <button 
            onClick={() => setView('statistics')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium"
          >
            <ArrowLeft size={20} /> Voltar para Estatísticas
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Printer size={18} /> Imprimir
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md"
            >
              <Download size={18} /> Exportar PDF
            </button>
          </div>
        </div>

        <div id="stat-report-content" className="bg-white p-6 sm:p-12 rounded-2xl shadow-xl border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-gray-900 pb-6 mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: '#9333ea' }}>
                <BarChart3 className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter">Relatório de Desempenho de Segurança</h1>
                <p className="text-gray-500 font-medium">Indicadores Mensais de Acidentabilidade</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-400 uppercase">Mês de Referência</p>
              <p className="text-xl font-black text-gray-900">
                {getMonthName(record.month).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Dados de Exposição</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Efetivo Médio</p>
                  <p className="text-xl font-black">{record.employeeCount}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Horas Trabalhadas</p>
                  <p className="text-xl font-black">{Math.round(record.htt).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Indicadores de Desempenho</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border" style={{ backgroundColor: '#eff6ff', borderColor: '#dbeafe' }}>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#2563eb' }}>Taxa Frequência (TF)</p>
                  <p className="text-xl font-black" style={{ color: '#1d4ed8' }}>{record.frequencyRate.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-xl border" style={{ backgroundColor: '#faf5ff', borderColor: '#f3e8ff' }}>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#9333ea' }}>Taxa Gravidade (TG)</p>
                  <p className="text-xl font-black" style={{ color: '#7e22ce' }}>{record.severityRate.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Resumo de Ocorrências</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Acidentes CPT</p>
                <p className="text-2xl font-black" style={{ color: '#ef4444' }}>{record.accidentsWithLostTime}</p>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Acidentes SPT</p>
                <p className="text-2xl font-black" style={{ color: '#f97316' }}>{record.accidentsWithoutLostTime}</p>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Fatais</p>
                <p className="text-2xl font-black text-gray-900">{record.fatalAccidents || 0}</p>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Dias Perdidos</p>
                <p className="text-2xl font-black" style={{ color: '#b91c1c' }}>{record.daysLost}</p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-gray-50 rounded-2xl border border-gray-100 italic text-sm text-gray-600">
            <p><strong>Nota:</strong> Os cálculos de Taxa de Frequência e Gravidade seguem os critérios da NBR 14280. HTT (Horas Homem Trabalhadas) é a base para o cálculo dos coeficientes de acidentabilidade.</p>
          </div>

          <div className="mt-20 flex flex-col sm:flex-row justify-between items-center gap-12 px-8">
            <div className="text-center">
              <div className="w-64 border-b border-gray-400 mb-2"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Responsável Técnico / SESMT</p>
            </div>
            <div className="text-center">
              <div className="w-64 border-b border-gray-400 mb-2"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Diretoria / Gerência</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {
    // Fallback to manual ID generation
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [asyncError, setAsyncError] = useState<any>(null);
  const [aprs, setAprs] = useState<APR[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accidentRecords, setAccidentRecords] = useState<AccidentRecord[]>([]);
  const [view, setView] = useState<'home' | 'list' | 'edit' | 'print' | 'employees' | 'statistics' | 'stat-report' | 'apr-monthly-report'>('home');
  const [currentApr, setCurrentApr] = useState<APR | null>(null);
  const [currentStatRecord, setCurrentStatRecord] = useState<AccidentRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statDeleteConfirmId, setStatDeleteConfirmId] = useState<string | null>(null);
  const [empDeleteConfirmId, setEmpDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedEmpRole, setSelectedEmpRole] = useState<string>('all');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [newMeasureInputs, setNewMeasureInputs] = useState<{[key: string]: string}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showEmployeeSuccess, setShowEmployeeSuccess] = useState(false);
  const [showAprSuccess, setShowAprSuccess] = useState(false);
  const [quickEmpName, setQuickEmpName] = useState('');
  const [quickEmpRole, setQuickEmpRole] = useState('Executante');
  const [quickEmpSignature, setQuickEmpSignature] = useState('');
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showCommonRisks, setShowCommonRisks] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Trigger ErrorBoundary for async errors
  if (asyncError) {
    throw asyncError;
  }

  // PWA Install Listener
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Auth Listener with timeout fallback
  useEffect(() => {
    // Timeout fallback in case Firebase auth never responds
    const timeout = setTimeout(() => {
      setIsAuthReady(true);
    }, 5000);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      setUser(user);
      if (user) {
        try {
          // Check if user is admin in Firestore or by email
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const isDefaultAdmin = user.email === "henriquenr.rodrigues@gmail.com";
          setIsAdmin(userData?.role === 'admin' || isDefaultAdmin);
          
          // Sync user profile to Firestore if it doesn't exist
          if (!userDoc.exists()) {
            try {
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                role: isDefaultAdmin ? 'admin' : 'user'
              });
            } catch (error) {
              try {
                handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
              } catch (e) {
                setAsyncError(e);
              }
            }
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
          // Fallback for admin check if Firestore fails
          const isDefaultAdmin = user.email === "henriquenr.rodrigues@gmail.com";
          setIsAdmin(isDefaultAdmin);
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthReady(true);
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!isAuthReady || !user) return;
    
    // Skip Firestore listeners in demo mode
    if (user.uid === 'demo-user-123') {
      console.log('Demo mode: skipping Firestore listeners');
      return;
    }

    const qAprs = query(collection(db, 'aprs'), orderBy('createdAt', 'desc'), limit(100));
    const unsubAprs = onSnapshot(qAprs, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as APR);
      setAprs(data);
      console.log(`Loaded ${data.length} APRs`);
    }, (error) => {
      console.error("Firestore error (aprs):", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'aprs');
      } catch (e) {
        setAsyncError(e);
      }
    });

    const qEmployees = query(collection(db, 'employees'), orderBy('name', 'asc'), limit(100));
    const unsubEmployees = onSnapshot(qEmployees, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Employee);
      setEmployees(data);
      console.log(`Loaded ${data.length} employees`);
    }, (error) => {
      console.error("Firestore error (employees):", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'employees');
      } catch (e) {
        setAsyncError(e);
      }
    });

    const qAccidents = query(collection(db, 'accidentRecords'), orderBy('month', 'desc'), limit(100));
    const unsubAccidents = onSnapshot(qAccidents, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as AccidentRecord);
      setAccidentRecords(data);
      console.log(`Loaded ${data.length} accident records`);
    }, (error) => {
      console.error("Firestore error (accidents):", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'accidentRecords');
      } catch (e) {
        setAsyncError(e);
      }
    });

    return () => {
      unsubAprs();
      unsubEmployees();
      unsubAccidents();
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    if (showEmployeeSuccess) {
      const timer = setTimeout(() => setShowEmployeeSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showEmployeeSuccess]);

  useEffect(() => {
    if (showAprSuccess) {
      const timer = setTimeout(() => setShowAprSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showAprSuccess]);

  useEffect(() => {
    if (saveError) {
      const timer = setTimeout(() => setSaveError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [saveError]);

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      const errorMessage = error?.message || 'Erro ao fazer login';
      if (errorMessage.includes('invalid') || errorMessage.includes('unauthorized') || errorMessage.includes('popup-closed')) {
        setLoginError('O dominio atual nao esta autorizado no Firebase. Configure o dominio no Firebase Console ou use o modo demo.');
      } else {
        setLoginError(errorMessage);
      }
    }
  };

  const handleDemoLogin = () => {
    setIsDemoMode(true);
    setUser({ email: 'demo@aprpro.com', displayName: 'Usuario Demo', uid: 'demo-user-123' });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('home');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const filteredAprs = useMemo(() => {
    if (!Array.isArray(aprs)) return [];
    return aprs.filter(apr => {
      if (!apr) return false;
      const company = String(apr.company || '');
      const task = String(apr.task || '');
      const location = String(apr.location || '');
      const osNumber = String(apr.osNumber || '');
      const date = String(apr.date || '');

      const matchesSearch = 
        company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        osNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMonth = selectedMonth === 'all' || date.startsWith(selectedMonth);
      
      const aprParticipants = [
        ...(apr.executors || []),
        ...(apr.safetyTechnicians || []),
        ...(apr.responsible ? [{ name: apr.responsible, role: 'Encarregado/Responsável' }] : [])
      ];

      const matchesRole = selectedRole === 'all' || aprParticipants.some(p => p.role === selectedRole);
      
      return matchesSearch && matchesMonth && matchesRole;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [aprs, searchTerm, selectedMonth, selectedRole]);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter(emp => {
      const name = String(emp.name || '');
      const role = String(emp.role || '');
      
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedEmpRole === 'all' || role === selectedEmpRole;
      
      return matchesSearch && matchesRole;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [employees, searchTerm, selectedEmpRole]);

  const stats = useMemo(() => {
    const aprList = Array.isArray(aprs) ? aprs : [];
    const empList = Array.isArray(employees) ? employees : [];
    return {
      total: aprList.length,
      employees: empList.length,
      recent: aprList.filter(a => {
        if (!a || !a.createdAt) return false;
        const date = new Date(a.createdAt);
        const now = new Date();
        return (now.getTime() - date.getTime()) < (7 * 24 * 60 * 60 * 1000);
      }).length,
    };
  }, [aprs, employees]);

  const handleCreateNew = () => {
    if (!user) return;
    const newApr: APR = {
      id: generateId(),
      company: 'Fiaux Soluções Tecnológicas',
      osNumber: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      task: '',
      risks: [],
      responsible: '',
      signature: '',
      safetyTechnicians: [],
      executors: [],
      photos: [],
      createdAt: new Date().toISOString(),
      uid: user.uid
    };
    setCurrentApr(newApr);
    setIsReadOnly(false);
    setView('edit');
  };

  const handleEdit = (apr: APR) => {
    setCurrentApr({ ...apr });
    setView('edit');
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!isAdmin || !deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'aprs', deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `aprs/${deleteConfirmId}`);
    }
  };

  const handleSave = async () => {
    if (!currentApr) return;
    if (!user) {
      setSaveError('Sessão expirada ou usuário não autenticado. Por favor, faça login novamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setSaveError(null);
    if (!currentApr.id) {
      setSaveError('Erro interno: ID da APR não encontrado. Tente criar uma nova APR.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!currentApr.company?.trim() || !currentApr.task?.trim()) {
      setSaveError('Por favor, preencha a empresa e a tarefa.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!currentApr.date || !dateRegex.test(currentApr.date)) {
      setSaveError('Data inválida. Por favor, selecione uma data válida (AAAA-MM-DD).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    try {
      // Ensure all required fields for Firestore rules are present
      const aprData: APR = {
        ...currentApr,
        company: (currentApr.company || '').trim(),
        task: (currentApr.task || '').trim(),
        location: (currentApr.location || '').trim(),
        responsible: (currentApr.responsible || '').trim(),
        osNumber: (currentApr.osNumber || '').trim(),
        signature: currentApr.signature || '',
        risks: currentApr.risks || [],
        executors: currentApr.executors || [],
        safetyTechnicians: currentApr.safetyTechnicians || [],
        photos: currentApr.photos || [],
        uid: currentApr.uid || user.uid,
        createdAt: currentApr.createdAt || new Date().toISOString()
      };

      // Final validation before sending to Firestore
      if (!aprData.location) {
        throw new Error('O campo "Local de Trabalho" é obrigatório.');
      }
      if (!aprData.responsible) {
        throw new Error('O campo "Responsável pela Execução" é obrigatório.');
      }
      if (!aprData.signature) {
        throw new Error('A assinatura do responsável é obrigatória.');
      }

      // Basic size check for Firestore (1MB limit)
      const size = JSON.stringify(aprData).length;
      if (size > 1000000) {
        throw new Error('O documento está muito grande (limite de 1MB). Tente remover algumas fotos ou reduzir a descrição.');
      }

      await setDoc(doc(db, 'aprs', currentApr.id), aprData);
      setShowAprSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setView('list');
      setCurrentApr(null);
    } catch (error: any) {
      console.error("Error saving APR:", error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      let errorMessage = 'Ocorreu um erro inesperado ao salvar a APR.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Erro de permissão: Você não tem autorização para salvar ou alterar esta APR.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Erro de conexão: O serviço está temporariamente indisponível. Verifique sua internet.';
      } else if (error.message) {
        try {
          // Check if it's our custom JSON error from handleFirestoreError
          const parsed = JSON.parse(error.message);
          if (parsed.error) {
            if (parsed.error.includes('insufficient permissions')) {
              errorMessage = 'Erro de permissão: Você não tem autorização para salvar esta APR.';
            } else {
              errorMessage = `Erro: ${parsed.error}`;
            }
          } else {
            errorMessage = `Erro: ${error.message}`;
          }
        } catch (e) {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      
      setSaveError(errorMessage);
      // Only call handleFirestoreError if it's not already a wrapped error to avoid double throwing
      if (!error.message || !error.message.startsWith('{')) {
        handleFirestoreError(error, OperationType.WRITE, `aprs/${currentApr.id}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = (apr: APR) => {
    setCurrentApr(apr);
    setView('print');
    setTimeout(() => {
      window.print();
      setView('list');
    }, 500);
  };

  const handleExportPDF = (apr: APR, returnTo: typeof view = 'list') => {
    setCurrentApr(apr);
    setView('print');
    
    setTimeout(() => {
      const element = document.getElementById('apr-print-view');
      if (element) {
        const opt = {
          margin: 10,
          filename: `APR_${apr.osNumber || apr.id.slice(0,8)}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(element).save().then(() => {
          setView(returnTo);
        });
      } else {
        setView(returnTo);
      }
    }, 1000);
  };

  const handleExportStatPDF = (record: AccidentRecord, returnTo: typeof view = 'statistics') => {
    setCurrentStatRecord(record);
    setView('stat-report');
    
    setTimeout(() => {
      const element = document.getElementById('stat-report-view');
      if (element) {
        const opt = {
          margin: 10,
          filename: `Relatorio_Seguranca_${record.month}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(element).save().then(() => {
          setView(returnTo);
        });
      } else {
        setView(returnTo);
      }
    }, 1000);
  };

  const handleExportMonthlyAPRReport = (month: string) => {
    setReportMonth(month);
    setView('apr-monthly-report');
    
    setTimeout(() => {
      const element = document.getElementById('apr-monthly-report-content');
      if (element) {
        const opt = {
          margin: 10,
          filename: `Relatorio_Consolidado_APR_${month}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => {
          setView('list');
        });
      } else {
        setView('list');
      }
    }, 1500);
  };

  const confirmStatDelete = async () => {
    if (!isAdmin || !statDeleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'accidentRecords', statDeleteConfirmId));
      setStatDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accidentRecords/${statDeleteConfirmId}`);
    }
  };

  const confirmEmpDelete = async () => {
    if (!isAdmin || !empDeleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'employees', empDeleteConfirmId));
      setEmpDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${empDeleteConfirmId}`);
    }
  };

  const handleSaveStatRecord = async (record: AccidentRecord) => {
    try {
      await setDoc(doc(db, 'accidentRecords', record.id), record);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `accidentRecords/${record.id}`);
    }
  };

  const addRisk = (riskDesc: string, measures: string[]) => {
    if (!currentApr) return;
    const newRisk: Risk = {
      id: generateId(),
      description: riskDesc,
      measures: [...measures]
    };
    setCurrentApr({
      ...currentApr,
      risks: [...currentApr.risks, newRisk]
    });
  };

  const removeRisk = (riskId: string) => {
    if (!currentApr) return;
    setCurrentApr({
      ...currentApr,
      risks: currentApr.risks.filter(r => r.id !== riskId)
    });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.4 quality to ensure it fits within Firestore limits
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentApr || !e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;

    if ((currentApr.photos || []).length >= 10) {
      setSaveError("Limite de 10 fotos por APR atingido.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      setCurrentApr({
        ...currentApr,
        photos: [...(currentApr.photos || []), compressed]
      });
    } catch (error) {
      console.error("Error compressing image:", error);
      setSaveError("Erro ao processar imagem. Tente outra foto.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    if (!currentApr) return;
    setCurrentApr({
      ...currentApr,
      photos: currentApr.photos.filter((_, i) => i !== index)
    });
  };

  const toggleExecutor = (employee: Employee) => {
    if (!currentApr) return;
    const isSelected = currentApr.executors.some(e => e.id === employee.id);
    if (isSelected) {
      setCurrentApr({
        ...currentApr,
        executors: currentApr.executors.filter(e => e.id !== employee.id)
      });
    } else {
      setCurrentApr({
        ...currentApr,
        executors: [...currentApr.executors, employee]
      });
    }
  };

  const removeExecutor = (index: number) => {
    if (!currentApr) return;
    const newExecutors = [...currentApr.executors];
    newExecutors.splice(index, 1);
    setCurrentApr({ ...currentApr, executors: newExecutors });
  };

  const addEmptyExecutor = () => {
    if (!currentApr) return;
    const placeholder: Employee = {
      id: `temp-${generateId()}`,
      name: '',
      role: 'Executante',
      signature: ''
    };
    setCurrentApr({ ...currentApr, executors: [...currentApr.executors, placeholder] });
  };

  const updateExecutorSelection = (index: number, employeeId: string) => {
    if (!currentApr) return;
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    const newExecutors = [...currentApr.executors];
    newExecutors[index] = employee;
    setCurrentApr({ ...currentApr, executors: newExecutors });
  };

  const toggleSafetyTechnician = (employee: Employee) => {
    if (!currentApr) return;
    const isSelected = (currentApr.safetyTechnicians || []).some(e => e.id === employee.id);
    if (isSelected) {
      setCurrentApr({
        ...currentApr,
        safetyTechnicians: (currentApr.safetyTechnicians || []).filter(e => e.id !== employee.id)
      });
    } else {
      setCurrentApr({
        ...currentApr,
        safetyTechnicians: [...(currentApr.safetyTechnicians || []), employee]
      });
    }
  };

  const handleQuickAddEmployee = async (type: 'tech' | 'executor' | 'general') => {
    if (!quickEmpName.trim() || !quickEmpSignature) return;
    
    const empData: Employee = {
      id: editingEmployeeId || generateId(),
      name: quickEmpName.trim(),
      role: quickEmpRole.trim() || (type === 'tech' ? 'Técnico de Segurança' : 'Executante'),
      signature: quickEmpSignature
    };

    try {
      await setDoc(doc(db, 'employees', empData.id), empData);
      
      if (currentApr && !editingEmployeeId) {
        if (type === 'tech') {
          toggleSafetyTechnician(empData);
        } else if (type === 'executor') {
          toggleExecutor(empData);
        }
      }

      setQuickEmpName('');
      setQuickEmpRole('Executante');
      setQuickEmpSignature('');
      setEditingEmployeeId(null);
      setShowEmployeeSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `employees/${empData.id}`);
    }
  };

  const handleAddMeasure = (riskId: string, measure: string) => {
    if (!currentApr || !measure.trim()) return;
    const newRisks = currentApr.risks.map(r => 
      r.id === riskId ? { ...r, measures: [...r.measures, measure.trim()] } : r
    );
    setCurrentApr({ ...currentApr, risks: newRisks });
    setNewMeasureInputs(prev => ({ ...prev, [riskId]: '' }));
  };

  const handleRemoveMeasure = (riskId: string, measureIndex: number) => {
    if (!currentApr) return;
    const newRisks = currentApr.risks.map(r => 
      r.id === riskId ? { ...r, measures: r.measures.filter((_, i) => i !== measureIndex) } : r
    );
    setCurrentApr({ ...currentApr, risks: newRisks });
  };







  if (!isAuthReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a2233', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #eab308', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'white', fontWeight: 'bold' }}>Carregando APR PRO...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2233] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="bg-[#ff7a1a] p-4 rounded-2xl shadow-xl shadow-orange-500/20">
              <Shield className="text-white w-12 h-12" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-gray-900">APR PRO</h1>
              <p className="text-gray-500 font-medium">Segurança do Trabalho Digital</p>
            </div>
          </div>

<div className="space-y-4">
  <p className="text-gray-600 text-sm">Acesse sua conta para gerenciar APRs e estatísticas de segurança.</p>
  <button
  onClick={handleLogin}
  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95"
  >
  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
  Entrar com Google
  </button>
  
  {loginError && (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
      {loginError}
    </div>
  )}
  
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-200"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-gradient-to-b from-amber-50 to-orange-100 text-gray-500">ou</span>
    </div>
  </div>
  
  <button
    onClick={handleDemoLogin}
    className="w-full flex items-center justify-center gap-3 bg-amber-500 text-white py-4 rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-sm active:scale-95"
  >
    Entrar em Modo Demo
  </button>
  <p className="text-gray-400 text-xs text-center">O modo demo permite testar o app sem autenticacao</p>
  </div>

          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold space-y-1">
            <p>© 2026 - Sistema desenvolvido</p>
            <p>Henrique Rodrigues</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <ErrorBoundary>
        <HomePage setView={setView} />
      </ErrorBoundary>
    );
  }

  if (view === 'stat-report' && currentStatRecord) {
    return (
      <ErrorBoundary>
        <StatReport record={currentStatRecord} setView={setView} />
      </ErrorBoundary>
    );
  }

  if (view === 'apr-monthly-report') {
    return (
      <ErrorBoundary>
        <APRMonthlyReport 
          aprs={aprs} 
          setView={setView} 
          reportMonth={reportMonth}
          setReportMonth={setReportMonth}
        />
      </ErrorBoundary>
    );
  }

  if (view === 'print' && currentApr) {
    return (
      <div id="apr-print-view" className="p-8 bg-white min-h-screen text-black print:p-0">
        <div className="border-2 border-black p-4 mb-4">
          <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
            <h1 className="text-2xl font-bold uppercase">Análise Preliminar de Risco (APR)</h1>
            <div className="text-right">
              <p className="font-bold">ID: {currentApr.id.slice(0, 8)}</p>
              <p>Data: {formatDateForDisplay(currentApr.date)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="font-bold uppercase text-xs text-gray-600">Empresa</p>
              <p className="border-b border-gray-300 pb-1">{currentApr.company}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-xs text-gray-600">Número da OS</p>
              <p className="border-b border-gray-300 pb-1">{currentApr.osNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-xs text-gray-600">Local de Trabalho</p>
              <p className="border-b border-gray-300 pb-1">{currentApr.location}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-xs text-gray-600">Data</p>
              <p className="border-b border-gray-300 pb-1">{formatDateForDisplay(currentApr.date)}</p>
            </div>
            <div className="col-span-2">
              <p className="font-bold uppercase text-xs text-gray-600">Descrição da Tarefa</p>
              <p className="border-b border-gray-300 pb-1">{currentApr.task}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-xs text-gray-600">Responsável pela Execução</p>
              <p className="border-b border-gray-300 pb-1">{currentApr.responsible}</p>
            </div>
          </div>

          {(currentApr.photos || []).length > 0 && (
            <div className="mb-6">
              <p className="font-bold uppercase text-xs text-gray-600 mb-2">Fotos das Atividades</p>
              <div className="grid grid-cols-3 gap-2">
                {(currentApr.photos || []).map((photo, i) => (
                  <img key={i} src={photo} alt={`Atividade ${i+1}`} className="w-full h-32 object-cover border border-gray-300 rounded" referrerPolicy="no-referrer" />
                ))}
              </div>
            </div>
          )}

          <table className="w-full border-collapse border border-black mb-8">
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th className="border border-black p-2 text-left w-1/3 uppercase text-sm">Riscos Identificados</th>
                <th className="border border-black p-2 text-left uppercase text-sm">Medidas Preventivas / Controle</th>
              </tr>
            </thead>
            <tbody>
              {(currentApr.risks || []).map(risk => (
                <tr key={risk.id}>
                  <td className="border border-black p-2 align-top font-medium">{risk.description}</td>
                  <td className="border border-black p-2 align-top">
                    <ul className="list-disc list-inside space-y-1">
                      {(risk.measures || []).map((m, i) => (
                        <li key={i} className="text-sm">{m}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {(currentApr.risks || []).length === 0 && (
                <tr>
                  <td colSpan={2} className="border border-black p-4 text-center text-gray-400 italic">
                    Nenhum risco registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-16 space-y-16">
            <div className="grid grid-cols-2 gap-x-12">
              <div className="text-center">
                <div className="border-t border-black pt-4 flex flex-col items-center">
                  {currentApr.signature && (
                    <img src={currentApr.signature} alt="Assinatura" className="h-16 mb-2 object-contain" referrerPolicy="no-referrer" />
                  )}
                  <p className="font-bold uppercase text-[10px] tracking-wider mb-1">Assinatura do Responsável</p>
                  <p className="text-xs font-medium">{currentApr.responsible}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-black pt-4 flex flex-col items-center">
                  <p className="font-bold uppercase text-[10px] tracking-wider mb-4">Assinatura do Técnico de Segurança</p>
                  <div className="grid grid-cols-1 gap-y-6 w-full">
                    {(currentApr.safetyTechnicians || []).map(tech => (
                      <div key={tech.id} className="flex flex-col items-center">
                        {tech.signature && (
                          <img src={tech.signature} alt={tech.name} className="h-12 mb-1 object-contain" referrerPolicy="no-referrer" />
                        )}
                        <p className="text-[10px] font-bold uppercase border-t border-gray-200 pt-1 w-2/3 mx-auto">{tech.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-8">
              <div className="border-t border-black pt-4">
                <p className="font-bold uppercase text-[10px] tracking-wider text-center mb-8">Assinatura dos Executantes</p>
                <div className="grid grid-cols-2 gap-x-12 gap-y-12">
                  {(currentApr.executors || []).map(executor => (
                    <div key={executor.id} className="flex flex-col items-center">
                      {executor.signature && (
                        <img src={executor.signature} alt={executor.name} className="h-12 mb-1 object-contain" referrerPolicy="no-referrer" />
                      )}
                      <div className="w-full border-t border-gray-200 pt-1 text-center">
                        <p className="text-[10px] font-bold uppercase">{executor.name}</p>
                        <p className="text-[8px] text-gray-400 uppercase tracking-tight">{executor.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardLayout 
        view={view} 
        setView={setView} 
        isReadOnly={isReadOnly} 
        currentApr={currentApr} 
        handleCreateNew={handleCreateNew} 
        handleSave={handleSave}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        user={user}
        handleLogout={handleLogout}
        deferredPrompt={deferredPrompt}
        handleInstallClick={handleInstallClick}
        setShowInstallGuide={setShowInstallGuide}
      >
        <AnimatePresence>
          {showAprSuccess && (
            <motion.div 
              key="success-msg"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm mb-6"
            >
              <CheckCircle2 className="text-green-500" />
              <span className="font-bold">APR salva com sucesso!</span>
            </motion.div>
          )}
          {saveError && (
            <motion.div 
              key="error-msg"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm mb-6"
            >
              <AlertTriangle className="text-red-500" />
              <span className="font-bold">{saveError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Quick Access */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    setCurrentApr({
                      id: generateId(),
                      company: 'Fiaux Soluções Tecnológicas',
                      osNumber: '',
                      date: new Date().toISOString().split('T')[0],
                      location: '',
                      task: '',
                      risks: [],
                      responsible: '',
                      signature: '',
                      safetyTechnicians: [],
                      executors: [],
                      photos: [],
                      createdAt: new Date().toISOString(),
                      uid: auth.currentUser?.uid || ''
                    });
                    setIsReadOnly(false);
                    setView('edit');
                  }}
                  className="flex items-center gap-4 p-6 bg-yellow-500 text-white rounded-2xl shadow-sm hover:bg-yellow-600 transition-all group"
                >
                  <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Nova APR</p>
                    <p className="text-white/80 text-sm">Criar uma nova análise de risco</p>
                  </div>
                </button>

                <button 
                  onClick={() => setShowInstallGuide(true)}
                  className="flex items-center gap-4 p-6 bg-white border border-yellow-200 rounded-2xl shadow-sm hover:bg-yellow-50 transition-all group"
                >
                  <div className="bg-yellow-100 p-3 rounded-xl text-yellow-600 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg text-gray-900">Instalar no Celular</p>
                    <p className="text-gray-500 text-sm">Criar ícone na tela inicial</p>
                  </div>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl">
                      <FileText className="text-blue-600 w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total de APRs</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-50 p-3 rounded-xl">
                      <Users className="text-green-600 w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Funcionários</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.employees}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-50 p-3 rounded-xl">
                      <Clock className="text-orange-600 w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Recentes (7 dias)</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.recent}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and List */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-gray-900">Histórico de Análises</h2>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-48">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full appearance-none cursor-pointer"
                      >
                        <option value="all">Todos os Meses</option>
                        {Array.from(new Set((aprs || []).map(a => (a.date || '').substring(0, 7)))).filter(Boolean).sort().reverse().map(month => (
                          <option key={month} value={month}>
                            {getMonthName(month)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="relative w-full sm:w-48">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full appearance-none cursor-pointer"
                      >
                        <option value="all">Todos os Cargos</option>
                        {Array.from(new Set((employees || []).map(e => e.role))).filter(Boolean).sort().map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Buscar por empresa, tarefa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full"
                      />
                    </div>
                    {selectedMonth !== 'all' && (
                      <button 
                        onClick={() => handleExportMonthlyAPRReport(selectedMonth)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                      >
                        <Download size={16} /> Relatório Mensal
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tarefa / Empresa</th>
                        <th className="hidden md:table-cell px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data / Local</th>
                        <th className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Riscos / Fotos</th>
                        <th className="hidden xl:table-cell px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Executantes</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAprs.map((apr) => (
                        <tr key={apr.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 truncate max-w-[120px] sm:max-w-none"><span>{apr.task || 'Sem título'}</span></div>
                            <div className="text-sm text-gray-500 truncate max-w-[120px] sm:max-w-none"><span>{apr.company || 'Empresa não informada'}</span></div>
                            <div className="md:hidden mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                              <span>{formatDateForDisplay(apr.date)}</span>
                              <span>•</span>
                              <span><span>{apr.location || 'Local'}</span></span>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              <Calendar size={14} className="text-gray-400" />
                              {formatDateForDisplay(apr.date)}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                              <MapPin size={14} className="text-gray-400" />
                              {apr.location || 'Local não informado'}
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 w-fit">
                                {(apr.risks || []).length} riscos
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 w-fit">
                                {(apr.photos || []).length} fotos
                              </span>
                            </div>
                          </td>
                          <td className="hidden xl:table-cell px-6 py-4">
                            <div className="flex -space-x-2 overflow-hidden">
                              {(apr.executors || []).map((e, i) => (
                                <div key={e.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600" title={e.name}>
                                  {e.name?.charAt(0)}
                                </div>
                              ))}
                              {(apr.executors || []).length === 0 && <span className="text-xs text-gray-400 italic">Nenhum</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 sm:gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setCurrentApr(apr);
                                  setIsReadOnly(true);
                                  setView('edit');
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver Detalhes"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  setCurrentApr(apr);
                                  setIsReadOnly(false);
                                  setView('edit');
                                }}
                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handlePrint(apr)}
                                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title="Imprimir"
                              >
                                <Printer size={18} />
                              </button>
                              <button 
                                onClick={() => handleExportPDF(apr)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Exportar PDF"
                              >
                                <Download size={18} />
                              </button>
                              {isAdmin && (
                                <button 
                                  onClick={() => handleDelete(apr.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredAprs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <FileText size={48} strokeWidth={1} />
                              <p>Nenhuma APR encontrada.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : view === 'statistics' ? (
            <motion.div 
              key="statistics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StatisticsPage 
                employees={employees}
                accidentRecords={accidentRecords}
                onSaveRecord={handleSaveStatRecord}
                setView={setView}
                setCurrentStatRecord={setCurrentStatRecord}
                setStatDeleteConfirmId={setStatDeleteConfirmId}
                handleExportStatPDF={handleExportStatPDF}
                isAdmin={isAdmin}
              />
            </motion.div>
          ) : view === 'employees' ? (
            <motion.div 
              key="employees"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Add/Edit Form (Replaced with Quick Add Style) */}
                <div className="md:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {editingEmployeeId ? <Edit2 size={18} className="text-yellow-500" /> : <UserPlus size={18} className="text-yellow-500" />}
                        <h3 className="font-bold text-gray-900">{editingEmployeeId ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                      </div>
                      {editingEmployeeId && (
                        <button 
                          onClick={() => {
                            setEditingEmployeeId(null);
                            setQuickEmpName('');
                            setQuickEmpRole('Executante');
                            setQuickEmpSignature('');
                          }}
                          className="text-xs font-bold text-gray-400 hover:text-gray-600"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase">Nome Completo do Funcionário</label>
                        <input 
                          type="text" 
                          value={quickEmpName}
                          onChange={(e) => setQuickEmpName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase">Cargo ou Função</label>
                        <input 
                          type="text" 
                          value={quickEmpRole}
                          onChange={(e) => setQuickEmpRole(e.target.value)}
                          placeholder="Ex: Eletricista"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['Encarregado', 'Mestre Obra', 'Técnico de Segurança', 'Executante'].map(role => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setQuickEmpRole(role)}
                              className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-yellow-100 text-gray-600 hover:text-yellow-700 rounded-md transition-colors font-bold"
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase">Assinatura Digital do Funcionário</label>
                        <SignaturePad 
                          value={quickEmpSignature} 
                          onChange={setQuickEmpSignature} 
                        />
                      </div>
                      <button 
                        onClick={() => handleQuickAddEmployee('general')}
                        disabled={!quickEmpName.trim() || !quickEmpSignature}
                        className={`w-full ${editingEmployeeId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-500 hover:bg-yellow-600'} disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2`}
                      >
                        {editingEmployeeId ? <Save size={18} /> : <Plus size={18} />} 
                        {editingEmployeeId ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
                      </button>

                      <AnimatePresence>
                        {showEmployeeSuccess && (
                          <motion.div 
                            key="emp-success-alert"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold"
                          >
                            <CheckCircle2 size={18} />
                            Cadastro realizado com sucesso!
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Employee List */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
                    <h3 className="font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <Users size={18} className="text-yellow-500" />
                      Sua Equipe ({filteredEmployees.length})
                    </h3>
                    <div className="relative w-full sm:w-48">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select 
                        value={selectedEmpRole}
                        onChange={(e) => setSelectedEmpRole(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full appearance-none cursor-pointer shadow-sm"
                      >
                        <option value="all">Filtro: Todos</option>
                        {Array.from(new Set((employees || []).map(e => e.role))).filter(Boolean).sort().map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {filteredEmployees.map(emp => (
                    <div key={emp.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                          {(emp.name || '').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{emp.name || 'Sem Nome'}</p>
                          <p className="text-sm text-gray-500">{emp.role || 'Sem Função'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button 
                          onClick={() => setViewingEmployee(emp)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingEmployeeId(emp.id);
                            setQuickEmpName(emp.name);
                            setQuickEmpRole(emp.role);
                            setQuickEmpSignature(emp.signature);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => setEmpDeleteConfirmId(emp.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Users size={48} strokeWidth={1} />
                        <p className="font-medium">Nenhum funcionário encontrado com estes filtros.</p>
                      </div>
                    </div>
                  )}
                  {(employees || []).length === 0 && (
                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
                      Nenhum funcionário cadastrado.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="edit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setView('list')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isReadOnly ? 'Visualizar APR' : currentApr?.id ? 'Editar APR' : 'Nova Análise de Risco'}
                  </h2>
                  <p className="text-gray-500">
                    {isReadOnly ? 'Detalhes da análise de risco identificada.' : 'Preencha os detalhes da atividade e identifique os riscos.'}
                  </p>
                </div>
              </div>

              {/* Basic Info */}
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Informações Gerais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Building2 size={16} className="text-gray-400" /> Empresa
                    </label>
                    <input 
                      key="company-input"
                      type="text" 
                      value={currentApr?.company || ''}
                      onChange={(e) => setCurrentApr(prev => prev ? ({ ...prev, company: e.target.value }) : null)}
                      placeholder="Ex: Fiaux Soluções Tecnológicas"
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Hash size={16} className="text-gray-400" /> Número da OS
                    </label>
                    <input 
                      key="os-number-input"
                      type="text" 
                      value={currentApr?.osNumber || ''}
                      onChange={(e) => setCurrentApr(prev => prev ? ({ ...prev, osNumber: e.target.value }) : null)}
                      placeholder="Ex: OS-2024-001"
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" /> Data da Atividade
                    </label>
                    <input 
                      key="date-input"
                      type="date" 
                      value={currentApr?.date || ''}
                      onChange={(e) => setCurrentApr(prev => prev ? ({ ...prev, date: e.target.value }) : null)}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" /> Local de Trabalho
                    </label>
                    <input 
                      key="location-input"
                      type="text" 
                      value={currentApr?.location || ''}
                      onChange={(e) => setCurrentApr(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                      placeholder="Ex: Canteiro de Obras - Setor A"
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" /> Descrição da Tarefa
                    </label>
                    <textarea 
                      key="task-textarea"
                      rows={3}
                      value={currentApr?.task || ''}
                      onChange={(e) => setCurrentApr(prev => prev ? ({ ...prev, task: e.target.value }) : null)}
                      placeholder="Descreva detalhadamente a atividade a ser realizada..."
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <User size={16} className="text-gray-400" /> Responsável pela Execução (Nome)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(employees || []).filter(emp => 
                        emp.role.toLowerCase().includes('encarregado') || 
                        emp.role.toLowerCase().includes('mestre')
                      ).map(emp => (
                        <button
                          key={`resp-${emp.id}`}
                          type="button"
                          onClick={() => {
                            if (!isReadOnly) {
                              setCurrentApr(prev => prev ? ({ ...prev, responsible: emp.name, signature: emp.signature }) : null);
                            }
                          }}
                          disabled={isReadOnly}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            currentApr?.responsible === emp.name
                            ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                          } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            currentApr?.responsible === emp.name ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {(emp.name || '').charAt(0)}
                          </div>
                          <span className="text-sm font-bold truncate">{emp.name}</span>
                        </button>
                      ))}
                    </div>
                    {!isReadOnly && (employees || []).filter(emp => 
                      emp.role.toLowerCase().includes('encarregado') || 
                      emp.role.toLowerCase().includes('mestre')
                    ).length === 0 && (
                      <p className="text-xs text-gray-400 italic">Nenhum Encarregado ou Mestre de Obra cadastrado.</p>
                    )}
                    {/* Fallback input for manual entry if needed */}
                    {!isReadOnly && (
                      <input 
                        key="responsible-input"
                        type="text" 
                        value={currentApr?.responsible || ''}
                        onChange={(e) => setCurrentApr(prev => prev ? ({ ...prev, responsible: e.target.value }) : null)}
                        placeholder="Ou digite o nome manualmente..."
                        className="w-full px-4 py-2 mt-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    {currentApr && (
                      <SignaturePad 
                        value={currentApr.signature} 
                        onChange={(val) => {
                          if (!isReadOnly) setCurrentApr(prev => prev ? ({ ...prev, signature: val }) : null);
                        }} 
                      />
                    )}
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield size={16} className="text-yellow-500" /> Técnicos de Segurança Responsáveis
                    </h4>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {(employees || []).filter(e => e.role.toLowerCase().includes('seguranca') || e.role.toLowerCase().includes('técnico') || e.role.toLowerCase().includes('tecnico')).map(emp => (
                          <button
                            key={`tech-${emp.id}`}
                            type="button"
                            onClick={() => {
                              if (!isReadOnly) toggleSafetyTechnician(emp);
                            }}
                            disabled={isReadOnly}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                              (currentApr?.safetyTechnicians || []).some(t => t.id === emp.id)
                              ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                            } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              (currentApr?.safetyTechnicians || []).some(t => t.id === emp.id) ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {(emp.name || '').charAt(0)}
                            </div>
                            <span className="text-sm font-bold truncate">{emp.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executors Selection (Redesigned) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-blue-50/50 p-6 border-b border-gray-100 flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <Users size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Assinaturas dos Funcionários</h3>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">Adicione as assinaturas dos funcionários envolvidos na atividade</p>
                    {!isReadOnly && (
                      <button 
                        onClick={addEmptyExecutor}
                        className="bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
                      >
                        <Plus size={14} /> Adicionar Funcionário
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {(currentApr?.executors || []).map((executor, index) => (
                      <div key={executor.id || index} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm relative group">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">Funcionário {index + 1}</h4>
                          {!isReadOnly && (
                            <button 
                              onClick={() => removeExecutor(index)}
                              className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="relative">
                            <select
                              disabled={isReadOnly}
                              value={executor.id.startsWith('temp-') ? '' : executor.id}
                              onChange={(e) => updateExecutorSelection(index, e.target.value)}
                              className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none font-medium text-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Selecione um funcionário cadastrado</option>
                              {(employees || []).map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <ChevronDown size={16} />
                            </div>
                          </div>

                          {!isReadOnly && executor.id.startsWith('temp-') && (
                            <div className="space-y-4 pt-2 border-t border-dashed border-gray-100">
                              <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <UserPlus size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Novo Cadastro para este campo</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-600 uppercase">Nome do Funcionário</label>
                                  <input 
                                    type="text"
                                    placeholder="Nome completo..."
                                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    onChange={(e) => {
                                      const newExecs = [...(currentApr?.executors || [])];
                                      newExecs[index] = { ...newExecs[index], name: e.target.value };
                                      setCurrentApr({ ...currentApr!, executors: newExecs });
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-600 uppercase">Cargo / Função</label>
                                  <input 
                                    type="text"
                                    placeholder="Ex: Eletricista..."
                                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    onChange={(e) => {
                                      const newExecs = [...(currentApr?.executors || [])];
                                      newExecs[index] = { ...newExecs[index], role: e.target.value };
                                      setCurrentApr({ ...currentApr!, executors: newExecs });
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-600 uppercase">Assinatura Digital</label>
                                <SignaturePad 
                                  value={executor.signature} 
                                  onChange={(val) => {
                                    const newExecs = [...(currentApr?.executors || [])];
                                    newExecs[index] = { ...newExecs[index], signature: val };
                                    setCurrentApr({ ...currentApr!, executors: newExecs });
                                  }} 
                                />
                              </div>
                              <button 
                                onClick={async () => {
                                  if (executor.name && executor.signature) {
                                    const newEmp: Employee = {
                                      id: generateId(),
                                      name: executor.name,
                                      role: executor.role,
                                      signature: executor.signature
                                    };
                                    
                                    try {
                                      await setDoc(doc(db, 'employees', newEmp.id), newEmp);
                                      setEmployees(prev => [...prev, newEmp]);
                                      const newExecs = [...(currentApr?.executors || [])];
                                      newExecs[index] = newEmp;
                                      setCurrentApr({ ...currentApr!, executors: newExecs });
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.WRITE, `employees/${newEmp.id}`);
                                    }
                                  }
                                }}
                                disabled={!executor.name || !executor.signature}
                                className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                Confirmar e Salvar na Equipe
                              </button>
                            </div>
                          )}

                          {(!executor.id.startsWith('temp-') || isReadOnly) && executor.signature && (
                            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                              <img src={executor.signature} alt="Assinatura" className="h-12 mb-2" referrerPolicy="no-referrer" />
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{executor.name} - {executor.role}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {(currentApr?.executors || []).length === 0 && (
                      <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <UserPlus size={48} strokeWidth={1} />
                          <p className="text-sm font-medium">Nenhum funcionário selecionado para esta atividade.</p>
                          <button 
                            onClick={addEmptyExecutor}
                            className="mt-2 text-blue-600 font-bold text-sm hover:underline"
                          >
                            Clique aqui para adicionar o primeiro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Risks and Measures */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Análise de Riscos</h3>
                  <div className="flex gap-2">
                    {!isReadOnly && (
                      <>
                        <button 
                          onClick={() => addRisk('', [''])}
                          className="bg-white border border-gray-200 hover:border-yellow-500 hover:text-yellow-600 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        >
                          <Plus size={16} /> Risco Manual
                        </button>
                        <div className="relative">
                          <button 
                            onClick={() => setShowCommonRisks(!showCommonRisks)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
                          >
                            <Shield size={16} /> Riscos Comuns
                          </button>
                          {showCommonRisks && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowCommonRisks(false)}
                              />
                              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl transition-all z-20 overflow-hidden">
                                <div className="p-2 max-h-64 overflow-y-auto">
                                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Sugestões de Riscos</div>
                                  {COMMON_RISKS.map((risk, i) => (
                                    <button 
                                      key={i}
                                      onClick={() => {
                                        addRisk(risk.description, risk.measures);
                                        setShowCommonRisks(false);
                                      }}
                                      className="w-full text-left p-3 hover:bg-yellow-50 rounded-xl text-sm transition-colors border-b border-gray-50 last:border-0 group/item"
                                    >
                                      <p className="font-bold text-gray-900 group-hover/item:text-yellow-700">{risk.description}</p>
                                      <p className="text-[10px] text-gray-500 truncate">{risk.measures.join(', ')}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {(currentApr?.risks || []).map((risk) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={risk.id}
                      className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="bg-yellow-100 p-1.5 rounded-lg">
                                <AlertTriangle size={18} className="text-yellow-600" />
                              </div>
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Risco Identificado</label>
                            </div>
                            <input 
                              type="text" 
                              value={risk.description}
                              onChange={(e) => {
                                if (!isReadOnly) {
                                  const newRisks = (currentApr.risks || []).map(r => r.id === risk.id ? { ...r, description: e.target.value } : r);
                                  setCurrentApr({ ...currentApr, risks: newRisks });
                                }
                              }}
                              disabled={isReadOnly}
                              className="w-full text-xl font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0 placeholder:text-gray-300 disabled:cursor-default"
                              placeholder="Descreva o risco (ex: Queda de altura)..."
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                              Medidas de Controle
                              <span className="text-[10px] font-normal lowercase italic">Pressione Enter para adicionar</span>
                            </label>
                            
                            <div className="flex flex-wrap gap-2">
                              <AnimatePresence>
                                {(risk.measures || []).map((measure, mIdx) => (
                                  <motion.div 
                                    key={`${risk.id}-m-${mIdx}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 px-3 py-1.5 rounded-xl group/measure max-w-full"
                                  >
                                    <Shield size={14} className="text-yellow-600 shrink-0" />
                                    <input 
                                      type="text" 
                                      value={measure}
                                      onChange={(e) => {
                                        if (!isReadOnly) {
                                          const newMeasures = [...risk.measures];
                                          newMeasures[mIdx] = e.target.value;
                                          const newRisks = (currentApr.risks || []).map(r => r.id === risk.id ? { ...r, measures: newMeasures } : r);
                                          setCurrentApr({ ...currentApr, risks: newRisks });
                                        }
                                      }}
                                      disabled={isReadOnly}
                                      className="text-sm text-gray-700 bg-transparent border-none focus:ring-0 p-0 placeholder:text-gray-300 disabled:cursor-default min-w-[100px] flex-1"
                                      placeholder="Medida..."
                                    />
                                    {!isReadOnly && (
                                      <button 
                                        onClick={() => handleRemoveMeasure(risk.id, mIdx)}
                                        className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </motion.div>
                                ))}
                              </AnimatePresence>

                              {!isReadOnly && (
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl focus-within:ring-2 focus-within:ring-yellow-500/20 focus-within:border-yellow-500 transition-all flex-1 min-w-[200px]">
                                  <Plus size={14} className="text-gray-400" />
                                  <input 
                                    type="text"
                                    value={newMeasureInputs[risk.id] || ''}
                                    onChange={(e) => setNewMeasureInputs(prev => ({ ...prev, [risk.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddMeasure(risk.id, newMeasureInputs[risk.id] || '');
                                      }
                                    }}
                                    placeholder="Adicionar nova medida..."
                                    className="text-sm text-gray-700 bg-transparent border-none focus:ring-0 p-0 w-full"
                                  />
                                  {newMeasureInputs[risk.id] && (
                                    <button 
                                      onClick={() => handleAddMeasure(risk.id, newMeasureInputs[risk.id] || '')}
                                      className="p-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAdmin && !isReadOnly && (
                          <button 
                            onClick={() => removeRisk(risk.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {(currentApr?.risks || []).length === 0 && (
                    <div className="bg-dashed border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Camera size={48} strokeWidth={1} />
                        <p className="font-medium">Nenhum risco identificado. Aproveite para revisar as fotos das atividades.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos of Activities */}
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Fotos das Atividades</h3>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      {isUploadingPhoto ? (
                        <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 rounded-lg">
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin"></div>
                          Processando...
                        </div>
                      ) : (
                        <>
                          <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors">
                            <ImageIcon size={14} /> Galeria
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                          </label>
                          <label className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors">
                            <Camera size={14} /> Câmera
                            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {(currentApr?.photos || []).map((photo, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={photo} alt={`Atividade ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {!isReadOnly && (
                        <button 
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 p-2 bg-red-600 text-white rounded-full transition-all shadow-md hover:bg-red-700 active:scale-90 z-10 border-2 border-white"
                          title="Remover foto"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(currentApr?.photos || []).length === 0 && (
                    <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <ImageIcon size={32} strokeWidth={1} />
                        <p className="text-sm">Nenhuma foto adicionada.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-gray-200 flex justify-end gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="px-6 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  {isReadOnly ? 'Voltar para Lista' : 'Descartar Alterações'}
                </button>
                {isReadOnly && currentApr && (
                  <button 
                    onClick={() => handleExportPDF(currentApr, 'edit')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Download size={20} />
                    Exportar PDF
                  </button>
                )}
                {!isReadOnly && (
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save size={20} />
                    )}
                    {isSaving ? 'Salvando...' : 'Salvar APR'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modals */}
        <AnimatePresence>
          {deleteConfirmId && (
            <div key="modal-delete-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                key="modal-delete-box"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="bg-red-100 p-4 rounded-full text-red-600">
                    <Trash2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Excluir APR?</h3>
                    <p className="text-gray-500 mt-2">Esta ação não pode ser desfeita. Todos os dados desta APR serão removidos permanentemente.</p>
                  </div>
                  <div className="flex gap-3 w-full mt-4">
                    <button 
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={confirmDelete}
                      className="flex-1 px-4 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {statDeleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="bg-red-100 p-4 rounded-full text-red-600">
                    <Trash2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Excluir Registro?</h3>
                    <p className="text-gray-500 mt-2">Deseja realmente excluir este registro mensal de estatísticas?</p>
                  </div>
                  <div className="flex gap-3 w-full mt-4">
                    <button 
                      onClick={() => setStatDeleteConfirmId(null)}
                      className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={confirmStatDelete}
                      className="flex-1 px-4 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {empDeleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="bg-red-100 p-4 rounded-full text-red-600">
                    <Trash2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Excluir Funcionário?</h3>
                    <p className="text-gray-500 mt-2">Deseja realmente remover este funcionário? Esta ação não pode ser desfeita.</p>
                  </div>
                  <div className="flex gap-3 w-full mt-4">
                    <button 
                      onClick={() => setEmpDeleteConfirmId(null)}
                      className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={confirmEmpDelete}
                      className="flex-1 px-4 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {showInstallGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowInstallGuide(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
                
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="bg-yellow-100 p-4 rounded-full text-yellow-600">
                    <Smartphone size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">Instalar no Celular</h3>
                    <p className="text-gray-500">Siga os passos abaixo para deixar o ícone do sistema na sua tela inicial:</p>
                  </div>

                  <div className="w-full space-y-4 text-left">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
                        No iPhone (Safari):
                      </p>
                      <p className="text-sm text-gray-600 ml-8">Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta) e escolha <strong>"Adicionar à Tela de Início"</strong>.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
                        No Android (Chrome):
                      </p>
                      <p className="text-sm text-gray-600 ml-8">Toque nos <strong>três pontinhos</strong> no canto superior e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowInstallGuide(false)}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors mt-4"
                  >
                    Entendi
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {viewingEmployee && (
            <div key="modal-emp-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                key="modal-emp-box"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
              >
                <button 
                  onClick={() => setViewingEmployee(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
                
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center text-3xl font-bold text-yellow-600">
                    {viewingEmployee.name.charAt(0)}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-gray-900">{viewingEmployee.name}</h3>
                    <p className="text-gray-500 font-medium">{viewingEmployee.role}</p>
                  </div>

                  <div className="w-full space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assinatura Digital</p>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-center min-h-[150px]">
                      {viewingEmployee.signature ? (
                        <img 
                          src={viewingEmployee.signature} 
                          alt="Assinatura" 
                          className="max-w-full max-h-[120px] object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <p className="text-sm text-gray-400 italic">Nenhuma assinatura cadastrada</p>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => setViewingEmployee(null)}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors mt-4"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Print Styles */}
        <style>{`
          @media print {
            body { background: white !important; }
            header, footer, button, aside, .no-print { display: none !important; }
            main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
            .flex-1.ml-64 { margin-left: 0 !important; }
            .bg-white { box-shadow: none !important; border: none !important; }
          }
        `}</style>
      </DashboardLayout>
    </ErrorBoundary>
  );
}
