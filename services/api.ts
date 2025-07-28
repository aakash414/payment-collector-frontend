import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../config';
class ApiService {
    private async getAuthHeaders() {
        const token = await AsyncStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    }

    async request(endpoint: string, options: RequestInit = {}) {
        try {
            const headers = await this.getAuthHeaders();

            const config: RequestInit = {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers,
                },
            };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getCustomers() {
        return this.request('/customers');
    }

    async getCustomer(accountNumber: string) {
        return this.request(`/customers/${accountNumber}`);
    }

    async makePayment(paymentData: {
        account_number: string;
        payment_amount: number;
        payment_method?: string;
        remarks?: string;
    }) {
        return this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    }

    async getPaymentHistory(accountNumber: string, page: number = 1, limit: number = 10) {
        return this.request(`/payments/${accountNumber}?page=${page}&limit=${limit}`);
    }

    async getDashboardStats() {
        return this.request('/dashboard');
    }
}

export const apiService = new ApiService();