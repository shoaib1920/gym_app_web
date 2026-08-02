---
name: Kinetic Ops
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#303030'
  tertiary-container: '#e4e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  gutter: 20px
---

## Brand & Style

The design system is built on the **Industrial Athlete** aesthetic, targeting independent gym owners who demand efficiency and high-impact visual feedback. The personality is high-energy, authoritative, and resilient. 

The style utilizes a **Modern-Corporate** framework with **High-Contrast** accents. It balances deep, dark surfaces with aggressive safety-inspired colors to evoke the physical atmosphere of a weight room. The UI prioritizes "at-a-glance" readability for high-traffic environments, using heavy weights and distinct status signals to ensure administrative tasks feel as powerful as the training sessions they support.

## Colors

The palette is anchored in a true "Industrial Dark" theme. 
- **Primary (Electric Lime):** Used exclusively for high-priority actions, active states, and critical performance metrics. 
- **Surface Tiers:** Backgrounds utilize `#121212`. Secondary and Tertiary neutrals define container depth, moving toward lighter grays as elements "lift" toward the user.
- **Accents:** Safety Orange is reserved for warnings or secondary calls to action to maintain a strict visual hierarchy.
- **Text:** High-contrast white (`#F5F5F5`) for primary readability, with muted grays for metadata.

## Typography

This design system uses a dual-font strategy. **Montserrat** is used for headlines and data "power numbers" to provide a bold, geometric punch. **Inter** is utilized for all body copy and UI labels to ensure maximum legibility in dense data tables. 

All labels use uppercase styling with slight letter-spacing to mimic industrial signage. For mobile, headline sizes scale down significantly to maintain structural integrity on smaller screens while retaining the heavy font weight.

## Layout & Spacing

The layout follows a **Fluid Grid** model with high density. 
- **Grid:** A 12-column system for desktop, shifting to 4 columns for mobile. 
- **Rhythm:** An 8px base unit drives all margins and padding. 
- **Dashboards:** Use a bento-box style layout where cards are tightly packed with 16px (md) gutters to maximize the information displayed on a single screen.
- **Margins:** Desktop margins are fixed at 40px (xl) to frame the content, while mobile scales down to 16px (md).

## Elevation & Depth

Depth is achieved through **Tonal Layers** rather than heavy shadows, maintaining a flat, rugged appearance. 
- **Level 0 (Background):** `#121212` - The base gym floor.
- **Level 1 (Cards/Containers):** `#1A1A1A` - Primary working surfaces.
- **Level 2 (Modals/Overlays):** `#262626` - Elements that float above the main UI.

When shadows are necessary for modals, use a "Hard Ambient" style: `0px 4px 20px rgba(0, 0, 0, 0.5)`. Borders are the primary tool for separation; use 1px solid strokes in `#333333` to define card boundaries clearly without adding visual clutter.

## Shapes

The shape language is **Modern Rounded**. While the brand is industrial, the `0.5rem` (8px) base radius ensures the UI feels contemporary and premium rather than dated. 
- **Small components (Checkboxes, Tags):** Use `rounded-sm` (4px).
- **Standard components (Buttons, Inputs, Cards):** Use the base `0.5rem`.
- **Status Pills:** Use `rounded-xl` or "Full" for a distinct pill shape that separates status indicators from structural elements.

## Components

- **Buttons:** Primary buttons use the Electric Lime background with black text. Hover states should slightly increase brightness. Secondary buttons use a ghost style with a lime border.
- **Input Fields:** Dark backgrounds (`#1A1A1A`) with a subtle `#333333` border. On focus, the border transitions to Electric Lime.
- **Status Indicators:** Use the pill shape. "Active" members or classes use the Electric Lime background; "Inactive" or "Full" states use a muted gray.
- **Cards:** Dashboard cards should feature a 1px border and contain a "Header" area for the metric title (Label-SM) and a "Value" area (Headline-LG).
- **Progress Bars:** Use a thick, 8px bar. The "filled" portion uses Electric Lime, while the "unfilled" portion uses the Tertiary color to show remaining capacity.
- **Data Tables:** Row stripes are not used; instead, use a 1px bottom border on rows to maintain a clean, architectural look.