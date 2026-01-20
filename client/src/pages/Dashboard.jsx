import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  LogOut, Upload, FileText, Image as ImageIcon, Trash2, Download, 
  Folder, FolderPlus, Search, RotateCcw, X, CloudUpload, HardDrive, 
  ArrowDownUp, User, Edit2, FolderInput, Share2, Users, MoreVertical, 
  Link as LinkIcon, Copy, Check, Star, Clock, Activity, History, 
  CheckSquare, LayoutGrid, List as ListIcon, ChevronRight, Home 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// --- SUB-COMPONENTS FOR MODERN UI ---

const SidebarItem = ({ icon: Icon, label, active, onClick, colorClass = "text-gray-500" }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group
      ${active 
        ? "bg-white shadow-md text-blue-600 scale-[1.02]" 
        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
      }`}
  >
    <div className={`p-2 rounded-lg transition-colors ${active ? "bg-blue-50" : "bg-transparent group-hover:bg-gray-100"} ${active ? "text-blue-600" : colorClass}`}>
      <Icon size={20} />
    </div>
    <span className="tracking-wide text-sm">{label}</span>
  </button>
);

const ActionButton = ({ icon: Icon, label, onClick, primary, danger }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm active:scale-95
      ${primary 
        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-200 hover:shadow-lg border border-transparent" 
        : danger 
          ? "bg-white text-red-500 border border-red-100 hover:bg-red-50"
          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
      }`}
  >
    {Icon && <Icon size={18} />}
    {label}
  </button>
);

export default function Dashboard() {
  // --- STATE ---
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activities, setActivities] = useState([]); 
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [view, setView] = useState("drive"); 
  const [layout, setLayout] = useState("grid"); // 'grid' or 'list'
  
  const [selectedItems, setSelectedItems] = useState(new Set()); 
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [filterType, setFilterType] = useState("all"); 
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 0, percentage: 0 });
  const [user, setUser] = useState({ full_name: "", email: "" });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState("");

  // Modals & Actions
  const [moveFile, setMoveFile] = useState(null); 
  const [allFolders, setAllFolders] = useState([]);
  const [shareFile, setShareFile] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("viewer");
  const [sharedUsers, setSharedUsers] = useState([]);
  const [publicToken, setPublicToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkExpiry, setLinkExpiry] = useState("");
  const [linkSettingsOpen, setLinkSettingsOpen] = useState(false);
  const [folderMenuId, setFolderMenuId] = useState(null);
  const [versionFile, setVersionFile] = useState(null);
  const [versions, setVersions] = useState([]);

  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // --- LOGIC (Kept same as before, just cleaner structure) ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    fetchProfile(); fetchStorage(); fetchBreadcrumbs(); setSelectedItems(new Set());
    const timer = setTimeout(() => { fetchData(); }, 300);
    return () => clearTimeout(timer);
  }, [currentFolder, view, sortConfig, searchQuery, filterType]); 

  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024; const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
  };

  const fetchProfile = async () => { try { const res = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: localStorage.getItem("token") } }); if (res.data) { setUser(res.data); setEditName(res.data.full_name || ""); } } catch (err) { handleLogout(); } };
  const fetchStorage = async () => { try { const res = await axios.get(`${API_URL}/files/storage`, { headers: { Authorization: localStorage.getItem("token") } }); setStorageUsage(res.data); } catch (err) { console.error(err); } };
  const fetchBreadcrumbs = async () => { if (!currentFolder) { setBreadcrumbs([]); return; } try { const res = await axios.get(`${API_URL}/folders/${currentFolder}/path`, { headers: { Authorization: localStorage.getItem("token") } }); setBreadcrumbs(res.data); } catch (err) { console.error("Failed path"); } };

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      const params = { q: searchQuery, type: filterType, sortBy: sortConfig.key, order: sortConfig.direction };
      if (view === "trash") { const res = await axios.get(`${API_URL}/files/trash/all`, { headers: { Authorization: token } }); setFiles(Array.isArray(res.data) ? res.data : []); setFolders([]); } 
      else if (view === "shared") { const res = await axios.get(`${API_URL}/files/shared`, { params, headers: { Authorization: token } }); setFiles(Array.isArray(res.data) ? res.data : []); setFolders([]); } 
      else if (view === "recent") { const res = await axios.get(`${API_URL}/files/recent`, { headers: { Authorization: token } }); setFiles(Array.isArray(res.data) ? res.data : []); setFolders([]); } 
      else if (view === "starred") { const res = await axios.get(`${API_URL}/stars`, { headers: { Authorization: token } }); setFiles(res.data.files || []); setFolders(res.data.folders || []); } 
      else if (view === "activity") { const res = await axios.get(`${API_URL}/activities`, { headers: { Authorization: token } }); setActivities(res.data); setFiles([]); setFolders([]); } 
      else { const fRes = await axios.get(`${API_URL}/files`, { params: { ...params, folderId: currentFolder }, headers: { Authorization: token } }); setFiles(Array.isArray(fRes.data) ? fRes.data : []); if (!searchQuery && filterType === 'all') { const foRes = await axios.get(`${API_URL}/folders`, { params: { parentId: currentFolder }, headers: { Authorization: token } }); setFolders(Array.isArray(foRes.data) ? foRes.data : []); } else { setFolders([]); } }
    } catch (err) { console.error(err); setFiles([]); }
  };

  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/"); };
  const toggleSelection = (id, type) => { const key = `${type}_${id}`; const newSet = new Set(selectedItems); if (newSet.has(key)) newSet.delete(key); else newSet.add(key); setSelectedItems(newSet); };
  const handleSelectAll = () => { if (selectedItems.size > 0) { setSelectedItems(new Set()); } else { const newSet = new Set(); folders.forEach(f => newSet.add(`folder_${f.id}`)); files.forEach(f => newSet.add(`file_${f.id}`)); setSelectedItems(newSet); } };
  const handleBulkDelete = async () => { if(!confirm(`Delete ${selectedItems.size} items?`)) return; const fileIds = [...selectedItems].filter(k => k.startsWith('file_')).map(k => k.split('_')[1]); const folderIds = [...selectedItems].filter(k => k.startsWith('folder_')).map(k => k.split('_')[1]); try { await axios.post(`${API_URL}/batch/delete`, { fileIds, folderIds }, { headers: { Authorization: localStorage.getItem("token") } }); setSelectedItems(new Set()); fetchData(); } catch(e) { alert("Bulk delete failed"); } };
  const handleBulkMoveInit = async () => { try{ const res=await axios.get(`${API_URL}/folders?all=true`,{headers:{Authorization:localStorage.getItem("token")}}); setAllFolders(res.data); setMoveFile({ id: 'bulk', name: `${selectedItems.size} items` }); }catch(e){alert("Failed");} };
  const handleMoveExecute = async (targetId) => { if (moveFile?.id === 'bulk') { const fileIds = [...selectedItems].filter(k => k.startsWith('file_')).map(k => k.split('_')[1]); const folderIds = [...selectedItems].filter(k => k.startsWith('folder_')).map(k => k.split('_')[1]); try { await axios.post(`${API_URL}/batch/move`, { fileIds, folderIds, targetFolderId: targetId }, { headers: { Authorization: localStorage.getItem("token") } }); setMoveFile(null); setSelectedItems(new Set()); fetchData(); } catch(e) { alert("Bulk move failed"); } } else { if(!moveFile) return; try{ await axios.patch(`${API_URL}/files/${moveFile.id}`, { folderId: targetId }, { headers: { Authorization: localStorage.getItem("token") } }); setMoveFile(null); fetchData(); }catch(e){alert("Failed");} } };
  const handleSearch = (e) => { setSearchQuery(e.target.value); if (e.target.value && view === 'trash') setView('drive'); };
  const handleSort = (key, direction) => { setSortConfig({ key, direction }); setIsSortOpen(false); };
  const handleToggleStar = async (id, type) => { try { await axios.post(`${API_URL}/stars/toggle`, { resourceId: id, resourceType: type }, { headers: { Authorization: localStorage.getItem("token") } }); fetchData(); } catch(e){alert("Failed");} };
  const handleViewVersions = async (fileObj) => { setVersionFile(fileObj); setVersions([]); try { const res = await axios.get(`${API_URL}/files/${fileObj.id}/versions`, { headers: { Authorization: localStorage.getItem("token") } }); setVersions(res.data); } catch(e){alert("Failed");} };
  const handleRestoreVersion = async (vid) => { if(!confirm("Restore?")) return; try { await axios.post(`${API_URL}/files/${versionFile.id}/versions/${vid}/restore`, {}, { headers: { Authorization: localStorage.getItem("token") } }); alert("Restored!"); setVersionFile(null); fetchData(); } catch(e){alert("Failed");} };
  const handleRenameFolder = async (id, name) => { const n=prompt("Rename:", name); if(!n) return; try{ await axios.patch(`${API_URL}/folders/${id}`, { name: n }, { headers: { Authorization: localStorage.getItem("token") } }); setFolderMenuId(null); fetchData(); } catch(e){alert("Failed");} };
  const handleDeleteFolder = async (id) => { if(!confirm("Delete?")) return; try{ await axios.delete(`${API_URL}/folders/${id}`, { headers: { Authorization: localStorage.getItem("token") } }); setFolderMenuId(null); fetchData(); } catch(e){alert("Failed");} };
  const handleCreateFolder = async () => { const n=prompt("Name:"); if(!n) return; try{ await axios.post(`${API_URL}/folders`, { name: n, parentId: currentFolder }, { headers: { Authorization: localStorage.getItem("token") } }); fetchData(); } catch(e){alert("Failed");} };
  const handleEnterFolder = (id) => { setFolderHistory([...folderHistory, { id: currentFolder }]); setCurrentFolder(id); setSearchQuery(""); };
  const handleBreadcrumbClick = (id) => { setCurrentFolder(id); };
  const getUserInitial = () => { if (user?.full_name) return user.full_name[0].toUpperCase(); return "U"; };
  
  const handleDownload = async (id, name) => { try { const res = await axios.get(`${API_URL}/files/${id}`, { headers: { Authorization: localStorage.getItem("token") } }); const link = document.createElement('a'); link.href = res.data.downloadUrl; link.setAttribute('download', name); document.body.appendChild(link); link.click(); link.remove(); } catch(e){ alert("Failed"); } };
  const handlePreview = async (id, name, type) => { if(!type?.startsWith("image/") && type!=="application/pdf"){ handleDownload(id,name); return; } try { const res = await axios.get(`${API_URL}/files/${id}?preview=true`, { headers: { Authorization: localStorage.getItem("token") } }); setPreviewFile({ url: res.data.downloadUrl, name: name, type: type }); } catch(e){ alert("Failed"); } };
  const handleRename = async (id, name) => { const n=prompt("Rename:", name); if(!n) return; try{ await axios.patch(`${API_URL}/files/${id}`, { name: n }, { headers: { Authorization: localStorage.getItem("token") } }); fetchData(); } catch(e){alert("Failed");} };
  const handleDelete = async (id) => { if(!confirm("Trash?")) return; try{ await axios.delete(`${API_URL}/files/${id}`, { headers: { Authorization: localStorage.getItem("token") } }); fetchData(); } catch(e){alert("Failed");} };
  const handleRestore = async (id) => { try{ await axios.post(`${API_URL}/files/restore/${id}`, {}, { headers: { Authorization: localStorage.getItem("token") } }); fetchData(); } catch(e){alert("Failed");} };
  const handlePermanentDelete = async (id) => { if(!confirm("Delete forever?")) return; try{ await axios.delete(`${API_URL}/files/trash/${id}`, { headers: { Authorization: localStorage.getItem("token") } }); fetchData(); fetchStorage(); } catch(e){alert("Failed");} };
  const handleEmptyTrash = async () => { if(!confirm("Empty Trash?")) return; try{ await axios.delete(`${API_URL}/files/trash/empty`, { headers: { Authorization: localStorage.getItem("token") } }); fetchData(); fetchStorage(); } catch(e){alert("Failed");} };
  const openMoveModal = async (f) => { setMoveFile(f); try{ const res=await axios.get(`${API_URL}/folders?all=true`,{headers:{Authorization:localStorage.getItem("token")}}); setAllFolders(res.data); }catch(e){alert("Failed");} };
  const openShareModal = async (f) => { setShareFile(f); setSharedUsers([]); setPublicToken(null); setLinkSettingsOpen(false); setLinkPassword(""); setLinkExpiry(""); try{ const res=await axios.get(`${API_URL}/share/${f.id}/status`,{headers:{Authorization:localStorage.getItem("token")}}); setSharedUsers(res.data.users); setPublicToken(res.data.publicToken); }catch(e){console.error(e);} };
  const handleShareSubmit = async () => { if(!shareEmail) return; try{ await axios.post(`${API_URL}/share/${shareFile.id}`, { email: shareEmail, permission: sharePermission }, { headers: { Authorization: localStorage.getItem("token") } }); alert("Shared"); setShareEmail(""); openShareModal(shareFile); }catch(e){alert("Failed");} };
  const handleRevoke = async (uid) => { if(!confirm("Revoke?")) return; try{ await axios.delete(`${API_URL}/share/${shareFile.id}/user/${uid}`, { headers: { Authorization: localStorage.getItem("token") } }); openShareModal(shareFile); }catch(e){alert("Failed");} };
const handleToggleLink = async () => {
  // If we have a token, action is 'remove'. 
  // If we don't, action is 'create'.
  const action = publicToken ? 'remove' : 'create'; 
  
  try {
    const res = await axios.post(`${API_URL}/share/${shareFile.id}/public`, { 
      action, 
      password: linkPassword, 
      expiry: linkExpiry 
    }, { headers: { Authorization: localStorage.getItem("token") } });
    
    // Update State with response
    setPublicToken(res.data.publicToken);
    
    if (action === 'create') {
      setLinkSettingsOpen(false);
      setLinkPassword("");
      setLinkExpiry("");
      alert("Public link created!");
    } else {
      alert("Public link disabled.");
    }
  } catch (e) {
    alert("Failed to update link settings");
    console.error(e);
  }
};  const copyToClipboard = () => { navigator.clipboard.writeText(`${window.location.origin}/share/${publicToken}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleUpdateProfile = async () => { try { const res = await axios.put(`${API_URL}/auth/profile`, { fullName: editName }, { headers: { Authorization: localStorage.getItem("token") } }); setUser(res.data); setShowProfileModal(false); } catch (e) { alert("Failed"); } };
  const processUpload = async (f) => { try { const initRes = await axios.post(`${API_URL}/files/init`, { name: f.name, sizeBytes: f.size, mimeType: f.type, folderId: currentFolder }, { headers: { Authorization: localStorage.getItem("token") } }); const { uploadUrl } = initRes.data; await axios.put(uploadUrl, f, { headers: { "Content-Type": f.type } }); return true; } catch (err) { console.error(`Failed ${f.name}`, err); return false; } };
  const handleUploadBatch = async (filesList) => { if (!filesList || filesList.length === 0) return; setUploading(true); const uploads = Array.from(filesList).map(file => processUpload(file)); await Promise.all(uploads); setUploading(false); fetchData(); fetchStorage(); };
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (view !== 'drive') return; if (e.type === "dragenter" || e.type === "dragover") { if (e.type === "dragenter") dragCounter.current += 1; setIsDragActive(true); } else if (e.type === "dragleave") { dragCounter.current -= 1; if (dragCounter.current === 0) setIsDragActive(false); } else if (e.type === "drop") { setIsDragActive(false); dragCounter.current = 0; if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { handleUploadBatch(e.dataTransfer.files); } } };

  // --- NEW: FOLDER CREATION LOGIC ---
  const [newFolderName, setNewFolderName] = useState("");

  // Update your modals state to include 'createFolder'
  // const [modals, setModals] = useState({ profile: false, share: false, move: false, preview: false, createFolder: false }); 

  const handleCreateFolderTrigger = () => {
    setNewFolderName("");
    setModals({ ...modals, createFolder: true });
  };

  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    try {
      await axios.post(`${API_URL}/folders`, { 
        name: newFolderName, 
        parentId: currentFolder 
      }, { headers: { Authorization: localStorage.getItem("token") } });
      
      fetchData();
      setModals({ ...modals, createFolder: false });
      showToast("Folder created successfully");
    } catch (e) {
      showToast("Failed to create folder");
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col relative font-sans text-gray-800" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrag}>
      {/* --- BACKGROUND GRADIENT MESH --- */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-200 via-gray-100 to-white"></div>

      {/* --- FLOATING UPLOAD OVERLAY --- */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-blue-600/10 backdrop-blur-md flex items-center justify-center pointer-events-none transition-all duration-300">
          <div className="bg-white p-12 rounded-3xl shadow-2xl border border-blue-100 flex flex-col items-center gap-6 animate-bounce">
            <div className="bg-blue-100 p-6 rounded-full text-blue-600"><CloudUpload size={48} /></div>
            <h2 className="text-2xl font-bold text-gray-800">Drop files to upload</h2>
          </div>
        </div>
      )}

      {/* --- FLOATING BULK ACTION BAR --- */}
      {selectedItems.size > 0 && view === 'drive' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{selectedItems.size}</div>
            <span className="font-medium text-sm">Selected</span>
            <button onClick={() => setSelectedItems(new Set())} className="text-gray-400 hover:text-white transition"><X size={16} /></button>
          </div>
          <div className="h-6 w-px bg-gray-700/50"></div>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkMoveInit} className="flex items-center gap-2 hover:bg-white/10 px-4 py-2 rounded-full transition text-sm font-medium"><FolderInput size={16} /> Move</button>
            <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:bg-red-500/20 text-red-300 hover:text-red-200 px-4 py-2 rounded-full transition text-sm font-medium"><Trash2 size={16} /> Delete</button>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-20 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-blue-500/30">
            <CloudUpload size={24} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">KCloud</h1>
        </div>

        <div className="flex-1 max-w-2xl mx-8 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search your files..." 
            value={searchQuery} 
            onChange={handleSearch} 
            className="w-full bg-gray-100/50 border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl pl-11 pr-4 py-2.5 text-sm transition-all duration-200 outline-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <div onClick={() => setShowProfileModal(true)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1.5 pr-4 rounded-full transition border border-transparent hover:border-gray-200">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {getUserInitial()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-gray-700 leading-tight">{user?.full_name || "User"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* --- SIDEBAR --- */}
        <div className="w-64 hidden md:flex flex-col justify-between p-4 bg-white/50 backdrop-blur-lg border-r border-gray-200/60">
          <div className="space-y-1">
            <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">My Library</div>
            <SidebarItem icon={HardDrive} label="My Drive" active={view === 'drive'} onClick={() => { setView("drive"); setCurrentFolder(null); }} colorClass="text-blue-500" />
            <SidebarItem icon={Users} label="Shared" active={view === 'shared'} onClick={() => setView("shared")} colorClass="text-purple-500" />
            <SidebarItem icon={Clock} label="Recent" active={view === 'recent'} onClick={() => setView("recent")} colorClass="text-orange-500" />
            <SidebarItem icon={Star} label="Starred" active={view === 'starred'} onClick={() => setView("starred")} colorClass="text-yellow-500" />
            <div className="px-4 py-2 mt-6 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System</div>
            <SidebarItem icon={Activity} label="Activity" active={view === 'activity'} onClick={() => setView("activity")} />
            <SidebarItem icon={Trash2} label="Trash" active={view === 'trash'} onClick={() => setView("trash")} colorClass="text-red-500" />
          </div>

          <div className="mt-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600">Storage</span>
              <span className="text-xs font-bold text-blue-600">{storageUsage.percentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
              <div className={`h-2 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 to-indigo-500`} style={{ width: `${storageUsage.percentage}%` }}></div>
            </div>
            <p className="text-[10px] text-gray-400">{formatBytes(storageUsage.used)} of {formatBytes(storageUsage.limit)} used</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
               <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-red-600 transition w-full"><LogOut size={14}/> Sign Out</button>
            </div>
          </div>
        </div>

        {/* --- MAIN CANVAS --- */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {view === 'drive' && (
            <div className="flex flex-col gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* BREADCRUMBS */}
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/60 w-fit px-4 py-2 rounded-full border border-gray-200 shadow-sm backdrop-blur-sm">
                 <button onClick={() => handleBreadcrumbClick(null)} className={`hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition flex items-center gap-1 ${!currentFolder ? 'font-bold text-blue-600' : ''}`}><Home size={14} /> Home</button>
                 {breadcrumbs.map((crumb) => ( 
                    <div key={crumb.id} className="flex items-center gap-1">
                        <ChevronRight size={14} className="text-gray-300"/>
                        <button onClick={() => handleBreadcrumbClick(crumb.id)} className="hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition max-w-[120px] truncate">{crumb.name}</button>
                    </div> 
                 ))}
              </div>

              {/* TOOLBAR */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3 w-full md:w-auto bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200">
                    <button onClick={handleSelectAll} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition" title="Select All"><CheckSquare size={18} /></button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <ActionButton icon={FolderPlus} label="New Folder" onClick={handleCreateFolder} />
                    
                    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                        <button onClick={() => setLayout("grid")} className={`p-1.5 rounded-lg transition-all ${layout === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid size={18} /></button>
                        <button onClick={() => setLayout("list")} className={`p-1.5 rounded-lg transition-all ${layout === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><ListIcon size={18} /></button>
                    </div>

                    <div className="relative group">
                      <button onClick={() => setIsSortOpen(!isSortOpen)} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition flex items-center gap-2 text-sm font-medium"><ArrowDownUp size={18} /></button>
                      {isSortOpen && <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)}></div>}
                      {isSortOpen && ( <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden py-1"> <button onClick={() => handleSort("created_at", "desc")} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">Date (Newest)</button> <button onClick={() => handleSort("name", "asc")} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">Name (A-Z)</button> <button onClick={() => handleSort("size_bytes", "desc")} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50">Size (Largest)</button> </div> )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => { if (e.target.files.length > 0) handleUploadBatch(e.target.files); }} />
                    <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 text-white px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed font-semibold text-sm">
                      {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Upload size={18} />} <span>{uploading ? "Uploading..." : "Upload File"}</span>
                    </button>
                  </div>
              </div>
            </div>
          )}

          {/* VIEW TITLE HEADERS */}
          {view === 'trash' && <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg text-red-600"><Trash2 size={24}/></div> Trash Bin</h2>{files.length > 0 && <button onClick={handleEmptyTrash} className="text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition border border-red-200">Empty Trash</button>}</div>}
          {view === 'shared' && <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6"><div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Users size={24}/></div> Shared with Me</h2>}
          {view === 'recent' && <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6"><div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Clock size={24}/></div> Recent Files</h2>}
          {view === 'starred' && <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6"><div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Star size={24}/></div> Starred Items</h2>}
          {view === 'activity' && <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6"><div className="p-2 bg-gray-100 rounded-lg text-gray-600"><Activity size={24}/></div> Recent Activity</h2>}

          {/* ACTIVITY LIST */}
          {view === 'activity' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm max-w-3xl">
                  {activities.length === 0 && <p className="p-12 text-gray-400 text-center italic">No activity recorded yet.</p>}
                  {activities.map(act => (
                      <div key={act.id} className="p-5 border-b last:border-b-0 flex items-center gap-5 hover:bg-gray-50 transition group">
                          <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><Activity size={20} /></div>
                          <div className="flex-1">
                              <p className="text-sm text-gray-900 leading-relaxed">
                                  You <span className="font-bold text-gray-800">{act.action}</span> <span className="font-semibold text-blue-600">"{act.resource_name}"</span>
                                  <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-3">{act.resource_type}</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-1 font-medium">{new Date(act.created_at).toLocaleString()}</p>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* === LIST VIEW (TABLE) === */}
          {layout === 'list' && view !== 'activity' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-300">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <tr>
                              <th className="p-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition" /></th>
                              <th className="p-4">Name</th>
                              <th className="p-4 w-32">Size</th>
                              <th className="p-4 w-48">Last Modified</th>
                              <th className="p-4 w-24 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {folders.map(folder => (
                              <tr key={folder.id} className={`group transition-colors duration-150 ${selectedItems.has(`folder_${folder.id}`) ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}>
                                  <td className="p-4 text-center"><input type="checkbox" checked={selectedItems.has(`folder_${folder.id}`)} onChange={() => toggleSelection(folder.id, 'folder')} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></td>
                                  <td className="p-4">
                                      <div className="flex items-center gap-3 cursor-pointer" onDoubleClick={() => handleEnterFolder(folder.id, folder.name)}>
                                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Folder size={18} /></div>
                                          <span className="font-semibold text-gray-700">{folder.name}</span>
                                      </div>
                                  </td>
                                  <td className="p-4 text-sm text-gray-400">-</td>
                                  <td className="p-4 text-sm text-gray-500">{new Date(folder.created_at).toLocaleDateString()}</td>
                                  <td className="p-4 text-right">
                                      <button onClick={() => handleDeleteFolder(folder.id)} className="text-gray-400 hover:bg-red-50 hover:text-red-500 p-2 rounded-full transition"><Trash2 size={16} /></button>
                                  </td>
                              </tr>
                          ))}
                          {files.map(f => (
                              <tr key={f.id} className={`group transition-colors duration-150 ${selectedItems.has(`file_${f.id}`) ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}>
                                  <td className="p-4 text-center"><input type="checkbox" checked={selectedItems.has(`file_${f.id}`)} onChange={() => toggleSelection(f.id, 'file')} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></td>
                                  <td className="p-4">
                                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => handlePreview(f.id, f.name, f.mime_type)}>
                                          {f.thumbnailUrl ? <img src={f.thumbnailUrl} className="w-9 h-9 rounded-lg object-cover shadow-sm" /> : <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg"><FileText size={18}/></div>}
                                          <span className="font-medium text-gray-700 truncate max-w-[200px]">{f.name}</span>
                                      </div>
                                  </td>
                                  <td className="p-4 text-sm text-gray-500">{formatBytes(f.size_bytes)}</td>
                                  <td className="p-4 text-sm text-gray-500">{new Date(f.created_at).toLocaleDateString()}</td>
                                  <td className="p-4 text-right flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleDownload(f.id, f.name)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><Download size={16}/></button>
                                      <button onClick={() => handleDelete(f.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"><Trash2 size={16}/></button>
                                      <button onClick={() => handleViewVersions(f)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition"><History size={16}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {files.length === 0 && folders.length === 0 && <div className="p-12 text-center text-gray-400">This folder is empty.</div>}
              </div>
          )}

          {/* === GRID VIEW (GLASS CARDS) === */}
          {layout === 'grid' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              {/* FOLDERS */}
              {(view === 'drive' || view === 'starred') && folders.length > 0 && !searchQuery && (
                <div className="mb-8">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Folders</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {folders.map((folder) => {
                      const isSelected = selectedItems.has(`folder_${folder.id}`);
                      return (
                      <div key={folder.id} className={`relative group select-none transition-all duration-300 ${isSelected ? 'ring-2 ring-blue-500 rounded-2xl bg-white' : ''}`}>
                        <div className={`absolute top-3 left-3 z-10 ${isSelected ? 'block' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(folder.id, 'folder')} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"/>
                        </div>
                        <div onDoubleClick={() => handleEnterFolder(folder.id, folder.name)} className="bg-white/80 hover:bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-gray-100/50 cursor-pointer flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
                          <Folder className="text-blue-400 fill-blue-50 w-12 h-12" /> 
                          <span className="font-semibold text-gray-700 truncate w-full text-center text-sm">{folder.name}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setFolderMenuId(folderMenuId === folder.id ? null : folder.id); }} className={`absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition ${folderMenuId === folder.id ? 'opacity-100 bg-gray-100' : 'opacity-0 group-hover:opacity-100'}`}><MoreVertical size={16} /></button>
                        {folderMenuId === folder.id && ( <div className="absolute top-10 right-0 w-40 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 z-20 py-1 animate-in zoom-in-95 duration-200"> <div className="fixed inset-0 z-[-1]" onClick={() => setFolderMenuId(null)}></div> <button onClick={() => handleRenameFolder(folder.id, folder.name)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"><Edit2 size={14} /> Rename</button> <button onClick={() => handleDeleteFolder(folder.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"><Trash2 size={14} /> Delete</button> </div> )}
                      </div>
                    )})}
                  </div>
                </div>
              )}

              {/* FILES */}
              {view !== 'activity' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {files.map((f) => {
  const isSelected = selectedItems.has(`file_${f.id}`);
  return (
    <div 
      key={f.id} 
      className={`bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 group relative hover:-translate-y-1 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      {/* Checkbox */}
      <div className={`absolute top-3 left-3 z-10 ${isSelected ? 'block' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
        <input 
          type="checkbox" 
          checked={isSelected} 
          onChange={() => toggleSelection(f.id, 'file')} 
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-md bg-white"
        />
      </div>
      
      {/* PREVIEW AREA (Updated for Thumbnails) */}
      <div 
        className="h-40 w-full bg-gray-50 rounded-t-2xl flex items-center justify-center overflow-hidden cursor-pointer relative border-b border-gray-100" 
        onClick={() => handlePreview(f.id, f.name, f.mime_type)}
      >
          {f.thumbnailUrl ? (
              <>
                <img 
                  src={f.thumbnailUrl} 
                  alt={f.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
              </>
          ) : (
              <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-500">
                {/* Show Image icon if it's an image type but no URL yet, otherwise File icon */}
                {f.mime_type?.includes('image') ? <ImageIcon size={40}/> : <FileText size={40}/>}
              </div>
          )}
      </div>

      {/* FILE INFO & ACTIONS */}
      <div className="p-4">
          <div className="flex justify-between items-start mb-2">
             <p className="font-semibold text-gray-800 truncate text-sm flex-1 pr-2" title={f.name}>{f.name}</p>
             <button 
               onClick={() => handleToggleStar(f.id, 'file')} 
               className={`transition-colors ${f.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
             >
               <Star size={16} fill={f.is_starred ? "currentColor" : "none"}/>
             </button>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
             <span>{formatBytes(f.size_bytes)}</span>
             <span>{new Date(f.created_at).toLocaleDateString()}</span>
          </div>
          
          {/* QUICK ACTIONS ROW */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex gap-1">
                <button onClick={() => handleDownload(f.id, f.name)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Download"><Download size={16} /></button>
                <button onClick={() => openShareModal(f)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Share"><Share2 size={16} /></button>
                <button onClick={() => handleRename(f.id, f.name)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition" title="Rename"><Edit2 size={16} /></button>
              </div>
              <button onClick={() => handleDelete(f.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete"><Trash2 size={16} /></button>
          </div>
      </div>
    </div>
  )
})}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* ... (Keep existing modals unchanged, they are functional overlays) ... */}
      {previewFile && ( <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setPreviewFile(null)}> <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}> <div className="p-4 border-b flex justify-between items-center bg-white z-10"> <h3 className="font-semibold text-gray-800 truncate px-2 text-lg">{previewFile.name}</h3> <button onClick={() => setPreviewFile(null)} className="text-gray-400 hover:text-gray-800 p-2 hover:bg-gray-100 rounded-full transition"><X size={24} /></button> </div> <div className="flex-1 bg-gray-100 flex items-center justify-center p-8 overflow-auto min-h-[400px]"> {previewFile.type.startsWith("image/") ? <img src={previewFile.url} alt="Preview" className="max-w-full max-h-[75vh] object-contain shadow-2xl rounded-lg" /> : <iframe src={previewFile.url} className="w-full h-[75vh] bg-white rounded-lg shadow-lg border border-gray-200" title="PDF Preview"></iframe>} </div> <div className="p-4 border-t bg-white flex justify-end"> <a href={previewFile.url} download={previewFile.name} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/30 transition transform active:scale-95"><Download size={20}/> Download Original</a> </div> </div> </div> )}
      {moveFile && ( <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setMoveFile(null)}> <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-800">Move items to...</h3><button onClick={() => setMoveFile(null)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button></div> <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl mb-6 custom-scrollbar"> <div onClick={() => handleMoveExecute(null)} className={`p-4 border-b border-gray-50 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition ${moveFile.folder_id === null ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600'}`}><HardDrive size={20} /> My Drive (Root)</div> {allFolders.filter(f => f.id !== moveFile.folder_id).map(f => ( <div key={f.id} onClick={() => handleMoveExecute(f.id)} className="p-4 border-b border-gray-50 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition text-gray-600"><Folder size={20} className="text-blue-300" /> {f.name}</div> ))} </div> </div> </div> )}
{shareFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setShareFile(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            
            {/* --- MODAL HEADER --- */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Share "{shareFile.name}"</h3>
              <button onClick={() => setShareFile(null)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="space-y-6">
              
              {/* --- SECTION 1: INVITE PEOPLE --- */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Invite People</label>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    value={shareEmail} 
                    onChange={e => setShareEmail(e.target.value)} 
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                  />
                  <select 
                    value={sharePermission} 
                    onChange={e => setSharePermission(e.target.value)} 
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button onClick={handleShareSubmit} className="bg-blue-600 text-white px-5 rounded-xl font-semibold hover:bg-blue-700 transition">Send</button>
                </div>
              </div>

              {/* --- SECTION 2: PUBLIC ACCESS --- */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Public Access</label>
                
                <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  
                  {/* Status Bar */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${publicToken ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                        <LinkIcon size={20}/>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{publicToken ? "Link is active" : "Restricted"}</p>
                        <p className="text-xs text-gray-500">{publicToken ? "Anyone with link can view" : "Only added people"}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {publicToken ? (
                      <div className="flex gap-2">
                        <button onClick={copyToClipboard} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                          {copied ? "Copied" : "Copy"}
                        </button>
                        <button onClick={() => {setLinkPassword(""); setLinkExpiry(""); handleToggleLink();}} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition">
                          Disable
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setLinkSettingsOpen(!linkSettingsOpen)} 
                        className="text-xs font-bold text-gray-600 hover:bg-white bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-lg transition"
                      >
                        {linkSettingsOpen ? "Cancel" : "Create Link"}
                      </button>
                    )}
                  </div>

                  {/* Settings Panel (Password/Expiry) - THIS WAS MISSING */}
                  <AnimatePresence>
                    {linkSettingsOpen && !publicToken && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 border-t border-gray-200 bg-gray-50"
                      >
                        <div className="pt-4 space-y-3">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Password (Optional)</label>
                            <input 
                              type="password" 
                              placeholder="Set a password" 
                              value={linkPassword} 
                              onChange={e => setLinkPassword(e.target.value)} 
                              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Expiration (Optional)</label>
                            <input 
                              type="datetime-local" 
                              value={linkExpiry} 
                              onChange={e => setLinkExpiry(e.target.value)} 
                              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <button 
                            onClick={handleToggleLink} 
                            className="w-full bg-black text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-md mt-2"
                          >
                            Enable Public Link
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </div>

            </div>
          </div>
        </div>
      )}
            {showProfileModal && ( <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowProfileModal(false)}> <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}> <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-4xl font-bold mx-auto mb-6 shadow-xl shadow-blue-500/30">{getUserInitial()}</div> <h2 className="text-2xl font-bold text-gray-800 mb-1">{user.full_name || "User"}</h2> <p className="text-gray-500 mb-6">{user.email}</p> <div className="space-y-4 text-left"> <div><label className="text-xs font-bold text-gray-400 uppercase">Full Name</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" /></div> <button onClick={handleUpdateProfile} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg">Save Changes</button> </div> </div> </div> )}
      {versionFile && ( <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={() => setVersionFile(null)}> <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-800">Version History</h3><button onClick={() => setVersionFile(null)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button></div> <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2"> {versions.length === 0 && <p className="text-center text-gray-400 py-8">No history available.</p>} {versions.map(v => ( <div key={v.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100"> <div><p className="font-bold text-gray-700 text-sm">Version {v.version}</p><p className="text-xs text-gray-500 mt-0.5">{new Date(v.created_at).toLocaleString()}</p></div> <button onClick={() => handleRestoreVersion(v.id)} className="text-xs bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium text-gray-600 flex items-center gap-1"><RotateCcw size={12}/> Restore</button> </div> ))} </div> </div> </div> )}
    </div>
  );
}