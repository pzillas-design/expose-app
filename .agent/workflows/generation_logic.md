---
description: System Logic for Image Generation and Editing
---

# Image Generation & Editing Logic

This document defines the core logic for image generation and editing within Exposé.

## 1. Core Terminology

*   **Original Image**: The source image to be edited.
*   **Prompt**: The textual instruction describing the desired changes or new creation.
*   **Annotation Image**: A generated image where the original background is muted (40% opacity) and all annotations (brush paths, stamps, text labels) are drawn at 100% opacity.
*   **Reference Image**: Visual guidance provided to the AI. These can be cropped by the user.
    *   **Global**: Provides general style or context for the whole image.
    *   **Addressed**: Specifically linked to a label in the *Annotation Image* (e.g., a "SOFA" reference image for a "SOFA" stamp).

## 2. Operation Modes (UI)

### Mode 1: Bild generieren (Create)
Used for Text-to-Image generation.
*   **Input**: `Prompt`
*   **Optional**: One or more `Reference Images`.
*   **AI Package**:
    1.  `System Instruction`: "Create a new image based on the prompt."
    2.  `Parts`: Prompt + Reference Images (labeled as style/guidance).
*   **Result**: A brand new image from scratch. Logged as type `Create`.

### Mode 2: Bild bearbeiten (Edit)
Used for targeted image modification.
*   **Input**: `Original Image` + `Prompt`
*   **Optional Component 1: Annotation Image**: Triggered if brush paths or stamps exist.
*   **Optional Component 2: Reference Images**:
    *   *Global*: No specific label link.
    *   *Addressed*: Linked to a stamp/label in the Annotation Image.
*   **AI Package**:
    1.  `Image 1`: The Original Image (Clean).
    2.  `Image 2`: The Annotation Image (Muted original + high-contrast overlays/labels).
    3.  `Image 3+`: Reference Images.
        *   If addressed: "Reference Image specifically for the object labeled [LABEL]".
        *   If global: "General Reference Image".
*   **Result**: A targeted modification of the original image. Logged as type `Edit`.

## 3. Technical Implementation Rules
- **Mask Generation**: The background is Always the Original Image at 0.4 `globalAlpha`.
- **Annotation Labels**: Drawn at 100% opacity at specified coordinates or stamp centers.
- **Reference Image Selection**: The CropModal starts at 100% (full image) by default.
- **Job Logging**: Ensure jobs are logged with the correct `type` ('Create' vs 'Edit') in the database.

## 4. Technical API Payload Structure (Gemini)

The payload sent to the Gemini API is multimodal, containing both text instructions and image data.

```json
{
  "contents": [
    {
      "parts": [
        { "text": "I am providing an ORIGINAL image (to be edited). I am also providing an ANNOTATION image... The following labels are marked in the Annotation Image: \"SOFA\"." },
        { "text": "User Prompt: [USER_INPUT_PROMPT]" },
        {
          "inlineData": {
            "data": "base64_encoded_original_image",
            "mimeType": "image/jpeg"
          }
        },
        { "text": "Image 1: The Original Image" },
        {
          "inlineData": {
            "data": "base64_encoded_annotation_image",
            "mimeType": "image/png"
          }
        },
        { "text": "Image 2: The Annotation Image (Muted original + overlays showing where and what to change)." },
        {
          "inlineData": {
            "data": "base64_encoded_reference_image_1",
            "mimeType": "image/png"
          }
        },
        { "text": "Image 3: Reference Image specifically for the object labeled 'SOFA' in the Annotation Image." }
      ]
    }
  ],
  "generationConfig": {
    "imageConfig": {
      "imageSize": "4K"
    }
  }
}
```

### Key Payload Rules:
1.  **Order Matters**: Gemini processes parts in sequence. We start with the system instruction followed immediately by the **User Prompt** to establish the goal. Then we provide the visual context (images + identifies).
2.  **Explicit Labeling**: Every `inlineData` part is immediately followed by a `text` part identifying it (e.g., "Image 1: ...").
3.  **Addresssing**: For specifically addressed reference images, the label matches the text found in the Annotation Image.
