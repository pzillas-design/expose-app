# Manifesto Section Scroll-Reveal Animation

**Date:** 2026-04-16  
**File:** `src/components/pages/AboutPage.tsx` — Manifesto section (section 7, bottom of page)

---

## Goal

When the manifesto section scrolls into view, the background blur blobs drift outward from the center and the text/button fades in line by line — creating a lens-flare-like reveal effect.

---

## Components

### `useInView` hook — `src/hooks/useInView.ts`

```ts
useInView(ref: RefObject<Element>, options?: { threshold?: number }): boolean
```

- Uses `IntersectionObserver` on the passed ref
- Returns `true` once the element has been visible (one-shot, no reset)
- Default threshold: `0.2` (20% visible triggers it)
- ~20 lines, no dependencies

### CSS keyframes — `src/index.css`

Three new keyframes:

**`blob-reveal-center`**
- `from`: `opacity: 0; transform: scale(0.3)`
- `to`: `opacity: 1; transform: scale(1)`

**`blob-reveal-left`**
- `from`: `opacity: 0; transform: translateY(-50%) translateX(300px) scale(0.3)`
- `to`: `opacity: 1; transform: translateY(-50%) translateX(-80px) scale(1)` *(matches current left blob position)*

**`blob-reveal-right`**
- `from`: `opacity: 0; transform: translateY(-50%) translateX(-300px) scale(0.3)`
- `to`: `opacity: 1; transform: translateY(-50%) translateX(-80px) scale(1)` *(matches current right blob position)*

**`text-reveal`**
- `from`: `opacity: 0; transform: translateY(20px)`
- `to`: `opacity: 1; transform: translateY(0)`

---

## Animation Timing

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
| Button | text-reveal | 0.6s | 1.3s | ease-out |

All elements start with `opacity: 0` (via inline style or initial class) and are invisible until `isVisible` is true. The animation class is applied when `isVisible` becomes `true`.

---

## AboutPage Changes

1. Add `useRef` on the manifesto section container
2. Pass ref to `useInView` → get `isVisible`
3. Blobs: initially `opacity-0`, apply animation class when `isVisible`
4. Each text `<p>` and the `<Button>`: initially `opacity-0`, apply `animate-text-reveal` with inline `animationDelay` when `isVisible`
5. `fill-mode: forwards` on all animations so they stay in end state

---

## What is NOT changing

- No new npm dependencies
- No changes to the blob sizes, colors, or positions
- No pulsing/looping after reveal (one-shot only)
- Blog page has no manifesto section — no changes needed there
