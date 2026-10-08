"use client";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { id: 1, sender: "Alice", text: "Hey! Welcome to the chat." },
    { id: 2, sender: "Bob", text: "Is this secure?" },
    { id: 3, sender: "Alice", text: "Yes, you need a password to send messages." }
  ]);
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "1234") {
      setIsLocked(false);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    const newMessage = {
      id: messages.length + 1,
      sender: "You",
      text: messageInput
    };
    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  return (
      <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between border-b border-gray-200">
           <h1 className="text-xl font-bold text-gray-800">Hams</h1>
           <div className="flex items-center text-sm font-medium">
             {isLocked ? (
               <span className="flex items-center text-gray-500"><LockIcon className="w-4 h-4 mr-1"/> Read Only</span>
             ) : (
               <span className="flex items-center text-green-600"><UnlockIcon className="w-4 h-4 mr-1"/> Unlocked</span>
             )}
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 relative">
           <div className={`space-y-6 max-w-2xl mx-auto transition-all duration-500 ${isLocked ? 'blur-md select-none opacity-60 pointer-events-none' : ''}`}>
             {messages.map(msg => (
               <div key={msg.id} className={`flex flex-col ${msg.sender === "You" ? "items-end" : "items-start"}`}>
                  <div className="text-xs text-gray-500 mb-1 ml-1">{msg.sender}</div>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] ${msg.sender === "You" ? "bg-blue-600 text-white rounded-tr-sm shadow-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"}`}>
                    {msg.text}
                  </div>
               </div>
             ))}
           </div>
        </main>

        <footer className="bg-white border-t border-gray-200 p-4">
           <div className="max-w-2xl mx-auto">
             {isLocked ? (
               <form onSubmit={handleUnlock} className="flex flex-col sm:flex-row items-center gap-3">
                 <div className="flex-1 w-full flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                   <LockIcon className="w-5 h-5 text-gray-400 mr-2" />
                   <input 
                     type="password" 
                     placeholder="Enter password to unlock chat (Hint: 1234)" 
                     className="bg-transparent w-full outline-none text-gray-700"
                     value={passwordInput}
                     onChange={(e) => setPasswordInput(e.target.value)}
                   />
                 </div>
                 <button type="submit" className="bg-gray-800 text-white px-8 py-3 rounded-xl hover:bg-gray-900 w-full sm:w-auto font-medium transition-colors shadow-sm">
                   Unlock
                 </button>
               </form>
             ) : (
               <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                 <input 
                   type="text" 
                   placeholder="Type your message..." 
                   className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700"
                   value={messageInput}
                   onChange={(e) => setMessageInput(e.target.value)}
                 />
                 <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-sm">
                   Send
                 </button>
               </form>
             )}
             {error && <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>}
           </div>
        </footer>
      </div>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function UnlockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );
}
