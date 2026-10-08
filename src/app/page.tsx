"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { Lock, Unlock, User, UserPlus, Trash2, Settings, MessageSquare, ArrowLeft, Send, AlertCircle, Palette, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { getSettings, setupApp, verifyAdmin, verifyGroup, getUsers, createUser, deleteUser, changeGroupPassword, changeAdminPassword, updateAppSettings, emptyChat } from "./actions";

type DBUser = { id: string; username: string; role: string; created_at: string };
type Message = { id: string; user_id: string; text: string; created_at: string; users?: { username: string } };

const THEMES: Record<string, { bg: string, text: string, hover: string, ring: string, lightBg: string, from: string, to: string, border: string }> = {
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', hover: 'hover:bg-indigo-700', ring: 'focus:ring-indigo-500', lightBg: 'bg-indigo-50', from: 'from-indigo-500', to: 'to-purple-600', border: 'hover:border-indigo-200' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600', hover: 'hover:bg-rose-700', ring: 'focus:ring-rose-500', lightBg: 'bg-rose-50', from: 'from-rose-500', to: 'to-pink-600', border: 'hover:border-rose-200' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', hover: 'hover:bg-emerald-700', ring: 'focus:ring-emerald-500', lightBg: 'bg-emerald-50', from: 'from-emerald-400', to: 'to-teal-600', border: 'hover:border-emerald-200' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-700', ring: 'focus:ring-blue-500', lightBg: 'bg-blue-50', from: 'from-blue-500', to: 'to-cyan-600', border: 'hover:border-blue-200' },
};

export default function Home() {
  const [appState, setAppState] = useState<"LOADING" | "SELECT_USER" | "SETUP" | "LOGIN" | "ADMIN_PANEL" | "CHAT" | "EMERGENCY">("LOADING");
  const [settings, setSettings] = useState({ initialized: false, emergency_link: '', primary_color: 'indigo' });
  const [users, setUsers] = useState<DBUser[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<DBUser | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  
  // Forms
  const [setupAdminPass, setSetupAdminPass] = useState("");
  const [setupGroupPass, setSetupGroupPass] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newGroupPass, setNewGroupPass] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [newEmergencyLink, setNewEmergencyLink] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const theme = THEMES[settings.primary_color] || THEMES.indigo;

  useEffect(() => {
    loadInitialData();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  useEffect(() => {
    if (appState === "CHAT") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, appState]);

  async function loadInitialData() {
    setAppState("LOADING");
    const [dbSettings, dbUsers] = await Promise.all([getSettings(), getUsers()]);
    setSettings(dbSettings);
    setNewEmergencyLink(dbSettings.emergency_link);
    setUsers(dbUsers);
    setAppState("SELECT_USER");
  }

  const triggerEmergency = () => {
    setAppState("EMERGENCY");
    setTimeout(() => {
      window.location.href = settings.emergency_link;
    }, 400);
  };

  const handleUserClick = (user: DBUser) => {
    setSelectedUser(user);
    setError("");
    setPasswordInput("");
    if (user.role === "admin" && !settings.initialized) {
      setAppState("SETUP");
    } else {
      setAppState("LOGIN");
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupAdminPass.length < 4 || setupGroupPass.length < 4) {
      setError("Passwords must be at least 4 characters."); return;
    }
    await setupApp(setupAdminPass, setupGroupPass);
    setSettings(s => ({ ...s, initialized: true }));
    setAppState("ADMIN_PANEL");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedUser) return;

    if (selectedUser.role === "admin") {
      const isValid = await verifyAdmin(passwordInput);
      if (isValid) setAppState("ADMIN_PANEL");
      else setError("Incorrect Admin Password.");
    } else {
      const isValid = await verifyGroup(passwordInput);
      if (isValid) enterChat();
      else setError("Incorrect Group Password.");
    }
  };

  const enterChat = async () => {
    setAppState("CHAT");
    
    // Fetch initial messages
    const { data: initialMessages } = await supabase.from('messages').select('*, users(username)').order('created_at', { ascending: true }).limit(200);
    if (initialMessages) setMessages(initialMessages as any);

    const channel = supabase.channel('group_chat', { config: { presence: { key: selectedUser!.username } } });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = Object.keys(state);
        setOnlineUsers(online);
        const typing = online.filter(user => (state[user] as any[]).some(conn => conn.isTyping));
        setTypingUsers(typing);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msgUser = users.find(u => u.id === payload.new.user_id);
        const newMsg = { ...payload.new, users: { username: msgUser?.username || 'Unknown' } } as Message;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, () => {
        // Chat was emptied
        setMessages([]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ isTyping: false });
      });

    channelRef.current = channel;
  };

  const safeTrack = (isTyping: boolean) => {
    try {
      if (channelRef.current && channelRef.current.state === 'joined') channelRef.current.track({ isTyping }).catch(() => {});
    } catch (e) {}
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (!typingTimeoutRef.current) safeTrack(true);
    else clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      safeTrack(false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUser) return;
    
    const text = messageInput.trim();
    setMessageInput("");
    safeTrack(false);
    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }

    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: tempId, user_id: selectedUser.id, text, created_at: new Date().toISOString(), users: { username: selectedUser.username } }]);
    await supabase.from('messages').insert({ id: tempId, user_id: selectedUser.id, text });
  };

  // Admin Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const { error: createErr } = await createUser(newUsername.trim());
    if (createErr) alert(createErr);
    else { setNewUsername(""); setUsers(await getUsers()); }
  };
  const handleDeleteUser = async (id: string) => {
    const { error: delErr } = await deleteUser(id);
    if (delErr) alert(delErr); else setUsers(await getUsers());
  };
  const handleUpdateGroupPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupPass.length < 4) return;
    await changeGroupPassword(newGroupPass);
    setNewGroupPass(""); alert("Group password updated!");
  };
  const handleUpdateAdminPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPass.length < 4) return;
    await changeAdminPassword(newAdminPass);
    setNewAdminPass(""); alert("Admin password updated!");
  };
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAppSettings({ emergency_link: newEmergencyLink });
    setSettings(s => ({ ...s, emergency_link: newEmergencyLink }));
    alert("Emergency link updated!");
  };
  const handleChangeTheme = async (color: string) => {
    await updateAppSettings({ primary_color: color });
    setSettings(s => ({ ...s, primary_color: color }));
  };
  const handleEmptyChat = async () => {
    if (confirm("Are you sure you want to delete ALL messages?")) {
      await emptyChat();
      alert("Chat cleared.");
    }
  };

  // Renders
  if (appState === "EMERGENCY") {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/30 backdrop-blur-3xl flex items-center justify-center transition-all duration-500">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (appState === "LOADING") {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
  }

  if (appState === "SELECT_USER") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 p-4 relative overflow-hidden">
        {/* Fancy Background */}
        <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-br ${theme.from} ${theme.to} rounded-b-[4rem] shadow-xl transform -skew-y-6 origin-top-left -translate-y-10 scale-110`}></div>
        
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/50 z-10">
          <div className="px-8 py-10 text-center">
            <h1 className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${theme.from} ${theme.to} mb-2 tracking-tight`}>Hams</h1>
            <p className="text-gray-500 text-sm font-medium">Select your profile to continue</p>
          </div>
          <div className="p-4 pt-0 space-y-3 max-h-[50vh] overflow-y-auto px-6 pb-6">
            {users.map(u => (
              <button key={u.id} onClick={() => handleUserClick(u)} className={`w-full flex items-center p-4 hover:bg-gray-50/80 rounded-2xl transition-all duration-300 text-left group border border-gray-100 hover:shadow-md ${theme.border}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-4 shadow-sm transition-transform group-hover:scale-105 ${u.role === 'admin' ? theme.bg + ' text-white' : theme.lightBg + ' ' + theme.text}`}>
                  {u.role === 'admin' ? <Settings size={22} /> : <User size={22} />}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">{u.username}</div>
                  <div className={`text-xs uppercase tracking-wider font-semibold ${u.role === 'admin' ? theme.text : 'text-gray-400'}`}>{u.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (appState === "SETUP") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-100">
          <div className="mb-8 text-center">
            <div className={`w-20 h-20 ${theme.lightBg} ${theme.text} rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner`}>
              <Lock size={36} />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Welcome Admin</h2>
            <p className="text-gray-500 text-sm mt-2">Let's secure your app before continuing.</p>
          </div>
          <form onSubmit={handleSetup} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Create Admin Password</label>
              <input type="password" value={setupAdminPass} onChange={e => setSetupAdminPass(e.target.value)} className={`w-full border-2 border-gray-200 rounded-2xl px-5 py-4 outline-none ${theme.ring} focus:border-transparent transition-all text-gray-900 font-medium`} placeholder="Required for admin panel" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Create Group Chat Password</label>
              <input type="password" value={setupGroupPass} onChange={e => setSetupGroupPass(e.target.value)} className={`w-full border-2 border-gray-200 rounded-2xl px-5 py-4 outline-none ${theme.ring} focus:border-transparent transition-all text-gray-900 font-medium`} placeholder="Share this with your users" required />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button type="submit" className={`w-full ${theme.bg} text-white rounded-2xl py-4 font-bold text-lg ${theme.hover} transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}>Complete Setup</button>
          </form>
        </div>
      </div>
    );
  }

  if (appState === "LOGIN") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-100">
          <button onClick={() => setAppState("SELECT_USER")} className="text-gray-400 hover:text-gray-800 mb-6 transition-colors flex items-center gap-2 font-medium">
            <ArrowLeft size={20} /> Back
          </button>
          <div className="mb-8 text-center">
            <div className={`w-24 h-24 ${selectedUser?.role === 'admin' ? theme.bg + ' text-white shadow-lg' : theme.lightBg + ' ' + theme.text + ' shadow-inner'} rounded-[2rem] rotate-3 flex items-center justify-center mx-auto mb-6 transform transition-transform hover:rotate-6`}>
              <User size={40} className="-rotate-3"/>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">{selectedUser?.username}</h2>
            <p className="text-gray-500 text-sm mt-2 font-medium">{selectedUser?.role === 'admin' ? 'Enter admin password to unlock panel' : 'Enter the secret group password'}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={`w-full border-2 border-gray-200 rounded-2xl px-5 py-4 outline-none ${theme.ring} focus:border-transparent text-center tracking-[0.5em] text-2xl text-gray-900 font-bold transition-all bg-gray-50 focus:bg-white`} placeholder="••••••••" autoFocus />
            {error && <p className="text-red-500 text-sm text-center font-bold bg-red-50 py-2 rounded-lg">{error}</p>}
            <button type="submit" className={`w-full ${theme.bg} text-white rounded-2xl py-4 font-bold text-lg ${theme.hover} transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}>Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  if (appState === "ADMIN_PANEL") {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-20">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${theme.bg} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                <Settings size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Console</h1>
                <p className="text-gray-500 font-medium">Manage users, security, and aesthetics</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
              <button onClick={() => setAppState("SELECT_USER")} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-bold">Log out</button>
              <button onClick={enterChat} className={`flex items-center gap-2 ${theme.bg} text-white px-6 py-2.5 rounded-xl ${theme.hover} transition-all shadow-md font-bold hover:shadow-lg transform hover:-translate-y-0.5`}>
                <MessageSquare size={18} /> Enter Chat
              </button>
              <button onClick={triggerEmergency} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all shadow-md font-bold hover:shadow-lg transform hover:-translate-y-0.5 ml-auto md:ml-0">
                <AlertTriangle size={18} /> Emergency
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Users Management */}
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col h-[500px]">
              <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-3"><div className={`p-2 ${theme.lightBg} ${theme.text} rounded-lg`}><User size={20}/></div> Manage Access</h2>
              
              <form onSubmit={handleCreateUser} className="flex gap-3 mb-8">
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="New username" className={`flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none ${theme.ring} focus:border-transparent text-gray-900 font-medium bg-gray-50 focus:bg-white transition-colors`} />
                <button type="submit" className={`bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all font-bold flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}><UserPlus size={18} /> Add</button>
              </form>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {users.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-4 bg-gray-50/80 hover:bg-gray-100/80 rounded-2xl border border-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === 'admin' ? theme.lightBg + ' ' + theme.text : 'bg-gray-200 text-gray-600'}`}>
                        {u.role === 'admin' ? <Settings size={16}/> : <User size={16}/>}
                      </div>
                      <span className="font-bold text-gray-900 text-lg">{u.username} <span className="text-xs font-semibold text-gray-400 ml-2 uppercase tracking-wide">{u.role}</span></span>
                    </div>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:bg-red-100 p-2.5 rounded-xl transition-colors"><Trash2 size={18} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              {/* Security Settings */}
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-3"><div className={`p-2 ${theme.lightBg} ${theme.text} rounded-lg`}><Lock size={20}/></div> Security Controls</h2>
                
                <div className="space-y-6">
                  <form onSubmit={handleUpdateGroupPass} className="flex flex-col sm:flex-row gap-3">
                    <input type="password" value={newGroupPass} onChange={e => setNewGroupPass(e.target.value)} className={`flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none ${theme.ring} focus:border-transparent text-gray-900 font-medium`} placeholder="New Group Password" />
                    <button type="submit" className="bg-gray-100 text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors">Update</button>
                  </form>
                  <form onSubmit={handleUpdateAdminPass} className="flex flex-col sm:flex-row gap-3">
                    <input type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} className={`flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none ${theme.ring} focus:border-transparent text-gray-900 font-medium`} placeholder="New Admin Password" />
                    <button type="submit" className="bg-gray-100 text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors">Update</button>
                  </form>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-3"><div className={`p-2 ${theme.lightBg} ${theme.text} rounded-lg`}><Palette size={20}/></div> Customization</h2>
                
                <form onSubmit={handleUpdateSettings} className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><LinkIcon size={16}/> Emergency Redirect Link</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="url" value={newEmergencyLink} onChange={e => setNewEmergencyLink(e.target.value)} className={`flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none ${theme.ring} focus:border-transparent text-gray-900 font-medium`} placeholder="https://..." />
                    <button type="submit" className="bg-gray-100 text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors">Save</button>
                  </div>
                </form>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Palette size={16}/> Accent Color</label>
                  <div className="flex gap-4">
                    {Object.keys(THEMES).map(color => (
                      <button key={color} onClick={() => handleChangeTheme(color)} className={`w-12 h-12 rounded-full ${THEMES[color].bg} ${settings.primary_color === color ? 'ring-4 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110'} transition-all shadow-md`}></button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 p-8 rounded-3xl border border-red-200">
                <h2 className="text-xl font-extrabold text-red-700 mb-4 flex items-center gap-3"><AlertCircle size={20}/> Danger Zone</h2>
                <p className="text-red-600 text-sm font-medium mb-4">This will permanently delete all messages in the group chat for everyone.</p>
                <button onClick={handleEmptyChat} className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors shadow-md">
                  Nuke Chat History
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === "CHAT") {
    const activeTypers = typingUsers.filter(u => u !== selectedUser?.username);
    
    return (
      <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900 relative">
        <header className="bg-white/80 backdrop-blur-xl shadow-sm px-6 py-4 flex items-center justify-between border-b border-gray-200 z-10 sticky top-0">
           <div className="flex items-center gap-4">
             <button onClick={() => {
               if (channelRef.current) supabase.removeChannel(channelRef.current);
               setAppState(selectedUser?.role === 'admin' ? "ADMIN_PANEL" : "SELECT_USER");
             }} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
               <ArrowLeft size={20} />
             </button>
             <div>
               <h1 className="text-xl font-extrabold text-gray-900">Hams Group</h1>
               <div className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mt-0.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                 {onlineUsers.length} online
               </div>
             </div>
           </div>
           <button onClick={triggerEmergency} className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Emergency Logout">
             <AlertTriangle size={18} />
           </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative custom-scrollbar">
           <div className="space-y-6 max-w-4xl mx-auto pb-4">
             {messages.length === 0 && (
               <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                 <MessageSquare size={48} className="mb-4 opacity-20"/>
                 <p className="font-medium">No messages here yet. Start the conversation!</p>
               </div>
             )}
             {messages.map(msg => {
               const isMe = msg.user_id === selectedUser?.id;
               return (
                 <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 ml-2 font-bold">{isMe ? "You" : msg.users?.username}</div>
                    <div className={`px-5 py-3.5 rounded-3xl max-w-[85%] md:max-w-[70%] break-words shadow-sm text-[15px] leading-relaxed ${isMe ? theme.bg + " text-white rounded-tr-sm" : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-gray-200/50"}`}>
                      {msg.text}
                    </div>
                 </div>
               );
             })}
             {activeTypers.length > 0 && (
               <div className="flex items-start opacity-80 animate-pulse">
                 <div className="bg-gray-200/80 backdrop-blur-sm text-gray-600 font-medium px-5 py-3 rounded-3xl rounded-tl-sm text-sm flex items-center gap-2">
                   <div className="flex gap-1">
                     <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                     <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                     <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                   </div>
                   {activeTypers.join(", ")} {activeTypers.length > 1 ? "are" : "is"} typing
                 </div>
               </div>
             )}
             <div ref={messagesEndRef} />
           </div>
        </main>

        <footer className="bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4 sticky bottom-0 z-10">
           <div className="max-w-4xl mx-auto">
             <form onSubmit={sendMessage} className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-300 transition-all">
               <input 
                 type="text" 
                 placeholder="Type your message..." 
                 className="flex-1 bg-transparent px-5 py-3 outline-none text-gray-900 font-medium"
                 value={messageInput}
                 onChange={handleTyping}
               />
               <button type="submit" disabled={!messageInput.trim()} className={`${theme.bg} disabled:opacity-50 disabled:scale-100 text-white p-3.5 rounded-full ${theme.hover} transition-all shadow-md transform hover:scale-105 flex-shrink-0 mr-0.5`}>
                 <Send size={20} className="ml-0.5" />
               </button>
             </form>
           </div>
        </footer>
      </div>
    );
  }

  return null;
}
