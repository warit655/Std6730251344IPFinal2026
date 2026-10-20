import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { baht, confirm, hasToken, request, setToken, showAlert, type Cluster, type Employee } from '@/lib/api';

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [saving, setSaving] = useState(false);

  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    try {
      setEmployees(await request<Employee[]>('GET', '/employees'));
    } catch (e) {
      showAlert('Error', (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ยังไม่ login → กลับไปหน้า Login
  useEffect(() => {
    if (!hasToken()) {
      router.replace('/');
      return;
    }
    void load();
  }, [load]);

  async function addEmployee() {
    // Client-side validation
    if (!name.trim() || !position.trim() || !salary.trim()) {
      showAlert('Missing information', 'Please fill in name, position and salary');
      return;
    }
    const s = Number(salary);
    if (!Number.isFinite(s) || s < 0) {
      showAlert('Invalid salary', 'Salary must be a positive number');
      return;
    }
    setSaving(true);
    try {
      await request('POST', '/employees', { name: name.trim(), position: position.trim(), salary: s });
      setName('');
      setPosition('');
      setSalary('');
      setClusters(null);
      await load();
    } catch (e) {
      showAlert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(emp: Employee) {
    try {
      await request('PUT', `/employees/${emp.id}/status`);
      await load();
    } catch (e) {
      showAlert('Error', (e as Error).message);
    }
  }

  async function remove(emp: Employee) {
    const ok = await confirm('Are you sure?', `Delete ${emp.name}?`);
    if (!ok) return;
    try {
      await request('DELETE', `/employees/${emp.id}`);
      setClusters(null);
      await load();
    } catch (e) {
      showAlert('Error', (e as Error).message);
    }
  }

  async function analyze() {
    setAnalyzing(true);
    setClusters(null);
    try {
      const res = await request<{ success: boolean; clusters: Cluster[] }>('GET', '/employees/salary-clusters');
      setClusters(res.clusters);
    } catch (e) {
      showAlert('Error', (e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function logout() {
    setToken(null);
    router.replace('/');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F8F5' }}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>Employee Dashboard</Text>
            <Text style={s.sub}>{employees.length} employees</Text>
          </View>
          <Pressable onPress={logout} style={s.outlineBtn}>
            <Text style={s.outlineText}>Logout</Text>
          </Pressable>
        </View>

        {/* ===== Phase 2: Salary analysis ===== */}
        <View style={s.card}>
          <Text style={s.h2}>Salary Structure (K-Means)</Text>
          <Pressable onPress={analyze} disabled={analyzing} style={({ pressed }) => [s.btn, (pressed || analyzing) && { opacity: 0.8 }]}>
            <Text style={s.btnText}>Analyze Salary Structure</Text>
          </Pressable>
          {analyzing ? (
            <View style={{ alignItems: 'center', padding: 16, gap: 8 }}>
              <ActivityIndicator size="large" color="#1F7A50" />
              <Text style={s.sub}>Analyzing salaries...</Text>
            </View>
          ) : null}
          {clusters ? (
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {clusters.map((c) => (
                <View key={c.group} style={s.tier}>
                  <Text style={s.tierName}>{c.group}</Text>
                  <Text style={s.tierValue}>{baht(c.centroid)}</Text>
                  <Text style={s.sub}>avg. salary</Text>
                  <Text style={s.tierCount}>{c.count} employee{c.count === 1 ? '' : 's'}</Text>
                </View>
              ))}
              {clusters.length === 0 ? <Text style={s.sub}>No salary data</Text> : null}
            </View>
          ) : null}
        </View>

        {/* ===== Add employee ===== */}
        <View style={s.card}>
          <Text style={s.h2}>Add Employee</Text>
          <TextInput style={s.input} placeholder="Name" placeholderTextColor="#94A39B" value={name} onChangeText={setName} />
          <TextInput style={s.input} placeholder="Position" placeholderTextColor="#94A39B" value={position} onChangeText={setPosition} />
          <TextInput style={s.input} placeholder="Salary" placeholderTextColor="#94A39B" value={salary} onChangeText={setSalary} keyboardType="numeric" />
          <Pressable onPress={addEmployee} disabled={saving} style={({ pressed }) => [s.btn, (pressed || saving) && { opacity: 0.8 }]}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>+ Add Employee</Text>}
          </Pressable>
        </View>

        {/* ===== Employee list ===== */}
        <Text style={s.h2}>Employees</Text>
        {loading ? <ActivityIndicator size="large" color="#1F7A50" style={{ padding: 24 }} /> : null}
        {!loading && employees.length === 0 ? <Text style={s.sub}>No employees yet</Text> : null}
        {employees.map((emp) => {
          const active = emp.status === 'Active';
          return (
            <View key={emp.id} style={s.card}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.name}>{emp.name}</Text>
                  <Text style={s.sub}>{emp.position}</Text>
                  <Text style={s.salary}>{baht(emp.salary)}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: active ? '#DDF1E6' : '#FFF1DD' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#1F7A50' : '#8A4510' }}>{emp.status}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable onPress={() => toggleStatus(emp)} style={[s.outlineBtn, { flex: 1 }]}>
                  <Text style={s.outlineText}>Toggle Status</Text>
                </Pressable>
                <Pressable onPress={() => remove(emp)} style={[s.outlineBtn, { borderColor: '#F0C9C4' }]}>
                  <Text style={[s.outlineText, { color: '#A12A1E' }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  h1: { fontSize: 22, fontWeight: '800', color: '#17251E' },
  h2: { fontSize: 17, fontWeight: '700', color: '#17251E' },
  sub: { fontSize: 13, color: '#5B6B63' },
  card: { backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#E1ECE5', padding: 14, gap: 10 },
  input: { height: 48, borderWidth: 1, borderColor: '#E1ECE5', borderRadius: 12, paddingHorizontal: 12, fontSize: 15, color: '#17251E', backgroundColor: '#FAFCFB' },
  btn: { height: 48, borderRadius: 12, backgroundColor: '#1F7A50', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  outlineBtn: { height: 40, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#1F7A50', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  outlineText: { color: '#1F7A50', fontWeight: '700', fontSize: 13 },
  name: { fontSize: 16, fontWeight: '700', color: '#17251E' },
  salary: { fontSize: 15, fontWeight: '800', color: '#1F7A50', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tier: { flex: 1, minWidth: 140, backgroundColor: '#EAF5EE', borderRadius: 14, padding: 12, gap: 2 },
  tierName: { fontSize: 13, fontWeight: '700', color: '#1F7A50' },
  tierValue: { fontSize: 20, fontWeight: '800', color: '#17251E' },
  tierCount: { fontSize: 13, fontWeight: '600', color: '#17251E', marginTop: 4 },
});
