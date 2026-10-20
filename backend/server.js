// HR Manager & Salary Analytics — Backend (Express + MySQL)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' })); // รูปส่งมาเป็น base64

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectionLimit: 10,
});

// ชื่อตาราง/คอลัมน์ในฐานข้อมูล → แปลงเป็น JSON ตามโจทย์ (id, name, position, status, salary)
const SELECT_EMP = `SELECT
  CAST(Warit_ID_Employ AS CHAR) AS id,
  Warit_Name_Employ AS name,
  Warit_Position_Employ AS position,
  Warit_Status_Employ AS status,
  CAST(Warit_Salary_Employ AS DECIMAL(10,2)) + 0 AS salary,
  Warit_Image_Employ AS image
FROM Warit_Employees`;

// ครอบ route ให้ error ไม่ทำเซิร์ฟเวอร์ล่ม
const h = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  });

// =======================================================
// PHASE 1: LOGIN
// =======================================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === '123456') {
    return res.status(200).json({ success: true, token: 'mock-jwt-token' });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});


// ต้องส่ง Authorization: Bearer mock-jwt-token ถึงจะใช้ API พนักงานได้
function requireToken(req, res, next) {
  if ((req.headers.authorization || '') !== 'Bearer mock-jwt-token') {
    return res.status(401).json({ success: false, message: 'Unauthorized: please login first' });
  }
  next();
}

// =======================================================
// PHASE 2: K-MEANS (ต้องอยู่ก่อน /:id)
// =======================================================
function kmeans1D(values, k = 3, maxIter = 100) {
  const sorted = [...values].sort((a, b) => a - b);
  const uniq = [...new Set(sorted)];
  const kk = Math.min(k, uniq.length); // กันกรณีข้อมูลน้อยกว่า 3 ค่า
  if (kk === 0) return [];

  // เริ่ม centroid กระจายเท่าๆ กันจากค่าที่เรียงแล้ว
  let centroids = Array.from({ length: kk }, (_, i) => uniq[Math.round((i * (uniq.length - 1)) / Math.max(1, kk - 1))]);
  let assign = [];

  for (let iter = 0; iter < maxIter; iter++) {
    assign = values.map((v) => {
      let best = 0;
      for (let c = 1; c < kk; c++) if (Math.abs(v - centroids[c]) < Math.abs(v - centroids[best])) best = c;
      return best;
    });
    const next = centroids.map((old, c) => {
      const group = values.filter((_, i) => assign[i] === c);
      return group.length ? group.reduce((a, b) => a + b, 0) / group.length : old;
    });
    const moved = next.some((c, i) => Math.abs(c - centroids[i]) > 1e-9);
    centroids = next;
    if (!moved) break;
  }

  return centroids
    .map((c, i) => ({ centroid: c, count: assign.filter((a) => a === i).length }))
    .filter((g) => g.count > 0)
    .sort((a, b) => a.centroid - b.centroid);
}

app.get('/api/employees/salary-clusters', requireToken, h(async (req, res) => {
  const [rows] = await pool.query('SELECT Warit_Salary_Employ AS salary FROM Warit_Employees');
  const salaries = rows.map((r) => Number(r.salary)).filter((n) => Number.isFinite(n));
  const clusters = kmeans1D(salaries, 3).map((g, i) => ({
    group: `Tier ${i + 1}`,
    centroid: Math.round(g.centroid),
    count: g.count,
  }));
  res.status(200).json({ success: true, clusters });
}));

// =======================================================
// AI: วิเคราะห์โครงสร้างเงินเดือนอัตโนมัติ (ใช้ผล K-Means + สถิติ)
// =======================================================
const baht = (n) => '฿' + Math.round(n).toLocaleString('en-US');

app.get('/api/employees/ai-insights', requireToken, h(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT Warit_Name_Employ AS name, Warit_Position_Employ AS position, Warit_Status_Employ AS status, Warit_Salary_Employ AS salary FROM Warit_Employees'
  );
  const emps = rows.map((r) => ({ ...r, salary: Number(r.salary) }));
  if (!emps.length) return res.json({ success: true, score: 0, insights: [{ type: 'info', title: 'No data', text: 'Add employees to get AI insights.' }] });

  const salaries = emps.map((e) => e.salary);
  const total = salaries.reduce((a, b) => a + b, 0);
  const avg = total / salaries.length;
  const sorted = [...salaries].sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const sd = Math.sqrt(salaries.reduce((a, s) => a + (s - avg) ** 2, 0) / salaries.length);
  const clusters = kmeans1D(salaries, 3);
  const onLeave = emps.filter((e) => e.status === 'On Leave');
  const top = emps.reduce((a, b) => (b.salary > a.salary ? b : a));
  const gap = clusters.length > 1 ? clusters[clusters.length - 1].centroid / clusters[0].centroid : 1;
  // ใครห่างจากค่าเฉลี่ยเกิน 1.5 SD ถือว่าผิดปกติ
  const outliers = sd > 0 ? emps.filter((e) => Math.abs(e.salary - avg) > 1.5 * sd) : [];

  const insights = [
    { type: 'info', title: 'Monthly payroll', text: `Total ${baht(total)} for ${emps.length} employees • average ${baht(avg)} • median ${baht(median)}.` },
    {
      type: gap > 4 ? 'warning' : 'success',
      title: 'Pay gap',
      text: `Top tier earns ${gap.toFixed(1)}× the lowest tier. ${gap > 4 ? 'The gap is wide — review junior salaries.' : 'The salary structure looks balanced.'}`,
    },
    { type: 'info', title: 'Highest paid', text: `${top.name} (${top.position}) at ${baht(top.salary)}.` },
  ];
  if (outliers.length) {
    insights.push({ type: 'warning', title: 'Salary outliers', text: `${outliers.map((o) => `${o.name} (${baht(o.salary)})`).join(', ')} differ strongly from the company average.` });
  }
  if (onLeave.length) {
    const pct = Math.round((onLeave.length / emps.length) * 100);
    insights.push({ type: pct > 30 ? 'warning' : 'info', title: 'Staff availability', text: `${onLeave.length} employee(s) on leave (${pct}%). ${pct > 30 ? 'Team capacity may be at risk.' : 'Capacity is healthy.'}` });
  }
  // คะแนนสุขภาพโครงสร้างเงินเดือน 0-100
  const score = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, gap - 2) * 10 - outliers.length * 8 - (onLeave.length / emps.length) * 40)));
  res.json({ success: true, score, insights });
}));

// AI: แนะนำเงินเดือนจากตำแหน่ง (ดูคนที่ตำแหน่งคล้ายกัน)
app.get('/api/employees/suggest-salary', requireToken, h(async (req, res) => {
  const position = String(req.query.position || '').trim().toLowerCase();
  if (!position) return res.status(400).json({ success: false, message: 'position is required' });
  const [rows] = await pool.query('SELECT Warit_Position_Employ AS position, Warit_Salary_Employ AS salary FROM Warit_Employees');
  const words = position.split(/\s+/).filter((w) => w.length > 2);
  const scored = rows
    .map((r) => {
      const p = String(r.position).toLowerCase();
      const hits = p === position ? 10 : words.filter((w) => p.includes(w)).length;
      return { salary: Number(r.salary), hits };
    })
    .filter((r) => r.hits > 0);
  if (!scored.length) return res.json({ success: true, suggested: null, basedOn: 0, message: 'No similar positions found yet' });
  // ถ่วงน้ำหนักตามความคล้าย
  const weight = scored.reduce((a, r) => a + r.hits, 0);
  const suggested = Math.round(scored.reduce((a, r) => a + r.salary * r.hits, 0) / weight / 500) * 500;
  res.json({ success: true, suggested, basedOn: scored.length, message: `Based on ${scored.length} similar position(s)` });
}));

// =======================================================
// PHASE 1: CRUD
// =======================================================
app.get('/api/employees', requireToken, h(async (req, res) => {
  const [rows] = await pool.query(SELECT_EMP + ' ORDER BY Warit_ID_Employ');
  res.status(200).json(rows.map((r) => ({ ...r, salary: Number(r.salary) })));
}));

// ตรวจข้อมูลพนักงาน (ใช้ทั้งเพิ่มและแก้ไข) → คืน error message หรือ null
function validateEmployee(body) {
  const { name, position, salary } = body || {};
  if (!String(name ?? '').trim() || !String(position ?? '').trim() || salary === undefined || salary === null || String(salary).trim() === '') {
    return 'name, position and salary are required';
  }
  const s = Number(salary);
  if (!Number.isFinite(s) || s < 0) return 'salary must be a positive number';
  return null;
}

const cleanImage = (img) => {
  const v = String(img ?? '').trim();
  return v ? v : null;
};

app.post('/api/employees', requireToken, h(async (req, res) => {
  const error = validateEmployee(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const { name, position, salary, image } = req.body;

  const [rs] = await pool.query(
    "INSERT INTO Warit_Employees (Warit_Name_Employ, Warit_Position_Employ, Warit_Status_Employ, Warit_Salary_Employ, Warit_Image_Employ) VALUES (?, ?, 'Active', ?, ?)",
    [String(name).trim(), String(position).trim(), Number(salary), cleanImage(image)]
  );
  const [[emp]] = await pool.query(SELECT_EMP + ' WHERE Warit_ID_Employ = ?', [rs.insertId]);
  res.status(201).json({ success: true, employee: { ...emp, salary: Number(emp.salary) } });
}));

// แก้ไขข้อมูลพนักงาน (ชื่อ ตำแหน่ง เงินเดือน รูป)
app.put('/api/employees/:id', requireToken, h(async (req, res) => {
  const error = validateEmployee(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const { name, position, salary, image } = req.body;

  const [rs] = await pool.query(
    `UPDATE Warit_Employees
     SET Warit_Name_Employ = ?, Warit_Position_Employ = ?, Warit_Salary_Employ = ?, Warit_Image_Employ = ?
     WHERE Warit_ID_Employ = ?`,
    [String(name).trim(), String(position).trim(), Number(salary), cleanImage(image), req.params.id]
  );
  if (rs.affectedRows === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
  const [[emp]] = await pool.query(SELECT_EMP + ' WHERE Warit_ID_Employ = ?', [req.params.id]);
  res.status(200).json({ success: true, employee: { ...emp, salary: Number(emp.salary) } });
}));

app.put('/api/employees/:id/status', requireToken, h(async (req, res) => {
  const [rs] = await pool.query(
    `UPDATE Warit_Employees
     SET Warit_Status_Employ = IF(Warit_Status_Employ = 'Active', 'On Leave', 'Active')
     WHERE Warit_ID_Employ = ?`,
    [req.params.id]
  );
  if (rs.affectedRows === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
  const [[emp]] = await pool.query(SELECT_EMP + ' WHERE Warit_ID_Employ = ?', [req.params.id]);
  res.status(200).json({ success: true, employee: { ...emp, salary: Number(emp.salary) } });
}));

app.delete('/api/employees/:id', requireToken, h(async (req, res) => {
  const [rs] = await pool.query('DELETE FROM Warit_Employees WHERE Warit_ID_Employ = ?', [req.params.id]);
  if (rs.affectedRows === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.status(200).json({ success: true, message: 'Employee deleted' });
}));

// ไม่พบ route
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const port = process.env.PORT || 3100;
app.listen(port, '0.0.0.0', () => console.log('API running on port ' + port));
