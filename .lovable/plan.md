

## Fix: Scope Realtime Subscription for Messages

### Assessment

The `messages` table already has RLS enabled with `auth.uid() = user_id` on SELECT. Supabase Realtime's `postgres_changes` respects table-level RLS — users only receive events for rows they can SELECT. So there is no actual data leak.

However, two improvements will harden this:

1. **Add a filter to the Realtime subscription** — currently it subscribes to all INSERT events on the `messages` table with no filter. Adding a `filter` parameter scoped to the user's conversations reduces unnecessary server-side processing.

2. **Mark the finding as fixed** with an explanation that RLS already protects the channel, plus the added subscription filter.

### Changes

**`src/hooks/useMessages.ts`**
- In the Realtime subscription `useEffect`, add a `filter` on `conversation_id=eq.{conversationId}` when a conversation is selected, so the channel only receives events for the active conversation.
- When no conversation is selected, subscribe with a broader channel but RLS still protects access (only the user's own messages pass the SELECT policy).

### Files changed

| File | Change |
|------|--------|
| `src/hooks/useMessages.ts` | Add `filter` to Realtime subscription to scope events to the active conversation |
| Security finding | Mark `messages_realtime_no_channel_authorization` as fixed |

### Why this is safe

Supabase Realtime `postgres_changes` evaluates the table's RLS policies against the subscriber's JWT. The `messages` table SELECT policy is `auth.uid() = user_id`, so a user can never receive another user's message events regardless of the channel topic they subscribe to. The added filter is a defense-in-depth measure.

