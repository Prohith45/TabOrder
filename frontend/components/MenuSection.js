function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function MenuSection({ category, cart, locked, onAddItem, onQuantityChange }) {
  if (!category.menuItems || category.menuItems.length === 0) return null;

  return (
    <section className="animate-fade-in-up">
      {/* Category header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400">
            Category
          </p>
          <h2 className="mt-0.5 text-xl font-extrabold text-stone-900 sm:text-2xl">
            {category.name}
          </h2>
        </div>
        <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
          {category.menuItems.length} {category.menuItems.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Items grid */}
      <div className="grid gap-3">
        {category.menuItems.map((item) => {
          const cartEntry = cart[item.id];
          const qty = cartEntry?.quantity || 0;
          const unavailable = !item.isAvailable;
          const disabled = locked || unavailable;

          return (
            <article
              key={item.id}
              className={`surface-card rounded-[var(--radius-lg)] p-4 transition-opacity ${
                unavailable ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: name + badge + price */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-stone-900 sm:text-lg">
                      {item.name}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        unavailable
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {unavailable ? "Sold out" : "Available"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xl font-extrabold text-stone-900">
                    {formatPrice(item.price)}
                  </p>
                </div>

                {/* Right: quantity controls or Add button */}
                <div className="flex-shrink-0">
                  {qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-counter flex h-10 w-10 items-center justify-center rounded-xl text-lg font-extrabold"
                        onClick={() => onQuantityChange(item.id, qty - 1)}
                        disabled={disabled}
                        aria-label={`Decrease ${item.name}`}
                      >
                        −
                      </button>
                      <span className="min-w-[28px] text-center text-lg font-extrabold text-stone-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        className="btn-counter flex h-10 w-10 items-center justify-center rounded-xl text-lg font-extrabold"
                        onClick={() => onQuantityChange(item.id, qty + 1)}
                        disabled={disabled}
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary rounded-xl px-5 py-2.5 text-sm font-extrabold uppercase tracking-wider"
                      onClick={() => onAddItem(item)}
                      disabled={disabled}
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
