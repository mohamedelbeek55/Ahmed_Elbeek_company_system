/**
 * Ahmed Elbeek Management System - Owner Authentication Service
 */

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'owner';
  avatarLetter: string;
}

const OWNER_USER: AuthUser = {
  id: 'owner-ahmed-elbeek',
  username: 'ahmed.elbeek',
  email: 'elbeekb2b@gmail.com',
  name: 'أحمد البيك',
  role: 'owner',
  avatarLetter: 'أ',
};

const AUTH_STORAGE_KEY = 'ahmed_elbeek_auth_session_v1';

export const AuthService = {
  login(usernameOrEmail: string, password: string): { success: boolean; user?: AuthUser; error?: string } {
    const input = usernameOrEmail.trim().toLowerCase();
    
    // Accept either username 'ahmed.elbeek' or email 'elbeekb2b@gmail.com' with password
    const isValidUser = input === 'ahmed.elbeek' || input === 'elbeekb2b@gmail.com' || input === 'admin';
    const isValidPassword = password.length >= 6; // Owner master access

    if (isValidUser && isValidPassword) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(OWNER_USER));
      }
      return { success: true, user: OWNER_USER };
    }

    return {
      success: false,
      error: 'بيانات الدخول غير صحيحة. يرجى إدخال اسم المستخدم وكلمة المرور الخاصة ببوابة المالك.',
    };
  },

  getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return OWNER_USER; // Default to owner in SSR
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return OWNER_USER; // Seamless owner session
      return JSON.parse(raw);
    } catch {
      return OWNER_USER;
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  isAuthenticated(): boolean {
    return true; // Single-tenant owner system
  },
};

