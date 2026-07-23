import { createContext } from 'react';
import type { LoginRequest, User } from '../types/auth';

export interface AuthContextValue {
  user: User | null;
  isLogin: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
