import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Download, FileText, AlertCircle, Lock, Clock } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function SharedPage() {
    const { token } = useParams();
    const [file, setFile] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    
    // Password State
    const [isProtected, setIsProtected] = useState(false);
    const [password, setPassword] = useState("");

    const fetchPublicFile = async (pwd = null) => {
        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/share/public/${token}/access`, { password: pwd });
            setFile(res.data);
            setIsProtected(false);
            setError("");
        } catch (err) {
            if (err.response?.status === 401) {
                setIsProtected(true); // Show password input
            } else {
                setError(err.response?.data?.error || "Link invalid or expired");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPublicFile(); }, [token]);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        fetchPublicFile(password);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;

    // PASSWORD SCREEN
    if (isProtected) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="text-blue-600 w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Protected File</h2>
                <p className="text-gray-500 text-sm mb-6">Enter the password to access this file.</p>
                <form onSubmit={handlePasswordSubmit}>
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">Access File</button>
                </form>
                {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            </div>
        </div>
    );

    // ERROR SCREEN
    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4"><AlertCircle className="text-red-500 w-10 h-10" /></div>
            <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
            <p className="text-gray-600 mt-2">{error}</p>
        </div>
    );

    // SUCCESS SCREEN
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="text-blue-600 w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2 truncate" title={file.name}>{file.name}</h1>
                <p className="text-gray-500 text-sm mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.mimeType}</p>
                <a href={file.downloadUrl} download={file.name} className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"><Download size={20} /> Download File</a>
            </div>
        </div>
    );
}