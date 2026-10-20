import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { baht, request, showAlert, type Employee } from '@/lib/api';
import { Avatar } from './Avatar';

export type EmployeeInput = { name: string; position: string; salary: number; image: string | null };

// ฟอร์มเพิ่ม / แก้ไขพนักงาน (pop-up)
export function EmployeeForm({
  visible,
  employee,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  employee: Employee | null; // null = เพิ่มใหม่
  onClose: () => void;
  onSubmit: (data: EmployeeInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!visible) return;
    setHint('');
    setName(employee?.name ?? '');
    setPosition(employee?.position ?? '');
    setSalary(employee ? String(employee.salary) : '');
    setImage(employee?.image ?? null);
  }, [visible, employee]);

  // AI แนะนำเงินเดือนจากตำแหน่งที่คล้ายกันในบริษัท
  async function suggest() {
    if (!position.trim()) {
      showAlert('AI suggest', 'Type a position first');
      return;
    }
    setSuggesting(true);
    setHint('');
    try {
      const r = await request<{ suggested: number | null; message: string }>(
        'GET',
        `/employees/suggest-salary?position=${encodeURIComponent(position.trim())}`
      );
      if (r.suggested) {
        setSalary(String(r.suggested));
        setHint(`✨ AI suggests ${baht(r.suggested)} • ${r.message}`);
      } else {
        setHint(`✨ ${r.message}`);
      }
    } catch (e) {
      setHint((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    if (a.base64) setImage(`data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}`);
    else setImage(a.uri);
  }

  async function submit() {
    // Client-side validation
    if (!name.trim() || !position.trim() || !salary.trim()) {
      showAlert('Missing information', 'Please fill in name, position and salary');
      return;
    }
    const s = Number(salary.replace(/,/g, ''));
    if (!Number.isFinite(s) || s < 0) {
      showAlert('Invalid salary', 'Salary must be a positive number');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), position: position.trim(), salary: s, image });
      onClose();
    } catch (e) {
      showAlert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <ScrollView contentContainerStyle={{ padding: 22, gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={s.title}>{employee ? 'Edit Employee' : 'New Employee'}</Text>
                <Pressable onPress={onClose} accessibilityLabel="Close" style={s.close}>
                  <Text style={{ fontSize: 18, color: '#5B6B63' }}>✕</Text>
                </Pressable>
              </View>

              <View style={{ alignItems: 'center', gap: 10 }}>
                <Pressable onPress={pickImage} accessibilityLabel="Choose photo">
                  <Avatar name={name || '?'} image={image} size={96} />
                  <View style={s.camera}>
                    <Text style={{ color: '#FFF', fontSize: 14 }}>📷</Text>
                  </View>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={pickImage} style={s.chipBtn}>
                    <Text style={s.chipText}>{image ? 'Change photo' : 'Upload photo'}</Text>
                  </Pressable>
                  {image ? (
                    <Pressable onPress={() => setImage(null)} style={[s.chipBtn, { borderColor: '#F0C9C4' }]}>
                      <Text style={[s.chipText, { color: '#A12A1E' }]}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View>
                <Text style={s.label}>Full name</Text>
                <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. John Doe" placeholderTextColor="#94A39B" />
              </View>
              <View>
                <Text style={s.label}>Position</Text>
                <TextInput style={s.input} value={position} onChangeText={setPosition} placeholder="e.g. Software Engineer" placeholderTextColor="#94A39B" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[s.label, { flex: 1, marginBottom: 0 }]}>Monthly salary (THB)</Text>
                  <Pressable onPress={suggest} disabled={suggesting} style={s.aiBtn}>
                    {suggesting ? <ActivityIndicator size="small" color="#7A4BC2" /> : <Text style={s.aiText}>✨ AI suggest</Text>}
                  </Pressable>
                </View>
                <TextInput style={s.input} value={salary} onChangeText={setSalary} placeholder="e.g. 45000" placeholderTextColor="#94A39B" keyboardType="numeric" />
                {hint ? <Text style={s.hint}>{hint}</Text> : null}
              </View>

              <Pressable onPress={submit} disabled={saving} style={({ pressed }) => [s.btn, (pressed || saving) && { opacity: 0.85 }]}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>{employee ? 'Save changes' : 'Add employee'}</Text>}
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,30,20,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: '#FFF', borderRadius: 26, width: '100%', maxWidth: 460, alignSelf: 'center', maxHeight: '92%' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#17251E' },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F8F5', alignItems: 'center', justifyContent: 'center' },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F7A50', borderWidth: 3, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  chipBtn: { height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#B8DCC6', justifyContent: 'center' },
  chipText: { color: '#1F7A50', fontWeight: '700', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '700', color: '#17251E', marginBottom: 6 },
  input: { height: 50, borderWidth: 1, borderColor: '#E1ECE5', borderRadius: 14, paddingHorizontal: 14, fontSize: 15, color: '#17251E', backgroundColor: '#FAFCFB' },
  btn: { height: 54, borderRadius: 16, backgroundColor: '#1F7A50', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  aiBtn: { height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#F1EAFB', justifyContent: 'center', minWidth: 96, alignItems: 'center' },
  aiText: { color: '#7A4BC2', fontWeight: '800', fontSize: 12 },
  hint: { color: '#7A4BC2', fontSize: 12, marginTop: 6 },
});
