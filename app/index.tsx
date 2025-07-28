import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function Index() {
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (user) {
                router.replace('/(tabs)/dashboard');
            } else {
                router.replace('/(auth)/login');
            }
        }
    }, [user, isLoading]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});