import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hemolink_token') || null);
  const [loading, setLoading] = useState(true);

  // Set production backend URL if configured
  if (import.meta.env.VITE_API_URL) {
    axios.defaults.baseURL = import.meta.env.VITE_API_URL;
  }

  // Set default axios header
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to load user session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    if (res.data.success) {
      const jwtToken = res.data.token;
      localStorage.setItem('hemolink_token', jwtToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
      setToken(jwtToken);
      setUser(res.data.user);

      // Authenticate with Firebase Auth Client SDK so user appears in Firebase Console
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (fbErr) {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr) {
          console.warn('Firebase Auth sync notice:', createErr.message);
        }
      }

      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (formData) => {
    const res = await axios.post('/api/auth/register', formData);
    if (res.data.success) {
      const jwtToken = res.data.token;
      localStorage.setItem('hemolink_token', jwtToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
      setToken(jwtToken);
      setUser(res.data.user);

      // Create user record in Firebase Auth Console
      try {
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      } catch (fbErr) {
        try {
          await signInWithEmailAndPassword(auth, formData.email, formData.password);
        } catch (signErr) {
          console.warn('Firebase Auth login notice:', signErr.message);
        }
      }

      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('hemolink_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateAvailability = async (availability) => {
    const res = await axios.put('/api/auth/availability', { availability });
    if (res.data.success && user) {
      setUser(prev => ({
        ...prev,
        availability: res.data.availability,
        profile: { ...(prev.profile || {}), availability: res.data.availability }
      }));
    }
    return res.data;
  };

  const switchRole = async () => {
    const res = await axios.post('/api/auth/switch-role');
    if (res.data.success) {
      const jwtToken = res.data.token;
      localStorage.setItem('hemolink_token', jwtToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
      setToken(jwtToken);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data.message || 'Failed to switch role');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateAvailability, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
