import { supabase } from "@/integrations/supabase/client";

export const VIDEO_SAVE_INTERVAL_MS = 10_000;
export const VIDEO_GATE_PERCENT = 95; // Preserve the existing gate, including its rounding.
export const SEEK_TOLERANCE = 1.5;

export function playbackTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function resumePosition(position: number, watched: number, duration: number) {
  return Math.max(0, Math.min(position, watched, duration || watched));
}

export function firstUnanswered(questions: { id: string }[], answers: Record<string, string>) {
  return questions.find(q => !answers[q.id])?.id ?? null;
}

// Keep the authenticated request alive during navigation. Credentials stay in
// memory; progress and drafts are always read back from the server.
export function createResumeTransport() {
  let token: string | undefined;
  const initial = supabase.auth.getSession().then(({ data }) => { token = data.session?.access_token; });
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { token = session?.access_token; });
  return {
    dispose: () => listener.subscription.unsubscribe(),
    async rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
      if (!token) await initial;
      if (!token) throw new Error("Please sign in again to save your training.");
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Your latest progress hasn't saved yet. Please reconnect and try again.");
      return response.json();
    },
  };
}

// Serial, per-answer server saves prevent older requests replacing newer picks.
// Failed picks remain pending in memory and are retried while the page is open.
export class QuizAnswerQueue {
  private dirty = new Map<string, string>();
  private running: Promise<void> | null = null;
  constructor(private save: (id: string, answer: string) => Promise<unknown>) {}
  get pending() { return this.dirty.size; }
  pick(id: string, answer: string) { this.dirty.set(id, answer); return this.flush(); }
  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = (async () => {
      while (this.dirty.size) {
        const next = this.dirty.entries().next().value;
        if (!next) return;
        const [id, answer] = next;
        await this.save(id, answer);
        if (this.dirty.get(id) === answer) this.dirty.delete(id);
      }
    })().finally(() => { this.running = null; });
    return this.running;
  }
}