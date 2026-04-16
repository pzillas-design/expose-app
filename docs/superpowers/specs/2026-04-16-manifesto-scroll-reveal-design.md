# Manifesto Section Scroll-Reveal Animation

**Date:** 2026-04-16  
**File:** `src/components/pages/AboutPage.tsx` — Manifesto section (section 7, bottom of page)

---

## Goal

When the manifesto section scrolls into view, the background blur blobs drift outward from the center and the text/button fades in line by line — creating a lens-flare-like reveal effect. Blobs stay in their end position after animating in (no loop).

---

## Components

### `useInView` hook — `src/hooks/useInView.ts`

```ts
useInView(ref: RefObject<Element>, options?: { threshold?: number }): boolean
```

Implementation notes:
- Always returns a boolean — never returns early before the hook body completes (no conditional returns mid-hook)
- SSR guard: `if (typeof window === 'undefined') { return false; }` wraps only the `useEffect` body — the hook still returns `isVisible` state normally
- `IntersectionObserver` callback: on first intersection, calls `setIsVisible(true)` then immediately `observer.disconnect()` (stops watching after one trigger)
- `useEffect` cleanup: `return () => observer.disconnect()` — handles the case where the component unmounts *before* the element becomes visible (the `disconnect()` in the callback handles post-trigger; the cleanup handles pre-trigger unmount — both are needed for different cases)
- Default threshold: `0.2`
- ~25 lines, no dependencies

### CSS keyframes — `src/index.css`

**Strategy:** CSS positioning (`left`, `right`, `top`) stays on the elements. Keyframes control only the transform offset + opacity drift. All existing Tailwind transform classes (`-translate-x-1/2`, `-translate-y-1/2`) are preserved in **every keyframe state** to avoid visual jumps.

**`blob-reveal-center`**  
Center blob uses `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` — all four must appear in keyframe transforms:
- `from`: `opacity: 0; transform: translate(-50%, -50%) scale(0.3)`
- `to`: `opacity: 1; transform: translate(-50%, -50%) scale(1)`

**`blob-reveal-left`**  
Left blob uses `top-1/2 -translate-y-1/2`. Drift: starts 300px to the RIGHT of its natural position (toward center), ends at natural position (translateX 0):
- `from`: `opacity: 0; transform: translateY(-50%) translateX(300px)`
- `to`: `opacity: 1; transform: translateY(-50%) translateX(0)`

**`blob-reveal-right`**  
Right blob uses `top-1/2 -translate-y-1/2`. Drift: starts 300px to the LEFT of its natural position (toward center), ends at natural position:
- `from`: `opacity: 0; transform: translateY(-50%) translateX(-300px)`
- `to`: `opacity: 1; transform: translateY(-50%) translateX(0)`

**`text-reveal`**
- `from`: `opacity: 0; transform: translateY(20px)`
- `to`: `opacity: 1; transform: translateY(0)`

All four keyframe rules use `animation-fill-mode: forwards` on the element (via inline style), not inside the `@keyframes` block itself.

---

## Animation Timing

The manifesto section has **5 text lines** (verified from JSX: 2 DE lines + 3 EN lines) and 1 button.  
Last text line ends at `0.3 + (4 × 0.2) + 0.6 = 1.7s`. Button starts at `1.8s` (after all text finishes).

| Element | Keyframe | Duration | Delay | Easing |
|---|---|---|---|---|
| Center blob | blob-reveal-center | 1.2s | 0s | ease-in-out |
| Left blob | blob-reveal-left | 1.2s | 0s | ease-in-out |
| Right blob | blob-reveal-right | 1.2s | 0s | ease-in-out |
| Text line 1 | text-reveal | 0.6s | 0.3s | ease-out |
| Text line 2 | text-reveal | 0.6s | 0.5s | ease-out |
| Text line 3 | text-reveal | 0.6s | 0.7s | ease-out |
| Text line 4 | text-reveal | 0.6s | 0.9s | ease-out |
| Text line 5 | text-reveal | 0.6s | 1.1s | ease-out |
| Button | text-reveal | 0.6s | 1.8s | ease-out |

---

## AboutPage Changes

1. Add `const manifestoRef = useRef<HTMLDivElement>(null)` at the top of the component
2. `const isVisible = useInView(manifestoRef)` 
3. Attach `ref={manifestoRef}` to the manifesto section outer `<div>`
4. **Blobs:** Use `style={{ opacity: 0 }}` (inline, not Tailwind class) as default — inline styles have higher specificity than Tailwind, ensuring they're invisible before animation. When `isVisible`, replace with `style={{ animation: '...', animationFillMode: 'forwards' }}`
5. **Text lines and Button:** Same pattern — `style={{ opacity: 0 }}` by default, when `isVisible` set `style={{ animation: 'text-reveal 0.6s ease-out Xs forwards' }}` with the correct delay per line
6. The Tailwind `opacity-0` class is **not used** for this purpose — inline styles are used to avoid CSS specificity conflicts with the animation

---

## What is NOT changing

- No new npm dependencies
- No changes to blob sizes, colors, blur values, or visual end-state positions
- No pulsing/looping after reveal (one-shot only)
- Blog page has no manifesto section — no changes needed there
