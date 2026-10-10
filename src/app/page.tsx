"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { Lock, User, UserPlus, Trash2, Settings, MessageSquare, ArrowLeft, Send, AlertCircle, Palette, Link as LinkIcon, AlertTriangle, Edit2, Eye, Clock, Moon, Sun, Monitor, History } from "lucide-react";
import { getSettings, setupApp, verifyAdmin, verifyGroup, getUsers, createUser, deleteUser, changeGroupPassword, changeAdminPassword, updateAppSettings, emptyChat, editMessage, deleteMessage, markAsRead } from "./actions";

type DBUser = { id: string; username: string; role: string; created_at: string; last_login: string; last_seen_at: string; last_device: string };
type EditHistory = { text: string; edited_at: string };
type Message = { id: string; user_id: string; text: string; created_at: string; is_edited: boolean; is_deleted: boolean; edit_history: EditHistory[]; users?: { username: string } };

const THEMES: Record<string, { bg: string, text: string, hover: string, ring: string, lightBg: string, from: string, to: string, border: string }> = {
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', hover: 'hover:bg-indigo-700', ring: 'focus:ring-indigo-500', lightBg: 'bg-indigo-50', from: 'from-indigo-500', to: 'to-purple-600', border: 'hover:border-indigo-200' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600', hover: 'hover:bg-rose-700', ring: 'focus:ring-rose-500', lightBg: 'bg-rose-50', from: 'from-rose-500', to: 'to-pink-600', border: 'hover:border-rose-200' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', hover: 'hover:bg-emerald-700', ring: 'focus:ring-emerald-500', lightBg: 'bg-emerald-50', from: 'from-emerald-400', to: 'to-teal-600', border: 'hover:border-emerald-200' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-700', ring: 'focus:ring-blue-500', lightBg: 'bg-blue-50', from: 'from-blue-500', to: 'to-cyan-600', border: 'hover:border-blue-200' },
};

export default function Home() {
  const [appState, setAppState] = useState<"LOADING" | "SELECT_USER" | "SETUP" | "LOGIN" | "ADMIN_PANEL" | "CHAT" | "EMERGENCY">("LOADING");
  const [settings, setSettings] = useState({ initialized: false, emergency_link: '', primary_color: 'indigo', is_dark_mode: true });
  const [users, setUsers] = useState<DBUser[]>([]);
  const usersRef = useRef<DBUser[]>([]);
  useEffect(() => { usersRef.current = users; }, [users]);
  
  const [selectedUser, setSelectedUser] = useState<DBUser | null>(null);
  const selectedUserRef = useRef<DBUser | null>(null);
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

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
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [expandedHistoryMsgId, setExpandedHistoryMsgId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const theme = THEMES[settings.primary_color] || THEMES.indigo;
  const isDark = settings.is_dark_mode;

  // Sync dark mode class to HTML root for global CSS
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [isDark]);

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

  // Mark as read periodically when in chat
  useEffect(() => {
    if (appState === "CHAT" && selectedUser) {
      markAsRead(selectedUser.id);
      const interval = setInterval(() => markAsRead(selectedUser.id), 15000);
      return () => clearInterval(interval);
    }
  }, [appState, selectedUser]);

  async function loadInitialData() {
    setAppState("LOADING");
    const [dbSettings, dbUsers] = await Promise.all([getSettings(), getUsers()]);
    setSettings(dbSettings as any);
    setNewEmergencyLink((dbSettings as any).emergency_link);
    setUsers(dbUsers as DBUser[]);
    setAppState("SELECT_USER");
  }

  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    return 'Unknown Device';
  };

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

    const device = getDeviceName();

    if (selectedUser.role === "admin") {
      const isValid = await verifyAdmin(passwordInput, selectedUser.id, device);
      if (isValid) setAppState("ADMIN_PANEL");
      else setError("Incorrect Admin Password.");
    } else {
      const isValid = await verifyGroup(passwordInput, selectedUser.id, device);
      if (isValid) enterChat();
      else setError("Incorrect Group Password.");
    }
  };

  const enterChat = async () => {
    setAppState("CHAT");
    
    // Fetch initial messages
    const { data: initialMessages } = await supabase.from('messages').select('*, users(username)').order('created_at', { ascending: true }).limit(200);
    if (initialMessages) setMessages(initialMessages as any);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel('group_chat', { config: { presence: { key: selectedUserRef.current?.username || selectedUser!.username } } });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = Object.keys(state);
        setOnlineUsers(online);
        const typing = online.filter(user => (state[user] as any[]).some(conn => conn.isTyping));
        setTypingUsers(typing);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const currentUserList = usersRef.current.length > 0 ? usersRef.current : users;
        const msgUser = currentUserList.find(u => u.id === payload.new.user_id);
        const newMsg = { ...payload.new, users: { username: msgUser?.username || 'Unknown' } } as Message;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        
        const currentUser = selectedUserRef.current || selectedUser;
        if (currentUser) markAsRead(currentUser.id); 
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, () => {
        setMessages([]); 
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') channel.track({ isTyping: false }).catch(()=>{});
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn("Channel disconnected, reconnecting...");
          setTimeout(() => { if (channelRef.current === channel) channel.subscribe(); }, 3000);
        }
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

    if (editingMsgId) {
      const msgId = editingMsgId;
      const oldMsg = messages.find(m => m.id === msgId);
      setEditingMsgId(null);
      if (oldMsg) {
        const history = oldMsg.edit_history || [];
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text, is_edited: true, edit_history: [...history, { text: oldMsg.text, edited_at: new Date().toISOString() }] } : m));
        await editMessage(msgId, text, oldMsg.text);
      }
      return;
    }

    const tempId = crypto.randomUUID();
    const newMsg: Message = { id: tempId, user_id: selectedUser.id, text, created_at: new Date().toISOString(), is_edited: false, is_deleted: false, edit_history: [], users: { username: selectedUser.username } };
    setMessages(prev => [...prev, newMsg]);
    await supabase.from('messages').insert({ id: tempId, user_id: selectedUser.id, text });
  };

  const handleEditInit = (msg: Message) => {
    if (msg.is_deleted) return;
    setEditingMsgId(msg.id);
    setMessageInput(msg.text);
  };

  const handleDeleteMsg = async (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: 'deleted message', is_deleted: true } : m));
    await deleteMessage(msgId);
  };

  // Admin Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const { error: createErr } = await createUser(newUsername.trim());
    if (createErr) alert(createErr);
    else { setNewUsername(""); setUsers(await getUsers() as DBUser[]); }
  };
  const handleDeleteUser = async (id: string) => {
    const { error: delErr } = await deleteUser(id);
    if (delErr) alert(delErr); else setUsers(await getUsers() as DBUser[]);
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
    setShowColorPicker(false);
  };
  const handleToggleDarkMode = async () => {
    const newVal = !settings.is_dark_mode;
    await updateAppSettings({ is_dark_mode: newVal });
    setSettings(s => ({ ...s, is_dark_mode: newVal }));
    setShowColorPicker(false);
  };
  const handleEmptyChat = async () => {
    if (confirm("Are you sure you want to delete ALL messages?")) {
      await emptyChat();
      alert("Chat cleared.");
    }
  };

  const formatTime = (ts: string) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (ts: string) => {
    if (!ts) return "Never";
    const d = new Date(ts);
    if (new Date().toDateString() === d.toDateString()) return "Today at " + formatTime(ts);
    return d.toLocaleDateString() + " " + formatTime(ts);
  };

  // Theming classes
  const cBg = isDark ? "bg-gray-900" : "bg-gray-50";
  const cCard = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
  const cCardHover = isDark ? "hover:bg-gray-700" : "hover:bg-gray-50";
  const cText = isDark ? "text-white" : "text-gray-900";
  const cTextMuted = isDark ? "text-gray-400" : "text-gray-500";
  const cInput = isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900";
  const cBubbleOther = isDark ? "bg-gray-800 border border-gray-700 text-gray-100 shadow-lg" : "bg-white border border-gray-100 text-gray-800 shadow-sm";
  const cHeader = isDark ? "bg-gray-900/90 border-gray-800" : "bg-white/90 border-gray-200";

  if (appState === "EMERGENCY") {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/40 backdrop-blur-[50px] flex items-center justify-center transition-all duration-500">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-900"></div>
      </div>
    );
  }

  if (appState === "LOADING") {
    return <div className={`h-[100dvh] flex items-center justify-center ${cBg}`}><div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-white' : 'border-gray-900'}`}></div></div>;
  }

  if (appState === "SELECT_USER") {
    return (
      <div className={`h-[100dvh] flex items-center justify-center ${cBg} p-4 relative overflow-hidden transition-colors`}>
        <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-br ${theme.from} ${theme.to} rounded-b-[4rem] shadow-xl transform -skew-y-6 origin-top-left -translate-y-10 scale-110`}></div>
        
        <div className={`${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-white/50'} backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border z-10 flex flex-col max-h-[90vh]`}>
          <div className="px-8 py-10 text-center flex-shrink-0">
            <h1 className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${theme.from} ${theme.to} mb-2 tracking-tight`}>Hams</h1>
            <p className={`${cTextMuted} text-sm font-medium`}>Select your profile to continue</p>
          </div>
          <div className="p-4 pt-0 space-y-3 overflow-y-auto px-6 pb-6 custom-scrollbar">
            {users.map(u => (
              <button key={u.id} onClick={() => handleUserClick(u)} className={`w-full flex items-center p-4 ${cCardHover} rounded-2xl transition-all duration-300 text-left group border ${isDark ? 'border-gray-700' : 'border-gray-100'} hover:shadow-md ${theme.border}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-4 shadow-sm transition-transform group-hover:scale-105 ${u.role === 'admin' ? theme.bg + ' text-white' : (isDark ? 'bg-gray-700 text-gray-300' : theme.lightBg + ' ' + theme.text)}`}>
                  {u.role === 'admin' ? <Settings size={22} /> : <User size={22} />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className={`font-bold ${cText} text-lg`}>{u.username}</div>
                  <div className={`text-xs uppercase tracking-wider font-semibold ${u.role === 'admin' ? theme.text : cTextMuted} flex items-center gap-1`}>
                    {u.role}
                  </div>
                  <div className={`text-[10px] ${cTextMuted} mt-1 truncate flex items-center gap-1.5`}>
                    <Clock size={10} /> {formatDate(u.last_login)} 
                    {u.last_device && <><Monitor size={10} className="ml-1"/> on {u.last_device}</>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ... SETUP and LOGIN ...
  if (appState === "SETUP") {
    return (
      <div className={`h-[100dvh] flex items-center justify-center ${cBg} p-4`}>
        <div className={`${cCard} rounded-3xl shadow-2xl w-full max-w-md p-8 border`}>
          <div className="mb-8 text-center">
            <div className={`w-20 h-20 ${isDark ? 'bg-gray-700' : theme.lightBg} ${theme.text} rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner`}>
              <Lock size={36} />
            </div>
            <h2 className={`text-3xl font-extrabold ${cText}`}>Welcome Admin</h2>
            <p className={`${cTextMuted} text-sm mt-2`}>Let's secure your app before continuing.</p>
          </div>
          <form onSubmit={handleSetup} className="space-y-6">
            <div>
              <label className={`block text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Create Admin Password</label>
              <input type="password" value={setupAdminPass} onChange={e => setSetupAdminPass(e.target.value)} className={`w-full border-2 rounded-2xl px-5 py-4 outline-none ${theme.ring} focus:border-transparent transition-all ${cInput} font-medium`} required />
            </div>
            <div>
              <label className={`block text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Create Group Chat Password</label>
              <input type="password" value={setupGroupPass} onChange={e => setSetupGroupPass(e.target.value)} className={`w-full border-2 rounded-2xl px-5 py-4 outline-none ${theme.ring} focus:border-transparent transition-all ${cInput} font-medium`} required />
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
      <div className={`h-[100dvh] flex items-center justify-center ${cBg} p-4`}>
        <div className={`${cCard} rounded-3xl shadow-2xl w-full max-w-md p-8 border`}>
          <button onClick={() => setAppState("SELECT_USER")} className={`${cTextMuted} hover:${cText} mb-6 transition-colors flex items-center gap-2 font-medium`}>
            <ArrowLeft size={20} /> Back
          </button>
          <div className="mb-8 text-center">
            <div className={`w-24 h-24 ${selectedUser?.role === 'admin' ? theme.bg + ' text-white shadow-lg' : (isDark ? 'bg-gray-700 text-gray-300' : theme.lightBg + ' ' + theme.text) + ' shadow-inner'} rounded-[2rem] rotate-3 flex items-center justify-center mx-auto mb-6 transform transition-transform hover:rotate-6`}>
              <User size={40} className="-rotate-3"/>
            </div>
            <h2 className={`text-3xl font-extrabold ${cText}`}>{selectedUser?.username}</h2>
            <p className={`${cTextMuted} text-sm mt-2 font-medium`}>{selectedUser?.role === 'admin' ? 'Enter admin password to unlock panel' : 'Enter the secret group password'}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={`w-full border-2 rounded-2xl px-5 py-4 outline-none ${theme.ring} focus:border-transparent text-center tracking-[0.5em] text-2xl font-bold transition-all ${cInput}`} placeholder="••••••••" autoFocus />
            {error && <p className="text-red-500 text-sm text-center font-bold bg-red-500/10 py-2 rounded-lg">{error}</p>}
            <button type="submit" className={`w-full ${theme.bg} text-white rounded-2xl py-4 font-bold text-lg ${theme.hover} transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}>Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  if (appState === "ADMIN_PANEL") {
    return (
      <div className={`min-h-[100dvh] ${cBg} p-4 md:p-8 font-sans pb-20 transition-colors`}>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className={`flex flex-col md:flex-row justify-between items-center ${cCard} p-6 md:p-8 rounded-3xl shadow-xl shadow-black/5 border gap-4`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${theme.bg} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                <Settings size={28} />
              </div>
              <div>
                <h1 className={`text-3xl font-extrabold ${cText} tracking-tight`}>Admin Console</h1>
                <p className={`${cTextMuted} font-medium`}>Manage users, security, and aesthetics</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
              <button onClick={() => setAppState("SELECT_USER")} className={`px-5 py-2.5 ${cTextMuted} ${cCardHover} rounded-xl transition-colors font-bold`}>Switch Account</button>
              <button onClick={enterChat} className={`flex items-center gap-2 ${theme.bg} text-white px-6 py-2.5 rounded-xl ${theme.hover} transition-all shadow-md font-bold hover:shadow-lg transform hover:-translate-y-0.5`}>
                <MessageSquare size={18} /> Enter Chat
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className={`${cCard} p-8 rounded-3xl shadow-xl shadow-black/5 border flex flex-col h-[500px]`}>
              <h2 className={`text-xl font-extrabold ${cText} mb-6 flex items-center gap-3`}><div className={`p-2 ${isDark ? 'bg-gray-700' : theme.lightBg} ${theme.text} rounded-lg`}><User size={20}/></div> Manage Access</h2>
              <form onSubmit={handleCreateUser} className="flex gap-3 mb-8">
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="New username" className={`flex-1 border-2 rounded-xl px-4 py-3 outline-none ${theme.ring} focus:border-transparent ${cInput} font-medium transition-colors`} />
                <button type="submit" className={`bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}><UserPlus size={18} /> Add</button>
              </form>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {users.map(u => (
                  <div key={u.id} className={`flex justify-between items-center p-4 ${isDark ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-gray-50/80 hover:bg-gray-100/80'} rounded-2xl border ${isDark ? 'border-gray-700' : 'border-gray-100'} transition-colors`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === 'admin' ? (isDark ? 'bg-gray-700' : theme.lightBg) + ' ' + theme.text : (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600')}`}>
                        {u.role === 'admin' ? <Settings size={16}/> : <User size={16}/>}
                      </div>
                      <div>
                        <div className={`font-bold ${cText} text-lg`}>{u.username} <span className="text-xs font-semibold text-gray-400 ml-2 uppercase tracking-wide">{u.role}</span></div>
                        <div className={`text-[10px] ${cTextMuted} truncate flex gap-1 items-center`}><Clock size={10}/> {formatDate(u.last_seen_at)}</div>
                        {u.last_device && <div className={`text-[10px] ${cTextMuted} truncate flex gap-1 items-center`}><Monitor size={10}/> {u.last_device}</div>}
                      </div>
                    </div>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:bg-red-500/10 p-2.5 rounded-xl transition-colors"><Trash2 size={18} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className={`${cCard} p-8 rounded-3xl shadow-xl shadow-black/5 border`}>
                <h2 className={`text-xl font-extrabold ${cText} mb-6 flex items-center gap-3`}><div className={`p-2 ${isDark ? 'bg-gray-700' : theme.lightBg} ${theme.text} rounded-lg`}><Lock size={20}/></div> Security Controls</h2>
                <div className="space-y-6">
                  <form onSubmit={handleUpdateGroupPass} className="flex flex-col sm:flex-row gap-3">
                    <input type="password" value={newGroupPass} onChange={e => setNewGroupPass(e.target.value)} className={`flex-1 border-2 rounded-xl px-4 py-3 outline-none ${theme.ring} focus:border-transparent ${cInput} font-medium`} placeholder="New Group Password" />
                    <button type="submit" className={`${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${cText} font-bold px-6 py-3 rounded-xl transition-colors`}>Update</button>
                  </form>
                  <form onSubmit={handleUpdateAdminPass} className="flex flex-col sm:flex-row gap-3">
                    <input type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} className={`flex-1 border-2 rounded-xl px-4 py-3 outline-none ${theme.ring} focus:border-transparent ${cInput} font-medium`} placeholder="New Admin Password" />
                    <button type="submit" className={`${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${cText} font-bold px-6 py-3 rounded-xl transition-colors`}>Update</button>
                  </form>
                </div>
              </div>

              <div className={`${cCard} p-8 rounded-3xl shadow-xl shadow-black/5 border`}>
                <h2 className={`text-xl font-extrabold ${cText} mb-6 flex items-center gap-3`}><div className={`p-2 ${isDark ? 'bg-gray-700' : theme.lightBg} ${theme.text} rounded-lg`}><Palette size={20}/></div> Customization</h2>
                <form onSubmit={handleUpdateSettings} className="mb-6">
                  <label className={`block text-sm font-bold ${cText} mb-2 flex items-center gap-2`}><LinkIcon size={16}/> Emergency Redirect Link</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="url" value={newEmergencyLink} onChange={e => setNewEmergencyLink(e.target.value)} className={`flex-1 border-2 rounded-xl px-4 py-3 outline-none ${theme.ring} focus:border-transparent ${cInput} font-medium`} placeholder="https://..." />
                    <button type="submit" className={`${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${cText} font-bold px-6 py-3 rounded-xl transition-colors`}>Save</button>
                  </div>
                </form>
              </div>

              <div className={`${isDark ? 'bg-red-900/20 border-red-900/50' : 'bg-red-50 border-red-200'} p-8 rounded-3xl border`}>
                <h2 className="text-xl font-extrabold text-red-500 mb-4 flex items-center gap-3"><AlertCircle size={20}/> Danger Zone</h2>
                <p className={`text-red-400 text-sm font-medium mb-4`}>This will permanently delete all messages in the group chat for everyone.</p>
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
    const isAdmin = selectedUser?.role === 'admin';
    
    return (
      <div className={`flex flex-col h-[100dvh] ${cBg} font-sans ${cText} relative transition-colors`}>
        {/* Global Background Layer */}
        <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none ${isDark ? 'opacity-10' : 'opacity-100'} z-0`}></div>

        <header className={`${cHeader} backdrop-blur-xl shadow-sm px-6 py-4 flex items-center justify-between border-b z-10 sticky top-0`}>
           <div className="flex items-center gap-4">
             <button onClick={() => {
               if (channelRef.current) supabase.removeChannel(channelRef.current);
               setAppState(isAdmin ? "ADMIN_PANEL" : "SELECT_USER");
             }} className={`w-10 h-10 flex items-center justify-center rounded-full ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors`}>
               <ArrowLeft size={20} />
             </button>
             <div>
               <h1 className={`text-xl font-extrabold ${cText}`}>Hams Group</h1>
               <div className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mt-0.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                 {onlineUsers.length} online {onlineUsers.length > 0 && <span className="opacity-70 font-normal">({onlineUsers.join(', ')})</span>}
               </div>
             </div>
           </div>
        </header>

        <main className={`flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-6 relative custom-scrollbar z-10`}>
           <div className="space-y-6 max-w-4xl mx-auto pb-4">
             {messages.length === 0 && (
               <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                 <MessageSquare size={48} className="mb-4 opacity-20"/>
                 <p className="font-medium">No messages here yet. Start the conversation!</p>
               </div>
             )}
             {messages.map(msg => {
               const isMe = msg.user_id === selectedUser?.id;
               const canDelete = isMe || isAdmin;
               const hasHistory = msg.edit_history && msg.edit_history.length > 0;
               const readers = users.filter(u => u.id !== msg.user_id && new Date(u.last_seen_at) >= new Date(msg.created_at));
               
               return (
                 <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group/msg w-full`}>
                    <div className={`text-[11px] uppercase tracking-wider ${cTextMuted} mb-1 ml-2 font-bold flex items-center gap-2`}>
                      {isMe ? "You" : msg.users?.username} <span className="text-[9px] font-medium opacity-60">{formatTime(msg.created_at)}</span>
                    </div>
                    
                    <div className={`flex items-center gap-1 w-full ${isMe ? "justify-end" : "justify-start"}`}>
                      {canDelete && !msg.is_deleted && (
                        <div className={`opacity-100 lg:opacity-0 lg:group-hover/msg:opacity-100 flex shrink-0 items-center gap-1 transition-opacity ${isMe ? "mr-1" : "ml-1 order-last"}`}>
                          {isMe && <button onClick={() => handleEditInit(msg)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"><Edit2 size={14}/></button>}
                          <button onClick={() => handleDeleteMsg(msg.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"><Trash2 size={14}/></button>
                        </div>
                      )}
                      
                      <div className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] break-words shadow-sm text-[15px] leading-relaxed relative ${msg.is_deleted ? (isDark ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-400') + ' italic rounded-tr-sm' : (isMe ? theme.bg + " text-white rounded-tr-sm" : cBubbleOther + " rounded-tl-sm")}`}>
                        {msg.text}
                        {msg.is_edited && !msg.is_deleted && (
                          <span 
                            className={`text-[10px] ml-2 opacity-60 italic ${isAdmin ? 'cursor-pointer hover:underline text-yellow-300 font-bold' : ''}`}
                            onClick={() => isAdmin ? setExpandedHistoryMsgId(expandedHistoryMsgId === msg.id ? null : msg.id) : null}
                          >
                            (edited)
                          </span>
                        )}
                        {expandedHistoryMsgId === msg.id && isAdmin && hasHistory && (
                          <div className={`mt-3 pt-3 border-t ${isMe ? 'border-white/20' : isDark ? 'border-gray-700' : 'border-gray-200'} text-xs opacity-90 space-y-2`}>
                            <div className="font-bold flex items-center gap-1"><History size={12}/> Edit History:</div>
                            {msg.edit_history.map((h, i) => (
                              <div key={i} className={`p-2 rounded ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                <div className="text-[9px] opacity-70 mb-0.5">{formatDate(h.edited_at)}</div>
                                <div>{h.text}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {isMe && readers.length > 0 && !msg.is_deleted && (
                      <div className={`text-[10px] ${cTextMuted} mt-1 mr-2 flex items-center gap-1 font-medium`}>
                        <Eye size={12} className={theme.text} /> Read by {readers.map(r => r.username).join(", ")}
                      </div>
                    )}
                 </div>
               );
             })}
             {activeTypers.length > 0 && (
               <div className="flex items-start opacity-80 animate-pulse">
                 <div className={`${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-200/80 text-gray-600'} backdrop-blur-sm font-medium px-5 py-3 rounded-3xl rounded-tl-sm text-sm flex items-center gap-2`}>
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

        <footer className={`${cHeader} backdrop-blur-xl border-t p-3 sm:p-4 sticky bottom-0 z-10`}>
           <div className="max-w-4xl mx-auto flex items-end gap-2">
             
             {/* Bottom Left Buttons: Customize and Emergency */}
             <div className="flex items-center gap-2 pb-1.5 relative">
               <button onClick={() => setShowColorPicker(!showColorPicker)} className={`w-12 h-12 flex items-center justify-center rounded-full ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600'} hover:${theme.bg} hover:text-white transition-all shadow-sm`} title="Customize">
                 <Palette size={20} />
               </button>
               {showColorPicker && (
                 <div className={`absolute bottom-16 left-0 ${cCard} p-4 rounded-3xl shadow-xl border flex flex-col gap-4 animate-in fade-in zoom-in duration-200 min-w-[200px]`}>
                    <div>
                      <div className={`text-xs font-bold ${cTextMuted} mb-2 uppercase tracking-wide`}>Theme</div>
                      <div className="flex gap-2">
                        {Object.keys(THEMES).map(color => (
                          <button key={color} onClick={() => handleChangeTheme(color)} className={`w-8 h-8 rounded-full ${THEMES[color].bg} ${settings.primary_color === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110'} transition-all shadow-sm`}></button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center justify-between">
                      <span className={`text-sm font-bold ${cText}`}>Dark Mode</span>
                      <button onClick={handleToggleDarkMode} className={`w-12 h-6 rounded-full relative transition-colors ${isDark ? theme.bg : 'bg-gray-300'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'} flex items-center justify-center`}>
                           {isDark ? <Moon size={10} className="text-gray-900"/> : <Sun size={10} className="text-yellow-500"/>}
                        </div>
                      </button>
                    </div>
                 </div>
               )}
               <button onClick={triggerEmergency} className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Emergency Logout">
                 <AlertTriangle size={20} />
               </button>
             </div>

             <form onSubmit={sendMessage} className={`flex-1 flex items-center gap-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} p-1.5 rounded-[2rem] border-2 ${editingMsgId ? 'border-yellow-500 bg-yellow-500/10' : ''} focus-within:${theme.ring} focus-within:ring-2 focus-within:border-transparent transition-all`}>
               <input 
                 type="text" 
                 placeholder={editingMsgId ? "Edit your message..." : "Type your message..."}
                 className={`flex-1 bg-transparent px-5 py-3 outline-none ${cText} font-medium`}
                 value={messageInput}
                 onChange={handleTyping}
               />
               {editingMsgId && (
                 <button type="button" onClick={() => { setEditingMsgId(null); setMessageInput(""); }} className={`${cTextMuted} hover:${cText} px-2 font-bold text-sm`}>Cancel</button>
               )}
               <button type="submit" disabled={!messageInput.trim()} className={`${editingMsgId ? 'bg-yellow-500 hover:bg-yellow-600' : theme.bg + ' ' + theme.hover} disabled:opacity-50 disabled:scale-100 text-white w-12 h-12 rounded-full transition-all shadow-md transform hover:scale-105 flex items-center justify-center flex-shrink-0 mr-0.5`}>
                 <Send size={18} />
               </button>
             </form>
           </div>
        </footer>
      </div>
    );
  }

  return null;
}
