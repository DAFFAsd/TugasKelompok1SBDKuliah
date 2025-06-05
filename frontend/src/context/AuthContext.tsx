import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || '/api';

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'aslab' | 'praktikan' | 'guest';
  created_at?: string;
  profile_image?: string | null;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role: 'aslab' | 'praktikan') => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
  error: string | null;
  clearError: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if user is in guest mode (not authenticated)
  const isGuest = !user;

  // Set up axios interceptor for authentication
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Check if user is authenticated on load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/users/me`);
          setUser(response.data);
        } catch (err) {
          console.error('Authentication error:', err);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/users/login`, { email, password }, {
        withCredentials: true
      });

      const { user, token } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);

      // Update token state which will trigger the axios interceptor
      setToken(token);

      // Set user data
      setUser(user);

      // Return a promise that resolves when the token is set
      return new Promise<void>((resolve) => {
        // Small delay to ensure the token is properly set in axios interceptors
        setTimeout(resolve, 50);
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function - only for praktikan and aslab roles
  const register = async (username: string, email: string, password: string, role: 'aslab' | 'praktikan') => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/users/register`, {
        username,
        email,
        password,
        role
      }, {
        withCredentials: true
      });

      const { user, token } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);

      // Update token state which will trigger the axios interceptor
      setToken(token);

      // Set user data
      setUser(user);

      // Return a promise that resolves when the token is set
      return new Promise<void>((resolve) => {
        // Small delay to ensure the token is properly set in axios interceptors
        setTimeout(resolve, 50);
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);

      if (token) {
        await axios.post(`${API_URL}/users/logout`, {}, {
          withCredentials: true
        });
      }

      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Update user data
  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isGuest,
        login,
        register,
        logout,
        updateUser,
        error,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
