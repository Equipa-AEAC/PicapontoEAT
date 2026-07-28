# Architecture.md

# Pica Ponto
## System Architecture Specification

Version: 1.0

---

# Project Overview

Pica Ponto is a desktop-first attendance management platform designed for educational institutions. Its primary objective is to accurately register student attendance through RFID authentication while automatically calculating support and internship hours.

The system is intended to replace paper attendance sheets with an automated, reliable, and auditable solution.

The project consists of four major components:

- Embedded RFID Terminal
- Backend API
- SQLite Database
- Desktop Application (Tauri)

The system is designed to be modular, making each component independent and replaceable.

---

# High-Level Architecture

```
                     RFID Card
                         │
                         ▼
                 RDM6300 RFID Reader
                         │
                    UART Communication
                         │
                         ▼
                  ESP32 Attendance Terminal
                         │
                   HTTPS REST Requests
                         │
                         ▼
                  OCaml Backend Server
                         │
                 Business Logic Layer
                         │
                         ▼
                    SQLite Database
                         │
                REST / WebSocket API
                         │
                         ▼
              Tauri Desktop Application
```

---

# Component Overview

## Embedded Terminal

Responsibilities

- Read RFID cards
- Provide audible feedback
- Provide visual feedback
- Connect to WiFi
- Cache events when offline
- Synchronize cached events
- Receive OTA firmware updates

The embedded device **must never contain business logic**.

It should never determine:

- Entry vs Exit
- Student hours
- Internship progress

The terminal simply reports events.

---

## Backend

The backend is the core of the entire system.

Responsibilities

- Device authentication
- Student authentication
- Attendance validation
- Duplicate detection
- Attendance calculation
- Internship hour calculation
- Report generation
- Data persistence
- Configuration management

The backend is the only source of truth.

---

## Database

SQLite stores all persistent information.

SQLite is selected because:

- Simple deployment
- Zero configuration
- Single-file database
- Reliable
- ACID compliant
- Excellent for desktop applications

The database file should never be modified directly.

All interaction must happen through the backend.

---

## Desktop Application

Built using Tauri.

Responsibilities

- Dashboard
- Student management
- Attendance management
- Device management
- Report generation
- User management
- Settings
- System monitoring

The desktop application never communicates directly with SQLite.

It communicates only through the Backend API.

---

# Development Philosophy

The project follows strict separation of responsibilities.

```
ESP32

↓

Collect Data

↓

Backend

↓

Process Data

↓

Database

↓

Store Data

↓

Desktop

↓

Display Data
```

No component should perform another component's responsibilities.

---

# Technology Stack

## Firmware

Language

- C++

Framework

- Arduino Framework

Hardware

- ESP32
- RDM6300
- RGB LED
- Buzzer

---

## Backend

Language

- OCaml

Responsibilities

- REST API
- Authentication
- Business Logic
- Database Layer

---

## Database

SQLite

Single database file.

Future migrations should remain compatible with PostgreSQL if enterprise deployment is desired.

---

## Desktop

Framework

Tauri

Frontend

One of the following:

- Vue 3 (Preferred)
- Svelte

Language

TypeScript

---

# Folder Structure

```
pica-ponto/

firmware/
backend/
frontend/
src-tauri/
database/
hardware/
docs/
production/
```

---

# Backend Structure

```
backend/

src/

api/
attendance/
authentication/
database/
devices/
students/
internships/
reports/
logs/
config/
utils/

main.ml
```

Each folder should encapsulate one business domain.

---

# Frontend Structure

```
frontend/

src/

components/
layouts/
pages/
stores/
services/
router/
types/
assets/
styles/

main.ts
```

Components must remain reusable.

Business logic should never exist inside components.

---

# Tauri Structure

```
src-tauri/

src/

commands/

state/

config/

main.rs
```

Rust inside Tauri should only provide desktop functionality.

Business logic remains inside the backend.

---

# Hardware Architecture

Hardware consists of:

ESP32

↓

UART

↓

RDM6300

↓

RFID Card

Additional peripherals

- RGB LED
- Piezo Buzzer
- USB-C Power
- Programming Header

Future expansion

- OLED Display
- RTC
- Ethernet
- Fingerprint Reader

---

# Communication

## ESP32 → Backend

REST API

JSON

HTTPS

Example

```
POST /attendance
```

```json
{
    "deviceId": "...",
    "uid": "...",
    "timestamp": "...",
    "firmware": "1.0.0"
}
```

---

## Desktop → Backend

REST API

Future

WebSockets

for

- Live dashboard
- Device monitoring
- Live attendance

---

# Business Rules

The backend owns all business rules.

Examples

- Student exists
- Card active
- Device authenticated
- Duplicate scan detection
- Entry vs Exit
- Internship hour calculation
- Attendance validation

No client should implement these rules.

---

# Modules

Attendance

Responsible for

- Register scan
- Determine entry
- Determine exit
- Calculate worked hours

---

Students

Responsible for

- Student CRUD
- Card assignment
- Status

---

Devices

Responsible for

- Registration
- Firmware
- Health
- Heartbeat

---

Internships

Responsible for

- Internship assignment
- Required hours
- Progress
- Completion

---

Reports

Responsible for

- Daily
- Weekly
- Monthly
- Internship
- Attendance

---

Authentication

Responsible for

- Login
- Session
- Roles
- Permissions

---

Logs

Responsible for

Audit trail

Never delete logs.

---

# Frontend Pages

Dashboard

Students

Attendance

Internships

Devices

Reports

Settings

Users

Login

Each page should be independent.

---

# UI Design Principles

Desktop-first.

Modern.

Minimal.

Fast.

Responsive.

Dark mode first.

Rounded corners.

Consistent spacing.

No unnecessary animations.

Accessibility considered.

---

# Dashboard Widgets

Current students

Today's attendance

Weekly hours

Internship progress

Recent scans

Connected devices

Offline devices

System health

---

# Design Principles

The system must prioritize

Reliability

Maintainability

Scalability

Security

Performance

Modularity

Readability

Testability

Every module should be independently testable.

---

# Coding Standards

Use descriptive names.

Avoid global state.

Avoid duplicated code.

Keep functions small.

One responsibility per module.

Prefer composition over inheritance.

Document public APIs.

Use TypeScript strict mode.

Backend should expose typed DTOs.

---

# Future Features

Multiple attendance terminals

Cloud synchronization

Automatic backups

Email notifications

QR identification

NFC

Fingerprint support

Facial recognition (optional)

LDAP / Active Directory integration

Analytics

OTA firmware updates

Mobile application

---

# LLM Development Guidelines

When generating code for this project, always follow these rules:

1. Respect the folder structure.
2. Never mix business logic with UI.
3. Never access SQLite directly from the frontend.
4. Keep modules independent.
5. Prefer reusable components.
6. Follow REST principles.
7. Use TypeScript strict mode.
8. Avoid unnecessary dependencies.
9. Write maintainable code instead of clever code.
10. Assume future scalability even if the initial deployment is for a single school.
11. Backend is the single source of truth.
12. Frontend should only display and submit data.
13. The ESP32 should never contain attendance business logic.
14. Every attendance action must be auditable.
15. Design for offline tolerance and future multi-device support.