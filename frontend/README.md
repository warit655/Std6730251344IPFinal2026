Std0251344IPFinal2026 — HR Manager & Salary Analytics System

Final Exam: Internet Programming (2026) ระบบจัดการพนักงาน + วิเคราะห์โครงสร้างเงินเดือนด้วย K-Means

Std0251344IPFinal2026
├── backend    (Express.js + MySQL)
└── frontend   (React Native / Expo)
1. สิ่งที่ต้องติดตั้งก่อน
โปรแกรม	ใช้ทำอะไร	ดาวน์โหลด
Node.js (LTS, v18 ขึ้นไป)	รัน backend และ Expo	https://nodejs.org
Git	ดึงโค้ดจาก GitHub	https://git-scm.com
MySQL / MariaDB	ฐานข้อมูล (หรือใช้ของ Server Cloud ที่มีอยู่แล้ว)	–
Expo Go (ไม่บังคับ)	เปิดแอปบนมือถือ	App Store / Play Store

เช็กว่าติดตั้งแล้ว:

bash
node -v
npm -v
git --version

Windows: ถ้า PowerShell ขึ้นว่า running scripts is disabled ให้ใช้ Command Prompt แทน หรือรัน Set-ExecutionPolicy -Scope CurrentUser RemoteSigned หนึ่งครั้ง

2. ดึงโค้ด
bash
git clone https://github.com/warit655/Std0251344IPFinal2026.git
cd Std0251344IPFinal2026
3. ฐานข้อมูล

รันคำสั่งนี้ใน phpMyAdmin (แท็บ SQL) หรือ MySQL client:

sql
CREATE TABLE IF NOT EXISTS Warit_Employees (
  Warit_ID_Employ INT AUTO_INCREMENT PRIMARY KEY,
  Warit_Name_Employ VARCHAR(100) NOT NULL,
  Warit_Position_Employ VARCHAR(100) NOT NULL,
  Warit_Status_Employ ENUM('Active', 'On Leave') NOT NULL DEFAULT 'Active',
  Warit_Salary_Employ DECIMAL(10,2) NOT NULL,
  Warit_Image_Employ MEDIUMTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO Warit_Employees (Warit_Name_Employ, Warit_Position_Employ, Warit_Status_Employ, Warit_Salary_Employ) VALUES
('John Doe', 'Software Engineer', 'Active', 45000),
('Jane Smith', 'UX Designer', 'Active', 42000),
('Somchai Jaidee', 'Office Assistant', 'On Leave', 15000),
('Nida Srisuk', 'Receptionist', 'Active', 18000),
('Anan Wongsa', 'Data Analyst', 'Active', 50000),
('Mali Rakdee', 'Engineering Manager', 'Active', 85000),
('Kittipong Saetang', 'CTO', 'Active', 90000);
4. Backend (Express.js)
bash
cd backend
npm install

สร้างไฟล์ .env จาก .env.example แล้วใส่ค่าฐานข้อมูลของตัวเอง:

PORT=3100
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

รันเซิร์ฟเวอร์:

bash
node server.js

ต้องขึ้นข้อความ API running on port 3100

รันค้างไว้บนเซิร์ฟเวอร์ Linux: nohup node server.js > nohup.out 2>&1 &

5. Frontend (React Native / Expo)

เปิด Terminal ใหม่ (ปล่อย backend รันไว้):

bash
cd frontend
npm install
npx expo install --fix
npx expo start -c
กด w เปิดบนเว็บเบราว์เซอร์
หรือสแกน QR ด้วยแอป Expo Go บนมือถือ (มือถือกับคอมต้องอยู่ Wi-Fi เดียวกัน)

ที่อยู่ backend ตั้งไว้ที่ frontend/src/lib/api.ts:

ts
export const API_URL = 'http://119.59.102.161:3100/api';

ถ้ารัน backend บนเครื่องตัวเอง เปลี่ยนเป็น http://localhost:3100/api (เปิดบนเว็บ) หรือ http://<IP เครื่องคอม>:3100/api (เปิดบนมือถือ)

6. วิธีใช้งาน
Login ด้วย admin / password123 (ใส่ผิดจะขึ้น Alert)
Dashboard
ด้านบนแสดงยอดเงินเดือนรวม และจำนวนพนักงานทั้งหมด / Active / On Leave
+ Add Employee (หรือปุ่ม + มุมขวาล่าง) → กรอกชื่อ ตำแหน่ง เงินเดือน ใส่รูปได้ → กด ✨ AI suggest ให้ AI แนะนำเงินเดือนจากตำแหน่งที่คล้ายกัน
ช่องค้นหา กรองรายชื่อทันทีขณะพิมพ์ (ชื่อ / ตำแหน่ง / เงินเดือน) + ปุ่มกรอง All / Active / On Leave + เรียงลำดับ
แต่ละคนมีปุ่ม ✏️ Edit (แก้ข้อมูล + รูป), Toggle Status (Active ↔ On Leave), 🗑 Delete (ถาม "Are you sure?" ก่อนลบ)
Analyze Salary Structure → แสดงตัวโหลด แล้วแบ่งเงินเดือนเป็น 3 Tier ด้วย K-Means พร้อมการ์ดสรุปและกราฟแท่ง
✨ AI HR Assistant → Ask AI → ให้คะแนนสุขภาพโครงสร้างเงินเดือน (0–100) พร้อมคำแนะนำ เช่น ส่วนต่างเงินเดือน, คนที่เงินเดือนผิดปกติ, สัดส่วนคนลา