import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Card, Danger, Screen } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { api, track, type FeedItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatWindow, timeAgo } from '@/lib/format';

export default function FeedScreen() {
  const { session } = useAuth();
  const token = session?.token ?? null;
  const [items, setItems] = useState<FeedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await api<FeedItem[]>('/feed'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Reload whenever the tab gains focus so newly shared trips show up.
  useFocusEffect(
    useCallback(() => {
      load();
      track('feed_viewed', {}, token);
    }, [load, token])
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ThemedText type="subtitle">Feed</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Trip windows other travelers chose to share.
      </ThemedText>

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      {items.length === 0 && !error ? (
        <ThemedText themeColor="textSecondary">Nothing shared yet.</ThemedText>
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <ThemedText type="smallBold">{item.destination}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatWindow(item)}
            </ThemedText>
            {!!item.note && <ThemedText type="small">“{item.note}”</ThemedText>}
            <ThemedText type="code" themeColor="textSecondary">
              @{item.author} · {timeAgo(item.created_at)}
            </ThemedText>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: Danger },
});
