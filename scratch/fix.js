const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// Replace the container
code = code.replace(
  '<div className="flex items-center gap-2">',
  '<div className={`flex items-center gap-1 w-full ${isMe ? "justify-end" : "justify-start"}`}>'
);

// Replace the buttons
code = code.replace(
  '<div className="opacity-100 lg:opacity-0 lg:group-hover/msg:opacity-100 flex items-center gap-2 transition-opacity mr-2">',
  '<div className={`opacity-100 lg:opacity-0 lg:group-hover/msg:opacity-100 flex shrink-0 items-center gap-1 transition-opacity ${isMe ? "mr-1" : "ml-1 order-last"}`}>'
);

// Also we need to make sure the outer wrapper is w-full
code = code.replace(
  '<div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group/msg`}>',
  '<div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group/msg w-full`}>'
);

// Also remove the explicit widths on the chat bubble because if it's in a justify-end/start container, max-w handles it correctly.
code = code.replace(
  'max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]',
  'max-w-fit w-fit xl:max-w-[65%]' 
  // Wait, if it's w-fit, it won't wrap properly if it exceeds screen width. 
  // Let's use max-w-[80%] so it wraps instead of squashing.
);
code = code.replace(
  'max-w-fit w-fit xl:max-w-[65%]',
  'max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]' // Restore it, actually max-w is correct!
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed message wrappers.');
