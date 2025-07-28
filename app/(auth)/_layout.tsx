import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    if (user) {
        return <Redirect href="/(tabs)/dashboard" />;
    }

    return (
        <Stack>
            <Stack.Screen
                name="login"
                options={{
                    title: 'Login',
                    headerShown: true
                }}
            />
            <Stack.Screen
                name="register"
                options={{
                    title: 'Register',
                    headerShown: true
                }}
            />
        </Stack>
    );
}