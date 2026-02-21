import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api, { setAccessToken, setRefreshToken, clearTokens, getApiError } from './api';

// Types
export interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: 'owner' | 'admin' | 'staff' | 'readonly';
    phone: string | null;
    avatarUrl: string | null;
    twoFactorEnabled: boolean;
    emailVerified: boolean;
}

export interface Vendor {
    id: string;
    name: string;
    businessType: string | null;
    contactEmail: string;
    phone: string | null;
    address: Record<string, string>;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    verified: boolean;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
    tier: 'BRONZE' | 'SILVER' | 'GOLD';
    apiEnabled: boolean;
    serviceAreas: string[];
    settings: Record<string, unknown>;
}

interface AuthState {
    user: User | null;
    vendor: Vendor | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    requiresTwoFactor: boolean;
    pendingEmail: string | null;
    pendingPassword: string | null;

    // Actions
    login: (email: string, password: string) => Promise<boolean>;
    verify2FA: (code: string) => Promise<boolean>;
    register: (data: RegisterData) => Promise<boolean>;
    logout: () => Promise<void>;
    fetchProfile: () => Promise<void>;
    updateProfile: (data: Partial<Vendor>) => Promise<void>;
    clearError: () => void;
}

interface RegisterData {
    vendorName: string;
    businessType?: string;
    contactEmail: string;
    phone?: string;
    website?: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            vendor: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            requiresTwoFactor: false,
            pendingEmail: null,
            pendingPassword: null,

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/login', { email, password });

                    if (response.data.requiresTwoFactor) {
                        set({
                            requiresTwoFactor: true,
                            pendingEmail: email,
                            pendingPassword: password,
                            isLoading: false,
                        });
                        return false;
                    }

                    const { user, vendor, accessToken, refreshToken } = response.data;
                    setAccessToken(accessToken);
                    setRefreshToken(refreshToken);

                    set({
                        user,
                        vendor,
                        isAuthenticated: true,
                        isLoading: false,
                        requiresTwoFactor: false,
                        pendingEmail: null,
                        pendingPassword: null,
                    });

                    return true;
                } catch (error) {
                    set({
                        error: getApiError(error),
                        isLoading: false,
                    });
                    return false;
                }
            },

            verify2FA: async (code: string) => {
                const { pendingEmail, pendingPassword } = get();
                if (!pendingEmail || !pendingPassword) {
                    set({ error: 'No pending login' });
                    return false;
                }

                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/login', {
                        email: pendingEmail,
                        password: pendingPassword,
                        twoFactorCode: code,
                    });

                    const { user, vendor, accessToken, refreshToken } = response.data;
                    setAccessToken(accessToken);
                    setRefreshToken(refreshToken);

                    set({
                        user,
                        vendor,
                        isAuthenticated: true,
                        isLoading: false,
                        requiresTwoFactor: false,
                        pendingEmail: null,
                        pendingPassword: null,
                    });

                    return true;
                } catch (error) {
                    set({
                        error: getApiError(error),
                        isLoading: false,
                    });
                    return false;
                }
            },

            register: async (data: RegisterData) => {
                set({ isLoading: true, error: null });
                try {
                    await api.post('/auth/register', data);
                    set({ isLoading: false });
                    return true;
                } catch (error) {
                    set({
                        error: getApiError(error),
                        isLoading: false,
                    });
                    return false;
                }
            },

            logout: async () => {
                try {
                    await api.post('/auth/logout');
                } catch (error) {
                    // Ignore logout errors
                } finally {
                    clearTokens();
                    set({
                        user: null,
                        vendor: null,
                        isAuthenticated: false,
                        requiresTwoFactor: false,
                        pendingEmail: null,
                        pendingPassword: null,
                    });
                }
            },

            fetchProfile: async () => {
                set({ isLoading: true });
                try {
                    const response = await api.get('/vendors/me');
                    set({
                        user: response.data.user,
                        vendor: response.data.vendor,
                        isLoading: false,
                    });
                } catch (error) {
                    set({
                        error: getApiError(error),
                        isLoading: false,
                    });
                }
            },

            updateProfile: async (data: Partial<Vendor>) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.put('/vendors/me', data);
                    set({
                        vendor: { ...get().vendor!, ...response.data },
                        isLoading: false,
                    });
                } catch (error) {
                    set({
                        error: getApiError(error),
                        isLoading: false,
                    });
                    throw error;
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                vendor: state.vendor,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

export default useAuthStore;
