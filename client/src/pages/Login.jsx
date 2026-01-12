import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Github, Command, ArrowRight, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { supabase } from "../supabaseClient"; 
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOAuthLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) { setError(err.message); }
  };

  useEffect(() => {
    const handleSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setLoading(true);
            try {
                const meta = session.user.user_metadata;
                const name = meta.full_name || meta.user_name || meta.name || session.user.email;
                const res = await axios.post(`${API_URL}/auth/oauth-sync`, { email: session.user.email, fullName: name, providerId: session.user.app_metadata.provider || 'github' });
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("user", JSON.stringify(res.data.user));
                await supabase.auth.signOut(); 
                navigate("/dashboard");
            } catch (err) { setError("Failed to sync account."); setLoading(false); }
        }
    };
    handleSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err) { setError(err.response?.data?.error || "Invalid credentials"); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-900">
      
      {/* --- BACKGROUND FX --- */}
      <div className="absolute inset-0 z-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Aurora Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[120px] mix-blend-multiply animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[400px] bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] relative z-10 p-8 md:p-10"
      >
        {/* LOGO AREA */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-lg shadow-black/20 mb-5"
          >
            <Command size={22} />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Log in to manage your digital assets</p>
        </div>

        {/* ERROR TOAST */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> {error}
                </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GITHUB BUTTON */}
        <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleOAuthLogin('github')}
            className="w-full bg-slate-900 hover:bg-black text-white p-3.5 rounded-xl font-medium transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-3 mb-6 relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Github className="w-5 h-5" />
            <span className="text-sm relative z-10">Continue with GitHub</span>
        </motion.button>

        {/* DIVIDER */}
        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200/80"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-slate-400"><span className="px-3 bg-[#FCFCFD]">Or using email</span></div>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="group space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wide">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input 
                type="email" 
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 shadow-sm" 
                placeholder="you@example.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>
          
          <div className="group space-y-1">
            <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password</label>
                <a href="#" className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">Forgot?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input 
                type="password" 
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 shadow-sm" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={loading} 
            className="w-full bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300 p-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
          >
            {loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : <>Sign In <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-900 transition-colors" /></>}
          </motion.button>
        </form>

        <p className="text-center text-slate-400 text-xs mt-8">
          Don't have an account? <Link to="/register" className="font-bold text-slate-900 hover:underline">Create one now</Link>
        </p>
      </motion.div>

      {/* Footer Decoration */}
      <div className="absolute bottom-6 text-center w-full text-[10px] text-slate-400 font-medium uppercase tracking-widest opacity-50">
        Protected by Labmentix Security
      </div>
    </div>
  );
}