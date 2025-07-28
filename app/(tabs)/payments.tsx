import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  Portal,
  RadioButton,
  Snackbar,
  Surface,
  Text,
  TextInput,
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
  const [isConfirmVisible, setConfirmVisible] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const { user, token } = useAuth();

  useEffect(() => {
    if (params.customer) {
      const customerData = JSON.parse(params.customer as string);
      setCustomerDetails(customerData);
      setAccountNumber(customerData.account_number);
      setPaymentData((prev) => ({
        ...prev,
        account_number: customerData.account_number,
        payment_amount: customerData.emi_amount.toString(),
      }));
    } else if (params.account_number) {
      const accNum = params.account_number as string;
      setAccountNumber(accNum);
      fetchCustomerDetails(accNum, true);
    }
  }, [params.customer, params.account_number]);

  const fetchCustomerDetails = async (accNumber: string, fromParams = false) => {
    if (params.customer && !fromParams) return;
    if (!accNumber.trim()) {
      setCustomerDetails(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const customers = await response.json();
        const currentCustomer = customers.find((c: any) => c.account_number === accNumber);
        if (currentCustomer) {
          setCustomerDetails(currentCustomer);
          setPaymentData((prev) => ({
            ...prev,
            account_number: accNumber,
            payment_amount: currentCustomer.emi_due.toString(),
          }));
        } else {
          setCustomerDetails(null);
          setSnackbar({ visible: true, message: 'Account not found for this user.' });
        }
      } else {
        setCustomerDetails(null);
        setSnackbar({ visible: true, message: 'Failed to fetch account details.' });
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      setSnackbar({ visible: true, message: 'Network error. Please try again.' });
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
    if (isNaN(amount)) return '';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const validatePayment = () => {
    if (!paymentData.account_number.trim()) {
      setSnackbar({ visible: true, message: 'Account number is missing.' });
      return false;
    }

    const amount = parseFloat(paymentData.payment_amount);
    if (isNaN(amount) || amount <= 0) {
      setSnackbar({ visible: true, message: 'Please enter a valid payment amount.' });
      return false;
    }

    if (amount > 1000000) {
      setSnackbar({ visible: true, message: 'Payment amount cannot exceed ₹10,00,000.' });
      return false;
    }

    return true;
  };

  const handlePayment = () => {
    if (!validatePayment()) return;
    setConfirmVisible(true);
  };

  const processPayment = async () => {
    setConfirmVisible(false);
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
          remarks: paymentData.remarks.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSnackbar({ visible: true, message: 'Payment Successful!' });
        setTimeout(() => {
          setAccountNumber('');
          setCustomerDetails(null);
          setPaymentData({
            account_number: '',
            payment_amount: '',
            payment_method: 'online',
            remarks: '',
          });
        }, 1500);
      } else {
        setSnackbar({ visible: true, message: data.error || 'Payment Failed' });
      }
    } catch (error) {
      console.error('Payment error:', error);
      setSnackbar({ visible: true, message: 'Network error. Please try again.' });
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <View style={styles.container}>
      <Portal>
        <Dialog visible={isConfirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Confirm Payment</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyLarge">
              Are you sure you want to pay{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {formatCurrency(parseFloat(paymentData.payment_amount) || 0)}
              </Text>
              {' for account '}
              <Text style={{ fontWeight: 'bold' }}>{paymentData.account_number}?</Text>
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)} disabled={processingPayment}>
              Cancel
            </Button>
            <Button onPress={processPayment} loading={processingPayment} disabled={processingPayment}>
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ScrollView>
        <Surface style={styles.header}>
          <Text variant="titleLarge">Make EMI Payment</Text>
          <Text variant="bodyMedium">Enter your account details to make a payment</Text>
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
                <Text variant="bodyMedium" style={styles.loadingText}>Loading account details...</Text>
              </View>
            )}

            {customerDetails && (
              <Surface style={styles.customerDetails}>
                <Text variant="bodyMedium" style={styles.customerName}>
                  Account Holder: {customerDetails.customer_name}
                </Text>
                <Text variant="bodyMedium">
                  Monthly EMI: {formatCurrency(customerDetails.emi_amount)}
                </Text>
                <Text variant="bodyMedium">
                  Outstanding Amount: {formatCurrency(customerDetails.outstanding_amount)}
                </Text>
                <Text variant="bodyMedium">
                  Due Date: {customerDetails.emi_due_date} of every month
                </Text>
                {customerDetails.is_overdue && (
                  <Text variant="bodyMedium" style={styles.overdueText}>
                    Payment is overdue
                  </Text>
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
                onChangeText={(text) => setPaymentData((prev) => ({ ...prev, payment_amount: text }))}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                disabled={processingPayment}
              />

              <View style={styles.radioGroup}>
                <Text variant="bodyMedium" style={styles.radioLabel}>Payment Method:</Text>

                <View style={styles.radioOption}>
                  <RadioButton.Android
                    value="online"
                    status={paymentData.payment_method === 'online' ? 'checked' : 'unchecked'}
                    onPress={() => setPaymentData((prev) => ({ ...prev, payment_method: 'online' }))}
                    disabled={processingPayment}
                  />
                  <Text variant="bodyMedium">Online Payment</Text>
                </View>

                <View style={styles.radioOption}>
                  <RadioButton.Android
                    value="bank_transfer"
                    status={paymentData.payment_method === 'bank_transfer' ? 'checked' : 'unchecked'}
                    onPress={() => setPaymentData((prev) => ({ ...prev, payment_method: 'bank_transfer' }))}
                    disabled={processingPayment}
                  />
                  <Text variant="bodyMedium">Bank Transfer</Text>
                </View>

                <View style={styles.radioOption}>
                  <RadioButton.Android
                    value="cheque"
                    status={paymentData.payment_method === 'cheque' ? 'checked' : 'unchecked'}
                    onPress={() => setPaymentData((prev) => ({ ...prev, payment_method: 'cheque' }))}
                    disabled={processingPayment}
                  />
                  <Text variant="bodyMedium">Cheque</Text>
                </View>
              </View>

              <TextInput
                label="Remarks (Optional)"
                value={paymentData.remarks}
                onChangeText={(text) => setPaymentData((prev) => ({ ...prev, remarks: text }))}
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

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={Snackbar.DURATION_MEDIUM}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    // margin: 16,
    padding: 16,
    elevation: 2,
  },
  card: {
    margin: 15,
    elevation: 2,
  },
  input: {
    marginTop: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
  },
  customerDetails: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#25232a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cce4ff',
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
    marginTop: 15,
  },
  radioLabel: {
    marginBottom: 5,
    color: '#666',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 20,
  },
  paymentButton: {
    paddingVertical: 8,
  },
  paymentButtonContent: {
    height: 50,
  },
});