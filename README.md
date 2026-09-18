# BUNK PRO - Fuel Bunk & Petrol Station Management System

An enterprise-grade, offline-first petrol bunk management system built with **React + TypeScript PWA**, **Dexie.js (IndexedDB)**, and **Spring Boot 3 + PostgreSQL**.

---

## Key Features

1. **Offline-First Zero Data Loss**:
   - Works fully without internet. All transactions, credits, readings, and payments persist to local IndexedDB.
   - Intelligent Background Sync Engine queues actions and syncs to PostgreSQL once connectivity is restored.
   - Idempotency with client UUIDs prevents duplicate entries under unstable network conditions.

2. **Role-Based Access Control (RBAC)**:
   - **Admin / Owner**: Manage staff, assign duties, view credit ledgers, enter/finalize readings, close shifts, audit cash differences, send payment alerts.
   - **Cashier / Shift Lead**: Issue fuel credit slips, record customer payments, monitor active duty statistics.
   - **Support Cashier**: Assist in shift operations with recorded audit logs.
   - **Customer**: Access personal fuel passbook, review credit slips, payment history, and receive owner payment reminders.

3. **Fuel Meter & Reading Management**:
   - Dynamic start/end meter tracking for **Petrol**, **Diesel**, and **Oil**.
   - Automatic calculation of liters dispensed and gross sales amount.
   - Shift finalization and record locking to prevent post-closure tampering.

4. **Duty Shift Closing & Cash Reconciliation**:
   - Mathematical formula:
     $$\text{Expected Cash Balance} = \text{Gross Fuel Sales} - \text{Customer Credit Issued} + \text{Cash Payments Received}$$
   - Compares physical cash in hand with calculated balance:
     - **MATCHED** ($\Delta = 0$)
     - **EXTRA AMOUNT** ($\Delta > 0$)
     - **SHORTAGE AMOUNT** ($\Delta < 0$)
   - Permanent locked closing record and printable shift settlement slip.

5. **Customer Credit & Ledger**:
   - Fast credit entry by liters or rupee amount.
   - Multi-mode payment recording (Cash, UPI, Card, Net Banking).
   - Real-time customer balance deduction and ledger history.

---

## Quickstart Guide

### 1. Run Frontend (React + TypeScript PWA)

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

### 2. Run Backend (Spring Boot 3 & PostgreSQL)

#### Option A: Run with Docker Compose (Recommended for Production)
```bash
docker-compose up -d
```

#### Option B: Run Standalone Backend
```bash
cd backend
mvn spring-boot:run
```

---

## Built-in Demo Accounts

Use the user switcher in the top-right navbar to test different roles:
- **Admin / Owner**: `Rajesh Sharma` (`admin` / `password123`)
- **Cashier / Shift Lead**: `Vikram Singh` (`cashier1` / `password123`)
- **Support Cashier**: `Anil Kumar` (`support1` / `password123`)
- **Customer Account**: `Ramesh Transport Corp` (`cust_ramesh` / `password123`)
