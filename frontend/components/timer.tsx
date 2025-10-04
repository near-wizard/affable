"use client";
import { useEffect, useState } from "react";

export function Timer() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="px-2 py-0.5 bg-[oklch(0.82_0.04_65)] border border-[oklch(0.60_0.06_50)] shadow-[inset_1px_1px_0_0_oklch(0.90_0.03_70)] text-[oklch(0.30_0.04_45)] rounded-sm">
    {time}
    </span>;
}
