/**
 * Prompt Engine — transforms high-level creative intent into
 * model-specific, style-specific prompts that produce genuinely
 * diverse, non-generic ad visuals.
 *
 * Two key ideas:
 * 1. Each STYLE defines conflicting composition constraints
 *    (lighting, focal point, camera angle, color palette) so
 *    two styles can NEVER produce the same image.
 * 2. Each MODEL gets prompts rewritten in its native language
 *    (technical for FLUX, photographic for Imagen, narrative for GPT).
 */

import type { ImageModel, AspectRatio } from "./creative-types";

// ---- Style templates ----

export interface StyleTemplate {
  /** Unique key */
  key: string;
  /** Human label */
  label: string;
  /** Hard composition constraints — these make each style mutually exclusive */
  composition: string;
  /** Lighting direction */
  lighting: string;
  /** Camera angle / framing */
  camera: string;
  /** Color palette guidance */
  palette: string;
  /** What should be the focal point */
  focalPoint: string;
  /** What to AVOID (prevents convergence across styles) */
  avoid: string;
  /** Suggested motion for video generation */
  videoMotion: string;
}

/**
 * Built-in style library.
 * Each style has CONFLICTING constraints so models CANNOT produce similar output.
 */
export const STYLE_TEMPLATES: Record<string, StyleTemplate> = {
  "hero-lifestyle": {
    key: "hero-lifestyle",
    label: "Hero Lifestyle",
    composition:
      "Wide environmental shot, subject using the product in a real-world context. " +
      "The setting tells the story — kitchen, office, gym, street. " +
      "Rule of thirds: subject at left or right third, environment fills the frame.",
    lighting: "Golden hour or large window natural light. Warm color temperature (3500K). Soft shadows.",
    camera: "Shot at eye level or slightly below (empowering angle). 35mm focal length, medium depth of field.",
    palette: "Warm earth tones — amber, terracotta, cream. Muted background, subject pops via color contrast.",
    focalPoint: "The person's face/hands interacting with the product. Product is secondary to the human moment.",
    avoid: "Studio backgrounds, flat lighting, centered composition, stock-photo poses, product-only shots.",
    videoMotion: "Slow cinematic dolly forward toward the subject, slight parallax on background elements. Warm light shifts subtly.",
  },
  "product-studio": {
    key: "product-studio",
    label: "Product Studio",
    composition:
      "Tight product-centric shot. Product fills 60-70% of frame. " +
      "Clean surface — marble, concrete, brushed metal, or solid color. " +
      "One accent prop maximum (leaf, fabric swatch, shadow pattern).",
    lighting:
      "Hard directional studio light from upper-left creating dramatic shadow. " +
      "Single key light + subtle fill. High contrast.",
    camera: "45-degree overhead angle or straight-on at product level. 85mm macro, shallow DOF (f/2.8).",
    palette: "Monochromatic with ONE accent color from the product's branding. High contrast, minimal palette.",
    focalPoint: "Product texture, finish, and detail. The product IS the hero. Every pixel serves the product.",
    avoid: "People, busy backgrounds, wide shots, warm fuzzy lifestyle feel, multiple products.",
    videoMotion: "Slow 360-degree orbit around the product with subtle light shift revealing texture and detail.",
  },
  "ugc-authentic": {
    key: "ugc-authentic",
    label: "UGC / Authentic",
    composition:
      "Selfie-style or friend-taking-a-photo framing. Slightly off-center, imperfect crop. " +
      "Busy real-world background (café, bedroom, street). NOT staged.",
    lighting:
      "Overhead fluorescent, phone flash, or mixed ambient. Slightly overexposed highlights. " +
      "NOT professionally lit — that kills authenticity.",
    camera:
      "Phone camera perspective — wide angle (24mm equivalent), slight barrel distortion. " +
      "Front-facing camera look. Eye-level or slightly above (selfie angle).",
    palette:
      "Uncontrolled real-world colors. No color grading. The 'messy' palette of real life. " +
      "Slightly warm from indoor lighting.",
    focalPoint:
      "Person's genuine expression — excitement, surprise, satisfaction. Product is visible but NOT centered.",
    avoid:
      "Studio lighting, perfect composition, professional models, clean backgrounds, shallow DOF, " +
      "anything that screams 'this is an ad.'",
    videoMotion:
      "Handheld camera shake, quick zoom-in on the product, casual pan to show the environment. Authentic phone-video feel.",
  },
  "bold-graphic": {
    key: "bold-graphic",
    label: "Bold Graphic",
    composition:
      "Flat-lay or direct overhead. Strong geometric shapes — circles, diagonals, grid layout. " +
      "Color blocking with bold sections. Graphic design sensibility, not photography.",
    lighting: "Even flat lighting — no shadows, no depth. Maximum color saturation. Billboard aesthetic.",
    camera: "Perfect overhead (90-degree) or dead-center straight-on. Symmetrical framing. No perspective distortion.",
    palette:
      "High-saturation complementary colors (electric blue + orange, magenta + lime). " +
      "Maximum contrast. Pop art influence.",
    focalPoint: "The color and shape pattern FIRST, product SECOND. The design stops the scroll, the product is discovered.",
    avoid: "Natural lighting, lifestyle scenes, people, muted tones, depth/dimension, photorealism.",
    videoMotion:
      "Sharp graphic transitions — slide, wipe, or zoom between color blocks. Rhythmic, punchy, 2-second cuts.",
  },
  "before-after": {
    key: "before-after",
    label: "Before / After",
    composition:
      "Split composition — left half shows the problem state, right half shows the result. " +
      "Clear visual divider (vertical line, gradient, or contrast boundary). " +
      "Both halves use the SAME camera angle for direct comparison.",
    lighting:
      "LEFT (before): Cool, flat, slightly underexposed. Desaturated. " +
      "RIGHT (after): Warm, bright, saturated. The lighting shift IS the transformation.",
    camera: "Matched framing on both sides. Same focal length, same distance. The only variable is the result.",
    palette:
      "Before: grey, blue-grey, muted. After: warm, vibrant, saturated. " +
      "The color shift tells the transformation story without words.",
    focalPoint: "The specific area of transformation — skin, space, product state. Draw the eye to WHAT changed.",
    avoid: "Text overlays (the visual should speak), complex backgrounds, multiple subjects, abstract imagery.",
    videoMotion:
      "Horizontal wipe transition from 'before' to 'after' state, then slow zoom into the transformed detail.",
  },
  "macro-texture": {
    key: "macro-texture",
    label: "Macro / Texture",
    composition:
      "Extreme close-up filling the entire frame with product texture, material, or surface detail. " +
      "Abstract at first glance — the viewer leans in to understand what they're seeing.",
    lighting:
      "Raking side-light at 15-degree angle to emphasize surface texture. " +
      "Specular highlights on glossy surfaces. Deep shadows in crevices.",
    camera: "True macro — 1:1 magnification or tighter. f/4-f/8 for sharp detail. Focus stacked if needed.",
    palette: "Driven entirely by the product's actual material — leather grain, liquid viscosity, fabric weave, metal finish.",
    focalPoint: "The tactile quality. The viewer should almost FEEL the surface. Trigger sensory response.",
    avoid: "Wide shots, people, context/environment, text, logos, anything that breaks the tactile immersion.",
    videoMotion:
      "Ultra-slow push-in revealing texture detail, with subtle light movement creating specular shifts across the surface.",
  },
};

/** Get a style template by key, or use the key as-is for custom styles */
export function getStyleTemplate(styleKey: string): StyleTemplate | null {
  return STYLE_TEMPLATES[styleKey] ?? null;
}

/** All available built-in style keys */
export function getAvailableStyles(): string[] {
  return Object.keys(STYLE_TEMPLATES);
}

// ---- Per-model prompt rewriting ----

/**
 * Rewrite a prompt to match a model's native language.
 * Each model interprets prompts differently — we lean into their strengths.
 */
export function rewriteForModel(
  basePrompt: string,
  model: ImageModel
): string {
  switch (model) {
    case "flux-2-pro":
      // FLUX excels with technical, architectural prompt language
      return (
        `${basePrompt} ` +
        "Professional commercial photography. Clean studio execution. " +
        "Precise edge rendering, accurate material representation. " +
        "8-bit color depth, no banding. Publication-ready output."
      );

    case "ideogram-3":
      // Ideogram excels with design/typography direction
      return (
        `${basePrompt} ` +
        "Graphic design composition. Strong visual hierarchy. " +
        "Clean typographic integration if text is present. " +
        "Bold color blocking, geometric precision, modern layout."
      );

    case "imagen-4-ultra":
      // Imagen excels with photographic/documentary language
      return (
        `${basePrompt} ` +
        "Shot on Canon EOS R5, natural available light. " +
        "Photojournalistic authenticity, no artificial enhancement. " +
        "True-to-life skin tones, accurate white balance, subtle film grain."
      );

    case "gpt-image-1":
    default:
      // GPT excels with narrative/emotional direction
      return (
        `${basePrompt} ` +
        "Emotionally compelling, tells a story in a single frame. " +
        "The viewer should feel something — desire, curiosity, belonging. " +
        "Cinematic quality, editorial sensibility."
      );
  }
}

// ---- Full prompt builder ----

export interface CreativeBrief {
  /** The product or service */
  product: string;
  /** User-provided style description OR a built-in style key */
  style?: string;
  /** Emotional mood override */
  mood?: string;
  /** Target emotion: what should the viewer FEEL? */
  targetEmotion?: string;
  /** Who/what is the hero of this ad? */
  hero?: "product" | "person" | "transformation" | "problem";
  /** Main objection to overcome */
  objection?: string;
}

/**
 * Build a complete, model-optimized prompt from a creative brief.
 * This is the core function that replaces naive string concatenation.
 */
export function buildPrompt(
  brief: CreativeBrief,
  model: ImageModel,
  _aspectRatio: AspectRatio
): string {
  const template = brief.style ? getStyleTemplate(brief.style) : null;

  // Step 1: Build the base scene description
  let prompt: string;

  if (template) {
    // Use the structured template for maximum diversity
    prompt = [
      `Subject: ${brief.product}.`,
      `Composition: ${template.composition}`,
      `Lighting: ${template.lighting}`,
      `Camera: ${template.camera}`,
      `Color palette: ${template.palette}`,
      `Focal point: ${template.focalPoint}`,
      brief.mood ? `Mood: ${brief.mood}.` : "",
      brief.targetEmotion
        ? `The image should evoke: ${brief.targetEmotion}.`
        : "",
      brief.hero === "person"
        ? "A real person is the emotional anchor of this image."
        : brief.hero === "transformation"
          ? "Show the transformation or result the product delivers."
          : brief.hero === "problem"
            ? "Show the pain point or problem state the product solves."
            : "",
      `AVOID: ${template.avoid}`,
    ]
      .filter(Boolean)
      .join(" ");
  } else {
    // Custom style — user provided their own description
    const styleDesc =
      brief.style ??
      "compelling commercial photography that stands out from generic stock imagery";
    const moodDesc = brief.mood ?? "confident, distinctive, memorable";

    prompt = [
      `${styleDesc}: ${brief.product}.`,
      `Mood: ${moodDesc}.`,
      brief.targetEmotion
        ? `Evoke: ${brief.targetEmotion}.`
        : "",
      brief.hero === "person"
        ? "A real person is the emotional anchor."
        : brief.hero === "transformation"
          ? "Show the result or transformation."
          : brief.hero === "problem"
            ? "Show the problem being solved."
            : "",
      brief.objection
        ? `Visually address this concern: ${brief.objection}.`
        : "",
      "Single clear focal point, high contrast between subject and background.",
      "Absolutely NO text, words, letters, logos, or watermarks.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  // Step 2: Add universal ad constraints
  prompt +=
    " The image must stop someone mid-scroll — visually striking and impossible to ignore." +
    " NO text, words, letters, logos, or watermarks anywhere in the image.";

  // Step 3: Rewrite for model's native language
  return rewriteForModel(prompt, model);
}

/**
 * Get the video motion prompt for a given style.
 * Returns style-appropriate motion instead of a one-size-fits-all prompt.
 */
export function getVideoMotion(
  styleKey: string,
  fallbackPrompt?: string
): string {
  const template = getStyleTemplate(styleKey);
  if (template) return template.videoMotion;
  return (
    fallbackPrompt ??
    "Slow cinematic push-in with subtle parallax, drawing the viewer into the scene."
  );
}

// ---- Video prompt builder ----

export interface VideoBrief {
  /** What the product/service is — visual description */
  product: string;
  /** The scene to depict */
  scene: string;
  /** Emotional tone */
  mood?: string;
  /** What the viewer should feel */
  targetEmotion?: string;
  /** Camera movement style */
  cameraMove?: string;
  /** Aspect ratio — determines framing language */
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

/**
 * Build a cinematic text-to-video prompt.
 *
 * PHILOSOPHY (from the best ad producers):
 * - First 0.5s = the HOOK. Something must move/change/appear immediately.
 * - Video ads are NOT animated photos. They need MOTIVATED motion —
 *   every movement serves the story.
 * - Camera movement = emotion. Dolly in = intimacy. Crane up = aspiration.
 *   Handheld = authenticity. Static = authority.
 * - Light should CHANGE during the clip — sunrise shift, passing clouds,
 *   a lamp turning on. Static light = boring.
 * - Human micro-movements sell it: hair moving, fabric shifting, steam rising,
 *   condensation dripping. These "proof of life" details make AI video convincing.
 * - Design for SOUND OFF. The visual story must work silently.
 */
export function buildVideoPrompt(brief: VideoBrief): string {
  const ar = brief.aspectRatio ?? "9:16";

  // Framing guidance per aspect ratio
  const framingGuide =
    ar === "9:16"
      ? "Vertical mobile-first framing. Subject fills the center-top of frame. " +
        "Designed for full-screen phone viewing — every pixel earns its place."
      : ar === "1:1"
        ? "Square framing for feed placement. Centered subject with breathing room. " +
          "Works in both feed scroll and grid view."
        : "Cinematic widescreen framing. Use the horizontal space for environment " +
          "and depth. Letterbox aesthetic.";

  const mood = brief.mood ?? "cinematic, premium, aspirational";
  const cameraMove =
    brief.cameraMove ??
    "Slow deliberate dolly-in toward the subject, creating a sense of " +
    "drawing the viewer deeper into the scene";

  const prompt = [
    // SCENE — what we see
    `Scene: ${brief.scene}.`,
    `Product: ${brief.product}.`,

    // FRAMING
    framingGuide,

    // CAMERA — the storytelling device
    `Camera: ${cameraMove}.`,
    "Camera movement is smooth and intentional — every motion serves the narrative. " +
    "No unmotivated camera shake or random drift.",

    // MOTION — what makes it feel alive
    "Motivated micro-motion throughout: fabric subtly shifting, ambient particles " +
    "catching light, hair or foliage responding to a gentle breeze, condensation " +
    "or steam if contextually appropriate. These details sell realism.",

    // LIGHTING — must change over the clip
    "Lighting evolves during the clip: a subtle warm shift from left to right " +
    "suggesting passing time, or volumetric rays slowly intensifying. " +
    "Specular highlights on surfaces respond to the light change.",

    // MOOD & EMOTION
    `Mood: ${mood}.`,
    brief.targetEmotion
      ? `The viewer should feel: ${brief.targetEmotion}. Every visual choice serves this emotion.`
      : "",

    // OPENING HOOK — critical for ads
    "CRITICAL — the first half-second must hook: open with motion already " +
    "in progress. Do NOT start with a static frame that then begins moving. " +
    "The video begins MID-ACTION.",

    // QUALITY
    "Cinematic color grading. Shallow depth of field with bokeh on background elements. " +
    "Film grain texture. 24fps cinematic cadence.",

    // ANTI-AI artifacts
    "AVOID: morphing artifacts, sudden scene changes, floating objects, " +
    "unnatural hand/finger movements, text or logos anywhere in frame, " +
    "stock-footage feel, static camera with no movement, flat even lighting " +
    "that never changes.",
  ]
    .filter(Boolean)
    .join(" ");

  return prompt;
}
