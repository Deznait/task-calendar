import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from 'src/boot/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from 'src/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const profile = ref<Profile | null>(null);
  const loading = ref(false);
  const initialized = ref(false);

  const isAuthenticated = computed(() => !!user.value);

  async function init() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user.value = session?.user ?? null;
    if (user.value) await fetchProfile();
    initialized.value = true;

    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null;
      if (user.value) await fetchProfile();
      else profile.value = null;
    });
  }

  async function fetchProfile() {
    if (!user.value) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single();
    profile.value = data;
  }

  async function signInWithGoogle() {
    loading.value = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) console.error(error);
    loading.value = false;
  }

  async function signInWithEmail(email: string, password: string) {
    loading.value = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    loading.value = false;
  }

  async function signUp(email: string, password: string) {
    loading.value = true;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    loading.value = false;
  }

  async function signOut() {
    await supabase.auth.signOut();
    user.value = null;
    profile.value = null;
  }

  return {
    user,
    profile,
    loading,
    initialized,
    isAuthenticated,
    init,
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
  };
});
