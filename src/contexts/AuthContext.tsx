import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { getCurrentUser, setCurrentUser, authenticateUser, hasAnyUser } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canEdit: boolean;
  canManage: boolean;
  needsSetup: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    async function init() {
      // Check if there are any users
      const hasUsers = await hasAnyUser();
      if (!hasUsers) {
        setNeedsSetup(true);
        setIsLoading(false);
        return;
      }

      const savedUser = await getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const authenticatedUser = await authenticateUser(username, password);
    if (authenticatedUser) {
      setUser(authenticatedUser);
      await setCurrentUser(authenticatedUser);
      return true;
    }
    return false;
  };

  const logout = async () => {
    setUser(null);
    await setCurrentUser(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const canEdit = user?.role === 'admin' || user?.role === 'operador';
  const canManage = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
        hasRole,
        canEdit,
        canManage,
        needsSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
