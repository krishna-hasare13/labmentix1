import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Loader2, X, ShieldCheck, Zap, Globe, Github, Lock, Mail, ChevronLeft, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient"; 

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// --- COMPONENT: FLOATING LABEL INPUT ---
const FloatingInput = ({ label, type, value, onChange, id }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.length > 0;

  return (
    <div className="relative mb-5 group">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`peer w-full px-4 pt-6 pb-2 bg-slate-50 border-2 rounded-xl outline-none transition-all duration-200 font-medium text-slate-800 ${
          focused ? "border-indigo-600 bg-white" : "border-slate-100 hover:border-slate-200"
        }`}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 transition-all duration-200 pointer-events-none text-slate-400 font-medium ${
          focused || hasValue ? "top-2 text-xs text-indigo-600" : "top-4 text-sm"
        }`}
      >
        {label}
      </label>
    </div>
  );
};

export default function Login() {
  const [view, setView] = useState("login"); // 'login' or 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- HANDLE GITHUB LOGIN ---
  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // --- HANDLE EMAIL LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLE PASSWORD RESET ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // Make sure to handle this route later
      });
      if (error) throw error;
      setSuccessMsg("Check your email for the password reset link.");
    } catch (err) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  // --- SYNC SESSION (Handle OAuth Redirect) ---
  useEffect(() => {
    const handleSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setLoading(true);
            try {
                const meta = session.user.user_metadata;
                const name = meta.full_name || meta.user_name || meta.name || session.user.email;
                
                const res = await axios.post(`${API_URL}/auth/oauth-sync`, { 
                    email: session.user.email, 
                    fullName: name, 
                    providerId: 'github' 
                });
                
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("user", JSON.stringify(res.data.user));
                await supabase.auth.signOut(); 
                navigate("/dashboard");
            } catch (err) {
                setError("Failed to sync account.");
                setLoading(false);
            }
        }
    };
    handleSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* --- LEFT SIDE: DYNAMIC FORM AREA --- */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center p-8 sm:p-12 lg:p-20 relative overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* VIEW 1: LOGIN FORM */}
          {view === "login" && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-md mx-auto w-full"
            >
              {/* Brand Logo */}
              <div className="mb-10 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Zap className="text-white w-5 h-5 fill-current" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">KCloud</span>
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Welcome back</h1>
              <p className="text-slate-500 mb-8">Please enter your details to sign in.</p>

              {/* GitHub Button */}
              <div className="mb-8">
                <button 
                    onClick={handleGitHubLogin}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition font-bold text-sm text-slate-700 active:scale-[0.98]"
                >
                  <Github size={20} className="fill-slate-900" />
                  Continue with GitHub
                </button>
              </div>

              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-slate-400 font-medium">Or sign in with email</span></div>
              </div>

              <form onSubmit={handleLogin}>
                <FloatingInput id="email" type="email" label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
                <FloatingInput id="password" type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                
                <div className="flex justify-end mb-6">
                    <button type="button" onClick={() => setView("forgot")} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                        Forgot Password?
                    </button>
                </div>

                {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2"><X size={14}/> {error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={18} /></>}
                </button>
              </form>

              <p className="text-center mt-8 text-slate-500 text-sm">
                Don't have an account? <Link to="/register" className="text-indigo-600 font-bold hover:underline">Create account</Link>
              </p>
            </motion.div>
          )}

          {/* VIEW 2: FORGOT PASSWORD FORM */}
          {view === "forgot" && (
            <motion.div 
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="max-w-md mx-auto w-full"
            >
              <button onClick={() => { setView("login"); setError(""); setSuccessMsg(""); }} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition mb-8">
                <ChevronLeft size={16} /> Back to Login
              </button>

              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                <Mail size={24} />
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Reset password</h1>
              <p className="text-slate-500 mb-8">Enter your email and we'll send you instructions to reset your password.</p>

              {successMsg ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle size={20} />
                    </div>
                    <h3 className="text-green-800 font-bold mb-1">Email Sent!</h3>
                    <p className="text-green-700 text-sm">{successMsg}</p>
                    <button onClick={() => setView("login")} className="mt-4 text-xs font-bold text-green-800 underline">Return to Login</button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword}>
                    <FloatingInput id="reset-email" type="email" label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
                    
                    {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2"><X size={14}/> {error}</div>}

                    <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Link"}
                    </button>
                </form>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* --- RIGHT SIDE: VISUAL ART --- */}
      <div className="hidden lg:flex w-[55%] bg-slate-900 relative overflow-hidden items-center justify-center">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1e293b_0%,_#0f172a_100%)]"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]"></div>
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Content Card */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
        >
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/30">
            <Lock className="text-indigo-400 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 leading-tight">Access your workspace securely.</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Log in to access your encrypted files, manage your team, and sync your data across all devices instantly.
          </p>
          
          <div className="flex gap-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Globe size={14} className="text-indigo-400"/> Always On
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Zap size={14} className="text-yellow-400"/> Lightning Fast
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}