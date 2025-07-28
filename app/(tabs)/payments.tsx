import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  RadioButton,
  Surface,
  Text,
  TextInput
} from 'react-native-paper';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

interface Customer {
  account_number: string;
  customer_name: string;
  emi_amount: number;
  outstanding_amount: number;
  emi_due_date: number;
  is_overdue: boolean;
}

interface PaymentData {
  account_number: string;
  payment_amount: string;
  payment_method: string;
  remarks: string;
}



export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const [accountNumber, setAccountNumber] = useState('');
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    account_number: '',
    payment_amount: '',
    payment_method: 'online',
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (params.customer) {
      const customerData = JSON.parse(params.customer as string);
      setCustomerDetails(customerData);
      setAccountNumber(customerData.account_number);
      setPaymentData(prev => ({
        ...prev,
        account_number: customerData.account_number,
        payment_amount: customerData.emi_amount.toString(),
      }));
    }
  }, [params.customer]);

  const fetchCustomerDetails = async (accNumber: string) => {
    if (params.customer) return; // Don't fetch if data is passed via params
    if (!accNumber.trim()) {
      setCustomerDetails(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${accNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomerDetails(data.customer);
        setPaymentData(prev => ({
          ...prev,
          account_number: accNumber,
          payment_amount: data.customer.emi_amount.toString()
        }));
      } else {
        setCustomerDetails(null);
        if (response.status === 404) {
          Alert.alert('Account Not Found', 'Please check the account number and try again.');
        } else {
          Alert.alert('Error', 'Failed to fetch account details.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      Alert.alert('Error', 'Network error. Please try again.');
      setCustomerDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountNumberChange = (text: string) => {
    setAccountNumber(text);
    if (text.length >= 6) {
      fetchCustomerDetails(text);
    } else {
      setCustomerDetails(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const validatePayment = () => {
    if (!paymentData.account_number.trim()) {
      Alert.alert('Error', 'Please enter account number');
      return false;
    }

    const amount = parseFloat(paymentData.payment_amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return false;
    }

    if (amount > 1000000) { // 10 lakh limit
      Alert.alert('Error', 'Payment amount cannot exceed ₹10,00,000');
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!validatePayment()) return;

    Alert.alert(
      'Confirm Payment',
      `Are you sure you want to pay ${formatCurrency(parseFloat(paymentData.payment_amount))} for account ${paymentData.account_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: processPayment }
      ]
    );
  };

  const processPayment = async () => {
    setProcessingPayment(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_number: paymentData.account_number,
          payment_amount: parseFloat(paymentData.payment_amount),
          payment_method: paymentData.payment_method,
          remarks: paymentData.remarks.trim() || null
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Payment Successful!',
          `Transaction ID: ${data.payment.transaction_id}\nAmount: ${formatCurrency(data.payment.payment_amount)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setAccountNumber('');
                setCustomerDetails(null);
                setPaymentData({
                  account_number: '',
                  payment_amount: '',
                  payment_method: 'online',
                  remarks: ''
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Payment Failed', data.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header}>
        <Text variant="titleLarge">Make EMI Payment</Text>
        <Text variant="bodyMedium">Enter your account details to make a payment</Text >
      </Surface>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge">Account Details</Text>

          <TextInput
            label="Account Number"
            value={accountNumber}
            onChangeText={handleAccountNumberChange}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            disabled={!!params.customer || processingPayment}
          />

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text variant="bodyMedium" style={styles.loadingText}>Loading account details...</Text >
            </View>
          )}

          {customerDetails && (
            <Surface style={styles.customerDetails}>
              <Text variant="bodyMedium" style={styles.customerName}>
                Account Holder: {customerDetails.customer_name}
              </Text >
              <Text variant="bodyMedium">
                Monthly EMI: {formatCurrency(customerDetails.emi_amount)}
              </Text >
              <Text variant="bodyMedium">
                Outstanding Amount: {formatCurrency(customerDetails.outstanding_amount)}
              </Text >
              <Text variant="bodyMedium">
                Due Date: {customerDetails.emi_due_date} of every month
              </Text >
              {customerDetails.is_overdue && (
                <Text variant="bodyMedium" style={styles.overdueText}>
                  Payment is overdue
                </Text >
              )}
            </Surface>
          )}
        </Card.Content>
      </Card>

      {customerDetails && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">Payment Details</Text>

            <TextInput
              label="Payment Amount (₹)"
              value={paymentData.payment_amount}
              onChangeText={(text) => setPaymentData(prev => ({ ...prev, payment_amount: text }))}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              disabled={processingPayment}
            />

            <View style={styles.radioGroup}>
              <Text variant="bodyMedium" style={styles.radioLabel}>Payment Method:</Text >

              <View style={styles.radioOption}>
                <RadioButton
                  value="online"
                  status={paymentData.payment_method === 'online' ? 'checked' : 'unchecked'}
                  onPress={() => setPaymentData(prev => ({ ...prev, payment_method: 'online' }))}
                  disabled={processingPayment}
                />
                <Text variant="bodyMedium">Online Payment</Text >
              </View>

              <View style={styles.radioOption}>
                <RadioButton
                  value="bank_transfer"
                  status={paymentData.payment_method === 'bank_transfer' ? 'checked' : 'unchecked'}
                  onPress={() => setPaymentData(prev => ({ ...prev, payment_method: 'bank_transfer' }))}
                  disabled={processingPayment}
                />
                <Text variant="bodyMedium">Bank Transfer</Text >
              </View>

              <View style={styles.radioOption}>
                <RadioButton
                  value="cheque"
                  status={paymentData.payment_method === 'cheque' ? 'checked' : 'unchecked'}
                  onPress={() => setPaymentData(prev => ({ ...prev, payment_method: 'cheque' }))}
                  disabled={processingPayment}
                />
                <Text variant="bodyMedium">Cheque</Text >
              </View>
            </View>

            <TextInput
              label="Remarks (Optional)"
              value={paymentData.remarks}
              onChangeText={(text) => setPaymentData(prev => ({ ...prev, remarks: text }))}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              disabled={processingPayment}
            />

            <Divider style={styles.divider} />

            <Button
              mode="contained"
              onPress={handlePayment}
              loading={processingPayment}
              disabled={processingPayment || !customerDetails}
              style={styles.paymentButton}
              contentStyle={styles.paymentButtonContent}
            >
              {processingPayment ? 'Processing...' : 'Make Payment'}
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  input: {
    marginBottom: 15,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontStyle: 'italic',
  },
  customerDetails: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '##25232a',
  },
  customerName: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  overdueText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    marginTop: 5,
  },
  radioGroup: {
    marginBottom: 15,
  },
  radioLabel: {
    fontWeight: '500',
    marginBottom: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  divider: {
    marginVertical: 20,
  },
  paymentButton: {
    marginTop: 10,
  },
  paymentButtonContent: {
    paddingVertical: 8,
  },
});