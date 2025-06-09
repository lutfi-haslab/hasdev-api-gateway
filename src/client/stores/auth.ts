import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../models/user'

interface AuthState {
    user: User | null
    setUser: (newUser: User | null) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            setUser: (newUser: User | null) => set({ user: newUser }),
        }),
        {
            name: 'auth-storage',
        }
    )
)