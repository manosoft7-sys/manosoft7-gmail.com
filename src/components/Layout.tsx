import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LayoutDashboard, Package, PlusCircle, LogOut, Menu, X, Users, Database as DatabaseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-500' },
    { path: '/parcels', icon: Package, label: 'Colis', color: 'text-orange-500' },
    { path: '/add', icon: PlusCircle, label: 'Ajouter un colis', color: 'text-green-500' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/users', icon: Users, label: 'Utilisateurs', color: 'text-purple-500' });
    navItems.push({ path: '/database', icon: DatabaseIcon, label: 'Base de données', color: 'text-indigo-500' });
  }

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <Package className="text-orange-600" />
          Gestion des colis
        </h1>
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="p-2 text-neutral-400 hover:text-neutral-900"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-700 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-orange-600' : item.color} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-100">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">{user?.username}</p>
            <p className="text-xs text-neutral-500 truncate">
              {user?.role === 'admin' ? 'Administrateur' : 'Agent'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} className="text-red-500" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-orange-600 border-b border-orange-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-white hover:bg-orange-700 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="font-bold text-white">Gestion des colis</div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
