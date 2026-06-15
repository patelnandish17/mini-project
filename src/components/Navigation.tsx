import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTrashTalkStore } from '../store';
import { Leaf, Map, Award, AlertTriangle, ShieldCheck, LogOut, Menu, X, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navigation() {
  const { adminToken, adminUser, logoutAdmin } = useTrashTalkStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logoutAdmin();
    setIsOpen(false);
    navigate('/');
  };

  const navItems = [
    { name: 'Live Map', path: '/map', icon: Map },
    { name: 'Report a Dump', path: '/report', icon: AlertTriangle },
    { name: 'Leaderboard', path: '/leaderboard', icon: Award },
    { name: 'Hotspots', path: '/hotspots', icon: Landmark },
  ];

  return (
    <nav id="navbar" className="sticky top-0 z-40 w-full bg-white border-b border-[#E5E7EB] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2.5 flex-shrink-0 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-100 transition-all group-hover:scale-105 group-hover:bg-emerald-700">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="font-display font-medium tracking-tight text-xl text-gray-900">
                Trash<span className="text-emerald-600">Talk</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-[#16A34A] bg-[#DCFCE7]/60'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}

            <div className="h-6 w-px bg-gray-200 mx-2" />

            {adminToken ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/admin"
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  <span>Admin Panel</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Logout Admin"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Nodal Login</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 bg-white"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <span>Home</span>
              </Link>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-all ${
                      isActive
                        ? 'text-[#16A34A] bg-[#DCFCE7]/60 font-semibold'
                        : 'text-[#475569] hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              ))}

              <div className="border-t border-gray-100 my-2 pt-2" />

              {adminToken ? (
                <div className="space-y-1">
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium bg-gray-900 text-white"
                  >
                    <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
                    <span>Admin Panel ({adminUser?.name.split(' ')[0]})</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-55"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-100"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Nodal Admin Login</span>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
