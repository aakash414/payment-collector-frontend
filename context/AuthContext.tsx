import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuthState();
    }, []);

    const checkAuthState = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('auth_token');
            if (storedToken) {
                const response = await fetch(`${API_BASE_URL}/auth/verify`, {
                    headers: {
                        'Authorization': `Bearer ${storedToken}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.valid) {
                        setToken(storedToken);
                        setUser(data.user);
                        router.replace('/(tabs)/dashboard');
                    } else {
                        await AsyncStorage.removeItem('auth_token');
                    }
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const responseText = await response.text();

            if (!response.ok) {
                console.error('Login failed with status:', response.status);
                console.error('Server response:', responseText);
                return false;
            }

            try {
                const data = JSON.parse(responseText);
                setToken(data.token);
                setUser(data.user);
                await AsyncStorage.setItem('auth_token', data.token);
                router.replace('/(tabs)/dashboard');
                return true;
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError);
                console.error('Raw response text:', responseText);
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const register = async (name: string, email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setToken(data.token);
                setUser(data.user);
                await AsyncStorage.setItem('auth_token', data.token);
                router.replace('/(tabs)/dashboard');
                return true;
            } else {
                console.error('Registration failed:', data.error);
                return false;
            }
        } catch (error) {
            console.error('Registration error:', error);
            return false;
        }
    };

    const logout = async () => {
        setUser(null);
        setToken(null);
        await AsyncStorage.removeItem('auth_token');
        router.replace('/(auth)/login');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                register,
                logout,
                token,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};