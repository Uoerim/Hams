require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const channel = supabase.channel('group_chat', {
  config: { presence: { key: 'test_user' } }
});

channel
  .on('presence', { event: 'sync' }, () => {
    console.log('Presence sync:', channel.presenceState());
  })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
    console.log('New message received via WS:', payload.new.text);
  })
  .subscribe(async (status, err) => {
    console.log('Subscription status:', status);
    if (err) console.error(err);
    if (status === 'SUBSCRIBED') {
      await channel.track({ isTyping: true });
      
      const res = await supabase.from('messages').insert({ user_id: '054c96ad-98a8-4dae-8015-4bfe8f8f24c2', text: 'hello' });
      console.log('Insert result:', res.error ? res.error : 'success');
    }
  });

setTimeout(() => {
  console.log('Test finished');
  process.exit(0);
}, 5000);
