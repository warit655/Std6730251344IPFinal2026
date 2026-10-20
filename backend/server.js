// HR Manager & Salary Analytics — Backend (Express + MySQL)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

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
  CAST(Warit_Salary_Employ AS DECIMAL(10,2)) + 0 AS salary
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
  if (username === 'admin' && password === 'password123') {
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
// PHASE 1: CRUD
// =======================================================
app.get('/api/employees', requireToken, h(async (req, res) => {
  const [rows] = await pool.query(SELECT_EMP + ' ORDER BY Warit_ID_Employ');
  res.status(200).json(rows.map((r) => ({ ...r, salary: Number(r.salary) })));
}));

app.post('/api/employees', requireToken, h(async (req, res) => {
  const { name, position, salary } = req.body || {};
  const n = String(name ?? '').trim();
  const p = String(position ?? '').trim();
  const s = Number(salary);

  if (!n || !p || salary === undefined || salary === null || String(salary).trim() === '') {
    return res.status(400).json({ success: false, message: 'name, position and salary are required' });
  }
  if (!Number.isFinite(s) || s < 0) {
    return res.status(400).json({ success: false, message: 'salary must be a positive number' });
  }

  const [rs] = await pool.query(
    "INSERT INTO Warit_Employees (Warit_Name_Employ, Warit_Position_Employ, Warit_Status_Employ, Warit_Salary_Employ) VALUES (?, ?, 'Active', ?)",
    [n, p, s]
  );
  const [[emp]] = await pool.query(SELECT_EMP + ' WHERE Warit_ID_Employ = ?', [rs.insertId]);
  res.status(201).json({ success: true, employee: { ...emp, salary: Number(emp.salary) } });
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
