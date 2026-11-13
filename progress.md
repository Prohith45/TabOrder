# Progress Log

## 2026-06-22 - Step 1: Database Schema and REST API

### Context reviewed
- Read the project architecture note to confirm scope and sequencing.
- Stayed within Step 1 only: backend setup, database schema, and REST API.
- Deferred frontend, WebSocket delivery, and printer integration.

### Backend setup completed
- Initialized a Node.js backend with Express.
- Added Prisma and PostgreSQL configuration.
- Added environment setup with `.env` and `.env.example`.
- Added basic npm scripts for development, start, Prisma generate, and Prisma migrate.

### Database schema completed
- Created relational Prisma models for:
  - `Restaurant`
  - `Table`
  - `Category`
  - `MenuItem`
  - `Order`
  - `OrderItem`
- Added enum types for:
  - `TableStatus`
  - `OrderStatus`
- Added key constraints and relationships:
  - unique restaurant passkey
  - unique table number per restaurant
  - unique category name per restaurant
  - order to order-items relation
  - category to menu-items relation

### API implementation completed
- Added `GET /api/restaurants/:restaurantId/menu`
  - Returns restaurant details with categories and menu items.
- Added `POST /api/orders`
  - Accepts `restaurantId`, `tableNumber`, and `items`.
  - Validates table existence.
  - Validates menu item availability for the restaurant.
  - Calculates `totalAmount`.
  - Creates the order and linked order items in a transaction.
  - Updates the table status to `ACTIVE`.

### Project structure added
- `prisma/schema.prisma`
- `src/app.js`
- `src/server.js`
- `src/config/env.js`
- `src/db/prisma.js`
- `src/controllers/`
- `src/services/`
- `src/routes/`
- `src/middleware/`
- `src/utils/`

### Validation completed
- Generated Prisma client successfully.
- Validated Prisma schema successfully.
- Confirmed the Express server starts successfully on port `4000`.
- Confirmed JavaScript files parse successfully.

### Notes
- A `taborder_spec.md` file was not present in the workspace when this step was completed.
- The available architecture file was used as the source of system context.
- Future progress should be appended to this file after each completed milestone.

## 2026-06-22 - Step 2: WebSocket Engine

### Scope followed
- Added real-time routing to the Node.js backend only.
- Did not add React/frontend code.
- Did not add hardware printer logic.

### Dependencies added
- Installed `socket.io`.
- Installed `cors`.

### WebSocket engine completed
- Integrated Socket.IO with the existing Express app through an HTTP server wrapper.
- Added room naming logic scoped by `restaurantId`.
- Added `join_restaurant` socket event so clients can join their restaurant room.
- Ensured a socket leaves any previous restaurant room before joining a new one.
- Added join success and join error payloads for safer client integration.

### Order event routing completed
- Updated the order creation flow so successful order creation emits `new_order` only to the matching restaurant room.
- Kept the database transaction and real-time emission responsibilities separate.
- Returned the created order payload with table information included for downstream consumers.

### Server and error handling improvements
- Added CORS configuration for both Express and Socket.IO.
- Added configurable `CORS_ORIGIN` environment support.
- Added cleaner invalid JSON handling.
- Added a `404` API fallback response.
- Added startup error handling for cases like port conflicts.

### Files added or updated
- Updated `package.json`
- Updated `.env`
- Updated `.env.example`
- Updated `src/app.js`
- Updated `src/server.js`
- Updated `src/config/env.js`
- Updated `src/controllers/orderController.js`
- Updated `src/services/orderService.js`
- Updated `src/middleware/errorHandler.js`
- Added `src/socket/restaurantRoom.js`
- Added `src/socket/socketServer.js`

### Validation completed
- Confirmed all JavaScript files parse successfully.
- Confirmed the server boots successfully with Socket.IO attached.
- Confirmed the socket module initializes and can emit a restaurant-scoped `new_order` event.
- Used port `4100` for one verification run because port `4000` was already occupied in the local environment.

## 2026-06-22 - Step 3: Customer Web Interface

### Scope followed
- Built the customer-facing ordering frontend only.
- Did not add admin dashboard or hardware print logic.
- Frontend communicates exclusively through the REST API.

### Frontend setup completed
- Initialized a Next.js 15.3.4 frontend with React 19 and Tailwind CSS v4.
- Created `.env.local` with only `NEXT_PUBLIC_API_URL=http://localhost:4000`.
- Added Inter font via Google Fonts for reliable cross-device rendering.
- Added `postcss.config.mjs` for Tailwind v4 PostCSS plugin.
- Added `jsconfig.json` with `@/` path alias.

### Design system completed
- Mobile-first, high-contrast theme optimised for outdoor / bright-screen use.
- Warm amber/cream background with subtle radial gradients.
- Glassmorphic `.surface-card` components with backdrop blur.
- Orange gradient action buttons with hover/active transitions.
- Green success banners and red error banners.
- Fade-in, slide-in, pulse, and checkmark-pop animations.
- INR (₹) currency formatting throughout.

### Components built
- `components/CustomerOrderingApp.js` — Core client component:
  - Reads `?table=X` from URL; blocks UI if missing ("Invalid Table QR Code").
  - Fetches menu from `GET /api/restaurants/1/menu`.
  - Manages cart state (add items, change quantities, special instructions).
  - Submits order via `POST /api/orders` with `{ restaurantId, tableNumber, items }`.
  - Permanently locks session via `sessionStorage` after successful order.
  - Shows "Sent to Kitchen" + "Session Locked" success state.
- `components/MenuSection.js` — Category renderer:
  - Displays category header with item count.
  - Renders item cards with name, availability badge, price, and Add / +/- controls.
  - Disables interaction when locked or item unavailable.
- `components/CartPanel.js` — Cart sidebar:
  - Sticky positioning (bottom on mobile, top on desktop).
  - Per-item quantity controls and special instructions textarea.
  - Dark total bar with INR amount and "Place Order →" button.
  - Locked state with order ID display.
  - Empty cart placeholder.

### Pages
- `app/page.js` — Home page wrapping `CustomerOrderingApp` in `<Suspense>`.
- `app/layout.js` — Root layout with metadata, viewport config, Inter font.
- `app/globals.css` — Full design system with Tailwind v4 import.

### Build validated
- Clean `next build` with zero errors.
- Client-side JS payload: ~105 kB (well under 1 MB limit).
- All static pages generated successfully.

### Files added or updated
- Added `frontend/package.json`
- Added `frontend/.env.local`
- Added `frontend/next.config.mjs`
- Added `frontend/postcss.config.mjs`
- Added `frontend/jsconfig.json`
- Added `frontend/app/globals.css`
- Added `frontend/app/layout.js`
- Added `frontend/app/page.js`
- Added `frontend/components/CustomerOrderingApp.js`
- Added `frontend/components/CartPanel.js`
- Added `frontend/components/MenuSection.js`

## 2026-06-22 - Step 4: Admin Dashboard (Backend Initialization)

### Backend changes completed
- Created `src/services/restaurantService.js` to handle:
  - Restaurant passkey authentication (`authenticateRestaurant`).
  - Fetching restaurant tables (`getTables`).
  - Listing restaurant orders (`getOrders`).
  - Updating table status (`updateTableStatus`) with transactional automatic completion of pending/preparing orders.
- Updated `src/socket/socketServer.js` to add Socket.IO event emission helper functions:
  - `emitOrderUpdateToRestaurant(order)` for `order_updated` events.
  - `emitTableUpdateToRestaurant(restaurantId, table)` for `table_updated` events.

### Files added or updated
- Added [restaurantService.js](file:///C:/Users/papan/downloads/taborder/src/services/restaurantService.js)
- Updated [socketServer.js](file:///C:/Users/papan/downloads/taborder/src/socket/socketServer.js)

## 2026-06-22 - Step 4: Kitchen Display System (KDS)

### Scope followed
- Built the real-time kitchen screen `/kds` for cooks.
- Deferred hardware receipt printer logic.
- Managed ticket completion state locally in the frontend.

### Frontend implementation completed
- Installed `socket.io-client` in the frontend app.
- Created `/kds` route component (`frontend/app/kds/page.js`):
  - Dark, high-contrast dashboard theme for tablets or Raspberry Pi screens.
  - Initial active orders fetch from `GET /api/restaurants/1/orders` on mount to prevent loss of state on refresh.
  - WebSocket connection to `http://localhost:4000` with room join payload (`{"restaurantId": 1}`).
  - Audio alert chime generated dynamically via Web Audio API (`AudioContext`) to avoid loading external assets.
  - Sound enable/disable user controls in the header to handle browser autoplay policies.
  - Flashing animation entry for incoming orders.
  - Color-coded wait timers updating in real-time (Green < 5 mins, Amber 5-10 mins, Red > 10 mins).
  - High-visibility warning highlights for special instructions.
  - Large touch targets for "Mark Complete" actions (removing tickets with smooth exit animations).
  - Standalone testing toggle ("TEST TICKET") to simulate incoming orders.

### Backend support added
- Created `src/services/restaurantService.js` and `src/controllers/restaurantController.js` to fetch tables/orders.
- Mounted `/api/restaurants/:restaurantId/orders` and `/api/restaurants/:restaurantId/tables` endpoints via `src/routes/restaurantRoutes.js`.
- Integrated Socket.IO handlers in `src/app.js` and updated CORS parameters.

### Validation completed
- Frontend builds cleanly with zero compiler warnings.
- Verified client JS payload for `/kds` is only 16.1 kB, keeping the total size well under 1MB.
- Tested REST API to fetch seed orders successfully.

### Files added or updated
- Added `frontend/app/kds/page.js`
- Updated `frontend/package.json`
- Added `src/services/restaurantService.js`
- Added `src/controllers/restaurantController.js`
- Added `src/routes/restaurantRoutes.js`
- Updated `src/app.js`
- Updated `src/socket/socketServer.js`

## 2026-06-22 - Step 5: Thermal Printer Engine

### Scope followed
- Built physical thermal printer integration using raw ESC/POS commands via `node-thermal-printer`.
- Implemented background non-blocking execution.
- Added strict try-catch boundaries to prevent server crashes.

### Backend implementation completed
- Installed `node-thermal-printer` dependency.
- Updated `src/config/env.js` and `.env` / `.env.example` to expose printer settings (`PRINTER_ENABLED`, `PRINTER_TYPE`, `PRINTER_INTERFACE`).
- Created `src/services/printerService.js` containing:
  - ESC/POS formatting (Alignments, Double height/width styles, separators).
  - High-visibility warning frames for special instructions (`*** INSTRUCTION: ... ***`).
  - Automatic lookup of the restaurant name during formatting.
  - Fail-safe try-catch wrapper that logs printer network or hardware errors without interrupting server processes.
  - Dry-run capability that dumps formatted receipts to the console if physical printer communication is disabled.
- Hooked `printOrderTicket` into `src/controllers/orderController.js`:
  - Triggers asynchronously (non-blocking) right after database persistence and Socket.IO emission to ensure client response speed is unaffected.

### Validation completed
- Successfully ran the printer formatting dry-run test to verify receipt aesthetics and layout.
- Tested the `POST /api/orders` endpoint via REST client; confirmed order created successfully (201 Created) and dry-run print output ran.

### Files added or updated
- Added [printerService.js](file:///C:/Users/papan/downloads/taborder/src/services/printerService.js)
- Updated [orderController.js](file:///C:/Users/papan/downloads/taborder/src/controllers/orderController.js)
- Updated [env.js](file:///C:/Users/papan/downloads/taborder/src/config/env.js)
- Updated [.env](file:///C:/Users/papan/downloads/taborder/.env)
- Updated [.env.example](file:///C:/Users/papan/downloads/taborder/.env.example)

## 2026-06-22 - Step 6: The Admin Dashboard

### Scope followed
- Created full-featured admin management capabilities.
- Added API endpoints for CRUD management of categories and menu items.
- Built the desktop-friendly `/admin` console route with real-time websocket synchronization.
- Linked front-end forms directly to backend REST APIs.

### Backend implementation completed
- Updated `src/services/menuService.js` to implement category and menu item management:
  - `createCategory(restaurantId, { name })`
  - `updateCategory(categoryId, { name })`
  - `deleteCategory(categoryId)`
  - `createMenuItem(categoryId, { name, price, isAvailable })`
  - `updateMenuItem(itemId, { name, price, isAvailable })`
  - `deleteMenuItem(itemId)` with strict constraint-catching (returns clean user-friendly errors on attempts to delete items with order history).
- Updated `src/controllers/menuController.js` to define handlers for menu actions.
- Updated `src/routes/menuRoutes.js` to map endpoints.
- Updated `src/controllers/restaurantController.js` and `src/routes/restaurantRoutes.js` to support:
  - Admin login passkey authentication (`POST /api/restaurants/auth`).
  - Table settling / clearing status (`PATCH /api/restaurants/:restaurantId/tables/:tableNumber`).

### Frontend implementation completed
- Created desktop-focused admin dashboard component (`frontend/app/admin/page.js`):
  - Passkey login interface (`1234` in default database).
  - Sound toggle bar enabling/disabling browser chime alerts.
  - Socket.IO connection joining room `restaurant:1` to track real-time orders and table status changes.
  - **Live Table Grid**: Displays green/red (empty/active) states, active order summaries, and a one-click settlement button that updates table status to EMPTY and settles corresponding table orders.
  - **Menu Manager**: Complete CRUD operations interface allowing admins to dynamically create/rename/delete categories and add/edit/delete menu items (names, prices, and availability toggle).
  - **Order History & Revenue Reports**: Displays all completed and active orders from the database, calculating total settled revenue dynamically.

### Validation completed
- verified that Next.js production build completes successfully with zero compile warnings or SSR failures.
- Verified all front-end pages are compiled as static pages with tiny client footprint (JS sizes: customer 105 kB, KDS 117 kB, admin 120 kB).
- Validated all REST routes successfully.

### Files added or updated
- Added `frontend/app/admin/page.js`
- Updated `src/services/menuService.js`
- Updated `src/controllers/menuController.js`
- Updated `src/routes/menuRoutes.js`
- Updated `src/controllers/restaurantController.js`
- Updated `src/routes/restaurantRoutes.js`

## 2026-06-22 - Step 6 Extension: Table Management Panel

### Scope followed
- Implemented full-featured Table Management within the Admin Dashboard.
- Added API endpoints for table creation (with constraints checks) and table deletion.
- Integrated a new "Manage Tables" tab in the desktop-focused admin dashboard.

### Backend implementation completed
- Updated `src/services/restaurantService.js` to implement:
  - `createTable(restaurantId, { tableNumber })` with automated database UUID/CUID generation and error handling for duplicate numbers.
  - `deleteTable(tableId)` with validation to reject deletions if the table has active orders.
- Updated `src/controllers/restaurantController.js` to implement `addTable` and `removeTable`.
- Updated `src/routes/restaurantRoutes.js` to expose `POST /api/restaurants/:restaurantId/tables` and `DELETE /api/tables/:tableId` endpoints.

### Frontend implementation completed
- Updated `frontend/app/admin/page.js` to add:
  - A new **Manage Tables** navigation tab.
  - Form to create new tables, inputting number values and sending POST requests to the backend.
  - Interactive table list showing table numbers, status pills, and red **Delete Table** buttons.
  - Disable checks to prevent deletion attempts on tables currently hosting active orders.

### Validation completed
- verified that Next.js production build completes successfully with zero compile warnings or SSR failures.
- Verified REST APIs:
  - Table creation adds records correctly.
  - Duplicate table numbers return a clean `400 Bad Request` with `{ message: "Table number already exists." }`.
  - Active tables cannot be deleted.
- Verified all front-end pages are compiled as static pages with tiny client footprint (JS sizes: customer 105 kB, KDS 117 kB, admin 120 kB).

## 2026-06-22 - Local Wi-Fi Network Exposing

### Scope followed
- Configured both frontend and backend to bind to `0.0.0.0` to allow local Wi-Fi testing.
- Added Next.js Dev Server `allowedDevOrigins` configuration to prevent blocking HMR/Next resources.
- Opened Express and Socket.IO CORS policies to accept wildcards.

### Backend implementation completed
- Updated `src/app.js`: Configured Express CORS middleware to use `origin: "*"`.
- Updated `src/server.js`:
  - Passed `corsOrigin: "*"` to Socket.IO initializer `initSocketServer`.
  - Configured `httpServer.listen` to bind to host address `0.0.0.0`.

### Frontend implementation completed
- Updated `frontend/next.config.mjs`: Added `allowedDevOrigins` listing `"http://10.97.233.185:3000"` and `"http://10.97.233.185"` under `nextConfig` root to resolve compilation warnings.
- Updated `frontend/package.json`: Configured the `dev` script to run `next dev --hostname 0.0.0.0` to bind Next.js dev server on the local Wi-Fi IP interface.
- Verified that `frontend/.env.local` points `NEXT_PUBLIC_API_URL` to `http://10.97.233.185:4000`.

### Validation completed
- Restarted both processes.
- Checked network sockets; confirmed both port 3000 and 4000 are bound to `0.0.0.0` and listening for network traffic.

## 2026-06-22 - Manual Order Confirmation Workflow

### Scope followed
- Inserted a manual confirmation step for incoming customer orders to prevent fake kitchen tickets.
- Shifted the thermal printer logic to trigger only upon admin confirmation.
- Emitted socket notifications to sync Admin and KDS dashboards in real-time.

### Backend implementation completed
- Updated `src/services/orderService.js`: Added the `confirmOrder(orderId)` function to transition status from `PENDING` to `PREPARING` in a database update, returning the fully structured order payload.
- Updated `src/controllers/orderController.js`:
  - Removed the `printOrderTicket()` trigger from the `POST /orders` handler (orders are created silently in the kitchen).
  - Implemented the `confirmRestaurantOrder(req, res, next)` controller action to trigger `printOrderTicket()` asynchronously and broadcast `emitOrderUpdateToRestaurant(order)` upon status transition.
- Updated `src/routes/orderRoutes.js`: Mounted the `PATCH /api/orders/:orderId/confirm` endpoint.

### Frontend implementation completed
- Updated KDS (`frontend/app/kds/page.js`):
  - Modified initial order fetching to filter for and show only `PREPARING` status tickets.
  - Configured Socket.IO handlers to ignore pending orders on `new_order` and listen for `order_updated` events to play the chime and render newly confirmed tickets.
- Updated Admin Dashboard (`frontend/app/admin/page.js`):
  - Added the `handleConfirmOrder(orderId)` handler to trigger the backend `/confirm` PATCH endpoint.
  - Registered the `order_updated` socket listener to sync order states on status updates.
  - Updated the Table Inspector modal: displayed flashing status badges for pending orders and rendered a large **👍 Confirm Order (Send to Kitchen)** action button for PENDING orders.

### Validation completed
- verified that Next.js production build compiles successfully with zero warnings or errors.
  - Confirming the order updates the DB to `PREPARING`, prints the receipt ticket, and broadcasts socket updates that turn the KDS screen live with chime playbacks.

## 2026-06-22 - Step 6 Extension: Checkout and Billing System

### Scope followed
- Implemented the full Table Checkout and Billing flow.
- Configured real-time status and payment method syncing.
- Added comprehensive thermal printer customer bill formatting.

### Backend implementation completed
- Modified Prisma schema `Order` model to add `paymentMethod` ("NONE", "CASH", "UPI") and `paymentStatus` ("UNPAID", "PAID").
- Synced the schema changes using `npx prisma db push` and regenerated the Prisma client.
- Implemented `printCustomerBill(tableData, orderData, restaurantData)` inside [printerService.js](file:///C:/Users/papan/downloads/taborder/src/services/printerService.js) to format customer-facing bills (Consolidated itemized table with name/quantity/price/amount, Subtotal, 2.5% CGST and 2.5% SGST taxes, Grand Total, and selected payment method).
- Implemented the `checkoutTable` service logic in [restaurantService.js](file:///C:/Users/papan/downloads/taborder/src/services/restaurantService.js):
  - Transitions table status to `BILL_REQUESTED`.
  - Sets the `paymentMethod` on all active unpaid orders for this table session to the requested one ("CASH" or "UPI").
  - Triggers the async non-blocking `printCustomerBill` printer logic.
- Implemented `PATCH /api/tables/:tableId/checkout` endpoint inside [restaurantRoutes.js](file:///C:/Users/papan/downloads/taborder/src/routes/restaurantRoutes.js) / [restaurantController.js](file:///C:/Users/papan/downloads/taborder/src/controllers/restaurantController.js) and integrated WebSocket status emissions (`table_updated` and `order_updated`).
- Updated the table clearing/settlement service `updateTableStatus` inside [restaurantService.js](file:///C:/Users/papan/downloads/taborder/src/services/restaurantService.js) to set all unpaid orders of that table session to `paymentStatus: "PAID"` and `status: "COMPLETED"`, returning the affected orders for Socket.IO synchronization.

### Frontend implementation completed
- Updated the Admin Dashboard Table Inspector modal inside [page.js](file:///C:/Users/papan/downloads/taborder/frontend/app/admin/page.js):
  - Refactored the Table Details modal footer to replace the old "Settle Table" flow.
  - Added the **Print Bill** button for `ACTIVE` tables, displaying inline payment method selection buttons (**💵 Cash** / **📱 UPI**).
  - Wired the payment method selection buttons to call the new checkout PATCH route.
  - If a table's status is `BILL_REQUESTED`, rendered a pulsed status label showing **⚠️ Payment Pending: [CASH/UPI]**.
  - Added the **✅ Mark Paid & Settle** button to settle payment and clear the table back to empty.
  - Configured Table Manager deletion checks to disable table deletion if status is `BILL_REQUESTED` or `ACTIVE`.

### Validation completed
- Verified that Next.js production build completes successfully with zero errors.
- Confirmed the Express server starts and binds successfully on port `4000`.
- Confirmed the Next.js frontend dev server boots successfully on port `3000`.

## 2026-06-22 - Hotfixes: Connection Resilience & Port Recovery

### Scope followed
- Handled front-end fetch failure visual reporting and back-end fallback address.
- Configured nodemon automatic reloading and port release listeners.

### Backend implementation completed
- Installed `nodemon` as dev dependency.
- Updated root `package.json` dev script to execute `nodemon src/server.js` for watch-mode file updates.
- Added graceful shutdown handlers for `SIGINT` and `SIGTERM` processes in [server.js](file:///C:/Users/papan/downloads/taborder/src/server.js) that execute `process.exit(0)`, preventing port 4000 ghost bindings.

### Frontend implementation completed
- Updated [page.js](file:///C:/Users/papan/downloads/taborder/frontend/app/admin/page.js) to hard-fallback `backendUrl` to the local hotspot IP address (`http://10.97.233.185:4000`).
- Added pre-fetch URL console logging immediately before API requests.
- Integrated standard `alert()` warnings inside catch blocks of `fetchTables` and `fetchOrders` to show immediate visual notification when connections fail.

## 2026-06-22 - Hotfixes: Table Session Lock Security

### Scope followed
- Locked static QR code tables to a customer's specific browser session.
- Prevented cross-table remote order spamming.

### Backend implementation completed
- Updated Prisma schema `Table` model to add `currentSessionToken` (String, nullable) and `sessionExpiresAt` (DateTime, nullable). Pushed updates via `npx prisma db push`.
- Modified order creation logic in [orderController.js](file:///C:/Users/papan/downloads/taborder/src/controllers/orderController.js) to perform token checks:
  - If a table has no active session, locks the table to the incoming `sessionToken` for 2 hours.
  - Rejects incoming orders with a `403 Forbidden` error if the token doesn't match the current active session.
  - Automatically resets/overrides the lock if the 2-hour window has expired.
- Updated the Table Settlement service in [restaurantService.js](file:///C:/Users/papan/downloads/taborder/src/services/restaurantService.js) to reset `currentSessionToken` and `sessionExpiresAt` to `null` when a table is cleared/settled to green (`EMPTY`).

### Frontend implementation completed
- Attached the stored `sessionToken` to the JSON payload of all `POST /api/orders` order requests.

## 2026-06-23 - Step 7: Customer-Initiated Digital Checkout

### Scope followed
- Shifted the table checkout initiating action from the restaurant admin to the customer.
- Disabled hardware receipt printing during checkout.
- Configured real-time digital receipt calculations and checkout requests directly on the customer's mobile device.

### Backend implementation completed
- Removed the `printCustomerBill` trigger from the `checkoutTable` service function in [restaurantService.js](file:///C:/Users/papan/downloads/taborder/src/services/restaurantService.js). The system now processes status and database state transitions without initiating a physical print job.

### Frontend implementation completed
- Updated the Customer Ordering App in [CustomerOrderingApp.js](file:///C:/Users/papan/downloads/taborder/frontend/components/CustomerOrderingApp.js):
  - Initialized a Socket.IO listener on load, connecting to room `restaurant:1`.
  - Added a `refreshSession` function that queries unpaid orders to recover session state on refreshes.
  - Listen for `order_updated` to refresh state when orders transition from PENDING to PREPARING/COMPLETED.
  - Listen for `table_updated` to clear customer session lock and reset shopping carts when the admin clears/settles the table back to EMPTY.
  - Wired `handleCustomerCheckout` to hit `PATCH /api/tables/:tableId/checkout`.
- Updated the customer [CartPanel.js](file:///C:/Users/papan/downloads/taborder/frontend/components/CartPanel.js):
  - Added a real-time status banner displaying live kitchen statuses (pending confirmation, preparing, or ready).
  - Implemented the **Digital Bill Summary** showing itemized ordered items consolidated across rounds, CGST (2.5%), SGST (2.5%), and Grand Total.
  - Added the **Checkout** section for active tables with ** Pay via UPI** and **💵 Pay with Cash** buttons.
  - Configured state-specific message display: "Redirecting to UPI gateway..." for UPI payment requests, and "Cash payment requested. Please pay at the counter." for Cash.
- Cleaned up the Admin Dashboard in [page.js](file:///C:/Users/papan/downloads/taborder/frontend/app/admin/page.js) by removing all checkout initiation button components, leaving only the "Payment Pending: [Cash/UPI]" warning badge and the "Mark Paid & Settle" button for table management.

### Validation completed
- Verified Next.js production build runs successfully (customer and admin bundles compiled with zero compiler errors).
- Automated backend port-release cleanup: configured the `"dev"` script in [package.json](file:///C:/Users/papan/downloads/taborder/package.json) to clear port 4000 using `kill-port` grouped by parentheses (to support proper CMD/PowerShell order of operations) before starting `nodemon`.
- Excluded duplicate port-binding tasks; restarted the Nodemon API and Next.js frontend dev servers.
## 2026-06-23 - Step 8: Dynamic Peer-to-Peer UPI Payments & Transaction ID Verification

### Scope followed
- Updated Prisma schema to include `ownerUpiId` and `transactionId`.
- Added custom settings panel in Admin UI to configure "Merchant UPI ID Configuration" dynamically.
- Created `PATCH /api/settings` route to store the merchant settings.
- Modified customer-initiated checkout API to accept and store optional `transactionId`.
- Implemented immediate cash payment locking view in Customer UI.
- Implemented step-by-step peer-to-peer UPI checkout modal dialog in Customer UI with a dynamic QR code generator (`qrcode.react`) embedding auto-filled amount deep links, and UTR/Transaction ID submission.
- Added dynamic UPI settings and Transaction ID inspector fields to the Admin Dashboard console.

### Backend implementation completed
- Verified schema contains `ownerUpiId` (Restaurant, defaults to `"8309943166@upi"`) and `transactionId` (Order, String, nullable).
- Modified checkout logic in [restaurantService.js](file:///C:/Users/papan/downloads/taborder/src/services/restaurantService.js) to accept `transactionId` and record it against all unpaid orders within the transaction.
- Added `updateRestaurantSettings` logic in [restaurantService.js](file:///C:/Users/papan/downloads/taborder/src/services/restaurantService.js) to update `ownerUpiId` in the database.
- Registered the `PATCH /api/settings` route in [restaurantRoutes.js](file:///C:/Users/papan/downloads/taborder/src/routes/restaurantRoutes.js) and wired it to `updateSettingsController` in [restaurantController.js](file:///C:/Users/papan/downloads/taborder/src/controllers/restaurantController.js).

### Frontend implementation completed
- Installed `qrcode.react` as a dependency inside the Next.js `frontend/` app.
- Updated customer ordering interface in [CustomerOrderingApp.js](file:///C:/Users/papan/downloads/taborder/frontend/components/CustomerOrderingApp.js) and [CartPanel.js](file:///C:/Users/papan/downloads/taborder/frontend/components/CartPanel.js):
  - Fetched the active merchant UPI ID from the `/api/restaurants/1/menu` menu payload.
  - Cash flow: immediate screen locking displaying the counter payment message.
  - UPI flow: rendering a modal overlay containing a dynamically generated QR code pointing to `upi://pay?pa=${ownerUpiId}&pn=TabOrder&am=${grandTotal}&cu=INR`, a text input labeled "Enter UTR / Transaction ID", and a "Submit Payment" button hitting checkout.
- Updated Admin dashboard in [page.js](file:///C:/Users/papan/downloads/taborder/frontend/app/admin/page.js):
  - Created a new **⚙️ Settings** console tab containing the "UPI Settings" panel.
  - Wired settings input saving to call `PATCH /api/settings` and trigger menu data refresh.
  - Enhanced the Table Inspector modal footer to show a flashing amber badge when checkout method is UPI: `"⚠️ Payment Pending: UPI"`.
  - Rendered the submitted customer transaction ID code underneath the badge: `"Txn ID: [transactionId]"` for direct peer-to-peer verification.

### Validation completed
- Synced the updated Prisma schema with the PostgreSQL database and regenerated Prisma Client via `npx prisma db push`.
- Installed dependencies and successfully built Next.js production builds.
- Verified Next.js and Express servers compile successfully.

## 2026-06-23 - Hotfix: UPI Template Literal Syntax Error & USB Tether CORS

### Bug identified
- The `<QRCodeSVG>` `value` prop in [CustomerOrderingApp.js](file:///C:/Users/papan/downloads/taborder/frontend/components/CustomerOrderingApp.js) had its backticks stripped by the editing tool, resulting in raw `value={upi://pay?pa=...}` without template literal wrapping — a fatal JSX syntax error.

### Fix applied
- Replaced the broken template literal with explicit string concatenation (`"upi://pay?pa=" + ownerUpiId + "&pn=TabOrder&am=" + grandTotal + "&cu=INR"`) to produce an identical runtime result while being immune to backtick-stripping by editing tools.
- Variable bindings verified:
  - `ownerUpiId` resolves dynamically from `menu?.ownerUpiId` with fallback `"8309943166@upi"`.
  - `grandTotal` computes `(totalAmount * 1.05).toFixed(2)` (subtotal + 5% CGST/SGST tax).

### Network configuration
- Updated [next.config.mjs](file:///C:/Users/papan/downloads/taborder/frontend/next.config.mjs) to add USB tether network IP `10.208.139.52` to `allowedDevOrigins` alongside the existing hotspot IP `10.97.233.185`.

### Validation
- Next.js production build compiled successfully with zero errors.

## 2026-06-23 - Bugfix: Customer UI checkout intermediate states and success flow

### Bug identified
- Re-rendering checkout buttons even when a checkout request (UPI with transaction ID or Cash) was submitted.
- Abrupt reset of the customer screen to an empty cart without showing success/thank you confirmation upon table settlement.

### Fix applied
- Updated [CartPanel.js](file:///C:/Users/papan/downloads/taborder/frontend/components/CartPanel.js) to conditionally hide the "Pay via UPI" and "Pay with Cash" checkout buttons if `lockedOrder.transactionId` exists or if `lockedOrder.paymentMethod === "CASH"`. In their place, a status box correctly indicates "UPI Verification Pending" or "Cash payment requested".
- Updated [CustomerOrderingApp.js](file:///C:/Users/papan/downloads/taborder/frontend/components/CustomerOrderingApp.js):
  - Added `paymentSuccessful` state.
  - Modified the Socket.IO `table_updated` listener. When the table status becomes `EMPTY`, it sets `paymentSuccessful` to true and defers the cart/session wipe using a 5-second `setTimeout`.
  - Added a full-screen "Payment Done!" success overlay to gracefully acknowledge table settlement.

## 2026-06-23 - Revert: Localhost Development Network

### Action
- Reverted frontend `package.json` dev script from `next dev -H 0.0.0.0` back to standard `next dev`.
- Reverted frontend `.env.local` API URL back to `http://localhost:4000`.
- Removed `allowedDevOrigins` from `next.config.mjs` to restore default Next.js local behavior.
- All network bindings are now fully local for desktop development.


## 2026-11-13 - Project Review, Git Repository Setup & README.md Integration

### Scope followed
- Performed a comprehensive audit of the TabOrder full-stack codebase, system pipeline, and database schema.
- Verified and configured `.gitignore` files for both root and `frontend/` to strictly protect secrets and prevent tracking unnecessary build artifacts.
- Created `README.md` in the project root following the portfolio showcase template.
- Initialized local Git repository and prepared codebase for remote GitHub push.

### Implementation completed
- Updated root [.gitignore](file:///C:/Users/papan/downloads/taborder/.gitignore) to exclude `node_modules/`, `.env`, `.env.local`, `.npm-cache/`, `.next/`, and `*.log`.
- Created [frontend/.gitignore](file:///C:/Users/papan/downloads/taborder/frontend/.gitignore) to exclude `node_modules/`, `.env.local`, `.next/`, and `*.log`.
- Created [README.md](file:///C:/Users/papan/downloads/taborder/README.md) with comprehensive tech stack badges, system preview placeholders, setup instructions, network testing guide, and printer configuration details.
- Initialized local Git tracking via `git init`.

### Validation completed
- Verified with `git status` that `.env`, `.env.local`, `.next/`, and `*.log` files are completely ignored.
- Confirmed Git repo initialized successfully and working tree clean of untracked secret files.


## 2026-11-13 - GitHub MCP Repository Creation & Push

### Scope followed
- Created the remote `TabOrder` repository on GitHub using the `github-mcp-server` MCP tool.
- Linked local Git repository to the remote origin (`https://github.com/Prohith45/TabOrder.git`).
- Pushed the `main` branch with the full project commit history to GitHub.

### Actions completed
- Invoked `create_repository` via MCP tool for `Prohith45/TabOrder` (public repository).
- Added Git remote origin: `https://github.com/Prohith45/TabOrder.git`.
- Executed `git push -u origin main`.
- Verified live commit status on GitHub via `list_commits` MCP tool (commit hash `f4d61ba1bc22cfe38f46159620172fdcc21553bf`).

### Validation completed
- GitHub API confirmed repository creation: `https://github.com/Prohith45/TabOrder`.
- Verified commit reflection on branch `main` via `list_commits`.


## 2026-11-13 - Real Pipeline Execution, UI Screenshots & /brag Showcase Delivery

### Scope followed
- Reinstalled all deleted `node_modules` across root backend and Next.js frontend.
- Generated Prisma Client and started backend and frontend pipelines.
- Captured authentic, full-resolution system screenshots for Customer Ordering UI, Admin Control Console, and Kitchen Display System (KDS).
- Executed the `/brag` workflow: crafted brag plan, composition brief, rendered a polished 16-second product video with soundtrack (`brag.mp4`), and converted it into an animated scroll-playing preview GIF (`taborder-preview.gif`).
- Updated [README.md](file:///C:/Users/papan/downloads/taborder/README.md) to embed the live preview GIF, link to the launch video, and replaced all placeholder links with real screenshots.
- Synced all newly generated assets and documentation to the remote GitHub repository.

### Implementation completed
- Installed root and frontend dependencies: `npm install` and `prisma generate`.
- Booted local Express API on port 4000 and Next.js frontend dev server on port 3000.
- Executed `scripts/capture_screenshots.js` using headless browser to generate:
  - `docs/customer-ui.png` (Mobile diner interface with 2-hour table session lock and digital receipt).
  - `docs/admin-dashboard.png` (Real-time live table grid, settlement workflow, and menu manager).
  - `docs/kds-screen.png` (Real-time kitchen display with color-coded wait timers and allergy callouts).
- Executed `scripts/generate_brag_video.js` following the `/brag` launch specification:
  - Created `brag-output/brag-plan.md` and `brag-output/composition-brief.md`.
  - Composed video scenes with high-contrast typography, product highlights, and soundtrack.
  - Rendered `brag-output/brag.mp4` and `docs/taborder-launch.mp4`.
  - Rendered `docs/taborder-preview.gif` (900px wide, 12fps, optimized color palette) for instant autoplay in GitHub README upon scrolling.
  - Wrote `brag-output/share-copy.txt`.
- Updated [README.md](file:///C:/Users/papan/downloads/taborder/README.md) to showcase the autoplay GIF and real screenshots.

### Validation completed
- Confirmed all screenshots render properly and match real system states.
- Confirmed `taborder-preview.gif` and `taborder-launch.mp4` play smoothly.
- Confirmed git commit and push cleanly update the remote GitHub repository.


## 2026-11-14 - Project Workspace Cleanup

### Scope followed
- Cleaned the local workspace by removing bulky dependencies, build artifacts, logs, and cache folders.
- Preserved environment files (`.env`, `.env.local`) and Git-tracked source code.

### Actions completed
- Deleted `node_modules/` from root backend and `frontend/node_modules/`.
- Deleted Next.js build cache (`frontend/.next/`).
- Deleted temporary npm caches (`.npm-cache/` and `frontend/.npm-cache/`).
- Removed local terminal log outputs (`backend.out.log`, `frontend.out.log`).

### Validation completed
- Confirmed working directory is pristine and lightweight.
- Verified `git status` reports working tree clean and up to date with `origin/main`.
