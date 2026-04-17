"use client";
import { useEffect, useRef, useState } from "react";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";
import type { StepProps, StepErrors } from "./index";

export function Identity({ errors, touched, markTouched }: StepProps) {
  const { formData, updateFormData } = useResume();
  const id = formData.identity;
  const set = (patch: Partial<FormData["identity"]>) =>
    updateFormData({ identity: { ...id, ...patch } });

  const fieldError = (name: string) => (touched[name] ? errors[name] : undefined);

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Full name"
        value={id.fullName}
        error={fieldError("fullName")}
        onChange={(v) => {
          set({ fullName: v });
          markTouched("fullName");
        }}
        onBlur={() => markTouched("fullName")}
      />
      <Field
        label="Phone"
        value={id.phone}
        error={fieldError("phone")}
        inputMode="tel"
        autoComplete="tel"
        maxLength={14}
        onChange={(v) => {
          set({ phone: formatUsPhoneInput(v) });
          markTouched("phone");
        }}
        onBlur={() => markTouched("phone")}
      />
      <Field
        label="Email"
        type="email"
        value={id.email}
        error={fieldError("email")}
        onChange={(v) => {
          set({ email: v });
          markTouched("email");
        }}
        onBlur={() => markTouched("email")}
      />
      <LocationField
        value={id.location}
        error={fieldError("location")}
        onChange={(v) => { set({ location: v }); markTouched("location"); }}
        onBlur={() => markTouched("location")}
      />
    </div>
  );
}

export function validateIdentity(data: FormData): StepErrors {
  const errs: StepErrors = {};
  if (!data.identity.fullName) errs.fullName = "Full name is required.";
  if (!data.identity.phone) errs.phone = "Phone is required.";
  if (!data.identity.email) errs.email = "Email is required.";
  else if (!/.+@.+\..+/.test(data.identity.email)) errs.email = "Enter a valid email address.";
  if (!data.identity.location) errs.location = "Location is required.";
  return errs;
}

/** North American display: (xxx) xxx-xxxx */
function formatUsPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function LocationField(props: {
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = props.value.trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (query.length < 2) { setSuggestions([]); return; }
      try {
        type NominatimAddress = {
          city?: string; town?: string; village?: string; suburb?: string;
          state?: string; postcode?: string;
        };
        type NominatimResult = { lat: string; lon: string; address: NominatimAddress };
        const fmt = (addr: NominatimAddress, zip: string) => {
          const city = addr.city ?? addr.town ?? addr.village ?? addr.suburb;
          if (!city || !addr.state) return null;
          return `${city}, ${addr.state}${zip ? " " + zip : ""}`;
        };
        const isZip = /^\d{3,5}$/.test(query);
        const url = isZip
          ? `https://nominatim.openstreetmap.org/search?postalcode=${query}&country=us&format=json&limit=5&addressdetails=1`
          : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us&addressdetails=1`;
        const data: NominatimResult[] = await (await fetch(url, { headers: { "Accept-Language": "en" } })).json();
        const results = await Promise.all(data.map(async (r) => {
          const zip = r.address.postcode ?? (isZip ? query : "");
          const direct = fmt(r.address, zip);
          if (direct) return direct;
          const rev: NominatimResult = await (await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${r.lat}&lon=${r.lon}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          )).json();
          return fmt(rev.address, zip);
        }));
        setSuggestions(results.filter((s): s is string => s !== null));
      } catch { setSuggestions([]); }
    }, 300);
  }, [props.value]);

  const hasError = Boolean(props.error);
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">Location</span>
      <input
        list="location-suggestions"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        placeholder="ZIP code or city name"
        aria-invalid={hasError || undefined}
        className={`rounded border px-3 py-2 dark:bg-zinc-900 ${hasError ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
      />
      <datalist id="location-suggestions">
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>
      {hasError ? <span className="text-xs text-red-600">{props.error}</span> : null}
    </label>
  );
}

function Field(props: {
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  inputMode?: "tel" | "text" | "email" | "numeric" | "url" | "search" | "none";
  autoComplete?: string;
  maxLength?: number;
}) {
  const hasError = Boolean(props.error);
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        maxLength={props.maxLength}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        aria-invalid={hasError || undefined}
        className={`rounded border px-3 py-2 dark:bg-zinc-900 ${
          hasError
            ? "border-red-500 dark:border-red-500"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
      />
      {hasError ? <span className="text-xs text-red-600">{props.error}</span> : null}
    </label>
  );
}
