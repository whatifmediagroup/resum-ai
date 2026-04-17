"use client";

import { motion } from "framer-motion";

type KoalaMascotProps = {
  speech?: string;
  size?: number;
  delay?: number;
  /** "hero" = stacked bubble above koala; "helper" = side-by-side compact row */
  variant?: "hero" | "helper";
};

export function KoalaMascot({
  speech,
  size = 120,
  delay = 0,
  variant = "hero",
}: KoalaMascotProps) {
  const delayS = delay / 1000;

  if (variant === "helper") {
    return (
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: delayS, ease: "easeOut" }}
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: size, height: size, flexShrink: 0 }}
          aria-label="Koala mascot"
          role="img"
        >
          <KoalaSVG />
        </motion.div>
        {speech && (
          <motion.div
            className="rounded-2xl rounded-tl-sm bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 shadow-sm dark:bg-indigo-950/60 dark:text-indigo-300"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: delayS + 0.2, ease: "backOut" }}
          >
            {speech}
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delayS, ease: "easeOut" }}
    >
      {speech && (
        <motion.div
          className="relative max-w-[240px] rounded-2xl bg-indigo-50 px-4 py-2.5 text-center text-sm font-medium text-indigo-700 shadow-sm dark:bg-indigo-950/60 dark:text-indigo-300"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: delayS + 0.25, ease: "backOut" }}
        >
          {speech}
          <span
            className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 border-x-[10px] border-t-[10px] border-x-transparent border-t-indigo-50 dark:border-t-indigo-950/60"
            aria-hidden="true"
          />
        </motion.div>
      )}

      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: size, height: size }}
        aria-label="Koala mascot"
        role="img"
      >
        <KoalaSVG />
      </motion.div>
    </motion.div>
  );
}

function KoalaSVG() {
  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* ── Ears — 4 rings each, very fluffy, behind head ── */}
      <circle cx="42" cy="40" r="34" fill="#7A9099" />
      <circle cx="42" cy="40" r="24" fill="#A8BCC4" />
      <circle cx="42" cy="40" r="15" fill="#CBE0E8" />
      <circle cx="42" cy="40" r="8"  fill="#F5AABF" />

      <circle cx="158" cy="40" r="34" fill="#7A9099" />
      <circle cx="158" cy="40" r="24" fill="#A8BCC4" />
      <circle cx="158" cy="40" r="15" fill="#CBE0E8" />
      <circle cx="158" cy="40" r="8"  fill="#F5AABF" />

      {/* ── Body ── */}
      <ellipse cx="100" cy="182" rx="52" ry="40" fill="#7A9099" />
      {/* Belly — off-white, clearly a tummy */}
      <ellipse cx="100" cy="185" rx="32" ry="26" fill="#EBF3F6" />

      {/* ── Simple round paws at bottom corners ── */}
      <circle cx="62"  cy="208" r="17" fill="#8898A2" />
      <circle cx="138" cy="208" r="17" fill="#8898A2" />
      {/* Paw toe lines */}
      <path d="M54 202 Q62 198 70 202" stroke="#7A9099" strokeWidth="2" strokeLinecap="round" />
      <path d="M130 202 Q138 198 146 202" stroke="#7A9099" strokeWidth="2" strokeLinecap="round" />

      {/* ── Coffee cup (sitting in lap between paws) ── */}
      {/* Steam */}
      <path d="M88 188 Q86 181 88 175 Q90 169 88 163" stroke="#A8BCC4" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M100 186 Q98 179 100 173 Q102 167 100 161" stroke="#A8BCC4" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M112 188 Q110 181 112 175 Q114 169 112 163" stroke="#A8BCC4" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      {/* Cup body — warm terracotta, very rounded */}
      <rect x="76" y="193" width="48" height="30" rx="11" fill="#C87B5A" />
      {/* Cup rim highlight */}
      <rect x="76" y="193" width="48" height="8" rx="11" fill="#DC9272" />
      {/* Handle */}
      <path d="M124 200 Q136 200 136 208 Q136 216 124 216" stroke="#C87B5A" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* Cup shine stripe */}
      <rect x="83" y="198" width="6" height="18" rx="3" fill="white" opacity="0.22" />
      {/* Tiny heart */}
      <path d="M96 208 Q96 204 100 204 Q104 204 104 208 Q104 213 100 216 Q96 213 96 208Z" fill="white" opacity="0.5" />

      {/* ── Head — warm medium gray, big and round ── */}
      <circle cx="100" cy="90" r="70" fill="#9BADB8" />
      {/* Subtle outline for cartoon pop */}
      <circle cx="100" cy="90" r="70" stroke="#8898A4" strokeWidth="1.5" />

      {/* ── Muzzle — SMALL lower-face oval only, clearly a snout not a visor ── */}
      <ellipse cx="100" cy="118" rx="38" ry="27" fill="#C4D8E0" />

      {/* ── Eyes — large chibi, nearly all dark ── */}
      <circle cx="74"  cy="82" r="21" fill="white" />
      <circle cx="74"  cy="83" r="16" fill="#18182C" />
      <circle cx="82"  cy="74" r="7"  fill="white" />
      <circle cx="70"  cy="91" r="3"  fill="white" opacity="0.65" />

      <circle cx="126" cy="82" r="21" fill="white" />
      <circle cx="126" cy="83" r="16" fill="#18182C" />
      <circle cx="134" cy="74" r="7"  fill="white" />
      <circle cx="122" cy="91" r="3"  fill="white" opacity="0.65" />

      {/* ── Nose — BIG, wide, the most koala thing about a koala ── */}
      <ellipse cx="100" cy="115" rx="21" ry="15" fill="#18182C" />
      <ellipse cx="93"  cy="110" rx="6"  ry="4"  fill="#2E2E44" />
      <circle  cx="94"  cy="110" r="2.5" fill="#484860" />

      {/* ── Blush ── */}
      <ellipse cx="58"  cy="112" rx="14" ry="9" fill="#F5AABF" opacity="0.52" />
      <ellipse cx="142" cy="112" rx="14" ry="9" fill="#F5AABF" opacity="0.52" />

      {/* ── Smile ── */}
      <path
        d="M83 130 Q100 144 117 130"
        stroke="#18182C"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
