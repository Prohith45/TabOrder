"use client";

import { useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

// Web Audio API helper to generate a clean, audible tone without external audio files
function playKitchenChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const now = audioCtx.currentTime;
    
    // Pleasant double-chime (G5 followed by C6)
    const playTone = (freq, startTime, duration) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    playTone(783.99, now, 0.18); // G5
    playTone(1046.50, now + 0.18, 0.35); // C6
  } catch (e) {
    console.error("Audio playback failed", e);
  }
}

export default function KitchenDisplaySystem() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [completingIds, setCompletingIds] = useState(new Set());

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // 1. Fetch active orders from REST API on mount
  useEffect(() => {
    async function loadActiveOrders() {
      try {
        const res = await fetch(`${backendUrl}/api/restaurants/1/orders`);
        if (!res.ok) throw new Error("Failed to fetch orders from backend");
        const data = await res.json();
        
        // Handle database return formats: sometimes { value: [...] } or direct array
        const fetchedOrders = Array.isArray(data) ? data : (data.value || []);
        
        // Filter only active confirmed orders (PREPARING)
        const activeOrders = fetchedOrders.filter(
          (o) => o.status === "PREPARING"
        );
        
        setOrders(activeOrders.map(o => ({ ...o, joinedAt: new Date(o.createdAt).getTime() })));
        setLoading(false);
      } catch (err) {
        console.error("Failed loading KDS initial data:", err);
        setError("Could not load current orders. Running in standalone WebSocket mode.");
        setLoading(false);
      }
    }

    loadActiveOrders();
  }, [backendUrl]);

  // 2. Connect to WebSocket server for live updates
  useEffect(() => {
    const socket = io(backendUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_restaurant", { restaurantId: "1" });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("new_order", (newOrder) => {
      if (newOrder.status !== "PREPARING") return;

      if (soundEnabled) {
        playKitchenChime();
      }

      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [
          {
            ...newOrder,
            isNew: true,
            joinedAt: Date.now(),
          },
          ...prev,
        ];
      });
    });

    socket.on("order_updated", (updatedOrder) => {
      if (updatedOrder.status !== "PREPARING") return;

      if (soundEnabled) {
        playKitchenChime();
      }

      setOrders((prev) => {
        if (prev.some((o) => o.id === updatedOrder.id)) return prev;
        return [
          {
            ...updatedOrder,
            isNew: true,
            joinedAt: Date.now(),
          },
          ...prev,
        ];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [backendUrl, soundEnabled]);

  // 3. Keep elapsed timers updating every second
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // 4. Mark Complete locally with transition
  const handleMarkComplete = (orderId) => {
    // Add to completing set to trigger exit fade/shrink animation
    setCompletingIds((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });

    // Remove from array after animation completes
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }, 350);
  };

  // Helper to format elapsed time (e.g. 05:22)
  const getElapsedString = (createdAt) => {
    const diffMs = currentTime - new Date(createdAt).getTime();
    if (diffMs < 0) return "00:00";
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper to get time-based priority class (Green < 5m, Amber 5-10m, Red > 10m)
  const getTicketStatusColor = (createdAt) => {
    const diffMins = (currentTime - new Date(createdAt).getTime()) / 60000;
    if (diffMins >= 10) return "border-red-600 bg-red-950/20 text-red-400";
    if (diffMins >= 5) return "border-amber-500 bg-amber-950/20 text-amber-400";
    return "border-emerald-600 bg-emerald-950/20 text-emerald-400";
  };

  const getElapsedTimeClass = (createdAt) => {
    const diffMins = (currentTime - new Date(createdAt).getTime()) / 60000;
    if (diffMins >= 10) return "text-red-500 font-black animate-pulse";
    if (diffMins >= 5) return "text-amber-500 font-bold";
    return "text-emerald-500 font-semibold";
  };

  // 5. Simulation tools (for testing kitchen chime/alert/layout locally)
  const simulateNewOrder = () => {
    if (soundEnabled) {
      playKitchenChime();
    }

    const testId = `sim-${Date.now()}`;
    const testOrder = {
      id: testId,
      createdAt: new Date().toISOString(),
      table: { tableNumber: Math.floor(Math.random() * 12) + 1 },
      isNew: true,
      items: [
        {
          id: `${testId}-i1`,
          quantity: Math.floor(Math.random() * 3) + 1,
          menuItem: { name: "Burger", price: 150 },
          specialInstructions: Math.random() > 0.5 ? "NO ONIONS, extra mayo" : null,
        },
        {
          id: `${testId}-i2`,
          quantity: Math.floor(Math.random() * 2) + 1,
          menuItem: { name: "fries", price: 80 },
          specialInstructions: Math.random() > 0.7 ? "Extra crispy please" : null,
        },
      ],
    };

    setOrders((prev) => [testOrder, ...prev]);
  };

  return (
    <div className="bg-neutral-950 text-white min-h-screen font-sans selection:bg-orange-500 selection:text-white p-4 md:p-6 flex flex-col">
      {/* KDS Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b-4 border-neutral-800 pb-4 mb-6 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-3">
            <span>🍳 KITCHEN DISPLAY</span>
            <span className="text-xs bg-orange-600 text-white font-extrabold uppercase px-2.5 py-1 rounded">
              KDS Screen
            </span>
          </h1>
          <p className="text-neutral-400 mt-1 text-lg font-medium">
            Test Hotel • Table Order Routing Center
          </p>
        </div>

        {/* Real-time Status Badge & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Simulate Order Button */}
          <button
            onClick={simulateNewOrder}
            className="px-4 py-3 bg-neutral-800 border-2 border-neutral-700 hover:bg-neutral-700 active:scale-95 text-sm font-black rounded-lg transition-all text-orange-400 tracking-wide cursor-pointer"
          >
            ➕ TEST TICKET
          </button>

          {/* Sound Unmute Controller */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playKitchenChime();
            }}
            className={`px-5 py-3 rounded-lg text-sm font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
              soundEnabled
                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30"
                : "bg-red-950/60 text-red-400 border border-red-800 hover:bg-red-900/30"
            }`}
          >
            {soundEnabled ? "🔊 AUDIO ACTIVE (TEST)" : "🔇 AUDIO BLOCKED (UNMUTE)"}
          </button>

          {/* Socket Connection Status */}
          <div
            className={`px-4 py-3 rounded-lg text-xs font-black tracking-widest uppercase flex items-center gap-2 border-2 ${
              connected
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/80"
                : "bg-red-950/40 text-red-500 border-red-900/80 animate-pulse"
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full ${
                connected ? "bg-emerald-400" : "bg-red-500 animate-ping"
              }`}
            />
            {connected ? "LIVE CONNECTED" : "OFFLINE"}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-neutral-400">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-2xl font-bold animate-pulse">Initializing Kitchen Screen...</p>
          </div>
        ) : error && orders.length === 0 ? (
          <div className="bg-red-950/20 border-2 border-red-900 text-red-400 p-6 rounded-xl text-center my-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-black mb-2">⚠️ Connection Issue</h3>
            <p className="text-lg mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer transition-all"
            >
              Retry Connection
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-24 border-4 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
            <span className="text-8xl mb-6">🍽️</span>
            <h2 className="text-3xl font-black text-neutral-400 tracking-tight">KITCHEN IS CLEAR</h2>
            <p className="text-neutral-500 mt-2 text-xl max-w-md">
              No pending orders. Incoming table orders will chime and display here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {orders.map((order) => {
              const isCompleting = completingIds.has(order.id);
              const isNewlyCreated = order.isNew;
              const statusColorClass = getTicketStatusColor(order.createdAt);
              const timeClass = getElapsedTimeClass(order.createdAt);
              const elapsedString = getElapsedString(order.createdAt);

              return (
                <div
                  key={order.id}
                  className={`bg-neutral-900 border-4 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 ${statusColorClass} ${
                    isCompleting ? "scale-90 opacity-0 -translate-y-8" : "scale-100 opacity-100"
                  } ${
                    isNewlyCreated
                      ? "ring-4 ring-yellow-400 ring-offset-4 ring-offset-neutral-950 animate-bounce duration-500"
                      : ""
                  }`}
                  style={{
                    animationIterationCount: isNewlyCreated ? 1 : "infinite",
                  }}
                  onAnimationEnd={(e) => {
                    // Turn off bouncy highlight after animation ends
                    if (e.animationName.includes("bounce")) {
                      setOrders((prev) =>
                        prev.map((o) => (o.id === order.id ? { ...o, isNew: false } : o))
                      );
                    }
                  }}
                >
                  {/* Ticket Header */}
                  <div className="p-4 border-b-4 border-neutral-800 flex justify-between items-start bg-neutral-950/80">
                    <div>
                      <span className="text-xs font-black tracking-widest text-neutral-400 uppercase">
                        TABLE
                      </span>
                      <h2 className="text-5xl font-black leading-none text-white tracking-tight mt-1">
                        {order.table?.tableNumber || "X"}
                      </h2>
                    </div>
                    
                    {/* Real-time Counter */}
                    <div className="text-right">
                      <span className="text-xs font-black tracking-widest text-neutral-400 uppercase">
                        WAIT TIME
                      </span>
                      <p className={`text-3xl tracking-wider font-mono mt-1 ${timeClass}`}>
                        {elapsedString}
                      </p>
                    </div>
                  </div>

                  {/* Order Ticket Items list */}
                  <div className="p-5 flex-1 space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="border-b border-neutral-800 pb-3 last:border-b-0 last:pb-0">
                        {/* Quantity and Name */}
                        <div className="flex items-start text-2xl font-bold leading-tight">
                          <span className="text-3xl font-extrabold text-orange-500 mr-3 min-w-[2.5rem]">
                            {item.quantity}x
                          </span>
                          <span className="text-neutral-100 flex-1">{item.menuItem?.name}</span>
                        </div>

                        {/* Special Instructions */}
                        {item.specialInstructions && (
                          <div className="mt-2 bg-yellow-400 text-black px-3 py-2 rounded-lg font-black text-lg tracking-wide uppercase flex items-start gap-1.5 shadow-sm">
                            <span className="text-xl">⚠️</span>
                            <span className="flex-1 leading-normal">{item.specialInstructions}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Ticket Footer Action Button */}
                  <div className="p-4 bg-neutral-950/60 border-t-2 border-neutral-800/80">
                    <button
                      onClick={() => handleMarkComplete(order.id)}
                      className="w-full py-4.5 bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] text-white font-extrabold text-2xl rounded-xl cursor-pointer transition-all uppercase shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                    >
                      ✓ DONE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
