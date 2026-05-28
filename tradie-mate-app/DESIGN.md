---
name: TradieFlow Pro
colors:
  urgent-red: '#ba1a1a'
  surface-main: '#f8f9fb'
  surface-card: '#ffffff'
  border-bold: '#8e7164'
  nav-active: '#ff6b00'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  touch-target-min: 48px
  gutter: 1rem
  margin-mobile: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style

**TradieFlow Pro** is a high-utility design system tailored for field service professionals. The aesthetic is a fusion of **Neo-Brutalism** and **Modern Corporate**, prioritizing immediate legibility and "gloved-hand" usability. 

The brand personality is reliable, urgent, and rugged. It uses thick borders (`2px`) and high-contrast shadows to create "clicky," tactile elements that feel like physical tools. The interface avoids subtle gradients in favor of bold, flat color blocks and strong structural lines, ensuring clarity even in harsh outdoor lighting conditions.

## Colors

The palette is anchored by **High-Visibility Orange** (#ff6b00), chosen for its association with safety and industrial tools. 

- **Primary**: Used for core actions, branding, and status indicators.
- **Secondary**: A deep blue for utility actions like navigation and technical scanning.
- **Surface**: A multi-tiered grayscale system using `#f8f9fb` for backgrounds and pure `#ffffff` for elevated card elements.
- **Urgency**: A high-chroma red (`#ba1a1a`) is reserved strictly for immediate hazards or "Urgent" job labels.
- **Borders**: Instead of soft shadows alone, a defined "Outline" color (`#8e7164`) is used to frame elements, improving visibility on mobile devices.

## Typography

The system utilizes **Inter** exclusively to maintain a utilitarian, highly-legible feel across all environments. 

- **Display & Headlines**: Use heavy weights (700-800) with tighter letter spacing for a "blocky" industrial look.
- **Labels**: Small labels use uppercase with tracking (`0.05em`) to differentiate metadata from body content.
- **Readability**: Body sizes are slightly enlarged (base 16px, large 18px) to accommodate viewing while moving or on the job site.

## Layout & Spacing

TradieFlow uses a **Fluid Grid** model with strict vertical rhythm. 

- **Touch Targets**: A minimum height of `48px` is enforced for all interactive elements to ensure accessibility.
- **Margins**: A standard `16px` (1rem) margin is used on mobile, scaling to `24px` on tablets.
- **Vertical Rhythm**: A "Stack" system (`8px`, `16px`, `24px`) governs the distance between related and unrelated components. 
- **Containment**: Most content is housed in cards with `1rem` internal padding to create a structured "dashboard" feel.

## Elevation & Depth

This system avoids "soft" Material-style depth in favor of **Structural Elevation**:

- **Hard Shadows**: Elevated cards use a `4px` offset shadow with `0.1` opacity and `0px` blur, creating a "lifted paper" effect common in Neo-Brutalism.
- **Tonal Tiers**: Depth is primarily communicated through surface color changes (e.g., `surface-container-highest` for summary blocks).
- **Accents**: 4px-wide vertical "Priority Strips" on the left edge of cards denote high-importance items without cluttering the layout.
- **Buttons**: Use 4px bottom-borders (`border-b-4`) to simulate a physical button that can be depressed.

## Shapes

The shape language is "Soft-Square." 

- **Base Radius**: `4px` (0.25rem) for standard components and input fields.
- **Container Radius**: `8px` (0.5rem) for cards and secondary job items.
- **Large Radius**: `12px` (0.75rem) for major summary sections.
- **Interactive Pill**: Full rounding (`999px`) is reserved for Floating Action Buttons (FABs) and progress indicators to distinguish them from static structural elements.

## Components

### Buttons
- **Primary Action**: 48px height, `primary-container` background, `8px` radius, with a `border-b-4` of a darker shade to provide a tactile "press" effect.
- **Secondary Action**: White background with a `2px` border-outline.

### Cards
- Cards must have a `2px` border-outline.
- **Featured Cards**: Include a `4px` colored accent bar on the left and a hard drop shadow.

### Inputs & Fields
- Use a `1px` border with `14px` labels positioned directly above the field. 
- Touch targets for all inputs must be `48px` tall.

### Navigation
- **Bottom Bar**: Fixed height of `80px`, including safe area. Active states are indicated by a pill-shaped background container behind the icon.
- **Floating Action Buttons**: Stacked vertically in the bottom-right; the primary action is the largest and most colorful.

### Status Indicators
- **Urgency Badges**: Small, high-contrast rectangles with `2px` radius and bold uppercase text.
- **Progress Bars**: 8px tall with fully rounded ends, using high-contrast fills against an `outline-variant` track.
