"use client";

import { useState, useEffect } from "react";
import { io } from "socket.io-client";

// Web Audio alert chime helper
function playAdminChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const now = audioCtx.currentTime;
    
    // Alert chime (C5 followed by E5 and G5)
    const playTone = (freq, startTime, duration) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playTone(523.25, now, 0.12); // C5
    playTone(659.25, now + 0.12, 0.12); // E5
    playTone(783.99, now + 0.24, 0.25); // G5
  } catch (e) {
    console.error("Audio failed", e);
  }
}

export default function AdminDashboard() {
  // Authentication & System State
  const [passkey, setPasskey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [activeTab, setActiveTab] = useState("tables"); // "tables", "menu", "history"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Data State
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // Selected table modal / inspector
  const [selectedTable, setSelectedTable] = useState(null);
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);

  // Form states for Category Management
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Form states for Table Management
  const [newTableNumber, setNewTableNumber] = useState("");

  // Form states for Menu Item Management
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCatId, setNewItemCatId] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState("");
  const [editingItemCatId, setEditingItemCatId] = useState("");
  const [editingItemAvailable, setEditingItemAvailable] = useState(true);

  // Settings State
  const [merchantUpiId, setMerchantUpiId] = useState("8309943166@upi");

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://10.97.233.185:4000";

  // Check session storage on mount
  useEffect(() => {
    const savedRest = sessionStorage.getItem("admin_restaurant");
    if (savedRest) {
      try {
        const parsed = JSON.parse(savedRest);
        setRestaurant(parsed);
        setIsAuthenticated(true);
      } catch (e) {
        sessionStorage.removeItem("admin_restaurant");
      }
    }
  }, []);

  // Fetch initial datasets when authenticated
  useEffect(() => {
    if (!isAuthenticated || !restaurant) return;

    fetchTables();
    fetchMenu();
    fetchOrders();

    // Setup Socket.IO listener for live updates
    const socket = io(backendUrl);

    socket.on("connect", () => {
      socket.emit("join_restaurant", { restaurantId: restaurant.id });
    });

    socket.on("new_order", (newOrder) => {
      if (soundEnabled) {
        playAdminChime();
      }
      // Prepend order
      setOrders((prev) => [newOrder, ...prev]);
      
      // Update corresponding table status to ACTIVE in state
      setTables((prev) =>
        prev.map((t) =>
          t.id === newOrder.tableId ? { ...t, status: "ACTIVE" } : t
        )
      );

      // Trigger alerts
      showTempSuccess(`🔔 New Order received for Table ${newOrder.table?.tableNumber}!`);
    });

    socket.on("table_updated", (updatedTable) => {
      setTables((prev) =>
        prev.map((t) => (t.id === updatedTable.id ? updatedTable : t))
      );
    });

    socket.on("order_updated", (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, restaurant, soundEnabled]);

  // Data Fetchers
  const fetchTables = async () => {
    try {
      console.log("Fetching tables from:", `${backendUrl}/api/restaurants/1/tables`);
      const res = await fetch(`${backendUrl}/api/restaurants/1/tables`);
      if (res.ok) setTables(await res.json());
    } catch (e) {
      console.error("Fetch tables failed", e);
      alert(`Cannot connect to backend server at ${backendUrl}. Is it running?`);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/restaurants/1/menu`);
      if (res.ok) {
        const data = await res.json();
        setMenu(data);
        setMerchantUpiId(data.ownerUpiId || "yourname@upi");
      }
    } catch (e) {
      console.error("Fetch menu failed", e);
    }
  };

  const fetchOrders = async () => {
    try {
      console.log("Fetching orders from:", `${backendUrl}/api/restaurants/1/orders`);
      const res = await fetch(`${backendUrl}/api/restaurants/1/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : (data.value || []));
      }
    } catch (e) {
      console.error("Fetch orders failed", e);
      alert(`Cannot connect to backend server at ${backendUrl}. Is it running?`);
    }
  };

  const showTempSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  // Auth Submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/restaurants/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey }),
      });
      if (!res.ok) {
        throw new Error("Invalid passkey. Access Denied.");
      }
      const data = await res.json();
      sessionStorage.setItem("admin_restaurant", JSON.stringify(data));
      setRestaurant(data);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_restaurant");
    setRestaurant(null);
    setIsAuthenticated(false);
  };

  // 1. Table Settling Action
  const handleClearTable = async (tableNumber) => {
    try {
      const res = await fetch(`${backendUrl}/api/restaurants/1/tables/${tableNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EMPTY" }),
      });
      if (!res.ok) throw new Error("Failed to clear table");
      showTempSuccess(`Table ${tableNumber} has been successfully cleared (orders completed).`);
      setSelectedTable(null);
      fetchTables();
      fetchOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmOrder = async (orderId) => {
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to confirm order");
      }
      showTempSuccess("Order confirmed and sent to kitchen.");
      fetchOrders();
      fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCheckoutTable = async (tableId, paymentMethod) => {
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/tables/${tableId}/checkout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to initiate checkout");
      }
      showTempSuccess("Customer bill printed. Table status changed to BILL_REQUESTED.");
      setShowPaymentSelect(false);
      setSelectedTable(null);
      fetchTables();
      fetchOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  // 2. Category Actions
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/restaurants/1/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add category");
      }
      setNewCatName("");
      showTempSuccess("Category added successfully.");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRenameCategory = async (e) => {
    e.preventDefault();
    if (!editingCatName.trim()) return;
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/categories/${editingCatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCatName }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update category");
      }
      setEditingCatId(null);
      showTempSuccess("Category updated successfully.");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  // 2.5 Table Manager Actions
  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/restaurants/1/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: Number(newTableNumber) }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add table");
      }
      setNewTableNumber("");
      showTempSuccess(`Table ${newTableNumber} created successfully.`);
      fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTable = async (tableId, tableNumber) => {
    const activeTable = tables.find((t) => t.id === tableId);
    if (activeTable && activeTable.status !== "EMPTY") {
      setError("Cannot delete table because it currently has active orders.");
      return;
    }

    if (!confirm(`Are you sure you want to delete Table ${tableNumber}?`)) return;
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/tables/${tableId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete table");
      }
      showTempSuccess(`Table ${tableNumber} deleted successfully.`);
      fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!confirm("Are you sure you want to delete this category? All items inside will be deleted.")) return;
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/categories/${catId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete category");
      }
      showTempSuccess("Category deleted successfully.");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  // 3. Menu Item Actions
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice || !newItemCatId) return;
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/categories/${newItemCatId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName,
          price: Number(newItemPrice),
          isAvailable: true,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add menu item");
      }
      setNewItemName("");
      setNewItemPrice("");
      showTempSuccess("Item added successfully.");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/menu-items/${editingItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingItemName,
          price: Number(editingItemPrice),
          isAvailable: editingItemAvailable,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update item");
      }
      setEditingItemId(null);
      showTempSuccess("Item updated successfully.");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleAvailability = async (item) => {
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAvailable: !item.isAvailable,
        }),
      });
      if (!res.ok) throw new Error("Failed to toggle availability");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/menu-items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete item");
      }
      showTempSuccess("Item deleted successfully.");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper selectors
  const activeOrdersForTable = (tableId) => {
    return orders.filter(
      (o) => o.tableId === tableId && o.paymentStatus === "UNPAID" && o.status !== "CANCELLED"
    );
  };

  const getTablePaymentMethod = (tableId) => {
    const tableOrders = activeOrdersForTable(tableId);
    const orderWithPayment = tableOrders.find((o) => o.paymentMethod !== "NONE");
    return orderWithPayment ? orderWithPayment.paymentMethod : "NONE";
  };

  const getTableTransactionId = (tableId) => {
    const tableOrders = activeOrdersForTable(tableId);
    const orderWithTxn = tableOrders.find((o) => o.transactionId);
    return orderWithTxn ? orderWithTxn.transactionId : "";
  };

  const tableBillTotal = (tableId) => {
    const tableOrders = activeOrdersForTable(tableId);
    return tableOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!merchantUpiId.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant?.id || "1",
          ownerUpiId: merchantUpiId.trim(),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update settings");
      }
      showTempSuccess("Merchant UPI ID updated successfully.");
      fetchMenu();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = orders.reduce((sum, o) => {
    if (o.paymentStatus === "PAID" && o.status !== "CANCELLED") {
      return sum + Number(o.totalAmount);
    }
    return sum;
  }, 0);

  // Render Login Card
  if (!isAuthenticated) {
    return (
      <div className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center font-sans p-4">
        <div className="w-full max-w-md bg-slate-900 border-2 border-slate-800 rounded-2xl p-8 shadow-2xl relative">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black tracking-tight text-white">⚙️ TabOrder Admin</h1>
            <p className="text-slate-400 mt-1">Please enter your restaurant passkey to proceed.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                Passkey
              </label>
              <input
                type="password"
                required
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-4 py-3.5 text-center text-2xl font-black text-orange-400 placeholder:text-slate-700 focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>
            {error && (
              <div className="bg-red-950/40 border border-red-800 text-red-400 p-3 rounded-lg text-sm font-bold text-center">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-lg rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {loading ? "Authenticating..." : "Login to Console"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col">
      {/* Top Banner Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span>⚙️ {restaurant?.name.toUpperCase()} CONTROL CONSOLE</span>
          </h1>
          <p className="text-sm text-slate-400">Manage real-time tables, edit menu cards, and check reports.</p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sound alert configuration */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playAdminChime();
            }}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
              soundEnabled
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
            }`}
          >
            {soundEnabled ? "🔊 LIVE NOTIFICATIONS ACTIVE" : "🔇 MUTED (CLICK TO UNMUTE)"}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-xs font-bold rounded-lg cursor-pointer transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-slate-900/60 border-b border-slate-800/80 p-2 flex gap-2">
        <button
          onClick={() => setActiveTab("tables")}
          className={`px-5 py-3 rounded-lg text-sm font-black tracking-wider uppercase cursor-pointer transition-all ${
            activeTab === "tables"
              ? "bg-slate-800 text-orange-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          📊 Table Grid
        </button>
        <button
          onClick={() => setActiveTab("menu")}
          className={`px-5 py-3 rounded-lg text-sm font-black tracking-wider uppercase cursor-pointer transition-all ${
            activeTab === "menu"
              ? "bg-slate-800 text-orange-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          🍽️ Menu Manager
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-3 rounded-lg text-sm font-black tracking-wider uppercase cursor-pointer transition-all ${
            activeTab === "history"
              ? "bg-slate-800 text-orange-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          📈 Order Reports
        </button>
        <button
          onClick={() => setActiveTab("manage-tables")}
          className={`px-5 py-3 rounded-lg text-sm font-black tracking-wider uppercase cursor-pointer transition-all ${
            activeTab === "manage-tables"
              ? "bg-slate-800 text-orange-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          🗂️ Manage Tables
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-5 py-3 rounded-lg text-sm font-black tracking-wider uppercase cursor-pointer transition-all ${
            activeTab === "settings"
              ? "bg-slate-800 text-orange-400 border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* Message banners */}
      {successMsg && (
        <div className="bg-emerald-950/60 border-b border-emerald-800 text-emerald-400 p-4 text-center text-sm font-bold animate-pulse">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-950/60 border-b border-red-800 text-red-400 p-4 text-center text-sm font-bold">
          {error}
          <button onClick={() => setError("")} className="ml-3 underline text-xs font-black">Dismiss</button>
        </div>
      )}

      {/* Main Panel View */}
      <main className="flex-1 p-4 md:p-6">
        
        {/* ========================================================
            TAB 1: TABLES GRID MONITORING
            ======================================================== */}
        {activeTab === "tables" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight border-l-4 border-orange-500 pl-3">
              LIVE TABLES STATUS
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map((table) => {
                const isActive = table.status === "ACTIVE";
                const isBillRequested = table.status === "BILL_REQUESTED";
                const tableOrders = activeOrdersForTable(table.id);
                const orderCount = tableOrders.length;
                const billTotal = tableBillTotal(table.id);
                const paymentMethod = getTablePaymentMethod(table.id);

                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      setSelectedTable(table);
                      setShowPaymentSelect(false);
                    }}
                    className={`border-2 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
                      isBillRequested
                        ? "bg-amber-950/20 border-amber-500 hover:bg-amber-950/40 hover:scale-[1.03] animate-pulse"
                        : isActive
                        ? "bg-red-950/10 border-red-500 hover:bg-red-950/30 hover:scale-[1.03]"
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:scale-[1.03]"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Table
                    </span>
                    <span className="text-5xl font-black leading-none text-white my-2">
                      {table.tableNumber}
                    </span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        isBillRequested
                          ? "bg-amber-500/20 text-amber-400"
                          : isActive
                          ? "bg-red-500/20 text-red-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {isBillRequested
                        ? `BILL REQUESTED`
                        : isActive
                        ? `ACTIVE (${orderCount})`
                        : "EMPTY"}
                    </span>
                    {isBillRequested && (
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mt-1">
                        Pending: {paymentMethod}
                      </span>
                    )}
                    {(isActive || isBillRequested) && (
                      <span className="text-sm font-bold text-orange-400 mt-2 font-mono">
                        ₹{billTotal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Table Details Modal Inspector */}
            {selectedTable && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
                <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                  {/* Modal Header */}
                  <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-white">
                        Table {selectedTable.tableNumber} Details
                      </h3>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1 flex flex-wrap items-center gap-2">
                        <span>Status: {selectedTable.status}</span>
                        {selectedTable.status === "BILL_REQUESTED" && (
                          <span className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-900 animate-pulse text-[9px] tracking-widest">
                            PAYMENT PENDING: {getTablePaymentMethod(selectedTable.id)}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTable(null)}
                      className="text-slate-400 hover:text-white text-2xl font-bold p-1"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {activeOrdersForTable(selectedTable.id).length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        <span className="text-4xl block mb-2">🍽️</span>
                        <p className="text-lg font-bold">No active orders on this table.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {activeOrdersForTable(selectedTable.id).map((order, idx) => (
                          <div key={order.id} className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                              <span className="text-xs font-black text-orange-400 tracking-wider flex items-center gap-2">
                                <span>ORDER #{idx + 1}</span>
                                <span className={`text-[9px] font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase ${
                                  order.status === "PENDING"
                                    ? "bg-yellow-950 text-yellow-400 border border-yellow-900 animate-pulse"
                                    : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                }`}>
                                  {order.status}
                                </span>
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <ul className="space-y-2">
                              {order.items.map((item) => (
                                <li key={item.id} className="flex justify-between text-sm">
                                  <span>
                                    <strong className="text-orange-400">{item.quantity}x</strong> {item.menuItem?.name}
                                    {item.specialInstructions && (
                                      <span className="block text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded mt-1 font-mono">
                                        Instruction: {item.specialInstructions}
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono text-slate-300">
                                    ₹{Number(item.menuItem?.price || 0) * item.quantity}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div className="border-t border-slate-800 mt-3 pt-2 text-right">
                              <span className="text-xs text-slate-400 mr-2">Total Amount:</span>
                              <span className="font-black text-white font-mono">₹{order.totalAmount}</span>
                            </div>
                            {order.status === "PENDING" && (
                              <button
                                onClick={() => handleConfirmOrder(order.id)}
                                className="w-full mt-4 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer uppercase tracking-wider active:scale-[0.98]"
                              >
                                👍 Confirm Order (Send to Kitchen)
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="bg-slate-950 p-5 border-t border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div className="text-center sm:text-left">
                      <span className="text-xs font-bold text-slate-400 uppercase block">Combined Table Total</span>
                      <span className="text-3xl font-black text-orange-400 font-mono">
                        ₹{tableBillTotal(selectedTable.id)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center sm:justify-end items-center">
                      <button
                        onClick={() => {
                          setSelectedTable(null);
                          setShowPaymentSelect(false);
                        }}
                        className="px-5 py-3 border border-slate-700 hover:bg-slate-800 text-sm font-bold rounded-xl cursor-pointer"
                      >
                        Close
                      </button>
                      {selectedTable.status === "BILL_REQUESTED" && (
                        <div className="flex flex-col items-center sm:items-end gap-2">
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <span className={`text-xs font-black tracking-wider px-3 py-2 rounded-lg animate-pulse uppercase ${
                              getTablePaymentMethod(selectedTable.id) === "UPI"
                                ? "bg-amber-950/40 border border-amber-900/60 text-amber-400"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}>
                              ⚠️ Payment Pending: {getTablePaymentMethod(selectedTable.id)}
                            </span>
                            <button
                              onClick={() => handleClearTable(selectedTable.tableNumber)}
                              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl cursor-pointer active:scale-98 transition-all"
                            >
                              ✅ Mark Paid & Settle
                            </button>
                          </div>
                          {getTablePaymentMethod(selectedTable.id) === "UPI" && (
                            <span className="text-xs font-bold text-amber-400 bg-amber-950/20 px-3 py-1 rounded border border-amber-900/40 font-mono">
                              Txn ID: {getTableTransactionId(selectedTable.id) || "N/A"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: MENU MANAGER
            ======================================================== */}
        {activeTab === "menu" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Category and Item Forms (Left panel) */}
            <div className="space-y-6 lg:col-span-1">
              
              {/* Category creation form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="text-lg font-bold tracking-tight text-white border-l-4 border-orange-500 pl-3 mb-4">
                  {editingCatId ? "RENAME CATEGORY" : "ADD NEW CATEGORY"}
                </h3>
                <form
                  onSubmit={editingCatId ? handleRenameCategory : handleAddCategory}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Category Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingCatId ? editingCatName : newCatName}
                      onChange={(e) =>
                        editingCatId ? setEditingCatName(e.target.value) : setNewCatName(e.target.value)
                      }
                      placeholder="e.g. Desserts"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-lg uppercase tracking-wider cursor-pointer"
                    >
                      {editingCatId ? "Save Change" : "Create Category"}
                    </button>
                    {editingCatId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(null);
                          setEditingCatName("");
                        }}
                        className="px-3 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Item creation form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="text-lg font-bold tracking-tight text-white border-l-4 border-orange-500 pl-3 mb-4">
                  {editingItemId ? "EDIT MENU ITEM" : "ADD NEW MENU ITEM"}
                </h3>
                <form
                  onSubmit={editingItemId ? handleEditItemSubmit : handleAddItem}
                  className="space-y-4"
                >
                  {!editingItemId && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Category
                      </label>
                      <select
                        required
                        value={newItemCatId}
                        onChange={(e) => setNewItemCatId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-orange-500 text-sm transition-all"
                      >
                        <option value="">Select Category</option>
                        {menu?.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItemId ? editingItemName : newItemName}
                      onChange={(e) =>
                        editingItemId ? setEditingItemName(e.target.value) : setNewItemName(e.target.value)
                      }
                      placeholder="e.g. Garlic Bread"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Price (INR ₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={editingItemId ? editingItemPrice : newItemPrice}
                      onChange={(e) =>
                        editingItemId ? setEditingItemPrice(e.target.value) : setNewItemPrice(e.target.value)
                      }
                      placeholder="e.g. 120"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-mono transition-all"
                    />
                  </div>

                  {editingItemId && (
                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        id="isAvailable"
                        checked={editingItemAvailable}
                        onChange={(e) => setEditingItemAvailable(e.target.checked)}
                        className="w-4 h-4 rounded text-orange-500 accent-orange-600"
                      />
                      <label htmlFor="isAvailable" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                        In stock & Available
                      </label>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-lg uppercase tracking-wider cursor-pointer"
                    >
                      {editingItemId ? "Save Item" : "Create Menu Item"}
                    </button>
                    {editingItemId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemId(null);
                          setEditingItemName("");
                          setEditingItemPrice("");
                        }}
                        className="px-3 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

            </div>

            {/* Menu List Table (Right Panel) */}
            <div className="space-y-6 lg:col-span-2">
              <h2 className="text-xl font-bold tracking-tight border-l-4 border-orange-500 pl-3">
                CURRENT RESTAURANT MENU
              </h2>
              {menu?.categories.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
                  <p className="text-lg font-bold">No categories exist yet. Create a category to start building your menu.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {menu?.categories.map((category) => (
                    <div
                      key={category.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md"
                    >
                      {/* Category Header */}
                      <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
                        <h4 className="text-lg font-extrabold text-white uppercase tracking-wide">
                          {category.name}
                          <span className="text-xs text-slate-400 ml-2 font-normal">
                            ({category.menuItems.length} items)
                          </span>
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCatId(category.id);
                              setEditingCatName(category.name);
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition-all cursor-pointer"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="px-2.5 py-1.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/30 text-red-400 text-xs font-bold rounded transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Items List Table */}
                      <div className="p-3">
                        {category.menuItems.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-sm">
                            No menu items in this category. Add one using the form on the left.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-black">
                                  <th className="py-2.5 px-3">Item Name</th>
                                  <th className="py-2.5 px-3 text-right">Price</th>
                                  <th className="py-2.5 px-3 text-center">In Stock</th>
                                  <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                {category.menuItems.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-950/40">
                                    <td className="py-3 px-3 font-bold text-white">
                                      {item.name}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                                      ₹{item.price}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <button
                                        onClick={() => handleToggleAvailability(item)}
                                        className={`px-3 py-1 text-xs font-extrabold rounded-full transition-all cursor-pointer ${
                                          item.isAvailable
                                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                            : "bg-red-950 text-red-400 border border-red-900"
                                        }`}
                                      >
                                        {item.isAvailable ? "IN STOCK" : "OUT OF STOCK"}
                                      </button>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <div className="flex justify-end gap-1.5">
                                        <button
                                          onClick={() => {
                                            setEditingItemId(item.id);
                                            setEditingItemName(item.name);
                                            setEditingItemPrice(item.price);
                                            setEditingItemAvailable(item.isAvailable);
                                          }}
                                          className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteItem(item.id)}
                                          className="p-1 px-2.5 bg-red-950/20 text-red-400 hover:bg-red-900/20 text-xs font-semibold rounded cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 3: ORDER HISTORY REPORTS
            ======================================================== */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-fade-in-up">
            
            {/* Sales Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-md">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Total Completed Revenue
                </span>
                <span className="text-5xl font-black text-emerald-400 font-mono my-3">
                  ₹{totalRevenue}
                </span>
                <span className="text-xs text-slate-500">Includes all settled tables.</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-md">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Total Orders Placed
                </span>
                <span className="text-5xl font-black text-white font-mono my-3">
                  {orders.length}
                </span>
                <span className="text-xs text-slate-500">All historical tickets in database.</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-md">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Active Pending Tables
                </span>
                <span className="text-5xl font-black text-red-400 font-mono my-3">
                  {tables.filter((t) => t.status === "ACTIVE").length}
                </span>
                <span className="text-xs text-slate-500">Unsettled tables currently ordering.</span>
              </div>
            </div>

            {/* Historical list */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-slate-950 p-5 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                  DATABASE ORDER RECORD LIST
                </h3>
              </div>
              <div className="p-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No orders exist in the database yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-black">
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Table</th>
                          <th className="py-3 px-4">Date/Time</th>
                          <th className="py-3 px-4">Items Ordered</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {orders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-950/40">
                            <td className="py-4 px-4 font-mono text-xs text-slate-400">
                              {order.id}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-white text-lg">
                              Table {order.table?.tableNumber || "N/A"}
                            </td>
                            <td className="py-4 px-4 text-slate-400 text-xs">
                              {new Date(order.createdAt).toLocaleString()}
                            </td>
                            <td className="py-4 px-4 max-w-sm">
                              <ul className="space-y-1">
                                {order.items.map((item) => (
                                  <li key={item.id} className="text-xs">
                                    <strong className="text-slate-300">{item.quantity}x</strong> {item.menuItem?.name}
                                    {item.specialInstructions && (
                                      <span className="text-slate-500 italic block pl-4">
                                        ↳ "{item.specialInstructions}"
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${
                                  order.status === "COMPLETED"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                    : order.status === "CANCELLED"
                                    ? "bg-red-950 text-red-500 border border-red-900"
                                    : "bg-yellow-950 text-yellow-400 border border-yellow-900 animate-pulse"
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-mono text-lg font-black text-white">
                              ₹{order.totalAmount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: MANAGE TABLES
            ======================================================== */}
        {activeTab === "manage-tables" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            {/* Create Table Form */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="text-lg font-bold tracking-tight text-white border-l-4 border-orange-500 pl-3 mb-4">
                  ADD NEW TABLE
                </h3>
                <form onSubmit={handleAddTable} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Table Number
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newTableNumber}
                      onChange={(e) => setNewTableNumber(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-mono transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-lg uppercase tracking-wider cursor-pointer"
                  >
                    Add Table
                  </button>
                </form>
              </div>
            </div>

            {/* Tables List */}
            <div className="space-y-6 lg:col-span-2">
              <h2 className="text-xl font-bold tracking-tight border-l-4 border-orange-500 pl-3">
                EXISTING TABLES
              </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4">
                  {tables.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      No tables found. Add one using the form on the left.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-black">
                            <th className="py-3 px-4">Table Number</th>
                            <th className="py-3 px-4">Current Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {tables.map((table) => {
                            const isNotSetted = table.status !== "EMPTY";
                            return (
                              <tr key={table.id} className="hover:bg-slate-950/40">
                                <td className="py-4 px-4 font-black text-white text-lg">
                                  Table {table.tableNumber}
                                </td>
                                <td className="py-4 px-4">
                                  <span
                                    className={`text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded uppercase ${
                                      table.status === "BILL_REQUESTED"
                                        ? "bg-amber-900 text-amber-400 border border-amber-800 animate-pulse"
                                        : table.status === "ACTIVE"
                                        ? "bg-red-950 text-red-400 border border-red-900 animate-pulse"
                                        : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                    }`}
                                  >
                                    {table.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <button
                                    onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                                    disabled={isNotSetted}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                      isNotSetted
                                        ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                                        : "bg-red-950 text-red-400 hover:bg-red-900/20"
                                    }`}
                                  >
                                    Delete Table
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: SYSTEM SETTINGS
            ======================================================== */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
            <h2 className="text-xl font-bold tracking-tight border-l-4 border-orange-500 pl-3">
              UPI Settings
            </h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-bold tracking-tight text-white mb-4">
                UPI Settings
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Configure your peer-to-peer UPI ID for customer checkouts. Customers will pay to this UPI ID when selecting the UPI checkout option.
              </p>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    UPI Address (Virtual Payment Address)
                  </label>
                  <input
                    type="text"
                    required
                    value={merchantUpiId}
                    onChange={(e) => setMerchantUpiId(e.target.value)}
                    placeholder="e.g. merchant@ybl"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-lg uppercase tracking-wider cursor-pointer transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Settings"}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
