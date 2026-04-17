# Manifesto Scroll-Reveal Animation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the manifesto section scrolls into view, the three blur-blobs drift outward from center and the text/button fades in line by line — one-shot, no loop.

**Architecture:** A lightweight `useInView` hook (IntersectionObserver, one-shot) drives a boolean flag. Four CSS keyframes handle blob drift and text fade. All animation state lives in inline styles (higher specificity than Tailwind) so opacity-0 default is bulletproof. No new npm dependencies.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS `@keyframes`, `IntersectionObserver`

**Spec:** `docs/superpowers/specs/2026-04-16-manifesto-scroll-reveal-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useInView.ts` | IntersectionObserver, one-shot, SSR-safe |
| Modify | `src/index.css` | 4 new `@keyframes` blocks |
| Modify | `src/components/pages/AboutPage.tsx` | ref + hook + inline animation styles |

---

### Task 1: Create `useInView` hook

**Files:**
- Create: `src/hooks/useInView.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/useInView.ts
import { RefObject, useEffect, useState } from 'react';

export function useInView(
    ref: RefObject<Element>,
    options?: { threshold?: number }
): boolean {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: options?.threshold ?? 0.2 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, options?.threshold]);

    return isVisible;
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls src/hooks/useInView.ts
```

Expected: file listed (no error)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useInView.ts
git commit -m "feat: add useInView hook (IntersectionObserver, one-shot, SSR-safe)"
```

---

### Task 2: Add CSS keyframes

**Files:**
- Modify: `src/index.css` — append 4 `@keyframes` blocks at the end of the file

- [ ] **Step 1: Append the keyframes to `src/index.css`**

Add this block at the very end of the file:

```css
/* ── Manifesto scroll-reveal keyframes ───────────────────── */

@keyframes blob-reveal-center {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes blob-reveal-left {
  from { opacity: 0; transform: translateY(-50%) translateX(300px); }
  to   { opacity: 1; transform: translateY(-50%) translateX(0); }
}

@keyframes blob-reveal-right {
  from { opacity: 0; transform: translateY(-50%) translateX(-300px); }
  to   { opacity: 1; transform: translateY(-50%) translateX(0); }
}

@keyframes text-reveal {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Verify the keyframes were added**

```bash
grep -n "blob-reveal-center" src/index.css
```

Expected: line number printed with the `@keyframes blob-reveal-center` declaration

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add manifesto scroll-reveal keyframes to index.css"
```

---

### Task 3: Wire animation into AboutPage manifesto section

**Files:**
- Modify: `src/components/pages/AboutPage.tsx`

**Reference:** manifesto section is the `{/* 7. MANIFESTO */}` block at approximately line 823.  
`useRef` is already imported at line 1. You only need to add the `useInView` import.

- [ ] **Step 1: Add the `useInView` import**

Find this line near the top of the file:
```tsx
import React, { useEffect, useRef, useState } from 'react';
```

Add after it (as a new import line):
```tsx
import { useInView } from '@/hooks/useInView';
```

- [ ] **Step 2: Declare the ref and hook**

Inside the `AboutV2Page` component body, near the other state declarations (look for `const [de, setDe]` or similar), add:

```tsx
const manifestoRef = useRef<HTMLDivElement>(null);
const manifestoVisible = useInView(manifestoRef);
```

- [ ] **Step 3: Attach the ref to the manifesto outer div**

The outer manifesto div currently starts with:
```tsx
<div className="relative w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 px-5 sm:px-8" style={{ paddingTop: '14rem', paddingBottom: '10rem' }}>
```

Add `ref={manifestoRef}` to it:
```tsx
<div ref={manifestoRef} className="relative w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 px-5 sm:px-8" style={{ paddingTop: '14rem', paddingBottom: '10rem' }}>
```

- [ ] **Step 4: Animate the center blob**

The center blob currently reads:
```tsx
<div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[min(500px,90vw)] h-[200px] sm:h-[260px] bg-orange-500/20 dark:bg-orange-500/30 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />
```

Replace with (add `style` prop):
```tsx
<div
    className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[min(500px,90vw)] h-[200px] sm:h-[260px] bg-orange-500/20 dark:bg-orange-500/30 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"
    style={manifestoVisible
        ? { animation: 'blob-reveal-center 1.2s ease-in-out forwards' }
        : { opacity: 0 }}
/>
```

- [ ] **Step 5: Animate the left blob**

The left blob currently reads:
```tsx
<div className="absolute top-1/2 -translate-y-1/2 -left-20 w-64 h-64 bg-red-500/15 dark:bg-red-500/20 rounded-full blur-[90px] pointer-events-none" />
```

Replace with:
```tsx
<div
    className="absolute top-1/2 -translate-y-1/2 -left-20 w-64 h-64 bg-red-500/15 dark:bg-red-500/20 rounded-full blur-[90px] pointer-events-none"
    style={manifestoVisible
        ? { animation: 'blob-reveal-left 1.2s ease-in-out forwards' }
        : { opacity: 0 }}
/>
```

- [ ] **Step 6: Animate the right blob**

The right blob currently reads:
```tsx
<div className="absolute top-1/2 -translate-y-1/2 -right-20 w-64 h-64 bg-orange-400/15 dark:bg-orange-400/20 rounded-full blur-[90px] pointer-events-none" />
```

Replace with:
```tsx
<div
    className="absolute top-1/2 -translate-y-1/2 -right-20 w-64 h-64 bg-orange-400/15 dark:bg-orange-400/20 rounded-full blur-[90px] pointer-events-none"
    style={manifestoVisible
        ? { animation: 'blob-reveal-right 1.2s ease-in-out forwards' }
        : { opacity: 0 }}
/>
```

- [ ] **Step 7: Animate the text lines**

A helper string makes the delay easier to read. Add this constant just above the return statement (or inline — your call):

```tsx
const tReveal = (delay: string) =>
    `text-reveal 0.6s ease-out ${delay} forwards`;
```

The DE branch has 2 `<p>` lines; the EN branch has 3 `<p>` lines.  
Each `<p>` gets `style` with `opacity: 0` default or the `text-reveal` animation.

**Current DE branch (2 lines):**
```tsx
{de ? (<>
    <p className="text-zinc-900 dark:text-white">
        die kraft der form, farbe und ästhetik, einst ein privileg, gehört sie nun uns allen.
    </p>
    <p className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
        alles was du brauchst, liegt in deiner hand. <Logo .../>
    </p>
</>) : (<>
    <p className="text-zinc-900 dark:text-white">
        ai masters looks, physics, and composition at a level once reserved for elite studios.
    </p>
    <p className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
        this power is now yours.
    </p>
    <p className="text-zinc-900 dark:text-white">
        surpass the professional standard. everything you need is at your fingertips. <Logo .../>
    </p>
</>)}
```

Replace with (delays: line 1 → 0.3s, line 2 → 0.5s, line 3 → 0.7s):
```tsx
{de ? (<>
    <p className="text-zinc-900 dark:text-white"
       style={manifestoVisible ? { animation: tReveal('0.3s') } : { opacity: 0 }}>
        die kraft der form, farbe und ästhetik, einst ein privileg, gehört sie nun uns allen.
    </p>
    <p className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent"
       style={manifestoVisible ? { animation: tReveal('0.5s') } : { opacity: 0 }}>
        alles was du brauchst, liegt in deiner hand. <Logo className="inline-block w-[0.85em] h-[0.85em] align-middle" />
    </p>
</>) : (<>
    <p className="text-zinc-900 dark:text-white"
       style={manifestoVisible ? { animation: tReveal('0.3s') } : { opacity: 0 }}>
        ai masters looks, physics, and composition at a level once reserved for elite studios.
    </p>
    <p className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent"
       style={manifestoVisible ? { animation: tReveal('0.5s') } : { opacity: 0 }}>
        this power is now yours.
    </p>
    <p className="text-zinc-900 dark:text-white"
       style={manifestoVisible ? { animation: tReveal('0.7s') } : { opacity: 0 }}>
        surpass the professional standard. everything you need is at your fingertips. <Logo className="inline-block w-[0.85em] h-[0.85em] align-middle" />
    </p>
</>)}
```

- [ ] **Step 8: Animate the button**

The button currently reads:
```tsx
<Button variant="primary" size="xl" onClick={onGetStarted} icon={<ChevronRight className="w-5 h-5" />} iconPosition="right" className="mt-12">
    {de ? 'exposé öffnen' : 'open exposé'}
</Button>
```

Replace with (delay 1.8s — spec-defined, provides buffer after all text branches finish):
```tsx
<Button
    variant="primary"
    size="xl"
    onClick={onGetStarted}
    icon={<ChevronRight className="w-5 h-5" />}
    iconPosition="right"
    className="mt-12"
    style={manifestoVisible ? { animation: tReveal('1.8s') } : { opacity: 0 }}
>
    {de ? 'exposé öffnen' : 'open exposé'}
</Button>
```

> **Note:** Check if the `Button` component in `src/components/ui/DesignSystem.tsx` forwards the `style` prop to its root element. If not, wrap the Button in a `<div style={...}>` instead and remove the `style` prop from `Button`.

- [ ] **Step 9: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors. If `Button` doesn't accept `style`, wrap it:
```tsx
<div style={manifestoVisible ? { animation: tReveal('1.8s') } : { opacity: 0 }}>
    <Button variant="primary" size="xl" onClick={onGetStarted} icon={<ChevronRight className="w-5 h-5" />} iconPosition="right" className="mt-12">
        {de ? 'exposé öffnen' : 'open exposé'}
    </Button>
</div>
```

- [ ] **Step 10: Commit**

```bash
git add src/components/pages/AboutPage.tsx
git commit -m "feat: manifesto scroll-reveal animation — blobs drift out, text fades in line by line"
```

---

## Summary

After all 3 tasks:
- `useInView` hook: IntersectionObserver, fires once, SSR-safe
- 4 CSS keyframes in `index.css`: center/left/right blob + text-reveal
- Manifesto section in `AboutPage`: blobs hidden until scroll, then drift outward in 1.2s; text lines fade up staggered (DE: 2 lines up to 0.5s; EN: 3 lines up to 0.7s); button at 1.8s
- No looping — `animation-fill-mode: forwards` holds final state
- No new npm packages
