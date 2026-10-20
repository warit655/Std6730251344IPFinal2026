import { Alert, Platform } from 'react-native';

// ที่อยู่ backend — แก้ตรงนี้ที่เดียว
export const API_URL = 'http://119.59.102.161:3100/api';

let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};
export const hasToken = () => !!token;

export type Employee = {
  id: string;
  name: string;
  position: string;
  status: 'Active' | 'On Leave';
  salary: number;
  image: string | null;
};

export type Cluster = { group: string; centroid: number; count: number };

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
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
    throw new Error('Cannot connect to server');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data as T;
}

// Alert.alert ใช้ไม่ได้บนเว็บ → ใช้ window.alert / window.confirm แทน
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n${message}` : title);
  else Alert.alert(title, message);
}

export function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

export const baht = (n: number) => '฿' + Math.round(n).toLocaleString('en-US');

// สีประจำแต่ละ Tier
export const TIER_COLORS = ['#2E9466', '#1D6FB8', '#7A4BC2'];
