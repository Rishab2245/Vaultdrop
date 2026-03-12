'use client';

import { create } from 'zustand';
import { AnonSession } from '@/types';
import { fetchGraphQL } from '@/lib/api';
import { CREATE_SESSION } from '@/lib/mutations';

interface SessionState {
  session: AnonSession | null;
  isLoading: boolean;
  error: string | null;
  initSession: () => Promise<void>;
  clearSession: () => void;
}

const SESSION_KEY = 'vaultdrop_session';

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  isLoading: false,
  error: null,

  initSession: async () => {
    if (get().session) return;
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Try to load from localStorage first
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as AnonSession;
            if (parsed.id && parsed.codename) {
              set({ session: parsed, isLoading: false });
              return;
            }
          } catch {
            localStorage.removeItem(SESSION_KEY);
          }
        }
      }

      // Create new session from backend
      const data = await fetchGraphQL<{ createSession: AnonSession }>(CREATE_SESSION);
      const session = data.createSession;

      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }

      set({ session, isLoading: false });
    } catch (error) {
      console.error('Failed to create session:', error);
      // Create a local-only session as fallback
      const fallbackSession: AnonSession = {
        id: `local-${Date.now()}`,
        codename: generateFallbackCodename(),
        credibilityScore: 0,
        earnings: 0,
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(fallbackSession));
      }

      set({ session: fallbackSession, isLoading: false });
    }
  },

  clearSession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    set({ session: null });
  },
}));

function generateFallbackCodename(): string {
  const adjectives = ['GHOST', 'SHADOW', 'PHANTOM', 'NEON', 'CYBER'];
  const nouns = ['WOLF', 'HAWK', 'VIPER', 'SHARK', 'EAGLE'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${adj}-${noun}-${num}-${suffix}`;
}

export function useSession() {
  const { session, isLoading, error, initSession } = useSessionStore();
  return { session, isLoading, error, initSession };
}
