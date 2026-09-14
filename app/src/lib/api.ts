import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL in app/.env (e.g. your Render URL, or http://<Mac LAN IP>:3000
// when testing on a phone against a local server — "localhost" on the phone is the phone).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export type User = { id: number; email: string };

export type Trip = {
  id: number;
  destination: string;
  lat: number | null;
  lon: number | null;
  start_date: string;
  end_date: string;
  flexible_days: number;
  note: string;
  is_public: boolean;
};

export type FeedItem = Pick<Trip, 'id' | 'destination' | 'start_date' | 'end_date' | 'flexible_days' | 'note'> & {
  author: string;
  created_at: string;
};

export type WeatherDay = { date: string; max: number; min: number; rain: number };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Options = { method?: string; body?: unknown; token?: string | null };

export async function api<T>(path: string, { method = 'GET', body, token }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Cannot reach server at ${API_URL}`);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

// Fire-and-forget activity analytics; never blocks or breaks the UI.
export function track(name: string, props: Record<string, unknown> = {}, token?: string | null) {
  api('/events', { method: 'POST', body: { name, props: { ...props, platform: Platform.OS } }, token }).catch(
    () => {}
  );
}
