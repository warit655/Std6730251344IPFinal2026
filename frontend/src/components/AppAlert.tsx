import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

// ป๊อปอัปแจ้งเตือนในแอป (หน้าตาเดียวกันทั้งเว็บและมือถือ)
export function AppAlert({
  visible,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.box} accessibilityRole="alert">
          <View style={s.icon}>
            <Text style={{ fontSize: 30, color: '#A12A1E', fontWeight: '900' }}>!</Text>
          </View>
          <Text style={s.title}>{title}</Text>
          {message ? <Text style={s.msg}>{message}</Text> : null}
          <Pressable onPress={onClose} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
            <Text style={s.btnText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,30,20,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 340, backgroundColor: '#FFF', borderRadius: 26, padding: 24, alignItems: 'center', gap: 8 },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FDECEA', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '900', color: '#17251E', textAlign: 'center' },
  msg: { fontSize: 14, color: '#5B6B63', textAlign: 'center', lineHeight: 20 },
  btn: { height: 50, alignSelf: 'stretch', borderRadius: 14, backgroundColor: '#1F7A50', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
