import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { request, setToken } from '@/lib/api';
import { AppAlert } from '@/components/AppAlert';

// หน้า Login
export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  async function login() {
    if (!username.trim() || !password) {
      setError({ title: 'Login failed', message: 'Please enter username and password' });
      return;
    }
    setLoading(true);
    try {
      const res = await request<{ success: boolean; token: string }>('POST', '/login', {
        username: username.trim(),
        password,
      });
      setToken(res.token);
      router.replace('/dashboard');
    } catch (e) {
      setError({ title: 'Login failed', message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.box}>
        <View style={s.logo}>
          <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '800' }}>HR</Text>
        </View>
        <Text style={s.title}>HR Manager</Text>
        <Text style={s.sub}>Salary Analytics System</Text>

        <Text style={s.label}>Username</Text>
        <TextInput style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="admin" placeholderTextColor="#94A39B" />
        <Text style={s.label}>Password</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={login} placeholder="••••••••" placeholderTextColor="#94A39B" />

        <Pressable style={({ pressed }) => [s.btn, (pressed || loading) && { opacity: 0.8 }]} onPress={login} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Login</Text>}
        </Pressable>
      </View>
      <AppAlert visible={!!error} title={error?.title ?? ''} message={error?.message} onClose={() => setError(null)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F8F5', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#1F7A50', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#17251E', textAlign: 'center', marginTop: 16 },
  sub: { fontSize: 14, color: '#5B6B63', textAlign: 'center', marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: '#17251E', marginBottom: 6 },
  input: { height: 50, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E1ECE5', borderRadius: 14, paddingHorizontal: 14, fontSize: 15, marginBottom: 14, color: '#17251E' },
  btn: { height: 52, borderRadius: 14, backgroundColor: '#1F7A50', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
