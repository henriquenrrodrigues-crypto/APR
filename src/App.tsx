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
  Check,
  Copy
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

// Patch window.getComputedStyle globally to prevent html2canvas oklch/oklab parsing crashes
if (typeof window !== 'undefined') {
  try {
    const originalGetComputedStyle = window.getComputedStyle;
    Object.defineProperty(window, 'getComputedStyle', {
      value: function (elt: Element, pseudoElt?: string) {
        const style = originalGetComputedStyle(elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop, receiver) {
            if (prop === 'getPropertyValue') {
              return function (propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                  return val
                    .replace(/oklch\([^)]+\)/g, 'rgb(113, 113, 122)')
                    .replace(/oklab\([^)]+\)/g, 'rgb(113, 113, 122)');
                }
                return val;
              };
            }
            
            // Safe invariant check to prevent Proxy crashes on read-only/non-configurable properties
            if (typeof prop === 'string' || typeof prop === 'symbol') {
              try {
                const desc = Object.getOwnPropertyDescriptor(target, prop);
                if (desc && desc.configurable === false && desc.writable === false) {
                  return target[prop as any];
                }
              } catch (e) {}
            }

            let val;
            try {
              val = Reflect.get(target, prop);
            } catch (err) {
              val = undefined;
            }
            if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
              return val
                .replace(/oklch\([^)]+\)/g, 'rgb(113, 113, 122)')
                .replace(/oklab\([^)]+\)/g, 'rgb(113, 113, 122)');
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        });
      },
      configurable: true,
      writable: true
    });
  } catch (e) {
    console.warn('Error patching global getComputedStyle:', e);
  }
}

const setupPDFCloneCompatibility = (clonedDoc: Document) => {
  const win = clonedDoc.defaultView;
  if (win) {
    try {
      const originalGetComputedStyle = win.getComputedStyle;
      Object.defineProperty(win, 'getComputedStyle', {
        value: function (elt: Element, pseudoElt?: string) {
          const style = originalGetComputedStyle(elt, pseudoElt);
          return new Proxy(style, {
            get(target, prop, receiver) {
              if (prop === 'getPropertyValue') {
                return function(propertyName: string) {
                  const val = target.getPropertyValue(propertyName);
                  if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                    return val
                      .replace(/oklch\([^)]+\)/g, 'rgb(113, 113, 122)')
                      .replace(/oklab\([^)]+\)/g, 'rgb(113, 113, 122)');
                  }
                  return val;
                };
              }

              // Safe invariant check to prevent Proxy crashes on read-only/non-configurable properties
              if (typeof prop === 'string' || typeof prop === 'symbol') {
                try {
                  const desc = Object.getOwnPropertyDescriptor(target, prop);
                  if (desc && desc.configurable === false && desc.writable === false) {
                    return target[prop as any];
                  }
                } catch (e) {}
              }

              let val;
              try {
                val = Reflect.get(target, prop);
              } catch (err) {
                val = undefined;
              }
              if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                return val
                  .replace(/oklch\([^)]+\)/g, 'rgb(113, 113, 122)')
                  .replace(/oklab\([^)]+\)/g, 'rgb(113, 113, 122)');
              }
              if (typeof val === 'function') {
                return val.bind(target);
              }
              return val;
            }
          });
        },
        configurable: true,
        writable: true
      });
    } catch (e) {
      console.warn('Error patching getComputedStyle in cloned window:', e);
    }
  }

  clonedDoc.querySelectorAll('style').forEach((styleTag) => {
    try {
      let css = styleTag.innerHTML;
      if (css.includes('oklch') || css.includes('oklab')) {
        css = css.replace(/oklch\([^)]+\)/g, '#71717a');
        css = css.replace(/oklab\([^)]+\)/g, '#71717a');
        styleTag.innerHTML = css;
      }
    } catch (e) {
      console.warn('Error patching style tag in cloned document:', e);
    }
  });

  clonedDoc.querySelectorAll('[style]').forEach((el) => {
    try {
      const styleAttr = el.getAttribute('style');
      if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
        el.setAttribute('style', styleAttr
          .replace(/oklch\([^)]+\)/g, '#71717a')
          .replace(/oklab\([^)]+\)/g, '#71717a')
        );
      }
    } catch (e) {
      console.warn('Error patching inline style in cloned document:', e);
    }
  });

  // Clean up any gaps, backgrounds, padding, margins, or shadows for the print view in PDF to ensure exact page alignment
  const printView = clonedDoc.getElementById('apr-print-view');
  if (printView) {
    printView.style.backgroundColor = 'transparent';
    printView.style.background = 'transparent';
    printView.style.padding = '0';
    printView.style.margin = '0';
    printView.style.gap = '0';
    printView.style.display = 'block';
    
    // Find all page children
    const childPages = printView.children;
    for (let i = 0; i < childPages.length; i++) {
      const child = childPages[i] as HTMLElement;
      if (child) {
        child.style.boxShadow = 'none';
        child.style.border = 'none';
        child.style.margin = '0';
      }
    }
  }
};

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
      let errorMessage = "Ocorreu um erro inesperado.";
      let isAuthError = false;
      let isQuotaError = false;
      
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) {
          errorMessage = parsed.error;
          if (errorMessage.includes('auth/unauthorized-domain') || errorMessage.includes('dominio não está autorizado')) {
            isAuthError = true;
          }
          if (errorMessage.includes('Limite diário') || errorMessage.includes('Quota exceeded')) {
            isQuotaError = true;
          }
          if (parsed.path) {
            errorMessage += ` (Caminho: ${parsed.path})`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || String(this.state.error);
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="text-red-500 w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900">Ops! Limite de Uso Atingido</h1>
              <p className="text-gray-600 leading-relaxed">
                {isQuotaError 
                  ? 'O Google atingiu o limite gratuito de leitura hoje. Para resolver isso permanentemente, é necessário habilitar o faturamento (billing) no Console do Firebase ou aguardar até amanhã para o limite resetar.' 
                  : 'Encontramos um problema ao carregar o aplicativo.'}
              </p>
            </div>
            
            <div className="p-4 bg-red-50 rounded-2xl text-left border border-red-100">
              <p className="text-xs font-bold text-red-800 uppercase mb-1 flex items-center gap-2">
                <Shield size={14} /> Detalhes Técnicos
              </p>
              <p className="text-sm text-red-700 break-words">{errorMessage}</p>
              {isQuotaError && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-red-100 text-xs text-red-900">
                  <p className="font-bold mb-1">Para o Administrador:</p>
                  <p>1. Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold">Console do Firebase</a>.</p>
                  <p>2. Selecione seu projeto.</p>
                  <p>3. Clique em "Upgrade" (Plano Blaze) para remover limites gratuitos.</p>
                </div>
              )}
              {isAuthError && !isQuotaError && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-red-100 text-xs text-red-900">
                  <p className="font-bold mb-1">Dica para o Administrador:</p>
                  <p>Adicione este domínio em: Firebase Console &gt; Autenticação &gt; Configurações &gt; Domínios autorizados.</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95"
            >
              Tentar Novamente
            </button>
            <p className="text-[10px] text-gray-400 font-medium">Se o faturamento já estiver ativo e o erro persistir, aguarde alguns minutos.</p>
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

        <main className="p-3 lg:p-6">
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
    // NBR 14280: Fatal accidents count as 6000 debited days
    const totalDaysForSeverity = daysLost + (fatalAccidents * 6000);
    const severityRate = htt > 0 ? (totalDaysForSeverity * 1000000) / htt : 0;

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
      <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <FileText className="text-white" size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Número do Contrato</p>
            <p className="text-lg font-black text-purple-900">4500083171</p>
          </div>
        </div>
      </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Mês/Ano Referência</label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => changeMonth(-1)}
                      className="p-3 shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                      title="Mês Anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="relative flex-1 h-[48px]">
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl pointer-events-none">
                        <span className="text-sm font-bold text-gray-900 uppercase">
                          {getMonthName(month, { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <input 
                        type="month" 
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <button 
                      onClick={() => changeMonth(1)}
                      className="p-3 shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
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
                    const frequencyRate = htt > 0 ? ((accidentsWithLostTime + fatalAccidents) * 1000000) / htt : 0;
                    const totalDaysForSeverity = daysLost + (fatalAccidents * 6000);
                    const severityRate = htt > 0 ? (totalDaysForSeverity * 1000000) / htt : 0;
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
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left table-fixed">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="w-1/3 px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mês</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">HTT</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CPT/SPT</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">TF</th>
                    <th className="w-24 px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
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
  const filteredAprs = useMemo(() => (aprs || []).filter(apr => apr && apr.date && typeof apr.date === 'string' && apr.date.startsWith(reportMonth)), [aprs, reportMonth]);
  
  const totalRisksCount = useMemo(() => filteredAprs.reduce((acc, apr) => acc + (apr.risks || []).length, 0), [filteredAprs]);
  const totalMeasuresCount = useMemo(() => filteredAprs.reduce((acc, apr) => acc + (apr.risks || []).reduce((sum, r) => sum + (r.measures || []).length, 0), 0), [filteredAprs]);
  
  const riskStats = useMemo(() => {
    if (filteredAprs.length === 0) return [];
    const counts: Record<string, number> = {};
    filteredAprs.forEach(apr => {
      const uniqueRisksInApr = new Set<string>(
        (apr.risks || [])
          .map(r => r && typeof r.description === 'string' ? r.description.trim() : '')
          .filter(Boolean)
      );
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
      const uniqueMeasuresInApr = new Set<string>(
        (apr.risks || [])
          .flatMap(r => (r && r.measures ? r.measures : []))
          .map(m => typeof m === 'string' ? m.trim() : '')
          .filter(Boolean)
      );
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
      margin: [15, 15, 15, 15],
      filename: `Relatorio_APR_${reportMonth}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        onclone: setupPDFCloneCompatibility
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.page-break-avoid', 'tr'] }
    };
    
    // @ts-ignore
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between no-print mb-1">
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm"
          >
            <ArrowLeft size={16} /> Voltar para Lista
          </button>
          <div className="flex gap-2">
            <button 
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Printer size={14} /> Imprimir
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-md"
            >
              <Download size={14} /> Exportar PDF
            </button>
          </div>
        </div>

        <div id="apr-monthly-report-content" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-900 pb-3 mb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: '#eab308' }}>
                <ClipboardList className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">Relatório Consolidado</h1>
                <p className="text-[11px] text-gray-400 font-bold leading-none">Análise de riscos e estatísticas de acidentes</p>
              </div>
            </div>
            
            {/* Contrato centralizado */}
            <div className="flex flex-col items-center justify-center bg-gray-50 px-3 py-1 rounded-lg border border-gray-200/60 text-center sm:mx-auto">
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Contrato</span>
              <span className="text-xs font-black text-gray-900 tracking-wider leading-none">4500083171</span>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[9px] font-bold text-gray-400 uppercase leading-none">Período</p>
              <p className="text-base font-black text-gray-900 leading-tight">
                {getMonthName(reportMonth).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white p-2.5 py-3 rounded-xl border border-gray-150 shadow-sm text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Total de APRs</p>
              <p className="text-xl font-black text-gray-900 leading-none">{filteredAprs.length}</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Análises cadastradas</p>
            </div>
            <div className="bg-white p-2.5 py-3 rounded-xl border border-gray-150 shadow-sm text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Riscos Identificados</p>
              <p className="text-xl font-black leading-none" style={{ color: '#ca8a04' }}>{totalRisksCount}</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Total de incidências</p>
            </div>
            <div className="bg-white p-2.5 py-3 rounded-xl border border-gray-150 shadow-sm text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Medidas Aplicadas</p>
              <p className="text-xl font-black leading-none" style={{ color: '#16a34a' }}>{totalMeasuresCount}</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Total de aplicações</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Risks Section */}
              <div className="rounded-xl border page-break-avoid" style={{ backgroundColor: '#fff5f5', borderColor: '#fee2e2', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div className="p-2.5 border-b flex items-center gap-2" style={{ backgroundColor: '#fef2f2', borderColor: '#fee2e2' }}>
                  <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                  <h2 className="text-xs font-black uppercase" style={{ color: '#7f1d1d' }}>Top 5 Riscos Mais Comuns</h2>
                </div>
                <div className="p-3 space-y-3">
                  {riskStats.map((risk, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[11px] font-bold text-gray-700 leading-tight">{risk.name}</span>
                          <span className="text-[9px] font-black text-gray-900 leading-none shrink-0 ml-2">{risk.count} ({risk.percentage}%)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                          <div 
                            className="h-full rounded-full" 
                            style={{ width: `${risk.percentage}%`, backgroundColor: '#ef4444' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {riskStats.length === 0 && (
                    <p className="text-center text-xs text-gray-400 italic py-2">Nenhum dado de risco disponível.</p>
                  )}
                </div>
              </div>

              {/* Top Measures Section */}
              <div className="rounded-xl border page-break-avoid" style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div className="p-2.5 border-b flex items-center gap-2" style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }}>
                  <Shield size={14} style={{ color: '#22c55e' }} />
                  <h2 className="text-xs font-black uppercase" style={{ color: '#14532d' }}>As 5 principais medidas de controle</h2>
                </div>
                <div className="p-3 space-y-3">
                  {measureStats.map((measure, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[11px] font-bold text-gray-700 leading-tight">{measure.name}</span>
                          <span className="text-[9px] font-black text-gray-900 leading-none shrink-0 ml-2">{measure.count} ({measure.percentage}%)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                          <div 
                            className="h-full rounded-full" 
                            style={{ width: `${measure.percentage}%`, backgroundColor: '#22c55e' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {measureStats.length === 0 && (
                    <p className="text-center text-xs text-gray-400 italic py-2">Nenhuma medida de controle disponível.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-black uppercase border-l-4 border-yellow-500 pl-3 leading-none py-1">Detalhamento das Atividades</h2>
              <div className="space-y-4">
                {filteredAprs.map(apr => (
                  <div 
                    key={apr.id} 
                    className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm"
                  >
                    {/* Header bar & Activity Title inside an unsplittable container to prevent orphan headers */}
                    <div className="page-break-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      {/* Header bar */}
                      <div className="bg-slate-900 text-white px-4 py-2 flex flex-wrap justify-between items-center gap-2 text-[10px] font-bold">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Data: {formatDateForDisplay(apr.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>SO: {apr.osNumber}</span>
                        </div>
                      </div>
                      
                      {/* Activity Title */}
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-200">
                        <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Atividade / Tarefa Executada</div>
                        <div className="text-xs font-black text-slate-800 leading-tight">{apr.task}</div>
                      </div>
                    </div>

                    {/* Risks and Measures Row by Row */}
                    <div className="divide-y divide-gray-150">
                      {(apr.risks || []).map((risk, idx) => {
                        const isHigh = risk.classification === 'Alto';
                        const isMedium = risk.classification === 'Médio';
                        
                        const badgeColor = isHigh 
                          ? 'bg-red-500 text-white border-red-600' 
                          : isMedium 
                            ? 'bg-amber-500 text-white border-amber-600' 
                            : 'bg-emerald-500 text-white border-emerald-600';
                        
                        const badgeText = risk.classification || 'Médio';

                        return (
                          <div 
                            key={risk.id || idx} 
                            className="page-break-avoid w-full" 
                            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                          >
                            <div 
                              className="flex hover:bg-slate-50/20 transition-colors w-full" 
                              style={{ display: 'flex', width: '100%' }}
                            >
                              {/* Left Side: Risk Name & Severity Badge (42% width) */}
                              <div className="p-2.5 border-r border-gray-200 flex flex-col justify-between gap-1.5 bg-slate-50/30" style={{ width: '42%', minWidth: '42%', boxSizing: 'border-box' }}>
                                <div>
                                  <div className="flex items-start gap-1.5">
                                    <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isHigh ? 'text-red-500' : isMedium ? 'text-amber-500' : 'text-emerald-500'}`} style={{ color: isHigh ? '#ef4444' : isMedium ? '#f59e0b' : '#10b981' }} />
                                    <span className="font-bold text-slate-900 text-[11px] leading-snug">{risk.description}</span>
                                  </div>
                                </div>
                                <div>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shadow-sm ${badgeColor}`}>
                                    {badgeText}
                                  </span>
                                </div>
                              </div>

                              {/* Right Side: Preventive Measures (58% width) */}
                              <div className="p-2.5 bg-white flex flex-col justify-center" style={{ width: '58%', minWidth: '58%', boxSizing: 'border-box' }}>
                                <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Medidas Preventivas e Controles</div>
                                {risk.measures && risk.measures.length > 0 ? (
                                  <ul className="space-y-1">
                                    {risk.measures.map((measure, mIdx) => (
                                      <li key={mIdx} className="text-[10.5px] text-slate-700 leading-tight flex items-start gap-1.5">
                                        <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0 font-bold" style={{ color: '#10b981' }} />
                                        <span>{measure}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Nenhuma medida preventiva cadastrada</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(apr.risks || []).length === 0 && (
                      <div className="p-4 text-center text-slate-400 italic text-xs">
                        Nenhum risco cadastrado para esta atividade.
                      </div>
                    )}
                  </div>
                ))}

                {filteredAprs.length === 0 && (
                  <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center text-slate-400 italic text-sm">
                    Nenhuma atividade registrada para o período selecionado.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-end page-break-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">Relatório gerado em</p>
              <p className="text-[11px] font-medium text-gray-600">{new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div className="text-right">
              <div className="w-40 border-b border-gray-900 mb-1.5"></div>
              <p className="text-[9px] font-bold text-gray-400 uppercase leading-none">Assinatura do Responsável</p>
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
      margin: [10, 10],
      filename: `Relatorio_Seguranca_${record.month}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        onclone: setupPDFCloneCompatibility
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: '.page-break-avoid' }
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
                <p className="text-purple-600 font-bold text-xs mt-1">CONTRATO: 4500083171</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-400 uppercase">Mês de Referência</p>
              <p className="text-xl font-black text-gray-900">
                {getMonthName(record.month).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 mb-10">
            <div className="flex-1 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Dados de Exposição</h3>
              <div className="flex flex-row gap-4">
                <div className="flex-1 bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Efetivo Médio</p>
                  <p className="text-xl font-black">{record.employeeCount}</p>
                </div>
                <div className="flex-1 bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Horas Trabalhadas</p>
                  <p className="text-xl font-black">{Math.round(record.htt).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Indicadores de Desempenho</h3>
              <div className="flex flex-row gap-4">
                <div className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: '#eff6ff', borderColor: '#dbeafe' }}>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#2563eb' }}>Taxa Frequência (TF)</p>
                  <p className="text-xl font-black" style={{ color: '#1d4ed8' }}>{record.frequencyRate.toFixed(2)}</p>
                </div>
                <div className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: '#faf5ff', borderColor: '#f3e8ff' }}>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#9333ea' }}>Taxa Gravidade (TG)</p>
                  <p className="text-xl font-black" style={{ color: '#7e22ce' }}>{record.severityRate.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Resumo de Ocorrências</h3>
            <div className="flex flex-row flex-wrap sm:flex-nowrap gap-4">
              <div className="flex-1 min-w-[100px] border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Acidentes CPT</p>
                <p className="text-2xl font-black" style={{ color: '#ef4444' }}>{record.accidentsWithLostTime}</p>
              </div>
              <div className="flex-1 min-w-[100px] border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Acidentes SPT</p>
                <p className="text-2xl font-black" style={{ color: '#f97316' }}>{record.accidentsWithoutLostTime}</p>
              </div>
              <div className="flex-1 min-w-[100px] border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Fatais</p>
                <p className="text-2xl font-black text-gray-900">{record.fatalAccidents || 0}</p>
              </div>
              <div className="flex-1 min-w-[100px] border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Dias Perdidos</p>
                <p className="text-2xl font-black" style={{ color: '#b91c1c' }}>{record.daysLost}</p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-gray-50 rounded-2xl border border-gray-100 italic text-sm text-gray-600">
            <p><strong>Nota:</strong> Os cálculos de Taxa de Frequência e Gravidade seguem os critérios da NBR 14280. HTT (Horas Homem Trabalhadas) é a base para o cálculo dos coeficientes de acidentabilidade.</p>
          </div>

          <div className="mt-20 flex flex-col sm:flex-row justify-between items-center gap-12 px-8 page-break-avoid">
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

const LaborDayMessage = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const today = new Date();
    // Month is 0-indexed, so 4 is May
    const isLaborDay = today.getFullYear() === 2026 && today.getMonth() === 4 && today.getDate() === 1;
    
    if (isLaborDay) {
      const hasSeen = localStorage.getItem('seenLaborDay2026');
      if (!hasSeen) {
        setShow(true);
      }
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-yellow-500" />
        
        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Briefcase className="text-yellow-600 w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 mb-2">Feliz Dia do Trabalhador!</h2>
        <p className="text-gray-600 leading-relaxed mb-8 text-sm">
          Agradecemos por todo o seu esforço e dedicação na construção de um ambiente mais seguro para todos. Aproveite seu dia!
        </p>
        
        <button 
          onClick={() => {
            localStorage.setItem('seenLaborDay2026', 'true');
            setShow(false);
          }}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95"
        >
          Continuar
        </button>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <LaborDayMessage />
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [asyncError, setAsyncError] = useState<any>(null);
  const [aprs, setAprs] = useState<APR[]>([]);
  const [aprsLimit, setAprsLimit] = useState(100);
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
  const [dateFilterType, setDateFilterType] = useState<string>('all');
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedEmpRole, setSelectedEmpRole] = useState<string>('all');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [newMeasureInputs, setNewMeasureInputs] = useState<{[key: string]: string}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showEmployeeSuccess, setShowEmployeeSuccess] = useState(false);
  const [copiedEmployees, setCopiedEmployees] = useState(false);
  const [importJsonInput, setImportJsonInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showImportArea, setShowImportArea] = useState(false);
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
  const [pages, setPages] = useState<any[][]>([]);

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

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
              const profileData = {
                uid: user.uid,
                email: user.email || '',
                role: isDefaultAdmin ? 'admin' : 'user'
              };
              await setDoc(doc(db, 'users', user.uid), profileData);
            } catch (error) {
              console.error("CRITICAL: setDoc failed for user profile:", error);
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
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const qAprs = query(collection(db, 'aprs'), orderBy('createdAt', 'desc'), limit(aprsLimit));
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

    const qEmployees = query(collection(db, 'employees'), orderBy('name', 'asc'), limit(1000));
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

    const qAccidents = query(collection(db, 'accidentRecords'), orderBy('month', 'desc'), limit(1000));
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
  }, [isAuthReady, user, aprsLimit]);

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
    if (view !== 'print' || !currentApr) {
      return;
    }
    
    const timer = setTimeout(() => {
      const headerEl = document.getElementById('measuring-header');
      const risksHeaderEl = document.getElementById('measuring-risks-header');
      const photosEl = document.getElementById('measuring-photos');
      const signaturesEl = document.getElementById('measuring-signatures');
      
      if (!headerEl) {
        console.warn('Measuring header element not found');
        return;
      }
      
      const headerHeight = headerEl.offsetHeight;
      const risksHeaderHeight = risksHeaderEl ? risksHeaderEl.offsetHeight : 50;
      const photosHeight = photosEl ? photosEl.offsetHeight : 0;
      const signaturesHeight = signaturesEl ? signaturesEl.offsetHeight : 200;
      
      const riskHeights: number[] = [];
      (currentApr.risks || []).forEach((_, idx) => {
        const el = document.getElementById(`measuring-risk-${idx}`);
        riskHeights.push(el ? el.offsetHeight : 80);
      });
      
      const maxPage1Height = 880; // Content limit on Page 1
      const maxPageSubsequentHeight = 910; // Content limit on Page 2+
      const subHeaderHeight = 35; // Height offset for subsequent pages
      const computedPages: any[][] = [];
      let currentPageItems: any[] = [];
      let currentPageHeight = 0;
      
      const checkPageBreak = (requiredHeight: number, isSubsequent: boolean) => {
        const pageLimit = isSubsequent ? maxPageSubsequentHeight : maxPage1Height;
        if (currentPageHeight + requiredHeight > pageLimit) {
          return true;
        }
        return false;
      };
      
      // Page 1 always starts with the main Header block
      currentPageItems.push({ type: 'header', height: headerHeight });
      currentPageHeight += headerHeight;
      
      // Add Risks Header if risks exist
      if ((currentApr.risks || []).length > 0) {
        const isSubsequent = computedPages.length > 0;
        if (checkPageBreak(risksHeaderHeight, isSubsequent)) {
          computedPages.push(currentPageItems);
          currentPageItems = [];
          currentPageHeight = subHeaderHeight;
        }
        currentPageItems.push({ type: 'risks-header', height: risksHeaderHeight });
        currentPageHeight += risksHeaderHeight;
      }
      
      // Add each Risk block
      (currentApr.risks || []).forEach((risk, idx) => {
        const rHeight = riskHeights[idx];
        const isSubsequent = computedPages.length > 0;
        if (checkPageBreak(rHeight, isSubsequent)) {
          computedPages.push(currentPageItems);
          currentPageItems = [];
          currentPageHeight = subHeaderHeight;
        }
        currentPageItems.push({ type: 'risk', data: risk, index: idx, height: rHeight });
        currentPageHeight += rHeight;
      });
      
      // Add Photos block (strictly after Risks)
      if ((currentApr.photos || []).length > 0) {
        const isSubsequent = computedPages.length > 0;
        if (checkPageBreak(photosHeight, isSubsequent)) {
          computedPages.push(currentPageItems);
          currentPageItems = [];
          currentPageHeight = subHeaderHeight;
        }
        currentPageItems.push({ type: 'photos', height: photosHeight });
        currentPageHeight += photosHeight;
      }
      
      // Add Signatures block
      const isSubsequentSig = computedPages.length > 0;
      if (checkPageBreak(signaturesHeight, isSubsequentSig)) {
        computedPages.push(currentPageItems);
        currentPageItems = [];
        currentPageHeight = subHeaderHeight;
      }
      currentPageItems.push({ type: 'signatures', height: signaturesHeight });
      currentPageHeight += signaturesHeight;
      
      // Push final page
      if (currentPageItems.length > 0) {
        computedPages.push(currentPageItems);
      }
      
      setPages(computedPages);
    }, 400); // 400ms is safe for full DOM paint of Base64 images
    
    return () => clearTimeout(timer);
  }, [currentApr, view]);

  useEffect(() => {
    if (saveError) {
      const timer = setTimeout(() => setSaveError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [saveError]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
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
      
      let matchesDate = true;
      const today = new Date();
      // Format as YYYY-MM-DD using local timezone/offset values to ensure accuracy
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      if (dateFilterType === 'today') {
        matchesDate = date === todayStr;
      } else if (dateFilterType === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const y_yyyy = yesterday.getFullYear();
        const y_mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const y_dd = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${y_yyyy}-${y_mm}-${y_dd}`;
        matchesDate = date === yesterdayStr;
      } else if (dateFilterType === '7days') {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 7);
        const l_yyyy = limitDate.getFullYear();
        const l_mm = String(limitDate.getMonth() + 1).padStart(2, '0');
        const l_dd = String(limitDate.getDate()).padStart(2, '0');
        const limitStr = `${l_yyyy}-${l_mm}-${l_dd}`;
        matchesDate = date >= limitStr && date <= todayStr;
      } else if (dateFilterType === '30days') {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 30);
        const l_yyyy = limitDate.getFullYear();
        const l_mm = String(limitDate.getMonth() + 1).padStart(2, '0');
        const l_dd = String(limitDate.getDate()).padStart(2, '0');
        const limitStr = `${l_yyyy}-${l_mm}-${l_dd}`;
        matchesDate = date >= limitStr && date <= todayStr;
      } else if (dateFilterType === 'this-month') {
        const currentMonthStr = `${yyyy}-${mm}`;
        matchesDate = date.startsWith(currentMonthStr);
      } else if (dateFilterType === 'specific-month') {
        matchesDate = selectedMonth === 'all' || date.startsWith(selectedMonth);
      } else if (dateFilterType === 'custom-range') {
        if (selectedStartDate) {
          matchesDate = matchesDate && date >= selectedStartDate;
        }
        if (selectedEndDate) {
          matchesDate = matchesDate && date <= selectedEndDate;
        }
      }
      
      const aprParticipants = [
        ...(apr.executors || []),
        ...(apr.safetyTechnicians || []),
        ...(apr.responsible ? [{ name: apr.responsible, role: 'Encarregado/Responsável' }] : [])
      ];

      const matchesRole = selectedRole === 'all' || aprParticipants.some(p => p && p.role === selectedRole);
      
      return matchesSearch && matchesDate && matchesRole;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [aprs, searchTerm, selectedMonth, dateFilterType, selectedStartDate, selectedEndDate, selectedRole]);

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

  const handleDuplicateApr = (apr: APR) => {
    if (!user) return;
    const duplicated: APR = {
      ...apr,
      id: generateId(),
      task: apr.task ? `${apr.task} (Cópia)` : '',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      uid: user.uid,
    };
    setCurrentApr(duplicated);
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
    setPages([]);
    setView('print');
    setTimeout(() => {
      window.print();
      setView('list');
    }, 1800);
  };

  const handleExportPDF = (apr: APR, returnTo: typeof view = 'list') => {
    setCurrentApr(apr);
    setPages([]);
    setView('print');
    
    setTimeout(() => {
      const element = document.getElementById('apr-print-view');
      if (element) {
        const opt = {
          margin: 0,
          filename: `APR_${apr.osNumber || apr.id.slice(0,8)}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            onclone: setupPDFCloneCompatibility
          },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
          pagebreak: { mode: ['css', 'legacy'] }
        };
        html2pdf().set(opt).from(element).save().then(() => {
          setView(returnTo);
        });
      } else {
        setView(returnTo);
      }
    }, 1800);
  };

  const handleExportStatPDF = (record: AccidentRecord, returnTo: typeof view = 'statistics') => {
    setCurrentStatRecord(record);
    setView('stat-report');
    
    setTimeout(() => {
      const element = document.getElementById('stat-report-content');
      if (element) {
        const opt = {
          margin: [15, 15, 15, 15] as [number, number, number, number],
          filename: `Relatorio_Seguranca_${record.month}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            onclone: setupPDFCloneCompatibility
          },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
          pagebreak: { mode: ['css', 'legacy'], avoid: '.page-break-avoid' }
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
          margin: [15, 15, 15, 15] as [number, number, number, number],
          filename: `Relatorio_Consolidado_APR_${month}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            onclone: setupPDFCloneCompatibility
          },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.page-break-avoid', 'tr'] }
        };
        html2pdf().set(opt).from(element).save();
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

  const addRisk = (riskDesc: string, measures: string[], classification?: 'Baixo' | 'Médio' | 'Alto') => {
    if (!currentApr) return;
    const newRisk: Risk = {
      id: generateId(),
      description: riskDesc,
      measures: [...measures],
      classification: classification || 'Médio'
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

  const handleExportEmployeesJson = () => {
    try {
      const dataStr = JSON.stringify(employees, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'funcionarios_com_assinaturas.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error("Erro exportando funcionarios", error);
    }
  };

  const handleCopyEmployeesJson = () => {
    try {
      const dataStr = JSON.stringify(employees, null, 2);
      navigator.clipboard.writeText(dataStr);
      setCopiedEmployees(true);
      setTimeout(() => setCopiedEmployees(false), 3000);
    } catch (error) {
      console.error("Erro ao copiar json", error);
    }
  };

  const handleImportEmployeesJson = async () => {
    if (!importJsonInput.trim()) return;
    setImportError(null);
    setImportSuccess(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(importJsonInput.trim());
      } catch (e) {
        setImportError("O JSON informado é inválido. Verifique o formato.");
        return;
      }

      const list = Array.isArray(parsed) ? parsed : [parsed];
      if (list.length === 0) {
        setImportError("Nenhum funcionário encontrado na lista.");
        return;
      }

      let importedCount = 0;
      for (const item of list) {
        if (item && item.name && item.role) {
          const id = item.id || generateId();
          const pEmp: Employee = {
            id,
            name: String(item.name).trim(),
            role: String(item.role).trim(),
            signature: item.signature || ''
          };
          await setDoc(doc(db, 'employees', id), pEmp);
          importedCount++;
        }
      }
      
      setImportSuccess(`${importedCount} funcionário(s) importado(s) com sucesso!`);
      setImportJsonInput('');
      setTimeout(() => {
        setImportSuccess(null);
        setShowImportArea(false);
      }, 4000);
    } catch (error) {
      console.error("Erro importando funcionarios", error);
      setImportError("Falha ao salvar os funcionários editados.");
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
      <div className="min-h-screen flex items-center justify-center bg-[#1a2233]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-bold animate-pulse">Carregando APR PRO...</p>
        </div>
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
    if (pages.length === 0) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="w-12 h-12 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <h2 className="text-lg font-bold uppercase tracking-tight text-slate-800">Paginação APR</h2>
            <p className="text-slate-500 text-xs">Calculando as alturas dos blocos de riscos, fotos e assinaturas para gerar quebras de página corporativas...</p>
          </div>
          
          {/* Measuring Container (Off-screen) */}
          <div 
            id="apr-measuring-container"
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: '-9999px', 
              width: '210mm', 
              boxSizing: 'border-box', 
              padding: '12mm',
              backgroundColor: 'white',
              color: 'black'
            }}
          >
            {/* 1. Header & Metadata Table */}
            <table id="measuring-header" className="w-full border-collapse border border-gray-300 mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
              <tbody>
                <tr>
                  <td className="p-2.5 border border-gray-300 w-1/2">
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Empresa</div>
                    <div className="font-semibold text-slate-800 text-xs mt-0.5">{currentApr.company}</div>
                  </td>
                  <td className="p-2.5 border border-gray-300 w-1/2">
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Número da OS</div>
                    <div className="font-semibold text-slate-800 text-xs mt-0.5">{currentApr.osNumber || 'N/A'}</div>
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-gray-300">
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Local de Trabalho</div>
                    <div className="font-semibold text-slate-800 text-xs mt-0.5">{currentApr.location}</div>
                  </td>
                  <td className="p-2.5 border border-gray-300">
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Data de Emissão</div>
                    <div className="font-semibold text-slate-800 text-xs mt-0.5">{formatDateForDisplay(currentApr.date)}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="p-2.5 border border-gray-300">
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Descrição da Tarefa</div>
                    <div className="font-semibold text-slate-800 text-xs mt-0.5">{currentApr.task}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="p-2.5 border border-gray-300">
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Responsável pela Execução</div>
                    <div className="font-semibold text-slate-800 text-xs mt-0.5">{currentApr.responsible}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. Risks Header */}
            {currentApr.risks && currentApr.risks.length > 0 && (
              <div id="measuring-risks-header" className="bg-slate-100 border border-gray-300 px-3 py-1.5 flex justify-between items-center text-[10px] font-bold uppercase text-slate-700 tracking-wider mb-0.5">
                <span>Riscos Identificados e Medidas de Controle</span>
                <span className="font-mono text-gray-500">Qtd: {currentApr.risks.length}</span>
              </div>
            )}

            {/* 3. Risks List Items */}
            {(currentApr.risks || []).map((risk, idx) => {
              const isHigh = risk.classification === 'Alto';
              const isMedium = risk.classification === 'Médio';
              const badgeText = risk.classification || 'Médio';
              return (
                <div key={risk.id || idx} id={`measuring-risk-${idx}`} className="border border-gray-300 bg-white flex w-full overflow-hidden text-xs mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <div className="p-2.5 border-r border-gray-300 flex flex-col justify-between" style={{ width: '42%', minWidth: '42%', boxSizing: 'border-box', backgroundColor: '#fafafa' }}>
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isHigh ? 'text-red-500' : isMedium ? 'text-amber-500' : 'text-emerald-500'}`} style={{ color: isHigh ? '#ef4444' : isMedium ? '#d97706' : '#059669' }} />
                      <span className="font-bold text-slate-800 text-[11px] leading-tight">{risk.description}</span>
                    </div>
                    <div className="mt-1.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded-none text-[8px] font-bold uppercase tracking-wider border ${
                        isHigh ? 'bg-red-50 text-red-700 border-red-200' : isMedium ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {badgeText}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white flex flex-col justify-center flex-1" style={{ width: '58%', minWidth: '58%', boxSizing: 'border-box' }}>
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Medidas Preventivas e Controles</div>
                    {risk.measures && risk.measures.length > 0 ? (
                      <ul className="space-y-0.5">
                        {risk.measures.map((measure, mIdx) => (
                          <li key={mIdx} className="text-[10px] text-slate-700 leading-tight flex items-start gap-1">
                            <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0 font-bold" style={{ color: '#059669' }} />
                            <span>{measure}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-400 italic text-[10px]">Nenhuma medida preventiva cadastrada</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 4. Photos Block */}
            {(currentApr.photos || []).length > 0 && (
              <div id="measuring-photos" className="border border-gray-300 p-3 mb-2.5 mt-2.5" style={{ breakInside: 'avoid', pageBreakInside: 'avoid', backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
                <p className="font-bold uppercase text-[8px] text-slate-500 tracking-wider mb-2 border-b border-gray-200 pb-1">Fotos das Atividades</p>
                {currentApr.photos.length === 1 ? (
                  <div className="flex justify-center py-1">
                    <img 
                      src={currentApr.photos[0]} 
                      alt="Atividade 1" 
                      className="object-cover border border-gray-200 rounded-none shadow-none" 
                      style={{ width: '240px', height: '150px' }}
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                ) : (
                  <div className="grid gap-2" style={{ display: 'grid', gridTemplateColumns: currentApr.photos.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                    {currentApr.photos.map((photo, i) => (
                      <img 
                        key={i} 
                        src={photo} 
                        alt={`Atividade ${i+1}`} 
                        className="w-full object-cover border border-gray-200 rounded-none shadow-none" 
                        style={{ height: currentApr.photos.length === 2 ? '120px' : '90px' }}
                        referrerPolicy="no-referrer" 
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Signatures Block */}
            <div id="measuring-signatures" className="border border-gray-300 p-3 mt-2.5 bg-white" style={{ breakInside: 'avoid', pageBreakInside: 'avoid', fontFamily: 'Arial, sans-serif' }}>
              <p className="font-bold uppercase text-[8px] text-slate-500 tracking-wider text-center mb-3 border-b border-gray-200 pb-1">Assinaturas de Validação</p>
              
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="text-center flex flex-col items-center justify-between">
                  <div className="h-8 flex items-center justify-center mb-0.5">
                    {currentApr.signature ? (
                      <img src={currentApr.signature} alt="Assinatura" className="max-h-7 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-24 border-b border-dashed border-gray-300 h-4"></div>
                    )}
                  </div>
                  <div className="w-3/4 border-t border-gray-300 pt-0.5">
                    <p className="text-[9px] font-bold text-slate-800 leading-none">{currentApr.responsible}</p>
                    <p className="text-[7px] text-gray-500 uppercase tracking-wider mt-0.5">Responsável pela Execução</p>
                  </div>
                </div>
                
                <div className="text-center flex flex-col items-center justify-between">
                  <div className="flex flex-col gap-2 w-full">
                    {(currentApr.safetyTechnicians || []).map((tech, tIdx) => (
                      <div key={tIdx} className="flex flex-col items-center">
                        <div className="h-6 flex items-center justify-center mb-0.5">
                          {tech.signature ? (
                            <img src={tech.signature} alt={tech.name} className="max-h-5 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-24 border-b border-dashed border-gray-300 h-3"></div>
                          )}
                        </div>
                        <div className="w-3/4 border-t border-gray-200 pt-0.5">
                          <p className="text-[9px] font-bold text-slate-800 leading-none">{tech.name}</p>
                          <p className="text-[7px] text-gray-500 uppercase tracking-wider mt-0.5">Técnico de Segurança</p>
                        </div>
                      </div>
                    ))}
                    {(currentApr.safetyTechnicians || []).length === 0 && (
                      <div className="flex flex-col items-center">
                        <div className="h-6 flex items-center justify-center mb-0.5">
                          <div className="w-24 border-b border-dashed border-gray-300 h-3"></div>
                        </div>
                        <div className="w-3/4 border-t border-gray-200 pt-0.5">
                          <p className="text-[9px] font-bold text-gray-300 uppercase leading-none">Pendente</p>
                          <p className="text-[7px] text-gray-500 uppercase tracking-wider mt-0.5">Técnico de Segurança</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="font-bold uppercase text-[7.5px] text-slate-400 tracking-wider text-center mb-2">Assinatura dos Executantes</p>
                {currentApr.executors && currentApr.executors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                    {currentApr.executors.map((executor, eIdx) => (
                      <div key={eIdx} className="flex flex-col items-center text-center">
                        <div className="h-6 flex items-center justify-center mb-0.5">
                          {executor.signature ? (
                            <img src={executor.signature} alt={executor.name} className="max-h-5 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-20 border-b border-dashed border-gray-300 h-3"></div>
                          )}
                        </div>
                        <div className="w-3/4 border-t border-gray-200 pt-0.5">
                          <p className="text-[8px] font-bold text-slate-800 leading-none">{executor.name}</p>
                          <p className="text-[6.5px] text-gray-400 uppercase tracking-wider mt-0.5">{executor.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 italic text-[8px] py-0.5">Nenhum executante selecionado</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fully partitioned page view for export / print
    return (
      <div id="apr-print-view" className="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center gap-6 print:bg-white print:p-0 print:gap-0" style={{ fontFamily: 'Arial, sans-serif' }}>
        {pages.map((pageItems, pageIdx) => (
          <div 
            key={pageIdx} 
            className="bg-white text-black p-[12mm] relative flex flex-col justify-between print:shadow-none print:border-none print:m-0"
            style={{ 
              width: '210mm', 
              height: '297mm', 
              boxSizing: 'border-box', 
              pageBreakAfter: 'always',
              breakInside: 'avoid',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="flex-1 flex flex-col">
              {/* Page Header */}
              {pageIdx === 0 ? (
                <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-3">
                  <div>
                    <h1 className="text-sm font-bold uppercase text-slate-800 tracking-tight leading-none">Análise Preliminar de Risco</h1>
                    <p className="text-[7.5px] font-medium text-gray-400 uppercase tracking-wider mt-1">APR PRO • Segurança do Trabalho</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono font-bold text-slate-700">ID: {currentApr.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[7.5px] font-medium text-gray-400 mt-1 uppercase">Data: {formatDateForDisplay(currentApr.date)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center border-b border-gray-300 pb-1 mb-2 text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                  <span>Análise Preliminar de Risco (APR) - Continuação</span>
                  <span>ID: {currentApr.id.slice(0, 8).toUpperCase()} | OS: {currentApr.osNumber || 'N/A'}</span>
                </div>
              )}

              {/* Page Body Content */}
              <div className="flex-1 flex flex-col gap-2">
                {pageItems.map((item, itemIdx) => {
                  if (item.type === 'header') {
                    return (
                      <table key={itemIdx} className="w-full border-collapse border border-gray-300 mb-2.5">
                        <tbody>
                          <tr>
                            <td className="p-2 border border-gray-300 w-1/2">
                              <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Empresa</div>
                              <div className="font-semibold text-slate-800 text-[10px] mt-0.5">{currentApr.company}</div>
                            </td>
                            <td className="p-2 border border-gray-300 w-1/2">
                              <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Número da OS</div>
                              <div className="font-semibold text-slate-800 text-[10px] mt-0.5">{currentApr.osNumber || 'N/A'}</div>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 border border-gray-300">
                              <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Local de Trabalho</div>
                              <div className="font-semibold text-slate-800 text-[10px] mt-0.5">{currentApr.location}</div>
                            </td>
                            <td className="p-2 border border-gray-300">
                              <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Data de Emissão</div>
                              <div className="font-semibold text-slate-800 text-[10px] mt-0.5">{formatDateForDisplay(currentApr.date)}</div>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="p-2 border border-gray-300">
                              <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Descrição da Tarefa</div>
                              <div className="font-semibold text-slate-800 text-[10px] mt-0.5">{currentApr.task}</div>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="p-2 border border-gray-300">
                              <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Responsável pela Execução</div>
                              <div className="font-semibold text-slate-800 text-[10px] mt-0.5">{currentApr.responsible}</div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  }
                  
                  if (item.type === 'risks-header') {
                    return (
                      <div key={itemIdx} className="bg-slate-100 border border-gray-300 px-3 py-1 flex justify-between items-center text-[8.5px] font-bold uppercase text-slate-700 tracking-wider mb-0.5">
                        <span>Riscos Identificados e Medidas de Controle</span>
                        <span className="font-mono text-gray-500">Qtd: {(currentApr.risks || []).length}</span>
                      </div>
                    );
                  }
                  
                  if (item.type === 'risk') {
                    const risk = item.data;
                    const isHigh = risk.classification === 'Alto';
                    const isMedium = risk.classification === 'Médio';
                    const badgeText = risk.classification || 'Médio';
                    
                    return (
                      <div key={itemIdx} className="border border-gray-300 bg-white flex w-full overflow-hidden text-[10px] mb-1">
                        <div className="p-2 border-r border-gray-300 flex flex-col justify-between" style={{ width: '42%', minWidth: '42%', boxSizing: 'border-box', backgroundColor: '#fafafa' }}>
                          <div className="flex items-start gap-1">
                            <AlertTriangle className={`w-3 h-3 mt-0.5 shrink-0 ${isHigh ? 'text-red-500' : isMedium ? 'text-amber-500' : 'text-emerald-500'}`} style={{ color: isHigh ? '#ef4444' : isMedium ? '#d97706' : '#059669' }} />
                            <span className="font-bold text-slate-800 text-[10px] leading-tight">{risk.description}</span>
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider border ${
                              isHigh ? 'bg-red-50 text-red-700 border-red-200' : isMedium ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {badgeText}
                            </span>
                          </div>
                        </div>
                        <div className="p-2 bg-white flex flex-col justify-center flex-1" style={{ width: '58%', minWidth: '58%', boxSizing: 'border-box' }}>
                          <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Medidas Preventivas e Controles</div>
                          {risk.measures && risk.measures.length > 0 ? (
                            <ul className="space-y-0.5">
                              {risk.measures.map((measure: string, mIdx: number) => (
                                <li key={mIdx} className="text-[9px] text-slate-700 leading-tight flex items-start gap-1">
                                  <Check className="w-2.5 h-2.5 text-emerald-600 mt-0.5 shrink-0 font-bold" style={{ color: '#059669' }} />
                                  <span>{measure}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-400 italic text-[9px]">Nenhuma medida preventiva cadastrada</span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  if (item.type === 'photos') {
                    const photos = currentApr.photos || [];
                    return (
                      <div key={itemIdx} className="border border-gray-300 p-2.5 mb-1.5 mt-1.5" style={{ breakInside: 'avoid', pageBreakInside: 'avoid', backgroundColor: '#ffffff' }}>
                        <p className="font-bold uppercase text-[7.5px] text-slate-500 tracking-wider mb-2 border-b border-gray-200 pb-0.5">Fotos das Atividades</p>
                        {photos.length === 1 ? (
                          <div className="flex justify-center py-0.5">
                            <img 
                              src={photos[0]} 
                              alt="Atividade 1" 
                              className="object-cover border border-gray-200 rounded-none shadow-none" 
                              style={{ width: '220px', height: '140px' }}
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        ) : (
                          <div className="grid gap-2" style={{ display: 'grid', gridTemplateColumns: photos.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                            {photos.map((photo, i) => (
                              <img 
                                key={i} 
                                src={photo} 
                                alt={`Atividade ${i+1}`} 
                                className="w-full object-cover border border-gray-200 rounded-none shadow-none" 
                                style={{ height: photos.length === 2 ? '110px' : '85px' }}
                                referrerPolicy="no-referrer" 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  if (item.type === 'signatures') {
                    return (
                      <div key={itemIdx} className="border border-gray-300 p-2.5 mt-1.5 bg-white" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                        <p className="font-bold uppercase text-[7.5px] text-slate-500 tracking-wider text-center mb-2.5 border-b border-gray-200 pb-0.5">Assinaturas de Validação</p>
                        
                        <div className="grid grid-cols-2 gap-4 pb-2 border-b border-gray-200" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="text-center flex flex-col items-center justify-between">
                            <div className="h-8 flex items-center justify-center mb-0.5">
                              {currentApr.signature ? (
                                <img src={currentApr.signature} alt="Assinatura" className="max-h-7 object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-24 border-b border-dashed border-gray-300 h-4"></div>
                              )}
                            </div>
                            <div className="w-3/4 border-t border-gray-300 pt-0.5">
                              <p className="text-[8.5px] font-bold text-slate-800 leading-none">{currentApr.responsible}</p>
                              <p className="text-[6.5px] text-gray-500 uppercase tracking-wider mt-0.5">Responsável pela Execução</p>
                            </div>
                          </div>
                          
                          <div className="text-center flex flex-col items-center justify-between">
                            <div className="flex flex-col gap-2 w-full">
                              {(currentApr.safetyTechnicians || []).map((tech, tIdx) => (
                                <div key={tIdx} className="flex flex-col items-center">
                                  <div className="h-6 flex items-center justify-center mb-0.5">
                                    {tech.signature ? (
                                      <img src={tech.signature} alt={tech.name} className="max-h-5 object-contain" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-24 border-b border-dashed border-gray-300 h-3"></div>
                                    )}
                                  </div>
                                  <div className="w-3/4 border-t border-gray-200 pt-0.5">
                                    <p className="text-[8.5px] font-bold text-slate-800 leading-none">{tech.name}</p>
                                    <p className="text-[6.5px] text-gray-500 uppercase tracking-wider mt-0.5">Técnico de Segurança</p>
                                  </div>
                                </div>
                              ))}
                              {(currentApr.safetyTechnicians || []).length === 0 && (
                                <div className="flex flex-col items-center">
                                  <div className="h-6 flex items-center justify-center mb-0.5">
                                    <div className="w-24 border-b border-dashed border-gray-300 h-3"></div>
                                  </div>
                                  <div className="w-3/4 border-t border-gray-200 pt-0.5">
                                    <p className="text-[8.5px] font-bold text-gray-300 uppercase leading-none">Pendente</p>
                                    <p className="text-[6.5px] text-gray-400 uppercase tracking-wider mt-0.5">Técnico de Segurança</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <p className="font-bold uppercase text-[7px] text-slate-400 tracking-wider text-center mb-2">Assinatura dos Executantes</p>
                          {currentApr.executors && currentApr.executors.length > 0 ? (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                              {currentApr.executors.map((executor, eIdx) => (
                                <div key={eIdx} className="flex flex-col items-center text-center">
                                  <div className="h-6 flex items-center justify-center mb-0.5">
                                    {executor.signature ? (
                                      <img src={executor.signature} alt={executor.name} className="max-h-5 object-contain" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-20 border-b border-dashed border-gray-300 h-3"></div>
                                    )}
                                  </div>
                                  <div className="w-3/4 border-t border-gray-200 pt-0.5">
                                    <p className="text-[8px] font-bold text-slate-800 leading-none">{executor.name}</p>
                                    <p className="text-[6.5px] text-gray-400 uppercase tracking-wider mt-0.5">{executor.role}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-400 italic text-[7.5px] py-0.5">Nenhum executante selecionado</p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Page Footer */}
            <div className="flex justify-between items-center border-t border-gray-200 pt-2 text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-3">
              <span>Gerado em {new Date(currentApr.createdAt || new Date()).toLocaleDateString('pt-BR')}</span>
              <span>Página {pageIdx + 1} de {pages.length}</span>
            </div>
          </div>
        ))}
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
            className="space-y-3 lg:space-y-4"
            >
              {/* Quick Access */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="flex items-center gap-4 p-3 lg:p-4 bg-yellow-500 text-white rounded-2xl shadow-sm hover:bg-yellow-600 transition-all group"
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
                  className="flex items-center gap-4 p-3 lg:p-4 bg-white border border-yellow-200 rounded-2xl shadow-sm hover:bg-yellow-50 transition-all group"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 lg:p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-xl">
                      <FileText className="text-blue-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total de APRs</p>
                      <p className="text-xl font-black text-gray-900">{stats.total}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 lg:p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-50 p-2.5 rounded-xl">
                      <Users className="text-green-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Funcionários</p>
                      <p className="text-xl font-black text-gray-900">{stats.employees}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 lg:p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-50 p-2.5 rounded-xl">
                      <Clock className="text-orange-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recentes (7 dias)</p>
                      <p className="text-xl font-black text-gray-900">{stats.recent}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and List */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-gray-900">Histórico de Análises</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Monthly Report export button if filtering by specific month */}
                      {(dateFilterType === 'specific-month' && selectedMonth !== 'all') && (
                        <button 
                          onClick={() => handleExportMonthlyAPRReport(selectedMonth)}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap animate-fadeIn"
                        >
                          <Download size={14} /> Relatório {getMonthName(selectedMonth, { month: 'short', year: 'numeric' })}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filters and Search Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
                    {/* Date Filter Type Selector */}
                    <div className="relative col-span-1 md:col-span-3">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select 
                        value={dateFilterType}
                        onChange={(e) => {
                          setDateFilterType(e.target.value);
                          // Reset other related states on type switch for safety
                          if (e.target.value !== 'specific-month') setSelectedMonth('all');
                          if (e.target.value !== 'custom-range') {
                            setSelectedStartDate('');
                            setSelectedEndDate('');
                          }
                        }}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full appearance-none cursor-pointer"
                      >
                        <option value="all">📅 Todos os Períodos</option>
                        <option value="today">📅 Hoje</option>
                        <option value="yesterday">📅 Ontem</option>
                        <option value="7days">📅 Últimos 7 dias</option>
                        <option value="30days">📅 Últimos 30 dias</option>
                        <option value="this-month">📅 Este Mês</option>
                        <option value="specific-month">📅 Mês Específico...</option>
                        <option value="custom-range">📅 Período Customizado...</option>
                      </select>
                    </div>

                    {/* Conditional Sub-filters for Dates */}
                    {dateFilterType === 'specific-month' && (
                      <div className="relative col-span-1 md:col-span-3">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select 
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-yellow-50/50 border border-yellow-200 rounded-xl text-sm font-semibold text-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full appearance-none cursor-pointer"
                        >
                          <option value="all">Escolha o Mês...</option>
                          {Array.from(new Set((aprs || []).map(a => (a.date || '').substring(0, 7)))).filter(Boolean).sort().reverse().map(month => (
                            <option key={month} value={month}>
                              {getMonthName(month)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {dateFilterType === 'custom-range' && (
                      <div className="col-span-1 md:col-span-4 flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1 text-[8px] font-bold text-gray-400 uppercase tracking-wider">De:</span>
                          <input 
                            type="date"
                            value={selectedStartDate}
                            onChange={(e) => setSelectedStartDate(e.target.value)}
                            className="pl-2.5 pr-2 pt-4 pb-1 bg-yellow-50/30 border border-yellow-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full"
                          />
                        </div>
                        <span className="text-gray-400 font-bold text-xs">à</span>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1 text-[8px] font-bold text-gray-400 uppercase tracking-wider">Até:</span>
                          <input 
                            type="date"
                            value={selectedEndDate}
                            onChange={(e) => setSelectedEndDate(e.target.value)}
                            className="pl-2.5 pr-2 pt-4 pb-1 bg-yellow-50/30 border border-yellow-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Cargo/Role Selector */}
                    <div className="relative col-span-1 md:col-span-2">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full appearance-none cursor-pointer"
                      >
                        <option value="all">Todos os Cargos</option>
                        {Array.from(new Set((employees || []).map(e => e.role))).filter(Boolean).sort().map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search Input */}
                    <div className="relative col-span-1 md:col-span-3 ml-auto w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Buscar por empresa, tarefa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all w-full font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left table-fixed">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="w-[35%] px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarefa / Empresa</th>
                        <th className="hidden md:table-cell w-[20%] px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data / Local</th>
                        <th className="hidden lg:table-cell w-[13%] px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Riscos / Fotos</th>
                        <th className="hidden xl:table-cell w-[12%] px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Executantes</th>
                        <th className="w-64 px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAprs.map((apr) => (
                        <tr key={apr.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-4 py-1.5" title={apr.task}>
                            <div className="font-black text-gray-900 truncate text-sm"><span>{apr.task || 'Sem título'}</span></div>
                            <div className="text-xs text-gray-500 truncate mt-0.5"><span>{apr.company || 'Empresa não informada'}</span></div>
                            <div className="md:hidden mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                              <span>{formatDateForDisplay(apr.date)}</span>
                              <span>•</span>
                              <span><span>{apr.location || 'Local'}</span></span>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-4 py-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                              <Calendar size={12} className="text-gray-400" />
                              {formatDateForDisplay(apr.date)}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                              <MapPin size={12} className="text-gray-400" />
                              {apr.location || 'Local não informado'}
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-4 py-1.5">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-800 w-fit uppercase">
                                {(apr.risks || []).length} riscos
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-800 w-fit uppercase">
                                {(apr.photos || []).length} fotos
                              </span>
                            </div>
                          </td>
                          <td className="hidden xl:table-cell px-4 py-1.5">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {(apr.executors || []).map((e, i) => (
                                <div key={`${e.id || 'exec'}-${i}`} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600" title={e.name}>
                                  {e.name?.charAt(0)}
                                </div>
                              ))}
                              {(apr.executors || []).length === 0 && <span className="text-[10px] text-gray-400 italic">Nenhum</span>}
                            </div>
                          </td>
                          <td className="px-4 py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1 sm:gap-1.5 transition-opacity">
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
                                onClick={() => handleDuplicateApr(apr)}
                                className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                title="Duplicar"
                              >
                                <Copy size={18} />
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

                {/* Limit Selector and Pagination Controls */}
                <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                  <p className="text-xs text-gray-500 font-medium">
                    Exibindo até <strong className="text-gray-900">{aprsLimit}</strong> APRs mais recentes (atualmente <strong className="text-gray-900">{aprs.length}</strong> carregadas).
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Limite:</span>
                    <select
                      value={aprsLimit}
                      onChange={(e) => setAprsLimit(Number(e.target.value))}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all cursor-pointer"
                    >
                      <option value={50}>50 APRs</option>
                      <option value={100}>100 APRs</option>
                      <option value={200}>200 APRs</option>
                      <option value={500}>500 APRs</option>
                      <option value={1000}>1000 APRs</option>
                      <option value={5000}>Sem limite (5000)</option>
                    </select>
                    {aprs.length >= aprsLimit && (
                      <button
                        onClick={() => setAprsLimit(prev => prev + 100)}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap"
                      >
                        Carregar Mais +100
                      </button>
                    )}
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                {/* Add/Edit Form (Replaced with Quick Add Style) */}
                <div className="md:col-span-1 space-y-6">
                  <div className="bg-white p-4 lg:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
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

                  {/* Export / Import Section for Worker List & Signatures */}
                  <div className="bg-white p-4 lg:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-gray-900">
                      <Users size={18} className="text-yellow-600" />
                      <h3 className="font-bold text-sm">Backup e Integração</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Exporte ou importe a lista de funcionários com as suas respectivas assinaturas digitais para outros dispositivos ou aplicativos compatíveis usando o formato JSON.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleExportEmployeesJson}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200/50 rounded-xl text-xs font-bold transition-all"
                        title="Baixar arquivo JSON"
                      >
                        <Download size={14} />
                        Baixar JSON
                      </button>
                      <button
                        onClick={handleCopyEmployeesJson}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          copiedEmployees 
                            ? 'bg-green-500 border-green-600 text-white' 
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                        }`}
                        title="Copiar dados JSON"
                      >
                        {copiedEmployees ? <Check size={14} /> : <Copy size={14} />}
                        {copiedEmployees ? 'Copiado!' : 'Copiar JSON'}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowImportArea(!showImportArea);
                          setImportError(null);
                          setImportSuccess(null);
                        }}
                        className="w-full text-center py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                      >
                        {showImportArea ? 'Ocultar Área de Importação' : 'Importar de outro App / Backup'}
                      </button>

                      {showImportArea && (
                        <div className="mt-3 space-y-3">
                          <textarea
                            value={importJsonInput}
                            onChange={(e) => setImportJsonInput(e.target.value)}
                            placeholder="Cole aqui o conteúdo do JSON exportado..."
                            className="w-full h-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 placeholder:font-sans"
                          />
                          <button
                            onClick={handleImportEmployeesJson}
                            disabled={!importJsonInput.trim()}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 border border-yellow-600 disabled:opacity-50 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            Confirmar Importação
                          </button>

                          {importError && (
                            <p className="text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-100">{importError}</p>
                          )}
                          {importSuccess && (
                            <p className="text-[11px] text-green-600 font-medium bg-green-50 p-2 rounded-lg border border-green-100">{importSuccess}</p>
                          )}
                        </div>
                      )}
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
                      <div key={`${executor.id || 'exec'}-${index}`} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm relative group">
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
                                        addRisk(risk.description, risk.measures, risk.classification);
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
                            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-50 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="bg-yellow-100 p-1.5 rounded-lg">
                                  <AlertTriangle size={18} className="text-yellow-600" />
                                </div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Risco Identificado</label>
                              </div>
                              {isReadOnly ? (
                                <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
                                  risk.classification === 'Baixo'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : risk.classification === 'Alto'
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}>
                                  Classificação: {risk.classification || 'Médio'}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                  <span className="text-[9px] uppercase font-bold text-gray-400 px-1">Classificação:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newRisks = (currentApr.risks || []).map(r => r.id === risk.id ? { ...r, classification: 'Baixo' as const } : r);
                                      setCurrentApr({ ...currentApr, risks: newRisks });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                      (risk.classification || 'Médio') === 'Baixo'
                                        ? 'bg-emerald-500 text-white shadow-sm scale-105'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                    }`}
                                  >
                                    Baixo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newRisks = (currentApr.risks || []).map(r => r.id === risk.id ? { ...r, classification: 'Médio' as const } : r);
                                      setCurrentApr({ ...currentApr, risks: newRisks });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                      (risk.classification || 'Médio') === 'Médio'
                                        ? 'bg-amber-500 text-white shadow-sm scale-105'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                    }`}
                                  >
                                    Médio
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newRisks = (currentApr.risks || []).map(r => r.id === risk.id ? { ...r, classification: 'Alto' as const } : r);
                                      setCurrentApr({ ...currentApr, risks: newRisks });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                      (risk.classification || 'Médio') === 'Alto'
                                        ? 'bg-rose-500 text-white shadow-sm scale-105'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                    }`}
                                  >
                                    Alto
                                  </button>
                                </div>
                              )}
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
