import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrashTalkStore } from '../store';
import { api } from '../api';
import { ShieldCheck, User, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setAdminAuth } = useTrashTalkStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email, password);
      if (res.success) {
        setAdminAuth(res.token, res.admin);
        navigate('/admin');
      } else {
        setError("Invalid credentials supplied.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid login profile or server connection loss.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-16">
      <div className="absolute inset-0 bg-radial from-[#16A34A]/5 to-transparent blur-3xl -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-md space-y-6 text-left"
      >
        <div className="text-center space-y-2">
          <div className="p-3 bg-emerald-50 text-[#16A34A] rounded-2xl inline-block border border-emerald-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="font-display font-medium text-2xl text-gray-900">MCMC Nodal Sign-in</h2>
          <p className="text-gray-400 text-xs font-mono">MANDYA EXECUTIVE ENTRANCE GATEWAY</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-display">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Officer Email</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="email"
                placeholder="officer@mandya.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] outline-none bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Secret Phrase</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] outline-none bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center space-x-2 py-3 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authorizing Nodal Token...</span>
              </>
            ) : (
              <span>Decrypt Entry Access</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
