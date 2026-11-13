# TabOrder - Project Architecture & Specification

## 1. System Overview
TabOrder is a lightweight, real-time SaaS utility for restaurants. Customers scan a table-specific QR code to access a web menu and place orders. Orders are instantly routed to a local admin dashboard, which then pushes raw print commands to a physical thermal receipt printer.

## 2. Tech Stack
* **Frontend (Customer & Admin):** Next.js / React, Tailwind CSS. (Mobile-first, under 1MB).
* **Backend:** Node.js (Express).
* **Database:** PostgreSQL with Prisma or Drizzle ORM.
* **Real-time Engine:** WebSockets (Socket.io) for live order routing.
* **Hardware Integration:** Background Python or Node.js script on local PC for raw ESC/POS thermal printing.

## 3. Core Workflows
* **Customer:** Scans QR -> Opens `?table=X` -> Adds items -> Hits "Order" -> Session locks.
* **Admin Dashboard:** Displays live grid of tables (Green = Empty, Red = Active/Ordering). Auto-calculates bill totals.
* **Hardware Print:** Backend receives order -> Emits WebSocket event to specific restaurant room -> Local machine script catches event -> Prints physical ticket for the kitchen via thermal printer. 

## 4. Development Rules
* Build strictly in isolated phases.
* Maintain clean relational database integrity.
* No bloated libraries.