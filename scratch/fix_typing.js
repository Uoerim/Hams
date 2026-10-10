const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Remove typing bubble from main
const typingBubbleStart = '{activeTypers.length > 0 && (';
const typingBubbleEnd = 'typing\\n                 </div>\\n               </div>\\n             )}';

const startIndex = code.indexOf(typingBubbleStart);
if (startIndex !== -1) {
  const endIndex = code.indexOf(typingBubbleEnd, startIndex) + typingBubbleEnd.length;
  code = code.substring(0, startIndex) + code.substring(endIndex);
} else {
  console.log("Could not find typing bubble to remove, maybe already removed?");
}

// 2. Add typing text to footer
const footerStartIdx = code.indexOf('<footer className={`${cHeader} backdrop-blur-xl border-t p-3 sm:p-4 sticky bottom-0 z-20 shrink-0`}>');
const footerEndIdx = code.indexOf('</footer>') + '</footer>'.length;

if (footerStartIdx !== -1) {
const newFooter = `<footer className={\`\${cHeader} backdrop-blur-xl border-t p-2 sm:p-3 sticky bottom-0 z-20 shrink-0\`}>
           <div className="max-w-4xl mx-auto w-full relative flex flex-col gap-0.5">
             
             {/* Typing Indicator Container (fixed height to prevent jump) */}
             <div className="h-4 px-4 sm:pl-[64px] flex items-center transition-all opacity-80">
               {activeTypers.length > 0 && (
                 <div className={\`\${isDark ? 'text-gray-400' : 'text-gray-500'} text-[11px] font-bold italic flex items-center gap-1.5 animate-pulse\`}>
                   <div className="flex gap-0.5">
                     <span className={\`w-1 h-1 \${isDark ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce\`} style={{animationDelay: '0ms'}}></span>
                     <span className={\`w-1 h-1 \${isDark ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce\`} style={{animationDelay: '150ms'}}></span>
                     <span className={\`w-1 h-1 \${isDark ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce\`} style={{animationDelay: '300ms'}}></span>
                   </div>
                   {activeTypers.join(", ")} {activeTypers.length > 1 ? "are" : "is"} typing...
                 </div>
               )}
             </div>

             <div className="w-full flex items-center gap-2 relative">
               {/* Floating on mobile, inline left on laptop */}
               <button onClick={triggerEmergency} className="absolute -top-14 right-0 sm:static sm:top-auto sm:right-auto w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-red-500 border-2 border-red-500/20 hover:bg-red-500 hover:text-white hover:border-transparent transition-all shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] sm:shadow-md backdrop-blur-md transform hover:scale-105 shrink-0" title="Emergency Logout">
                 <AlertTriangle size={20} />
               </button>

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
           </div>
        </footer>`;

code = code.substring(0, footerStartIdx) + newFooter + code.substring(footerEndIdx);
} else {
  console.log("Footer not found");
}

fs.writeFileSync('src/app/page.tsx', code);
console.log("Done");
