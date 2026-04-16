# Design System Document: The Editorial Atelier

## 1. Overview & Creative North Star
**Creative North Star: "The Private Wealth Curator"**

In a world of cold, blue, and sterile FinTech interfaces, this design system takes an antithetical approach. We are moving away from "software" and toward "service." The goal is to evoke the feeling of a high-end physical atelier—think linen paper, leather-bound ledgers, and soft afternoon light. 

To break the "standard template" look, we abandon the rigid 12-column grid in favor of **intentional asymmetry** and **breathable editorial whitespace**. We leverage large Serif headlines against a persistent, architecturally grounded sidebar to create a sense of permanence and trust. This is not just a dashboard; it is a premium financial companion.

---

## 2. Colors & Surface Philosophy
The palette is rooted in earth tones, designed to reduce cognitive eye strain and evoke a "home-like" warmth.

### The "No-Line" Rule
**Strict Mandate:** Traditional 1px solid borders (`#D1D1D1` style) are strictly prohibited for sectioning. 
*   **The Technique:** Define boundaries through subtle shifts in background tone. 
*   **Example:** A `surface_container_low` card sitting on a `surface` background provides enough contrast to be perceivable without the "cage" effect of a border.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine stationery.
*   **Base Layer (`surface` / #FDF8F5):** The canvas.
*   **Secondary Layer (`surface_container_low`):** Used for large content areas or the persistent sidebar.
*   **Interactive Layer (`surface_container_highest`):** Used for hover states or active card selections.

### The "Glass & Soul" Rule
To prevent the UI from feeling "flat" or "muddy," use **Glassmorphism** for floating elements (like dropdowns or modals). 
*   **Execution:** Use a semi-transparent `surface` color (80% opacity) with a `24px` backdrop-blur. 
*   **Signature Textures:** For main CTAs, do not use flat hex codes. Apply a subtle linear gradient from `primary` (#884B3A) to `primary_container` (#A56350) at a 135-degree angle to give the element "weight" and "soul."

---

## 3. Typography: The Editorial Contrast
We use a high-contrast pairing to balance authority with accessibility.

*   **The Authority (Serif):** *Newsreader*. This is used for all `display` and `headline` roles. It feels scholarly, premium, and trustworthy. Use it for account balances, section headers, and "Hero" moments.
*   **The Utility (Sans-Serif):** *Plus Jakarta Sans*. A modern, friendly sans with high legibility. Use this for `title`, `body`, and `label` roles to ensure the UI remains functional and clear.

**Scale Highlight:**
*   **Display LG (Newsreader, 3.5rem):** Reserved for primary financial figures (e.g., Total Net Worth).
*   **Label SM (Plus Jakarta Sans, 0.6875rem):** Used for micro-data, like percentage changes or timestamps.

---

## 4. Elevation & Depth
We eschew the "shadow-heavy" look of early 2010s design in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface_container_lowest` card placed on a `surface_container_low` background creates a natural, soft "lift" that mimics paper on a desk.
*   **Ambient Shadows:** If a shadow is required for a floating modal, use a "Warm Shadow." 
    *   *Recipe:* `0px 12px 32px rgba(136, 75, 58, 0.06)`. The tint is derived from our `primary` terracotta, making the shadow feel like a natural part of the environment rather than a grey smudge.
*   **The "Ghost Border":** For essential accessibility in input fields, use the `outline_variant` token at **15% opacity**. This creates a suggestion of a container without disrupting the organic flow.

---

## 5. Components

### Persistent Sidebar Navigation
*   **Background:** `surface_container_low`.
*   **Active State:** Use a soft "pill" shape in `secondary_container` (#D2E5CB) with `on_secondary_container` (#566752) text.
*   **Layout:** High-top padding (48px) with the logo as a serif wordmark. Navigation items should have 12px of vertical spacing to feel spacious.

### Buttons
*   **Primary:** A gradient of `primary` to `primary_container`. Corner radius: `lg` (1rem). No border.
*   **Secondary:** `secondary_container` fill with `on_secondary_container` text. This "Sage on Cream" look is our signature "soft" action.
*   **Tertiary:** Text-only in `primary` with a `title-sm` font weight.

### Cards & Financial Lists
*   **The "Anti-List" Rule:** Forbid the use of divider lines between transactions or list items.
*   **Separation:** Use `16px` of vertical white space and a subtle background shift (`surface_container_lowest`) on hover to define the row.
*   **Typography:** Transaction names in `title-md` (Sans), Amounts in `headline-sm` (Serif).

### Input Fields
*   **Default State:** `surface_container_highest` background, no border, `DEFAULT` (0.5rem) rounding.
*   **Focus State:** A "Ghost Border" of `primary` at 20% opacity and a `2px` soft glow of the same color.

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place a large Serif headline on the left and a small Sans-serif description on the right with a wide gap.
*   **Embrace the Cream:** Treat `#FDF8F5` as a luxury material. Let it breathe.
*   **Soft Transitions:** Use `300ms ease-in-out` for all hover states to maintain the "cozy" feeling.

### Don't:
*   **No Pure Black:** Never use `#000000`. Use `on_surface` (#1C1B1A) or `primary` for deep tones.
*   **No Harsh Corners:** Avoid `none` or `sm` roundedness unless it's for a hairline decorative element.
*   **No Grid-Lock:** Don't feel forced to align every card edge. Staggering elements slightly can create a more "hand-crafted" editorial feel.