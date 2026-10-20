# Std0251344IPFinal2026 — HR Manager & Salary Analytics System

Final Exam: Internet Programming (2026)

```
Std0251344IPFinal2026
├── backend    (Express.js + MySQL)
└── frontend   (React Native / Expo)
```

## Backend

```bash
cd backend
npm install
cp .env.example .env    # fill in DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
node server.js          # http://localhost:3100
```

Database table `Warit_Employees`:
`Warit_ID_Employ`, `Warit_Name_Employ`, `Warit_Position_Employ`, `Warit_Status_Employ`, `Warit_Salary_Employ`

### API

| Method | Path | Description |
|---|---|---|
| POST | `/api/login` | `admin` / `password123` → `{ success: true, token: "mock-jwt-token" }`, otherwise 401 |
| GET | `/api/employees` | All employees |
| POST | `/api/employees` | Add employee (`name`, `position`, `salary` required → else 400) |
| PUT | `/api/employees/:id/status` | Toggle `Active` ↔ `On Leave` |
| DELETE | `/api/employees/:id` | Remove employee |
| GET | `/api/employees/salary-clusters` | 1D K-Means (k=3) salary tiers |

Employee endpoints require header `Authorization: Bearer mock-jwt-token`.

## Frontend

```bash
cd frontend
npm install
npx expo start          # press w for web, or scan QR with Expo Go
```

API URL is set in `frontend/src/lib/api.ts`.

Login: `admin` / `password123`
