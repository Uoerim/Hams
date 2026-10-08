"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { Lock, Unlock, User, UserPlus, Trash2, Settings, MessageSquare, ArrowLeft, Send } from "lucide-react";
import { getSettings, setupApp, verifyAdmin, verifyGroup, getUsers, createUser, deleteUser, changeGroupPassword } from "./actions";

type DBUser = { id: string; username: string; role: string; created_at: string };
type Message = { id: string; user_id: string; text: string; created_at: string; users?: { username: string } };

export default function Home() {
  const [appState, setAppState] = useState<"LOADING" | "SELECT_USER" | "SETUP" | "LOGIN" | "ADMIN_PANEL" | "CHAT">("LOADING");
  const [isInitialized, setIsInitialized] = useState(false);
  const [users, setUsers] = useState<DBUser[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<DBUser | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  
  const [setupAdminPass, setSetupAdminPass] = useState("");
  const [setupGroupPass, setSetupGroupPass] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newGroupPass, setNewGroupPass] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const [settings, dbUsers] = await Promise.all([getSettings(), getUsers()]);
    setIsInitialized(settings.initialized);
    setUsers(dbUsers);
    setAppState("SELECT_USER");
  }

  const handleUserClick = (user: DBUser) => {
    setSelectedUser(user);
    setError("");
    setPasswordInput("");

    if (user.role === "admin" && !isInitialized) {
      setAppState("SETUP");
    } else {
      setAppState("LOGIN");
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupAdminPass.length < 4 || setupGroupPass.length < 4) {
      setError("Passwords must be at least 4 characters.");
      return;
    }
    await setupApp(setupAdminPass, setupGroupPass);
    setIsInitialized(true);
    setAppState("ADMIN_PANEL");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedUser) return;

    if (selectedUser.role === "admin") {
      const isValid = await verifyAdmin(passwordInput);
      if (isValid) {
        setAppState("ADMIN_PANEL");
      } else {
        setError("Incorrect Admin Password.");
      }
    } else {
      const isValid = await verifyGroup(passwordInput);
      if (isValid) {
        enterChat();
      } else {
        setError("Incorrect Group Password.");
      }
    }
  };

  const enterChat = async () => {
    setAppState("CHAT");
    
    // Fetch initial messages
    const { data: initialMessages } = await supabase
      .from('messages')
      .select('*, users(username)')
      .order('created_at', { ascending: true })
      .limit(100);
      
    if (initialMessages) setMessages(initialMessages as any);

    // Setup realtime
    const channel = supabase.channel('group_chat', {
      config: { presence: { key: selectedUser!.username } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = Object.keys(state);
        setOnlineUsers(online);
        
        // Track typing from state (check all connections for a user)
        const typing = online.filter(user => {
          const userConnections = state[user] as any[];
          return userConnections.some(conn => conn.isTyping);
        });
        setTypingUsers(typing);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        // Fetch the user for the new message
        const { data: userData } = await supabase.from('users').select('username').eq('id', payload.new.user_id).single();
        const newMsg = { ...payload.new, users: { username: userData?.username || 'Unknown' } } as Message;
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe(async (status) => {
        console.log("Realtime status:", status);
        if (status === 'SUBSCRIBED') {
          await channel.track({ isTyping: false });
        }
      });

    channelRef.current = channel;
  };

  const handleTyping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (channelRef.current) {
      await channelRef.current.track({ isTyping: true });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        await channelRef.current.track({ isTyping: false });
      }, 2000);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUser) return;
    
    const text = messageInput.trim();
    setMessageInput("");
    if (channelRef.current) await channelRef.current.track({ isTyping: false });

    await supabase.from('messages').insert({
      user_id: selectedUser.id,
      text: text
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const { data, error: createErr } = await createUser(newUsername.trim());
    if (createErr) {
      alert(createErr);
    } else {
      setNewUsername("");
      setUsers(await getUsers());
    }
  };

  const handleDeleteUser = async (id: string) => {
    const { error: delErr } = await deleteUser(id);
    if (delErr) {
      alert(delErr);
    } else {
      setUsers(await getUsers());
    }
  };

  const handleUpdateGroupPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupPass.length < 4) return;
    await changeGroupPassword(newGroupPass);
    setNewGroupPass("");
    alert("Group password updated successfully!");
  };

  if (appState === "LOADING") {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
  }

  if (appState === "SELECT_USER") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
          <div className="bg-gray-900 px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Hams</h1>
            <p className="text-gray-400 text-sm">Select your profile to continue</p>
          </div>
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => handleUserClick(u)}
                className="w-full flex items-center p-4 hover:bg-gray-50 rounded-xl transition-colors text-left group border border-transparent hover:border-gray-200"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 shadow-sm ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                  {u.role === 'admin' ? <Settings size={20} /> : <User size={20} />}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{u.username}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{u.role}</div>
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
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">First Time Setup</h2>
            <p className="text-gray-500 text-sm mt-2">Secure your app before continuing.</p>
          </div>
          <form onSubmit={handleSetup} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Create Admin Password</label>
              <input 
                type="password" 
                value={setupAdminPass}
                onChange={(e) => setSetupAdminPass(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900"
                placeholder="Required for admin panel"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Create Group Chat Password</label>
              <input 
                type="password" 
                value={setupGroupPass}
                onChange={(e) => setSetupGroupPass(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900"
                placeholder="Share this with your users"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition-colors shadow-md">
              Complete Setup
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (appState === "LOGIN") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100">
          <button onClick={() => setAppState("SELECT_USER")} className="text-gray-400 hover:text-gray-600 mb-6 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <User size={36} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedUser?.username}</h2>
            <p className="text-gray-500 text-sm mt-1">{selectedUser?.role === 'admin' ? 'Enter admin password' : 'Enter group password'}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-lg text-gray-900 transition-all shadow-sm"
              placeholder="••••••••"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold hover:bg-gray-800 transition-colors shadow-md">
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (appState === "ADMIN_PANEL") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-500 text-sm">Manage users and settings</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAppState("SELECT_USER")} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Log out</button>
              <button onClick={enterChat} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md font-medium">
                <MessageSquare size={18} /> Enter Chat
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Users Management */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><User size={20}/> Manage Users</h2>
              
              <form onSubmit={handleCreateUser} className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="New username" 
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
                <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
                  <UserPlus size={18} /> Add
                </button>
              </form>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {users.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-medium text-gray-900">{u.username} <span className="text-xs text-gray-500 ml-2">{u.role}</span></span>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Lock size={20}/> Security</h2>
              <form onSubmit={handleUpdateGroupPass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Change Group Password</label>
                  <input 
                    type="password" 
                    value={newGroupPass}
                    onChange={(e) => setNewGroupPass(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="New Group Password"
                  />
                </div>
                <button type="submit" className="w-full bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors">
                  Update Group Password
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === "CHAT") {
    const isTypingActive = typingUsers.filter(u => u !== selectedUser?.username).length > 0;

    return (
      <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900">
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between border-b border-gray-200 z-10">
           <div className="flex items-center gap-4">
             <button onClick={() => {
               if (channelRef.current) supabase.removeChannel(channelRef.current);
               setAppState(selectedUser?.role === 'admin' ? "ADMIN_PANEL" : "SELECT_USER");
             }} className="text-gray-500 hover:text-gray-900 transition-colors">
               <ArrowLeft size={20} />
             </button>
             <div>
               <h1 className="text-xl font-bold text-gray-900">Hams Group Chat</h1>
               <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 {onlineUsers.length} online
               </div>
             </div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
           <div className="space-y-6 max-w-3xl mx-auto pb-4">
             {messages.map(msg => {
               const isMe = msg.user_id === selectedUser?.id;
               return (
                 <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="text-xs text-gray-500 mb-1 ml-1 font-medium">{isMe ? "You" : msg.users?.username}</div>
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] break-words shadow-sm ${isMe ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"}`}>
                      {msg.text}
                    </div>
                 </div>
               );
             })}
             {isTypingActive && (
               <div className="flex items-start opacity-70">
                 <div className="bg-gray-200 text-gray-600 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm italic">
                   {typingUsers.filter(u => u !== selectedUser?.username).join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
                 </div>
               </div>
             )}
             <div ref={messagesEndRef} />
           </div>
        </main>

        <footer className="bg-white border-t border-gray-200 p-4">
           <div className="max-w-3xl mx-auto">
             <form onSubmit={sendMessage} className="flex items-center gap-3">
               <input 
                 type="text" 
                 placeholder="Type your message..." 
                 className="flex-1 bg-gray-100 border border-transparent rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
                 value={messageInput}
                 onChange={handleTyping}
               />
               <button type="submit" disabled={!messageInput.trim()} className="bg-blue-600 disabled:bg-blue-300 text-white p-3 rounded-full hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0">
                 <Send size={20} />
               </button>
             </form>
           </div>
        </footer>
      </div>
    );
  }

  return null;
}
