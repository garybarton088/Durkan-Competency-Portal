// Turns raw database / network errors into plain messages for staff (OWASP A10).
// The full error still goes to the browser console for troubleshooting.
export function friendlyError(e) {
  if (!e) return null;
  const msg = e.message || String(e);
  const code = e.code;

  if (e.__isAuthError) return msg;               // Supabase sign-in messages are already written for users
  if (code === 'P0001') return msg;              // our own messages from database rules
  if (/only durkan email/i.test(msg)) return msg;

  console.error(e);
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
  if (code === '23505') return 'That entry already exists.';
  if (code === '23503') return "That can't be removed because other records use it.";
  if (code === '23514' || code === '22P02') return 'One of the values entered is not valid. Please check and try again.';
  if (/jwt|session/i.test(msg)) return 'Your session has expired. Please sign in again.';
  if (/fetch|network|timeout/i.test(msg)) return "Couldn't reach the server. Check your connection and try again.";
  return 'Something went wrong. Please try again, or contact the portal administrator.';
}
