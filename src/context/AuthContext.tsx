import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getMe, postLogin, postLogout } from '../apis/auth';
import type { LoginRequest, User } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  isLogin: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (data: LoginRequest) => {
    const res = await postLogin(data);

    if (res.accessToken) {
      localStorage.setItem('accessToken', res.accessToken);
    }

    setUser(res.user);
  };

  const logout = async () => {
    try {
      await postLogout();
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await getMe();
        setUser(me);
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
