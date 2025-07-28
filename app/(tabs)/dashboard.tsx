import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Surface, Text } from 'react-native-paper';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

interface ApiResponseCustomer {
    id: number;
    user_id: number;
    account_number: string;
    issue_date: string;
    interest_rate: string;
    tenure: number;
    emi_due: string;
    created_at: string;
}

interface Customer {
    account_number: string;
    customer_name: string;
    issue_date: string;
    interest_rate: number;
    tenure_months: number;
    loan_amount: number;
    emi_amount: number;
    emi_due_date: number;
    total_paid: number;
    outstanding_amount: number;
    status: string;
    is_overdue: boolean;
}



export default function DashboardScreen() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user, token } = useAuth();
    const router = useRouter();

    const fetchCustomers = async () => {
        if (!user || !user.id) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/customers/${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const customerArray = Array.isArray(data) ? data : [data];

                const formattedCustomers: Customer[] = customerArray.map((customer: ApiResponseCustomer, index: number) => ({
                    account_number: customer.account_number,
                    customer_name: `Customer ${customer.id}`,
                    issue_date: customer.issue_date,
                    interest_rate: parseFloat(customer.interest_rate),
                    tenure_months: customer.tenure,
                    loan_amount: 500000, // Placeholder: Add to your DB
                    emi_amount: parseFloat(customer.emi_due),
                    emi_due_date: 5, // Placeholder: Add to your DB
                    total_paid: 250000, // Placeholder: Add to your DB
                    outstanding_amount: 250000, // Placeholder: Add to your DB
                    status: index % 2 === 0 ? 'active' : 'inactive', // Placeholder
                    is_overdue: index % 3 === 0, // Placeholder
                }));
                setCustomers(formattedCustomers);
            }
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCustomers();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <Surface style={styles.header}>
                <Text variant="titleMedium">Welcome, {user?.username}!</Text>
                <Text variant="bodyMedium">Your loan accounts overview</Text>
            </Surface>

            {customers.length === 0 ? (
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="bodyMedium">No loan accounts found.</Text>
                    </Card.Content>
                </Card>
            ) : (
                customers.map((customer) => (
                    <TouchableOpacity
                        key={customer.account_number}
                        onPress={() =>
                            router.push({
                                pathname: '/(tabs)/payments',
                                params: { customer: JSON.stringify(customer) },
                            })
                        }
                    >
                        <Card key={customer.account_number} style={styles.card}>
                            <Card.Content>
                                <View style={styles.cardHeader}>
                                    <Text variant="titleMedium" style={styles.accountNumber}>
                                        {customer.account_number}
                                    </Text>
                                    <Chip
                                        mode="outlined"
                                        style={[
                                            styles.statusChip,
                                            customer.status === 'active' ? styles.activeChip : styles.inactiveChip
                                        ]}
                                    >
                                        {customer.status.toUpperCase()}
                                    </Chip>
                                </View>

                                <View style={styles.detailsGrid}>
                                    <View style={styles.detailItem}>
                                        <Text variant="bodyMedium" style={styles.label}>Loan Amount</Text>
                                        <Text variant="bodyMedium" style={styles.value}>
                                            {formatCurrency(customer.loan_amount)}
                                        </Text>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <Text variant="bodyMedium" style={styles.label}>EMI Amount</Text>
                                        <Text variant="bodyMedium" style={styles.value}>
                                            {formatCurrency(customer.emi_amount)}
                                        </Text>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <Text variant="bodyMedium" style={styles.label}>Interest Rate</Text>
                                        <Text variant="bodyMedium" style={styles.value}>
                                            {customer.interest_rate}%
                                        </Text>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <Text variant="bodyMedium" style={styles.label}>Tenure</Text>
                                        <Text variant="bodyMedium" style={styles.value}>
                                            {customer.tenure_months} months
                                        </Text>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <Text variant="bodyMedium" style={styles.label}>Total Paid</Text>
                                        <Text variant="bodyMedium" style={styles.value}>
                                            {formatCurrency(customer.total_paid)}
                                        </Text>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <Text variant="bodyMedium" style={styles.label}>Outstanding</Text>
                                        <Text variant="bodyMedium" style={[styles.value, styles.outstanding]}>
                                            {formatCurrency(customer.outstanding_amount)}
                                        </Text>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <Text variant="bodyMedium" style={styles.label}>Issue Date</Text>
                                        <Text variant="bodyMedium" style={styles.value}>
                                            {formatDate(customer.issue_date)}
                                        </Text>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <Text variant="bodyMedium" style={styles.label}>EMI Due Date</Text>
                                        <Text variant="bodyMedium" style={[
                                            styles.value,
                                            customer.is_overdue ? styles.overdue : null
                                        ]}>
                                            {customer.emi_due_date} of every month
                                            {customer.is_overdue && ' (OVERDUE)'}
                                        </Text>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        margin: 16,
        padding: 16,
        elevation: 2,
    },
    card: {
        margin: 16,
        marginTop: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    accountNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusChip: {
        height: 32,
    },
    activeChip: {
        backgroundColor: '#e8f5e8',
    },
    inactiveChip: {
        backgroundColor: '#ffeaa7',
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    detailItem: {
        width: '48%',
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        color: '#666',
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    outstanding: {
        color: '#c0392b',
    },
    overdue: {
        color: '#e74c3c',
        fontWeight: 'bold',
    }
});