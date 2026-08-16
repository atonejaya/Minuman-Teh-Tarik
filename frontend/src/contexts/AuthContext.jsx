import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext();

const translateAuthError = (message) => {
  const msg = message || '';
  if (/invalid login credentials|invalid credentials/i.test(msg)) return 'Username atau password salah';
  if (/not authenticated/i.test(msg)) return 'Tidak terautentikasi';
  if (/email not confirmed/i.test(msg)) return 'Email belum dikonfirmasi';
  if (/too many requests/i.test(msg)) return 'Terlalu banyak percobaan. Silakan coba lagi nanti.';
  return msg;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id).catch((err) => console.error(err.message));
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('getSession failed', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id).catch((err) => console.error(err.message));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authId) => {
    const { data, error } = await supabase.from('User').select('*').eq('auth_id', authId).single();
    if (error || !data) {
      setLoading(false);
      throw new Error('Profil pengguna tidak ditemukan di database.');
    }
    setUser(data);
    setLoading(false);
  };

  const login = async (username, password) => {
    const email = username.includes('@') ? username : `${username.trim()}@tehtarik.local`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      error.message = translateAuthError(error.message);
      throw error;
    }

    if (data?.session) {
      await fetchProfile(data.session.user.id);
    }
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
