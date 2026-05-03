import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/api";
import { getToken, login as apiLogin, register as apiRegister, setToken } from "@/api";

type AuthState = {
  user: User | null;
  token: string | null;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    displayName: string;
    artistIds: number[];
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTok] = useState<string | null>(() => getToken());
  const [ready] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setTok(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiLogin(email, password);
    setToken(r.token);
    setTok(r.token);
    setUser(r.user);
  }, []);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      displayName: string;
      artistIds: number[];
    }) => {
      const r = await apiRegister(payload);
      setToken(r.token);
      setTok(r.token);
      setUser(r.user);
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      login,
      register,
      logout,
    }),
    [user, token, ready, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
