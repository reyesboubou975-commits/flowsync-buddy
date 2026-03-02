/**
 * FlowSync iframe ↔ Supabase bridge
 * 
 * Injects a `FlowSync` global into the iframe that communicates
 * with the parent via postMessage. The parent handles all Supabase operations.
 */

import { supabase } from "@/integrations/supabase/client";

// Script injected into iframes to provide FlowSync API
export function getIframeBridgeScript(): string {
  return `
(function() {
  if (window.FlowSync) return;
  
  let _reqId = 0;
  const _pending = {};
  
  window.addEventListener('message', function(e) {
    if (e.data && e.data._flowsync_response) {
      const { id, result, error } = e.data;
      const p = _pending[id];
      if (p) {
        delete _pending[id];
        if (error) p.reject(new Error(error));
        else p.resolve(result);
      }
    }
  });
  
  function call(action, payload) {
    return new Promise(function(resolve, reject) {
      const id = ++_reqId;
      _pending[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({ _flowsync_request: true, id: id, action: action, payload: payload }, '*');
    });
  }
  
  window.FlowSync = {
    auth: {
      signUp: function(data) { return call('auth.signUp', data); },
      signIn: function(data) { return call('auth.signIn', data); },
      signOut: function() { return call('auth.signOut', {}); },
      getUser: function() { return call('auth.getUser', {}); },
      getSession: function() { return call('auth.getSession', {}); },
    },
    projects: {
      list: function() { return call('projects.list', {}); },
      create: function(data) { return call('projects.create', data); },
      update: function(id, data) { return call('projects.update', { id: id, data: data }); },
      delete: function(id) { return call('projects.delete', { id: id }); },
    },
    tasks: {
      list: function(projectId) { return call('tasks.list', { projectId: projectId }); },
      create: function(data) { return call('tasks.create', data); },
      update: function(id, data) { return call('tasks.update', { id: id, data: data }); },
      delete: function(id) { return call('tasks.delete', { id: id }); },
    },
    navigate: function(page) { return call('navigate', { page: page }); },
  };
  
  // Notify parent that bridge is ready
  window.parent.postMessage({ _flowsync_ready: true }, '*');
})();
`;
}

// Handler for messages from iframes
export async function handleIframeMessage(
  event: MessageEvent,
  onNavigate?: (page: string) => void
): Promise<void> {
  if (!event.data || !event.data._flowsync_request) return;
  
  const { id, action, payload } = event.data;
  let result: unknown = null;
  let error: string | null = null;
  
  try {
    switch (action) {
      // ---- AUTH ----
      case 'auth.signUp': {
        const { data, error: err } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: {
            data: { full_name: payload.fullName || payload.full_name || '' }
          }
        });
        if (err) throw err;
        result = { user: data.user, session: data.session };
        break;
      }
      case 'auth.signIn': {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: payload.email,
          password: payload.password,
        });
        if (err) throw err;
        result = { user: data.user, session: data.session };
        break;
      }
      case 'auth.signOut': {
        const { error: err } = await supabase.auth.signOut();
        if (err) throw err;
        result = { success: true };
        break;
      }
      case 'auth.getUser': {
        const { data } = await supabase.auth.getUser();
        result = { user: data.user };
        break;
      }
      case 'auth.getSession': {
        const { data } = await supabase.auth.getSession();
        result = { session: data.session };
        break;
      }
      
      // ---- PROJECTS ----
      case 'projects.list': {
        const { data, error: err } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (err) throw err;
        result = data;
        break;
      }
      case 'projects.create': {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error: err } = await supabase
          .from('projects')
          .insert({ name: payload.name, description: payload.description, color: payload.color, owner_id: user.id })
          .select()
          .single();
        if (err) throw err;
        result = data;
        break;
      }
      case 'projects.update': {
        const { data, error: err } = await supabase
          .from('projects')
          .update(payload.data)
          .eq('id', payload.id)
          .select()
          .single();
        if (err) throw err;
        result = data;
        break;
      }
      case 'projects.delete': {
        const { error: err } = await supabase
          .from('projects')
          .delete()
          .eq('id', payload.id);
        if (err) throw err;
        result = { success: true };
        break;
      }
      
      // ---- TASKS ----
      case 'tasks.list': {
        let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (payload.projectId) query = query.eq('project_id', payload.projectId);
        const { data, error: err } = await query;
        if (err) throw err;
        result = data;
        break;
      }
      case 'tasks.create': {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error: err } = await supabase
          .from('tasks')
          .insert({
            title: payload.title,
            description: payload.description,
            status: payload.status || 'todo',
            priority: payload.priority || 'medium',
            project_id: payload.project_id || payload.projectId,
            due_date: payload.due_date || payload.dueDate || null,
            owner_id: user.id,
          })
          .select()
          .single();
        if (err) throw err;
        result = data;
        break;
      }
      case 'tasks.update': {
        const { data, error: err } = await supabase
          .from('tasks')
          .update(payload.data)
          .eq('id', payload.id)
          .select()
          .single();
        if (err) throw err;
        result = data;
        break;
      }
      case 'tasks.delete': {
        const { error: err } = await supabase
          .from('tasks')
          .delete()
          .eq('id', payload.id);
        if (err) throw err;
        result = { success: true };
        break;
      }
      
      // ---- NAVIGATION ----
      case 'navigate': {
        if (onNavigate) onNavigate(payload.page);
        result = { success: true };
        break;
      }
      
      default:
        error = `Unknown action: ${action}`;
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }
  
  // Send response back to iframe
  const source = event.source as Window;
  if (source) {
    source.postMessage({ _flowsync_response: true, id, result, error }, '*');
  }
}

// Set up realtime subscription for tasks and push changes to iframe
export function setupTasksRealtime(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const channel = supabase
    .channel('tasks-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          _flowsync_realtime: true,
          event: payload.eventType,
          record: payload.new,
          old_record: payload.old,
          table: 'tasks',
        }, '*');
      }
    })
    .subscribe();
  
  return () => { supabase.removeChannel(channel); };
}
