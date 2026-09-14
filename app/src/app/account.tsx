import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Danger, Field, Screen } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Stat = { name: string; count: number };

export default function AccountScreen() {
  const { session, ready, signIn, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (session) api<Stat[]>('/events/stats').then(setStats).catch(() => {});
    }, [session])
  );

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(mode, email, password);
      setPassword('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Account</ThemedText>

      {!ready ? (
        <ActivityIndicator />
      ) : session ? (
        <>
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Signed in as
            </ThemedText>
            <ThemedText type="smallBold">{session.user.email}</ThemedText>
            <Button title="Sign out" variant="secondary" onPress={signOut} />
          </Card>

          <Card>
            <ThemedText type="smallBold">Usage analytics (all users)</ThemedText>
            {stats.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No events yet.
              </ThemedText>
            ) : (
              stats.map((s) => (
                <View key={s.name} style={styles.statRow}>
                  <ThemedText type="code">{s.name}</ThemedText>
                  <ThemedText type="smallBold">{s.count}</ThemedText>
                </View>
              ))
            )}
          </Card>
        </>
      ) : (
        <Card>
          <View style={styles.segment}>
            <View style={styles.flex1}>
              <Button title="Log in" variant={mode === 'login' ? 'primary' : 'secondary'} onPress={() => setMode('login')} />
            </View>
            <View style={styles.flex1}>
              <Button
                title="Register"
                variant={mode === 'register' ? 'primary' : 'secondary'}
                onPress={() => setMode('register')}
              />
            </View>
          </View>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@gatech.edu"
          />
          <Field
            label="Password (6+ characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={mode === 'register' ? 'newPassword' : 'password'}
          />
          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}
          <Button
            title={busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            onPress={submit}
            disabled={busy}
          />
        </Card>
      )}

      <ThemedText type="code" themeColor="textSecondary">
        API: {API_URL}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  error: { color: Danger },
});
