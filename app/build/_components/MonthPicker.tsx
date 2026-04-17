"use client";
import { useEffect, useRef, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

export function MonthPicker(props: {
  value: string; // YYYY-MM or ""
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"year" | "month">("year");
  const [pendingYear, setPendingYear] = useState<number>(CURRENT_YEAR);
  const ref = useRef<HTMLDivElement>(null);

  const [vy, vm] = props.value
    ? props.value.split("-").map(Number)
    : [null, null];

  const displayLabel =
    vy && vm ? `${MONTHS[vm - 1]} ${vy}` : null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const openPicker = () => {
    if (props.disabled) return;
    setPendingYear(vy ?? CURRENT_YEAR);
    setView("year");
    setOpen(true);
  };

  const pickYear = (year: number) => {
    setPendingYear(year);
    setView("month");
  };

  const pickMonth = (monthIdx: number) => {
    const mm = String(monthIdx + 1).padStart(2, "0");
    props.onChange(`${pendingYear}-${mm}`);
    setOpen(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onChange("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPicker}
        disabled={props.disabled}
        className="flex w-full items-center justify-between rounded border border-zinc-300 px-3 py-2 text-left text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <span className={displayLabel ? "" : "text-zinc-400 dark:text-zinc-500"}>
          {displayLabel ?? "Select…"}
        </span>
        {displayLabel ? (
          <span
            role="button"
            onClick={clear}
            className="ml-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ✕
          </span>
        ) : null}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-48 rounded border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {view === "year" ? (
            <div className="max-h-52 overflow-y-auto py-1">
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => pickYear(y)}
                  className={`w-full px-4 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    y === vy ? "font-semibold text-black dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setView("year")}
                className="flex w-full items-center gap-1 border-b border-zinc-100 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:hover:text-zinc-100"
              >
                ← {pendingYear}
              </button>
              <div className="grid grid-cols-3 gap-1 p-2">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMonth(i)}
                    className={`rounded py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      i + 1 === vm && pendingYear === vy
                        ? "bg-zinc-200 font-semibold dark:bg-zinc-700"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
