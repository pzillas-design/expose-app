# Implementation Plan - Shared Templates (Viral Hook)

This plan outlines the implementation of a "Share Template" feature for prompt presets in Expose. The goal is to create a "network effect" by allowing users to share their creative setups via WhatsApp or Email.

## User Experience
1. **Sharing**:
   - In the `PresetLibrary`, each preset gets a "Share" icon (visible on hover).
   - Clicking "Share" opens a beautiful popover/modal with:
     - "Copy Link" button.
     - "Share on WhatsApp" button (opens WhatsApp with pre-filled message).
     - "Share via Email" button.
2. **Receiving**:
   - The recipient clicks the link (e.g., `expose.ae/shared/template?d=...`).
   - The app opens and detects the shared data.
   - A premium **"Import Template" Dialog** appears, showing a preview of the prompt and variables.
   - User clicks "Add to my library" to save it permanently.

## Technical Strategy
- **Serialization**: Use `lz-string` or standard Base64 + URI encoding to fit the pattern into a URL. Since templates are relatively small, this avoids the need for a backend "share-links" table.
- **Routing**: Update `App.tsx` to handle the incoming share route.
- **Components**:
  - `PresetLibrary`: Add share trigger.
  - `PresetShareModal`: New component for sharing options.
  - `PresetImportModal`: New component for the recipient's view.

## Tasks

### 1. Serialization Utility
- [ ] Create `src/utils/shareUtils.ts` with `encodeTemplate` and `decodeTemplate` functions.
- [ ] Ensure it handles all properties (title, prompt, controls, tags).

### 2. UI - Sharing Side
- [ ] Add Share icon/button to `TemplateCard` or `PresetLibrary` items.
- [ ] Implement `PresetShareModal` using the existing design system.
- [ ] Integrate WhatsApp sharing using `wa.me/...?text=...`.

### 3. UI - Receiving Side
- [ ] Add a `useTemplateImport` hook or logic in `useNanoController` to listen for URL parameters.
- [ ] Create `PresetImportModal` to display shared content and handle "Save".

### 4. Polish & Visuals
- [ ] Add micro-animations to the share transition.
- [ ] Ensure mobile-friendly sharing.

## Verification Plan
1. Create a custom template with several variables (Pro mode).
2. Share it to a local environment (simulated WhatsApp link).
3. Verify that opening the link correctly pops up the Import Dialog with all data preserved.
4. Save it and verify it appears in the recipient's library.
