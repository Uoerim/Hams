'use server'

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getSettings() {
  const { data } = await supabase.from('app_settings').select('initialized, emergency_link, primary_color').eq('id', 1).single();
  return {
    initialized: data?.initialized || false,
    emergency_link: data?.emergency_link || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    primary_color: data?.primary_color || 'indigo'
  };
}

export async function setupApp(adminPass: string, groupPass: string) {
  await supabase.from('app_settings').update({
    admin_password: adminPass,
    group_password: groupPass,
    initialized: true
  }).eq('id', 1);
  return { success: true };
}

export async function verifyAdmin(password: string, userId: string) {
  const { data } = await supabase.from('app_settings').select('admin_password').eq('id', 1).single();
  if (data?.admin_password === password) {
    await supabase.from('users').update({ last_login: new Date().toISOString(), last_seen_at: new Date().toISOString() }).eq('id', userId);
    return true;
  }
  return false;
}

export async function verifyGroup(password: string, userId: string) {
  const { data } = await supabase.from('app_settings').select('group_password').eq('id', 1).single();
  if (data?.group_password === password) {
    await supabase.from('users').update({ last_login: new Date().toISOString(), last_seen_at: new Date().toISOString() }).eq('id', userId);
    return true;
  }
  return false;
}

export async function markAsRead(userId: string) {
  await supabase.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
}

export async function editMessage(messageId: string, userId: string, newText: string) {
  await supabase.from('messages').update({ text: newText, is_edited: true }).eq('id', messageId).eq('user_id', userId);
  return { success: true };
}

export async function deleteMessageUser(messageId: string, userId: string) {
  await supabase.from('messages').update({ text: 'deleted message', is_deleted: true }).eq('id', messageId).eq('user_id', userId);
  return { success: true };
}

export async function changeGroupPassword(password: string) {
  await supabase.from('app_settings').update({ group_password: password }).eq('id', 1);
  return { success: true };
}

export async function changeAdminPassword(password: string) {
  await supabase.from('app_settings').update({ admin_password: password }).eq('id', 1);
  return { success: true };
}

export async function updateAppSettings(updates: { emergency_link?: string; primary_color?: string }) {
  await supabase.from('app_settings').update(updates).eq('id', 1);
  return { success: true };
}

export async function emptyChat() {
  await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
  return { success: true };
}

export async function getUsers() {
  const { data } = await supabase.from('users').select('*').order('created_at', { ascending: true });
  return data || [];
}

export async function createUser(username: string) {
  const { data, error } = await supabase.from('users').insert({ username, role: 'user' }).select().single();
  if (error) return { error: error.message };
  return { data };
}

export async function deleteUser(id: string) {
  const { data } = await supabase.from('users').select('role').eq('id', id).single();
  if (data?.role === 'admin') return { error: 'Cannot delete admin' };
  
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}
