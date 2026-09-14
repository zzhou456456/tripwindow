import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button, Card, Danger, Field, Screen } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { api, track, type Trip, type WeatherDay } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatWeekday, formatWindow } from '@/lib/format';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function TripsScreen() {
  const { session, ready } = useAuth();
  const token = session?.token ?? null;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [destination, setDestination] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [flex, setFlex] = useState('0');
  const [note, setNote] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const [openId, setOpenId] = useState<number | null>(null);
  const [weather, setWeather] = useState<Record<number, WeatherDay[] | string>>({});

  useEffect(() => {
    track('app_open');
  }, []);

  async function load() {
    if (!token) {
      setTrips([]);
      return;
    }
    try {
      setError(null);
      setTrips(await api<Trip[]>('/trips', { token }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function fillFromLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        track('location_denied', {}, token);
        Alert.alert('Location permission denied', 'You can still type a destination.');
        return;
      }
      const { coords: c } = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({ latitude: c.latitude, longitude: c.longitude });
      const name = [place?.city ?? place?.subregion, place?.country].filter(Boolean).join(', ');
      setDestination(name || `${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)}`);
      setCoords({ lat: c.latitude, lon: c.longitude });
      track('location_used', {}, token);
    } catch (e) {
      Alert.alert('Could not get location', (e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  async function createTrip() {
    if (!destination.trim() || !DATE_RE.test(start) || !DATE_RE.test(end)) {
      Alert.alert('Missing info', 'Destination, start and end dates (YYYY-MM-DD) are required.');
      return;
    }
    setSaving(true);
    try {
      let c = coords;
      if (!c) {
        // Forward-geocode typed destinations so the weather lookup has coordinates.
        const [hit] = await Location.geocodeAsync(destination).catch(() => []);
        if (hit) c = { lat: hit.latitude, lon: hit.longitude };
      }
      const flexibleDays = Number(flex) || 0;
      await api<Trip>('/trips', {
        method: 'POST',
        token,
        body: {
          destination: destination.trim(),
          lat: c?.lat,
          lon: c?.lon,
          start_date: start,
          end_date: end,
          flexible_days: flexibleDays,
          note,
          is_public: isPublic,
        },
      });
      track('trip_created', { is_public: isPublic, flexible_days: flexibleDays, has_coords: !!c }, token);
      setDestination('');
      setCoords(null);
      setStart('');
      setEnd('');
      setFlex('0');
      setNote('');
      setIsPublic(false);
      await load();
    } catch (e) {
      Alert.alert('Could not save trip', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(trip: Trip) {
    Alert.alert('Delete trip?', trip.destination, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/trips/${trip.id}`, { method: 'DELETE', token });
            track('trip_deleted', {}, token);
            await load();
          } catch (e) {
            Alert.alert('Delete failed', (e as Error).message);
          }
        },
      },
    ]);
  }

  async function toggleWeather(trip: Trip) {
    if (openId === trip.id) {
      setOpenId(null);
      return;
    }
    setOpenId(trip.id);
    if (weather[trip.id] || trip.lat == null || trip.lon == null) return;
    try {
      const days = await api<WeatherDay[]>(`/weather?lat=${trip.lat}&lon=${trip.lon}`);
      setWeather((w) => ({ ...w, [trip.id]: days }));
      track('weather_viewed', {}, token);
    } catch (e) {
      setWeather((w) => ({ ...w, [trip.id]: (e as Error).message }));
    }
  }

  if (!ready) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={token ? refresh : undefined}>
      <ThemedText type="subtitle">My Trips</ThemedText>

      {!session ? (
        <Card>
          <ThemedText>Sign in on the Account tab to save trip windows.</ThemedText>
        </Card>
      ) : (
        <>
          <Card>
            <ThemedText type="smallBold">New trip window</ThemedText>
            <Field
              label="Destination"
              value={destination}
              onChangeText={(v) => {
                setDestination(v);
                setCoords(null);
              }}
              placeholder="Tokyo, Japan"
            />
            <Button
              title={locating ? 'Locating…' : 'Use my location'}
              variant="secondary"
              onPress={fillFromLocation}
              disabled={locating}
            />
            <View style={styles.row}>
              <Field
                label="Start"
                value={start}
                onChangeText={setStart}
                placeholder="2026-12-20"
                keyboardType="numbers-and-punctuation"
                containerStyle={styles.flex1}
              />
              <Field
                label="End"
                value={end}
                onChangeText={setEnd}
                placeholder="2026-12-28"
                keyboardType="numbers-and-punctuation"
                containerStyle={styles.flex1}
              />
            </View>
            <Field label="Flexible ± days" value={flex} onChangeText={setFlex} keyboardType="number-pad" />
            <Field label="Note" value={note} onChangeText={setNote} placeholder="Cheapest week wins" />
            <View style={styles.rowBetween}>
              <ThemedText type="small">Share to public feed</ThemedText>
              <Switch value={isPublic} onValueChange={setIsPublic} />
            </View>
            <Button title={saving ? 'Saving…' : 'Save trip'} onPress={createTrip} disabled={saving} />
          </Card>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          {trips.length === 0 ? (
            <ThemedText themeColor="textSecondary">No trips yet.</ThemedText>
          ) : (
            <>
              {trips.map((trip) => (
                <Card key={trip.id}>
                  <Pressable onPress={() => toggleWeather(trip)} onLongPress={() => confirmDelete(trip)}>
                    <View style={styles.rowBetween}>
                      <ThemedText type="smallBold" style={styles.flex1}>
                        {trip.destination}
                      </ThemedText>
                      {trip.is_public && <ThemedText type="code">PUBLIC</ThemedText>}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatWindow(trip)}
                    </ThemedText>
                    {!!trip.note && <ThemedText type="small">{trip.note}</ThemedText>}
                  </Pressable>
                  {openId === trip.id && <WeatherStrip trip={trip} data={weather[trip.id]} />}
                </Card>
              ))}
              <ThemedText type="small" themeColor="textSecondary">
                Tap a trip for the forecast · long-press to delete
              </ThemedText>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function WeatherStrip({ trip, data }: { trip: Trip; data?: WeatherDay[] | string }) {
  if (trip.lat == null) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        No coordinates for this destination, so no forecast.
      </ThemedText>
    );
  }
  if (!data) return <ActivityIndicator />;
  if (typeof data === 'string') {
    return (
      <ThemedText type="small" style={styles.error}>
        {data}
      </ThemedText>
    );
  }
  return (
    <View style={styles.weatherBlock}>
      <ThemedText type="small" themeColor="textSecondary">
        Next 7 days at destination (Open-Meteo)
      </ThemedText>
      <View style={styles.weather}>
        {data.map((d) => (
          <View key={d.date} style={styles.day}>
            <ThemedText type="code">{formatWeekday(d.date)}</ThemedText>
            <ThemedText type="smallBold">{Math.round(d.max)}°</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {Math.round(d.min)}°
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {d.rain}%
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  flex1: { flex: 1 },
  error: { color: Danger },
  weatherBlock: { marginTop: Spacing.two, gap: Spacing.one },
  weather: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center' },
});
