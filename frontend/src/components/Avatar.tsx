import { Image, Text, View } from 'react-native';

const PALETTE = ['#1F7A50', '#1D6FB8', '#7A4BC2', '#B4531B', '#0E7C86', '#A12A5E'];

// รูปพนักงาน — ไม่มีรูปจะแสดงตัวอักษรย่อบนสีประจำตัว
export function Avatar({ name, image, size = 52 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    return <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#EAF5EE' }} />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const color = PALETTE[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % PALETTE.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: size * 0.36 }}>{initials || '?'}</Text>
    </View>
  );
}
