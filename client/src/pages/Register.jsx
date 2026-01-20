import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Loader2, Check, X, ShieldCheck, Zap, Globe, Github } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Adjust the path to where your supabaseClient.js file is located
// If Register.jsx is in 'src/pages', and the config is in 'src', go up one level:
import { supabase } from "../supabaseClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// --- INITIALIZE SUPABASE CLIENT ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


// --- COMPONENT 1: FLOATING LABEL INPUT ---
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

// --- COMPONENT 2: PASSWORD STRENGTH METER ---
const PasswordStrengthMeter = ({ password }) => {
  const criteria = [
    { label: "8+ Characters", met: password.length >= 8 },
    { label: "Number", met: /\d/.test(password) },
    { label: "Special Char", met: /[!@#$%^&*]/.test(password) },
  ];

  if (!password) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }} 
      animate={{ opacity: 1, height: "auto" }}
      className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100"
    >
      <div className="flex gap-2 mb-2">
        {criteria.map((c, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${c.met ? "bg-indigo-500" : "bg-slate-200"}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            {c.met ? <Check size={10} className="text-indigo-600" /> : <div className="w-2.5 h-2.5 rounded-full border border-slate-300" />}
            <span className={c.met ? "text-indigo-700" : ""}>{c.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default function Register() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });

  // --- HANDLE GITHUB LOGIN ---
  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin // Redirects back to this page after login
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // --- LISTEN FOR AUTH CHANGES (Redirect after GitHub login) ---
  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            localStorage.setItem("token", session.access_token);
            // Optionally save user info: localStorage.setItem("user", JSON.stringify(session.user));
            navigate("/dashboard");
        }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem("token", session.access_token);
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // --- HANDLE EMAIL REGISTER ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/auth/register`, formData);
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* --- LEFT SIDE: FORM --- */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-[45%] flex flex-col justify-center p-8 sm:p-12 lg:p-20 relative"
      >
        <div className="max-w-md mx-auto w-full">
          {/* Brand Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="text-white w-5 h-5 fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Kcloud</span>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Create your account</h1>
          <p className="text-slate-500 mb-8">Start managing your digital assets securely.</p>

          {/* GitHub Button */}
          <div className="mb-8">
            <button 
              onClick={handleGitHubLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition font-bold text-sm text-slate-700 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Github size={20} className="fill-slate-900" />
              Continue with GitHub
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-slate-400 font-medium">Or register with email</span></div>
          </div>

          <form onSubmit={handleRegister}>
            <FloatingInput id="fullName" type="text" label="Full Name" value={formData.fullName} onChange={handleChange} />
            <FloatingInput id="email" type="email" label="Work Email" value={formData.email} onChange={handleChange} />
            <FloatingInput id="password" type="password" label="Password" value={formData.password} onChange={handleChange} />
            
            <PasswordStrengthMeter password={formData.password} />

            <AnimatePresence>
              {error && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <X size={14} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <>Get Started <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-center mt-8 text-slate-500 text-sm">
            Already have an account? <Link to="/" className="text-indigo-600 font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </motion.div>

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
            <ShieldCheck className="text-indigo-400 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 leading-tight">Enterprise-grade security for your personal files.</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Join thousands of developers and designers who trust Kcloud for their file storage needs. 
            Encrypted, fast, and always accessible.
          </p>
          
          <div className="flex gap-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Globe size={14} className="text-indigo-400"/> Global CDN
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Zap size={14} className="text-yellow-400"/> Instant Sync
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}