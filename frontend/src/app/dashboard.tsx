import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { baht, confirm, hasToken, request, setToken, showAlert, TIER_COLORS, type Cluster, type Employee } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { EmployeeForm, type EmployeeInput } from '@/components/EmployeeForm';

type Filter = 'All' | 'Active' | 'On Leave';
type Sort = 'name' | 'salary-high' | 'salary-low';
type Insight = { type: 'info' | 'success' | 'warning'; title: string; text: string };

const G = '#1F7A50';

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [sort, setSort] = useState<Sort>('name');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [ai, setAi] = useState<{ score: number; insights: Insight[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  // ยังไม่ login → กลับหน้า Login
  useEffect(() => {
    if (!hasToken()) {
      router.replace('/');
      return;
    }
    void load();
  }, [load]);

  // ข้อมูลเปลี่ยน → ผลวิเคราะห์เดิมไม่ตรงแล้ว
  const invalidate = () => {
    setClusters(null);
    setAi(null);
  };

  // ===== ค้นหาแบบเรียลไทม์ + กรอง + เรียง =====
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = employees.filter(
      (e) =>
        (filter === 'All' || e.status === filter) &&
        (!q || e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || String(e.salary).includes(q))
    );
    return out.sort((a, b) =>
      sort === 'salary-high' ? b.salary - a.salary : sort === 'salary-low' ? a.salary - b.salary : a.name.localeCompare(b.name)
    );
  }, [employees, query, filter, sort]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === 'Active').length;
    const payroll = employees.reduce((n, e) => n + e.salary, 0);
    return { total: employees.length, active, leave: employees.length - active, payroll, avg: employees.length ? payroll / employees.length : 0 };
  }, [employees]);

  // หาว่าพนักงานแต่ละคนอยู่ Tier ไหน (เทียบกับ centroid ที่ใกล้สุด)
  const tierOf = (salary: number) => {
    if (!clusters?.length) return -1;
    let best = 0;
    clusters.forEach((c, i) => {
      if (Math.abs(salary - c.centroid) < Math.abs(salary - clusters[best].centroid)) best = i;
    });
    return best;
  };

  // ===== Actions =====
  async function save(data: EmployeeInput) {
    if (editing) await request('PUT', `/employees/${editing.id}`, data);
    else await request('POST', '/employees', data);
    invalidate();
    await load();
  }

  async function toggleStatus(emp: Employee) {
    try {
      await request('PUT', `/employees/${emp.id}/status`);
      invalidate();
      await load();
    } catch (e) {
      showAlert('Error', (e as Error).message);
    }
  }

  async function remove(emp: Employee) {
    const ok = await confirm('Are you sure?', `Delete ${emp.name}? This cannot be undone.`);
    if (!ok) return;
    try {
      await request('DELETE', `/employees/${emp.id}`);
      invalidate();
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

  async function askAi() {
    setAiLoading(true);
    try {
      setAi(await request<{ score: number; insights: Insight[] }>('GET', '/employees/ai-insights'));
    } catch (e) {
      showAlert('Error', (e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setFormOpen(true);
  };

  const maxCount = Math.max(1, ...(clusters || []).map((c) => c.count));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F8F5' }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={G} />}
      >
        {/* ===== HERO ===== */}
        <View style={s.hero}>
          <View style={[s.bubble, { width: 220, height: 220, right: -60, top: -80 }]} />
          <View style={[s.bubble, { width: 120, height: 120, right: 90, bottom: -50 }]} />
          <View style={s.wrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroSub}>Welcome back, Admin 👋</Text>
                <Text style={s.heroTitle}>HR Dashboard</Text>
              </View>
              <Pressable onPress={() => { setToken(null); router.replace('/'); }} style={s.logout}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Logout</Text>
              </Pressable>
            </View>
            <Text style={s.payLabel}>Monthly payroll</Text>
            <Text style={s.payValue}>{baht(stats.payroll)}</Text>
            <Text style={s.heroSub}>Average {baht(stats.avg)} per employee</Text>
          </View>
        </View>

        <View style={[s.wrap, { marginTop: -34, gap: 16 }]}>
          {/* ===== STATS ===== */}
          <View style={s.statRow}>
            <Stat label="Employees" value={stats.total} color={G} icon="👥" />
            <Stat label="Active" value={stats.active} color="#1D6FB8" icon="✅" />
            <Stat label="On Leave" value={stats.leave} color="#B4531B" icon="🌴" />
          </View>

          {/* ===== AI INSIGHTS ===== */}
          <View style={[s.card, { borderColor: '#E6DAF7' }]}>
            <View style={s.rowCenter}>
              <View style={[s.iconBox, { backgroundColor: '#F1EAFB' }]}>
                <Text style={{ fontSize: 18 }}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>AI HR Assistant</Text>
                <Text style={s.sub}>Smart analysis of your salary structure</Text>
              </View>
              <Pressable onPress={askAi} disabled={aiLoading} style={[s.pill, { backgroundColor: '#7A4BC2' }]}>
                {aiLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.pillText}>{ai ? 'Refresh' : 'Ask AI'}</Text>}
              </Pressable>
            </View>
            {ai ? (
              <>
                <View style={s.rowCenter}>
                  <Text style={[s.sub, { flex: 1 }]}>Salary health score</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: ai.score >= 70 ? G : ai.score >= 40 ? '#B4531B' : '#A12A1E' }}>{ai.score}/100</Text>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${ai.score}%`, backgroundColor: ai.score >= 70 ? G : ai.score >= 40 ? '#D98A2B' : '#C0392B' }]} />
                </View>
                {ai.insights.map((it, i) => (
                  <View key={i} style={[s.insight, { backgroundColor: it.type === 'warning' ? '#FFF5E6' : it.type === 'success' ? '#EAF5EE' : '#F4F7F5' }]}>
                    <Text style={{ fontSize: 15 }}>{it.type === 'warning' ? '⚠️' : it.type === 'success' ? '✅' : '💡'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.insightTitle}>{it.title}</Text>
                      <Text style={s.insightText}>{it.text}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </View>

          {/* ===== K-MEANS ===== */}
          <View style={s.card}>
            <View style={s.rowCenter}>
              <View style={[s.iconBox, { backgroundColor: '#EAF5EE' }]}>
                <Text style={{ fontSize: 18 }}>📊</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>Salary Structure</Text>
                <Text style={s.sub}>K-Means clustering • 3 tiers</Text>
              </View>
            </View>
            <Pressable onPress={analyze} disabled={analyzing} style={({ pressed }) => [s.btn, (pressed || analyzing) && { opacity: 0.85 }]}>
              <Text style={s.btnText}>Analyze Salary Structure</Text>
            </Pressable>
            {analyzing ? (
              <View style={{ alignItems: 'center', padding: 14, gap: 8 }}>
                <ActivityIndicator size="large" color={G} />
                <Text style={s.sub}>Running K-Means clustering...</Text>
              </View>
            ) : null}
            {clusters ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  {clusters.map((c, i) => (
                    <View key={c.group} style={[s.tier, { borderTopColor: TIER_COLORS[i % 3] }]}>
                      <Text style={[s.tierName, { color: TIER_COLORS[i % 3] }]}>{c.group}</Text>
                      <Text style={s.tierValue}>{baht(c.centroid)}</Text>
                      <Text style={s.sub}>average salary</Text>
                      <Text style={s.tierCount}>👥 {c.count} employee{c.count === 1 ? '' : 's'}</Text>
                    </View>
                  ))}
                </View>
                {clusters.length === 0 ? <Text style={s.sub}>No salary data</Text> : null}
                {/* กราฟแท่งจำนวนคนต่อ Tier */}
                {clusters.map((c, i) => (
                  <View key={c.group + '-bar'} style={s.rowCenter}>
                    <Text style={[s.sub, { width: 52 }]}>{c.group}</Text>
                    <View style={[s.track, { flex: 1 }]}>
                      <View style={[s.fill, { width: `${(c.count / maxCount) * 100}%`, backgroundColor: TIER_COLORS[i % 3] }]} />
                    </View>
                    <Text style={[s.sub, { width: 22, textAlign: 'right' }]}>{c.count}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* ===== SEARCH + FILTER ===== */}
          <View style={s.rowCenter}>
            <Text style={[s.h2, { flex: 1 }]}>Employees</Text>
            <Pressable onPress={openAdd} style={[s.pill, { backgroundColor: G }]}>
              <Text style={s.pillText}>+ Add Employee</Text>
            </Pressable>
          </View>

          <View style={s.search}>
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, position or salary..."
              placeholderTextColor="#94A39B"
              style={{ flex: 1, fontSize: 15, color: '#17251E', height: '100%' }}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
                <Text style={{ color: '#5B6B63', fontSize: 16 }}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['All', 'Active', 'On Leave'] as Filter[]).map((f) => (
              <Chip key={f} text={f} active={filter === f} onPress={() => setFilter(f)} />
            ))}
            <View style={{ width: 1, backgroundColor: '#D6E4DB', marginHorizontal: 2 }} />
            <Chip text="A–Z" active={sort === 'name'} onPress={() => setSort('name')} />
            <Chip text="Salary ↓" active={sort === 'salary-high'} onPress={() => setSort('salary-high')} />
            <Chip text="Salary ↑" active={sort === 'salary-low'} onPress={() => setSort('salary-low')} />
          </View>

          <Text style={s.sub}>
            Showing {list.length} of {employees.length}
            {query ? ` for "${query}"` : ''}
          </Text>

          {/* ===== LIST ===== */}
          {loading ? <ActivityIndicator size="large" color={G} style={{ padding: 24 }} /> : null}
          {!loading && list.length === 0 ? (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 30 }]}>
              <Text style={{ fontSize: 36 }}>🔎</Text>
              <Text style={s.sub}>{employees.length ? 'No employees match your search' : 'No employees yet'}</Text>
            </View>
          ) : null}

          {list.map((emp) => {
            const active = emp.status === 'Active';
            const t = tierOf(emp.salary);
            return (
              <View key={emp.id} style={s.card}>
                <View style={s.rowCenter}>
                  <Avatar name={emp.name} image={emp.image} size={54} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.name}>{emp.name}</Text>
                    <Text style={s.sub}>{emp.position}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <View style={[s.badge, { backgroundColor: active ? '#DDF1E6' : '#FFF1DD' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: active ? G : '#8A4510' }}>● {emp.status}</Text>
                      </View>
                      {t >= 0 ? (
                        <View style={[s.badge, { backgroundColor: TIER_COLORS[t % 3] + '22' }]}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: TIER_COLORS[t % 3] }}>{clusters![t].group}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text style={s.salary}>{baht(emp.salary)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <ActionBtn label="✏️ Edit" onPress={() => openEdit(emp)} />
                  <ActionBtn label={active ? '🌴 Toggle Status' : '✅ Toggle Status'} onPress={() => toggleStatus(emp)} flex />
                  <ActionBtn label="🗑 Delete" onPress={() => remove(emp)} danger />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ปุ่มลอยเพิ่มพนักงาน */}
      <Pressable onPress={openAdd} accessibilityLabel="Add employee" style={({ pressed }) => [s.fab, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Text style={{ color: '#FFF', fontSize: 30, lineHeight: 32, fontWeight: '300' }}>+</Text>
      </Pressable>

      <EmployeeForm visible={formOpen} employee={editing} onClose={() => setFormOpen(false)} onSubmit={save} />
    </SafeAreaView>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <View style={[s.card, s.stat]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ fontSize: 26, fontWeight: '900', color }}>{value}</Text>
      <Text style={s.sub}>{label}</Text>
    </View>
  );
}

function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: '#17251E', borderColor: '#17251E' }]}>
      <Text style={{ fontSize: 13, fontWeight: active ? '800' : '500', color: active ? '#FFF' : '#17251E' }}>{text}</Text>
    </Pressable>
  );
}

function ActionBtn({ label, onPress, danger, flex }: { label: string; onPress: () => void; danger?: boolean; flex?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        flex && { flex: 1 },
        danger && { borderColor: '#F0C9C4', backgroundColor: '#FFF7F6' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: danger ? '#A12A1E' : G }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18 },
  hero: { backgroundColor: G, paddingTop: 20, paddingBottom: 56, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  bubble: { position: 'absolute', borderRadius: 999, backgroundColor: '#2E9466' },
  heroSub: { color: '#CBE9D7', fontSize: 13 },
  heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 2 },
  payLabel: { color: '#CBE9D7', fontSize: 13, marginTop: 22 },
  payValue: { color: '#FFF', fontSize: 38, fontWeight: '900', letterSpacing: -0.5 },
  logout: { height: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center' },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'flex-start', gap: 2, shadowColor: '#0B3D26', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  card: { backgroundColor: '#FFF', borderRadius: 22, borderWidth: 1, borderColor: '#E1ECE5', padding: 16, gap: 12 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  h2: { fontSize: 18, fontWeight: '800', color: '#17251E' },
  sub: { fontSize: 13, color: '#5B6B63' },
  pill: { height: 38, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  pillText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  btn: { height: 50, borderRadius: 14, backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  track: { height: 10, borderRadius: 5, backgroundColor: '#EEF3F0', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  insight: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14 },
  insightTitle: { fontWeight: '800', color: '#17251E', fontSize: 14 },
  insightText: { color: '#44544C', fontSize: 13, lineHeight: 19, marginTop: 2 },
  tier: { flex: 1, minWidth: 150, backgroundColor: '#FAFCFB', borderRadius: 16, padding: 14, gap: 2, borderWidth: 1, borderColor: '#E1ECE5', borderTopWidth: 5 },
  tierName: { fontSize: 13, fontWeight: '900' },
  tierValue: { fontSize: 22, fontWeight: '900', color: '#17251E' },
  tierCount: { fontSize: 13, fontWeight: '700', color: '#17251E', marginTop: 6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E1ECE5' },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#D6E4DB', backgroundColor: '#FFF', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '800', color: '#17251E' },
  salary: { fontSize: 16, fontWeight: '900', color: G },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  action: { height: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#CDE6D7', backgroundColor: '#F6FBF8', alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: G,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B3D26',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
