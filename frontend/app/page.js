import { Suspense } from "react";
import CustomerOrderingApp from "@/components/CustomerOrderingApp";

function LoadingSkeleton() {
  return (
    <main className="app-shell flex items-center justify-center p-6">
      <div className="surface-card w-full max-w-md rounded-[28px] p-8 text-center">
        <div className="animate-pulse-gentle text-lg font-bold text-stone-600">
          Loading menu…
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CustomerOrderingApp />
    </Suspense>
  );
}
