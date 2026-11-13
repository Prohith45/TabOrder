function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function CartPanel({
  items,
  totalAmount,
  totalQuantity,
  lockedOrder,
  submitting,
  submitError,
  onQuantityChange,
  onInstructionsChange,
  onSubmit,
  onCheckout,
}) {
  const hasItems = items.length > 0;

  return (
    <aside className="surface-card sticky bottom-4 rounded-[var(--radius-lg)] p-4 md:top-6 md:self-start md:p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400">
            Your Cart
          </p>
          <h2 className="mt-0.5 text-xl font-extrabold text-stone-900">
            {lockedOrder ? "Order Sent" : "Ready to Send"}
          </h2>
        </div>
        <div className="surface-pill rounded-full px-3 py-1.5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Items
          </div>
          <div className="text-lg font-extrabold text-stone-900">{totalQuantity}</div>
        </div>
      </div>

      {/* Locked / success state */}
      {lockedOrder ? (
        <div className="space-y-4 animate-fade-in-up">
          {/* Order status banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-[var(--radius-md)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="animate-pulse text-2xl">⏳</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">
                  Real-time Status
                </p>
                <h3 className="text-sm font-extrabold text-emerald-950">
                  {lockedOrder.status === "PENDING" && "Order placed. Waiting for restaurant confirmation."}
                  {lockedOrder.status === "PREPARING" && "Your order is being prepared. It will arrive shortly."}
                  {lockedOrder.status === "COMPLETED" && "Your order is ready! Bon appétit."}
                </h3>
              </div>
            </div>
          </div>

          {/* Digital Bill Summary */}
          <div className="border border-stone-200 rounded-[var(--radius-md)] p-4 bg-white/70">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-3">
              Digital Bill Summary
            </h4>
            <div className="max-h-[160px] overflow-y-auto pr-1 mb-3 space-y-1.5">
              {lockedOrder.items && lockedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1 border-b border-stone-100 last:border-0">
                  <span className="text-stone-700 font-medium">
                    <strong className="text-stone-900">{item.quantity}x</strong> {item.menuItem?.name}
                  </span>
                  <span className="font-mono text-stone-600">
                    {formatPrice(Number(item.menuItem?.price || 0) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Taxes and totals */}
            <div className="border-t border-stone-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(lockedOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>CGST (2.5%)</span>
                <span className="font-mono">{formatPrice(Number(lockedOrder.totalAmount) * 0.025)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>SGST (2.5%)</span>
                <span className="font-mono">{formatPrice(Number(lockedOrder.totalAmount) * 0.025)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-stone-900 border-t border-stone-200/60 pt-2 text-sm">
                <span>Grand Total</span>
                <span className="font-mono text-orange-600">
                  {formatPrice(Number(lockedOrder.totalAmount) * 1.05)}
                </span>
              </div>
            </div>
          </div>

          {/* Checkout triggers */}
          {!(lockedOrder.transactionId || lockedOrder.paymentMethod === "CASH") ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider text-center">
                Select Checkout Option
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onCheckout("UPI")}
                  disabled={submitting}
                  className="btn-primary rounded-xl px-3 py-3 text-xs font-black tracking-wider uppercase text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40"
                >
                  📱 Pay via UPI
                </button>
                <button
                  type="button"
                  onClick={() => onCheckout("CASH")}
                  disabled={submitting}
                  className="bg-stone-900 hover:bg-stone-850 text-white rounded-xl px-3 py-3 text-xs font-black tracking-wider uppercase text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40"
                >
                  💵 Pay with Cash
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] p-4 text-center">
              {lockedOrder.transactionId && (
                <div>
                  <p className="text-2xl animate-pulse mb-1">⏳</p>
                  <p className="text-xs font-black uppercase text-amber-800 tracking-wider">
                    UPI Verification Pending
                  </p>
                  <p className="text-[11px] text-amber-600 mt-1">
                    Waiting for host to confirm Txn ID: {lockedOrder.transactionId}.
                  </p>
                </div>
              )}
              {lockedOrder.paymentMethod === "CASH" && (
                <div>
                  <p className="text-2xl animate-pulse mb-1">💵</p>
                  <p className="text-xs font-black uppercase text-amber-800 tracking-wider">
                    Cash payment requested
                  </p>
                  <p className="text-xs font-bold text-amber-700 mt-1">
                    Please pay at the counter.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Empty cart */}
      {!lockedOrder && !hasItems ? (
        <div className="rounded-[var(--radius-md)] border-2 border-dashed border-amber-300/60 bg-amber-50/50 p-5 text-center">
          <p className="text-2xl">🍽️</p>
          <p className="mt-2 text-sm font-semibold text-stone-500">
            Add dishes from the menu to build your order.
          </p>
        </div>
      ) : null}

      {/* Cart items */}
      {!lockedOrder && hasItems ? (
        <div className="space-y-4">
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {items.map((item, index) => (
              <div
                key={item.menuItemId}
                className="animate-slide-in rounded-[var(--radius-md)] bg-white/80 p-4 shadow-sm"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Item header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-stone-900">{item.name}</h3>
                    <p className="mt-0.5 text-xs font-semibold text-stone-400">
                      {formatPrice(item.price)} each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Subtotal
                    </p>
                    <p className="text-sm font-extrabold text-stone-900">
                      {formatPrice(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                </div>

                {/* Quantity controls */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-counter flex h-9 w-9 items-center justify-center rounded-xl text-base font-extrabold"
                    onClick={() => onQuantityChange(item.menuItemId, item.quantity - 1)}
                    disabled={submitting}
                    aria-label={`Decrease ${item.name}`}
                  >
                    −
                  </button>
                  <span className="min-w-[28px] text-center text-base font-extrabold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="btn-counter flex h-9 w-9 items-center justify-center rounded-xl text-base font-extrabold"
                    onClick={() => onQuantityChange(item.menuItemId, item.quantity + 1)}
                    disabled={submitting}
                    aria-label={`Increase ${item.name}`}
                  >
                    +
                  </button>
                </div>

                {/* Special instructions */}
                <label className="mt-3 block">
                  <span className="text-xs font-bold text-stone-500">Special instructions</span>
                  <textarea
                    value={item.specialInstructions}
                    onChange={(e) => onInstructionsChange(item.menuItemId, e.target.value)}
                    placeholder="No onions, extra spicy…"
                    disabled={submitting}
                    rows={2}
                    className="mt-1.5 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-orange-400 focus:bg-white disabled:opacity-40"
                  />
                </label>
              </div>
            ))}
          </div>

          {/* Submit error */}
          {submitError ? (
            <div className="banner-error animate-fade-in-up rounded-[var(--radius-md)] p-4 text-sm font-bold">
              {submitError}
            </div>
          ) : null}

          {/* Total bar + Place Order button */}
          <div className="rounded-[var(--radius-md)] bg-stone-950 p-4 text-white">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-400">
              <span>Total</span>
              <span>{totalQuantity} {totalQuantity === 1 ? "item" : "items"}</span>
            </div>
            <div className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {formatPrice(totalAmount)}
            </div>
            <button
              type="button"
              className="btn-primary mt-3 w-full rounded-xl px-4 py-3.5 text-base font-extrabold tracking-wide shadow-lg shadow-orange-900/20"
              onClick={onSubmit}
              disabled={submitting || !hasItems}
            >
              {submitting ? "Sending to kitchen…" : "Place Order →"}
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
