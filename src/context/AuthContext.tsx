import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMe, postLogin } from '../apis/auth';
import { AuthContext } from './authContextValue';
import { realtimeClient } from '../realtime';
import type { LoginRequest, User } from '../types/auth';
import { clearStoredAuth, saveStoredUserId } from '../utils/authStorage';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (data: LoginRequest) => {
    const res = await postLogin(data);

    setUser({
      id: res.user_id,
      email: res.email,
    });
    saveStoredUserId(res.user_id);
  };

  const logout = async () => {
    clearStoredAuth();
    realtimeClient.disconnect();
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await getMe();
        setUser(me);
        saveStoredUserId(me.id);
      } catch (error) {
        console.error('유저 정보 조회 실패:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLogin: !!user,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
