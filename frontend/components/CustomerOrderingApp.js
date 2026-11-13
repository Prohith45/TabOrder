"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import CartPanel from "./CartPanel";
import MenuSection from "./MenuSection";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const RESTAURANT_ID = "1";

/* ---------- Session lock helpers ---------- */

function sessionKey(tableNumber) {
  return `taborder:lock:${RESTAURANT_ID}:${tableNumber}`;
}

function readLock(tableNumber) {
  if (!tableNumber || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(tableNumber));
    return raw ? JSON.parse(raw) : null;
  } catch {
    window.sessionStorage.removeItem(sessionKey(tableNumber));
    return null;
  }
}

function writeLock(tableNumber, payload) {
  window.sessionStorage.setItem(sessionKey(tableNumber), JSON.stringify(payload));
}

/* ---------- Cart item builder ---------- */

function buildCartItem(menuItem, existing) {
  return {
    menuItemId: menuItem.id,
    name: menuItem.name,
    price: Number(menuItem.price),
    quantity: existing ? existing.quantity + 1 : 1,
    specialInstructions: existing?.specialInstructions || "",
  };
}

/* ========== Main Component ========== */

export default function CustomerOrderingApp() {
  const searchParams = useSearchParams();

  const [tableNumber, setTableNumber] = useState("");
  const [tableError, setTableError] = useState("");
  const [menu, setMenu] = useState(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [cart, setCart] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lockedOrder, setLockedOrder] = useState(null);
  const [sessionToken, setSessionToken] = useState("");
  const [cashLocked, setCashLocked] = useState(false);
  const [showUpiOverlay, setShowUpiOverlay] = useState(false);
  const [transactionIdInput, setTransactionIdInput] = useState("");
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let token = window.localStorage.getItem("tabOrder_session");
      if (!token) {
        token = "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
          (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        );
        window.localStorage.setItem("tabOrder_session", token);
      }
      setSessionToken(token);
    }
  }, []);

  /* ---- Effect 1: Validate ?table= parameter ---- */
  useEffect(() => {
    const raw = searchParams.get("table");
    if (!raw || !raw.trim() || !/^\d+$/.test(raw.trim())) {
      setTableError("Invalid Table QR Code");
      setTableNumber("");
      setLoadingMenu(false);
      return;
    }
    setTableNumber(raw.trim());
    setTableError("");
  }, [searchParams]);

  const refreshSession = async () => {
    if (!tableNumber) return;
    try {
      const res = await fetch(`${API_URL}/api/restaurants/${RESTAURANT_ID}/orders`);
      if (res.ok) {
        const allOrders = await res.json();
        const unpaidOrders = allOrders.filter(
          (o) => o.table?.tableNumber === Number(tableNumber) && o.paymentStatus === "UNPAID" && o.status !== "CANCELLED"
        );

        if (unpaidOrders.length > 0) {
          const items = unpaidOrders.flatMap(o => o.items);
          const totalAmt = items.reduce((sum, item) => sum + Number(item.menuItem?.price || 0) * item.quantity, 0);

          setLockedOrder({
            orderId: unpaidOrders[0].id,
            tableId: unpaidOrders[0].tableId,
            status: unpaidOrders[0].status, // PENDING, PREPARING, COMPLETED
            paymentStatus: unpaidOrders[0].paymentStatus, // UNPAID
            paymentMethod: unpaidOrders[0].paymentMethod,
            tableStatus: unpaidOrders[0].table?.status || "ACTIVE", // ACTIVE, BILL_REQUESTED
            items: items,
            totalAmount: totalAmt,
          });
        } else {
          setLockedOrder(null);
          setCashLocked(false);
        }
      }
    } catch (e) {
      console.error("Check active session failed", e);
    }
  };

  /* ---- Effect 2: Check session lock & listen to updates ---- */
  useEffect(() => {
    if (!tableNumber) return;

    refreshSession();

    // Setup Socket.IO listener for live order and table status changes
    const socket = io(API_URL);

    socket.on("connect", () => {
      socket.emit("join_restaurant", { restaurantId: RESTAURANT_ID });
    });

    socket.on("order_updated", (updatedOrder) => {
      if (updatedOrder.table?.tableNumber === Number(tableNumber)) {
        refreshSession();
      }
    });

    socket.on("table_updated", (updatedTable) => {
      if (updatedTable.tableNumber === Number(tableNumber)) {
        if (updatedTable.status === "EMPTY") {
          // Show massive success screen instead of abrupt reset
          setPaymentSuccessful(true);
          
          setTimeout(() => {
            // Release session locks after 5 seconds
            setLockedOrder(null);
            setCart({});
            setCashLocked(false);
            setPaymentSuccessful(false);
            window.localStorage.removeItem("tabOrder_session");
          }, 5000);
        } else {
          refreshSession();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [tableNumber]);

  /* ---- Effect 3: Fetch menu ---- */
  useEffect(() => {
    if (!tableNumber || tableError) return;
    let cancelled = false;

    async function load() {
      try {
        setLoadingMenu(true);
        setMenuError("");
        const res = await fetch(`${API_URL}/api/restaurants/${RESTAURANT_ID}/menu`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Unable to load menu right now.");
        const data = await res.json();
        if (!cancelled) setMenu(data);
      } catch (err) {
        if (!cancelled) setMenuError(err.message || "Unable to load menu right now.");
      } finally {
        if (!cancelled) setLoadingMenu(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tableNumber, tableError]);

  /* ---- Derived values ---- */
  const cartItems = Object.values(cart);
  const totalQuantity = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = cartItems.reduce((s, i) => s + i.quantity * Number(i.price), 0);
  const isLocked = Boolean(lockedOrder);
  const ownerUpiId = menu?.ownerUpiId || "8309943166@upi";
  const grandTotal = lockedOrder ? (Number(lockedOrder.totalAmount) * 1.05).toFixed(2) : "0.00";

  /* ---- Cart actions ---- */

  function addItem(menuItem) {
    setCart((prev) => ({
      ...prev,
      [menuItem.id]: buildCartItem(menuItem, prev[menuItem.id]),
    }));
  }

  function changeQuantity(menuItemId, nextQty) {
    setCart((prev) => {
      if (!prev[menuItemId]) return prev;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[menuItemId];
        return copy;
      }
      return { ...prev, [menuItemId]: { ...prev[menuItemId], quantity: nextQty } };
    });
  }

  function changeInstructions(menuItemId, text) {
    setCart((prev) => ({
      ...prev,
      [menuItemId]: { ...prev[menuItemId], specialInstructions: text },
    }));
  }

  /* ---- Submit order ---- */

  async function submitOrder() {
    if (!tableNumber || cartItems.length === 0 || isLocked) return;

    try {
      setSubmitting(true);
      setSubmitError("");

      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: RESTAURANT_ID,
          tableNumber: Number(tableNumber),
          sessionToken,
          items: cartItems.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            specialInstructions: i.specialInstructions,
          })),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Unable to place order right now.");

      setCart({});
      await refreshSession();
    } catch (err) {
      setSubmitError(err.message || "Unable to place order right now.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleCustomerCheckout = async (paymentMethod) => {
    if (!lockedOrder || !lockedOrder.tableId) return;
    if (paymentMethod === "UPI") {
      setShowUpiOverlay(true);
      setTransactionIdInput("");
      return;
    }

    try {
      setCashLocked(true);
      setSubmitting(true);
      setSubmitError("");
      const res = await fetch(`${API_URL}/api/tables/${lockedOrder.tableId}/checkout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to initiate checkout");
      }
      await refreshSession();
    } catch (err) {
      setSubmitError(err.message || "Failed to initiate checkout");
      setCashLocked(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpiSubmit = async (e) => {
    e.preventDefault();
    if (!transactionIdInput.trim() || !lockedOrder || !lockedOrder.tableId) return;

    try {
      setSubmitting(true);
      setSubmitError("");
      const res = await fetch(`${API_URL}/api/tables/${lockedOrder.tableId}/checkout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "UPI",
          transactionId: transactionIdInput.trim()
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to submit UPI payment");
      }
      setShowUpiOverlay(false);
      await refreshSession();
    } catch (err) {
      setSubmitError(err.message || "Failed to submit UPI payment");
    } finally {
      setSubmitting(false);
    }
  };

  /* ========== RENDER ========== */

  /* ---- Success Screen ---- */
  if (paymentSuccessful) {
    return (
      <main className="app-shell flex items-center justify-center p-4 min-h-screen bg-emerald-950 text-white">
        <section className="animate-fade-in-up w-full max-w-md rounded-[28px] p-8 text-center bg-emerald-900 border border-emerald-800 shadow-2xl">
          <p className="text-6xl animate-bounce mb-4">🎉</p>
          <h1 className="text-3xl font-black text-white mb-2">Payment Done!</h1>
          <p className="text-emerald-100 text-lg font-medium leading-relaxed font-sans">
            Thank you, please visit again.
          </p>
        </section>
      </main>
    );
  }

  /* ---- Cash checkout lock screen ---- */
  if (cashLocked || (lockedOrder && lockedOrder.tableStatus === "BILL_REQUESTED" && lockedOrder.paymentMethod === "CASH")) {
    return (
      <main className="app-shell flex items-center justify-center p-4 min-h-screen bg-stone-950 text-white">
        <section className="animate-fade-in-up w-full max-w-md rounded-[28px] p-8 text-center bg-stone-900 border border-stone-800 shadow-2xl">
          <p className="text-6xl animate-pulse mb-3">💵</p>
          <h1 className="text-2xl font-black text-white">Cash payment requested</h1>
          <p className="mt-2 text-stone-400 text-base font-bold leading-relaxed font-sans">
            Please pay at the counter.
          </p>
        </section>
      </main>
    );
  }

  /* ---- Error: missing / invalid ?table= ---- */
  if (tableError) {
    return (
      <main className="app-shell flex items-center justify-center p-4">
        <section className="banner-error animate-fade-in-up w-full max-w-md rounded-[var(--radius-lg)] p-6 text-center shadow-lg">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-3 text-2xl font-extrabold">Invalid Table QR Code</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed">
            This link is missing a valid <code className="rounded bg-red-200/40 px-1.5 py-0.5 text-xs font-bold">?table=</code> value.
            Please scan the QR code on your table.
          </p>
        </section>
      </main>
    );
  }

  /* ---- Main layout ---- */
  return (
    <main className="app-shell px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Left column: header + menu */}
        <section className={isLocked ? "locked-state space-y-5" : "space-y-5"}>
          {/* Header card */}
          <div className="surface-card rounded-[var(--radius-lg)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-stone-400">
                  {menu?.name || "TabOrder"}
                </p>
                <h1 className="mt-1 text-3xl font-extrabold leading-tight text-stone-900 sm:text-4xl">
                  Table Ordering
                </h1>
                <p className="mt-2 max-w-xl text-sm font-medium text-stone-500">
                  Browse the menu, add items, and send your order to the kitchen.
                </p>
              </div>
              <div className="surface-pill rounded-[var(--radius-md)] px-4 py-3 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                  Table
                </div>
                <div className="mt-0.5 text-3xl font-extrabold text-stone-900">
                  {tableNumber}
                </div>
              </div>
            </div>
          </div>

          {/* Locked banner */}
          {isLocked ? (
            <div className="banner-success animate-fade-in-up rounded-[var(--radius-lg)] p-5 shadow-md">
              <div className="flex items-center gap-3">
                <span className="animate-checkmark text-3xl">✅</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em]">Sent to Kitchen</p>
                  <h2 className="mt-0.5 text-xl font-extrabold">Session Locked</h2>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed">
                Your order was submitted from this device. Interactions are disabled to prevent duplicates.
              </p>
            </div>
          ) : null}

          {/* Loading state */}
          {loadingMenu ? (
            <div className="surface-card rounded-[var(--radius-lg)] p-6">
              <div className="animate-pulse-gentle text-base font-bold text-stone-500">
                Loading menu…
              </div>
            </div>
          ) : null}

          {/* Menu error */}
          {menuError ? (
            <div className="banner-error rounded-[var(--radius-md)] p-5 text-sm font-bold">
              {menuError}
            </div>
          ) : null}

          {/* Menu sections */}
          {menu && !loadingMenu ? (
            <div className="space-y-6">
              {menu.categories.map((cat) => (
                <MenuSection
                  key={cat.id}
                  category={cat}
                  cart={cart}
                  locked={isLocked || submitting}
                  onAddItem={addItem}
                  onQuantityChange={changeQuantity}
                />
              ))}
            </div>
          ) : null}
        </section>

        {/* Right column: cart */}
        <CartPanel
          items={cartItems}
          totalAmount={totalAmount}
          totalQuantity={totalQuantity}
          lockedOrder={lockedOrder}
          submitting={submitting}
          submitError={submitError}
          onQuantityChange={changeQuantity}
          onInstructionsChange={changeInstructions}
          onSubmit={submitOrder}
          onCheckout={handleCustomerCheckout}
        />
      </div>

      {/* UPI Checkout Overlay */}
      {showUpiOverlay && lockedOrder && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-[28px] w-full max-w-md p-6 shadow-2xl text-center">
            <div className="mb-4">
              <span className="text-4xl">📱</span>
              <h3 className="text-xl font-black text-white mt-2 font-sans">UPI Payment</h3>
              <p className="text-stone-400 text-xs font-medium font-sans">Peer-to-Peer Direct Transfer</p>
            </div>

            {/* Dynamic UPI QR Code */}
            <div className="flex justify-center mb-4 bg-white p-3.5 rounded-2xl max-w-[180px] mx-auto shadow-md">
              <QRCodeSVG
                value={
                  "upi://pay?pa=" + ownerUpiId + "&pn=TabOrder&am=" + grandTotal + "&cu=INR"
                }
                size={150}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="bg-stone-950 rounded-2xl p-4 border border-stone-850 mb-4 font-sans text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
                Amount to Pay
              </div>
              <div className="text-2xl font-black text-orange-500 font-mono mt-0.5">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 2,
                }).format(Number(grandTotal))}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 mt-2.5">
                Pay To (Merchant UPI ID)
              </div>
              <div className="text-xs font-black text-white mt-0.5 break-all select-all font-mono">
                {ownerUpiId}
              </div>
            </div>

            <form onSubmit={handleUpiSubmit} className="space-y-4">
              <div className="text-left font-sans">
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Enter UTR / Transaction ID
                </label>
                <input
                  type="text"
                  required
                  value={transactionIdInput}
                  onChange={(e) => setTransactionIdInput(e.target.value)}
                  placeholder="12-digit UTR number"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm font-mono text-center tracking-widest transition-all animate-none"
                />
              </div>
              <div className="flex gap-3 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => setShowUpiOverlay(false)}
                  className="flex-1 py-3 border border-stone-800 hover:bg-stone-800 text-stone-400 text-xs font-black rounded-xl uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !transactionIdInput.trim()}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all disabled:opacity-40"
                >
                  {submitting ? "Verifying..." : "Submit Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
