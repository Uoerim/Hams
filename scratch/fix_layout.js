const fs = require('fs');

let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Replace the Header block
const headerStartIdx = code.indexOf('<header className={`${cHeader}');
const headerEndIdx = code.indexOf('</header>') + '</header>'.length;
if (headerStartIdx === -1 || headerEndIdx === -1) throw new Error('Header not found');

const newHeader = `<header className={\`\${cHeader} backdrop-blur-xl shadow-sm px-4 sm:px-6 py-4 flex items-center justify-between border-b z-20 sticky top-0\`}>
           <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
             <button onClick={() => {
               if (channelRef.current) supabase.removeChannel(channelRef.current);
               setAppState(isAdmin ? "ADMIN_PANEL" : "SELECT_USER");
             }} className={\`w-10 h-10 flex items-center justify-center rounded-full shrink-0 \${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors\`}>
               <ArrowLeft size={20} />
             </button>
             <div className="min-w-0">
               <h1 className={\`text-3xl font-changa \${cText} tracking-wide truncate leading-none pt-1\`}>همس</h1>
               <div className="text-[10px] sm:text-xs font-bold text-gray-500 flex items-center gap-1.5 mt-0.5">
                 <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse shrink-0"></div>
                 <span className="truncate">{onlineUsers.length} online {onlineUsers.length > 0 && <span className="opacity-70 font-normal">({onlineUsers.join(', ')})</span>}</span>
               </div>
             </div>
           </div>

           {/* Theme Button Top Right */}
           <div className="relative shrink-0 ml-2">
             <button onClick={() => setShowColorPicker(!showColorPicker)} className={\`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full \${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600'} hover:\${theme.bg} hover:text-white transition-all shadow-sm\`} title="Customize">
               <Palette size={18} />
             </button>
             {showColorPicker && (
               <div className={\`absolute top-14 right-0 \${cCard} p-4 rounded-3xl shadow-xl border flex flex-col gap-4 animate-in fade-in zoom-in duration-200 min-w-[200px] z-50\`}>
                  <div>
                    <div className={\`text-xs font-bold \${cTextMuted} mb-2 uppercase tracking-wide\`}>Theme</div>
                    <div className="flex gap-2">
                      {Object.keys(THEMES).map(color => (
                        <button key={color} onClick={() => handleChangeTheme(color)} className={\`w-8 h-8 rounded-full \${THEMES[color].bg} \${settings.primary_color === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110'} transition-all shadow-sm\`}></button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center justify-between">
                    <span className={\`text-sm font-bold \${cText}\`}>Dark Mode</span>
                    <button onClick={handleToggleDarkMode} className={\`w-12 h-6 rounded-full relative transition-colors \${isDark ? theme.bg : 'bg-gray-300'}\`}>
                      <div className={\`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform \${isDark ? 'translate-x-6' : 'translate-x-0'} flex items-center justify-center\`}>
                         {isDark ? <Moon size={10} className="text-gray-900"/> : <Sun size={10} className="text-yellow-500"/>}
                      </div>
                    </button>
                  </div>
               </div>
             )}
           </div>
        </header>`;

code = code.substring(0, headerStartIdx) + newHeader + code.substring(headerEndIdx);


// 2. Replace the Footer block
const footerStartIdx = code.indexOf('<footer className={`${cHeader}');
const footerEndIdx = code.indexOf('</footer>') + '</footer>'.length;
if (footerStartIdx === -1 || footerEndIdx === -1) throw new Error('Footer not found');

const newFooter = `<footer className={\`\${cHeader} backdrop-blur-xl border-t p-3 sm:p-4 sticky bottom-0 z-20 shrink-0\`}>
           <div className="max-w-4xl mx-auto w-full relative">
             
             {/* Floating Emergency Button above text box */}
             <div className="absolute -top-16 right-0">
               <button onClick={triggerEmergency} className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-red-500 border-2 border-red-500/20 hover:bg-red-500 hover:text-white hover:border-transparent transition-all shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transform hover:scale-105" title="Emergency Logout">
                 <AlertTriangle size={20} />
               </button>
             </div>

             <form onSubmit={sendMessage} className={\`w-full flex items-center gap-1 sm:gap-2 \${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} p-1.5 rounded-[2rem] border-2 \${editingMsgId ? 'border-yellow-500 bg-yellow-500/10' : ''} focus-within:\${theme.ring} focus-within:ring-2 focus-within:border-transparent transition-all\`}>
               <input 
                 type="text" 
                 placeholder={editingMsgId ? "Edit your message..." : "Type your message..."}
                 className={\`flex-1 min-w-0 bg-transparent px-3 sm:px-5 py-2 sm:py-3 outline-none \${cText} font-medium text-sm sm:text-base\`}
                 value={messageInput}
                 onChange={handleTyping}
               />
               {editingMsgId && (
                 <button type="button" onClick={() => { setEditingMsgId(null); setMessageInput(""); }} className={\`\${cTextMuted} hover:\${cText} px-2 font-bold text-sm shrink-0\`}>Cancel</button>
               )}
               <button type="submit" disabled={!messageInput.trim()} className={\`\${editingMsgId ? 'bg-yellow-500 hover:bg-yellow-600' : theme.bg + ' ' + theme.hover} disabled:opacity-50 disabled:scale-100 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all shadow-md transform hover:scale-105 flex items-center justify-center flex-shrink-0 mr-0.5\`}>
                 <Send size={18} />
               </button>
             </form>
           </div>
        </footer>`;

code = code.substring(0, footerStartIdx) + newFooter + code.substring(footerEndIdx);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Mobile layout tweaks applied successfully.');
