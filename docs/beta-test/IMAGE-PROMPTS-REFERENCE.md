# Image Prompts Reference Guide

## Overview
Quick reference for creating consistent, on-brand images for Kinex Fit beta test marketing materials. Use this guide when generating images with AI tools (MidJourney, DALL-E, Stable Diffusion) or working with designers.

---

## Brand Colors

### Primary Palette

**Cyan (Primary Action Color)**
- Hex: `#00D0BD`
- RGB: `rgb(0, 208, 189)`
- Use for: CTAs, interactive elements, primary accents, success states

**Purple (Secondary Accent)**
- Hex: `#7A7EFF`
- RGB: `rgb(122, 126, 255)`
- Use for: Secondary actions, information highlights, scheduled items

**Gold (Special/Premium)**
- Hex: `#FFC247`
- RGB: `rgb(255, 194, 71)`
- Use for: Beta badges, premium features, achievements, rest timers

### Neutral Palette

**Dark Background**
- Primary: `#1A1A1A`
- Surface: `#2A2A2A`
- Elevated: `#3A3A3A`

**Text Colors**
- Primary: `#FFFFFF` (white)
- Secondary: `#A0A0A0` (light gray)
- Tertiary: `#666666` (medium gray)

**Borders & Lines**
- Default: `#404040` (dark gray)

### Semantic Colors

**Success**: `#22c55e` (green)
**Warning**: `#f59e0b` (orange)
**Destructive**: `#ef4444` (red)
**Rest/Accent**: `#FFC247` (gold - same as primary gold)

---

## Typography

### Font Family

**Primary**: Inter
- Download: [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif

### Font Weights

- **Black**: 900 (large headlines, emphasis)
- **Bold**: 700 (headings, labels)
- **Semibold**: 600 (subheadings, CTAs)
- **Medium**: 500 (buttons, navigation)
- **Regular**: 400 (body text)

### Font Sizes (Common)

**Headings:**
- H1 (Hero): 56-72px
- H2 (Section): 40-48px
- H3 (Card): 32px
- H4 (Subsection): 24px

**Body:**
- Large: 28-32px
- Regular: 16-20px
- Small: 14px
- Tiny: 12px (captions, labels)

### Line Height

- Headings: 1.1 - 1.2
- Body: 1.5 - 1.6
- Buttons/Labels: 1.0

---

## Image Dimensions

### Social Media

**Instagram:**
- Post (Square): 1080x1080px
- Story (Vertical): 1080x1920px (9:16 aspect ratio)
- Carousel: 1080x1080px per slide

**Facebook:**
- Link Preview: 1200x630px
- Post Image: 1080x1080px (square for albums)
- Cover Photo: 820x312px (if needed)

**Reddit:**
- Post Image: 1200x800px (landscape)
- Wide Format: 1200x675px (16:9)

### General Web

- Hero Image: 1920x1080px
- Card Image: 800x600px
- Thumbnail: 400x300px
- Avatar/Logo: 512x512px (square)

---

## Design System Components

### Buttons

**Primary Button:**
- Background: Cyan `#00D0BD`
- Text: Dark `#1A1A1A`
- Font: Inter Semibold or Bold
- Border radius: 8-16px
- Padding: 12px 24px (min)
- Min height: 44px (touch-friendly)

**Secondary Button:**
- Background: Transparent or `#3A3A3A`
- Text: White `#FFFFFF`
- Border: 1-2px solid `#404040`
- Same sizing as primary

**Ghost Button:**
- Background: Transparent
- Text: Cyan `#00D0BD`
- Hover: Light background `#2A2A2A`

### Cards

**Standard Card:**
- Background: `#2A2A2A`
- Border radius: 12px
- Padding: 16-24px
- Shadow: 0 4px 12px rgba(0,0,0,0.4)
- Accent border (optional): 3-4px left edge, cyan or purple

**Elevated Card:**
- Background: `#3A3A3A`
- Stronger shadow: 0 8px 24px rgba(0,0,0,0.6)

### Badges

**Beta Badge:**
- Background: Gold `#FFC247`
- Text: Dark `#1A1A1A`
- Font: Inter Bold, 12-16px, uppercase
- Border radius: 24px (pill shape)
- Padding: 4px 12px

**Status Badges:**
- Success: Green `#22c55e` background
- Warning: Orange `#f59e0b` background
- Error: Red `#ef4444` background
- Text: Always white or dark for contrast

---

## Icon Library

### Primary Icons (Lucide React)

**Navigation:**
- Home: `Home`
- Library: `Library`
- Add: `Plus` or `PlusCircle`
- Stats: `BarChart3` or `TrendingUp`
- Calendar: `Calendar`

**Features:**
- Workout: `Dumbbell`
- AI: `Sparkles` or `Zap`
- OCR: `Camera` or `ScanLine`
- Timer: `Clock` or `Timer`
- Profile: `User`

**Actions:**
- Edit: `Pencil` or `Edit`
- Delete: `Trash2`
- Save: `Check` or `Save`
- Close: `X`
- Settings: `Settings`

**Metrics:**
- Target: `Target`
- Trending Up: `TrendingUp`
- Award: `Award` or `Trophy`
- Heart: `Heart` (for favorites)

### Icon Styling

**Size:**
- Small: 16px
- Medium: 24px
- Large: 32px
- Hero: 48-64px

**Color:**
- Default: White `#FFFFFF`
- Accent: Cyan `#00D0BD`, Purple `#7A7EFF`, or Gold `#FFC247`
- Muted: Gray `#A0A0A0`

**Stroke Width:**
- Default: 2px
- Bold: 2.5-3px

---

## Screenshot Capture Guide

### How to Take High-Quality Screenshots

#### Desktop Screenshots

**Browser Setup:**
1. Use Chrome or Firefox (consistent rendering)
2. Set viewport to standard size:
   - Desktop: 1920x1080px
   - Laptop: 1440x900px
3. Remove browser chrome (press F11 for fullscreen)
4. Clear cache before capturing (fresh load)

**Tools:**
- **Mac**: Cmd + Shift + 4 (selection), Cmd + Shift + 3 (full screen)
- **Windows**: Win + Shift + S (Snip & Sketch)
- **Chrome Extension**: Awesome Screenshot, Full Page Screen Capture

#### Mobile Screenshots

**Phone Setup:**
1. Use actual device (better than emulator)
2. Clear notifications before capturing
3. Full battery or airplane mode (clean status bar)
4. Portrait orientation (unless testing landscape)

**Tools:**
- **iPhone**: Volume Up + Side Button
- **Android**: Volume Down + Power Button
- **Emulator**: Built-in screenshot button

### Screenshot Checklist

Before taking screenshot:
- [ ] Interface is clean (no debug elements)
- [ ] Sample data looks realistic (not "Test User")
- [ ] No personal information visible
- [ ] Proper lighting/contrast
- [ ] Full page visible (not cut off)
- [ ] Correct viewport size

After taking screenshot:
- [ ] Image is high resolution (min 1080px width)
- [ ] Image is in focus and clear
- [ ] Colors are accurate
- [ ] File size is reasonable (< 2MB)
- [ ] Named descriptively (e.g., `dashboard-workout-of-day.png`)

---

## Image Editing Tips

### Tools

**Free:**
- **Canva**: Easy templates, quick edits
- **Figma**: Professional design tool
- **Photopea**: Photoshop alternative (web-based)
- **GIMP**: Open-source Photoshop

**Paid:**
- **Adobe Photoshop**: Industry standard
- **Sketch**: Mac-only, design-focused
- **Affinity Photo**: One-time purchase

### Quick Edits

**Add Text Overlay:**
1. Use Inter font (download if needed)
2. Choose appropriate weight (Bold for headlines)
3. Ensure contrast (white on dark, dark on light)
4. Add subtle shadow for readability: 0 2px 4px rgba(0,0,0,0.5)

**Add Mockup:**
1. Find iPhone/phone mockup (free on Mockuper.net, Smartmockups)
2. Insert screenshot into mockup
3. Adjust perspective/angle
4. Add subtle glow or shadow

**Add Branding:**
1. Dumbbell icon: Use from Lucide or recreate
2. "Kinex Fit" wordmark: Inter Bold, 24-48px
3. Color: White or Cyan depending on background

### Color Adjustments

**Brightness/Contrast:**
- Increase contrast for social media (10-15%)
- Slightly brighten dark screenshots for visibility

**Color Correction:**
- Ensure cyan is `#00D0BD` (not shifted)
- Dark backgrounds should be true `#1A1A1A`
- Check color accuracy with eyedropper tool

---

## AI Image Generation Tips

### Prompting Best Practices

**Structure:**
1. **Subject**: What is the main element?
2. **Composition**: How is it arranged?
3. **Style**: What aesthetic/mood?
4. **Colors**: Specific color palette
5. **Details**: Important specifics
6. **Format**: Dimensions, aspect ratio

**Example Prompt:**
```
Create a modern fitness app mockup (1080x1080px).
Center: iPhone showing dark theme dashboard.
Background: Deep dark gradient #1A1A1A to #2A2A2A.
UI colors: Cyan #00D0BD accents, white text.
Style: Minimalist, professional, tech-forward.
Lighting: Soft glow around phone edges.
Format: Square, Instagram-optimized.
```

### Common Modifiers

**Quality:**
- "High quality", "4K", "professional", "detailed"

**Style:**
- "Minimalist", "modern", "clean", "sleek", "dark theme"

**Lighting:**
- "Soft lighting", "cinematic lighting", "studio lighting"

**Perspective:**
- "Centered", "straight on", "slight angle", "isometric"

**Mood:**
- "Professional", "energetic", "premium", "trustworthy"

### Platform-Specific Tips

**MidJourney:**
- Add `--ar 1:1` for square (Instagram)
- Add `--ar 9:16` for vertical (Stories)
- Add `--ar 16:9` for landscape (Reddit)
- Add `--q 2` for higher quality
- Use `--v 6` for latest model

**DALL-E:**
- Be specific about colors (hex codes work well)
- Request "no text" if you'll add text later
- Use "photorealistic" for realistic mockups
- Use "flat design" or "illustration" for graphics

**Stable Diffusion:**
- Use negative prompts: "no blur, no artifacts, no text"
- Add "trending on dribbble" for design inspiration
- Specify aspect ratio in initial prompt

---

## Brand Asset Library

### Logo Files

**Dumbbell Icon:**
- Format: SVG (vector) or PNG (high-res)
- Color: Cyan `#00D0BD` or White `#FFFFFF`
- Sizes: 64px, 128px, 256px, 512px

**Wordmark ("Kinex Fit"):**
- Font: Inter Bold
- Color: White or Cyan
- Spacing: Tight kerning (-2%)

### App Screenshots (from Beta Guide)

You'll need these 15 screenshots:
1. Login/welcome page
2. Training profile
3. Desktop navigation
4. Mobile bottom nav
5. Mobile hamburger menu
6. Manual workout creation
7. OCR scanning
8. AI enhancement
9. AI workout generator
10. Workout of the Day
11. PR tracking
12. Body metrics
13. Calendar view
14. Timer interface
15. Mobile dashboard

---

## Quality Checklist

Before publishing any image:

**Brand Consistency:**
- [ ] Uses correct brand colors (cyan, purple, gold)
- [ ] Uses Inter font family
- [ ] Matches dark theme aesthetic
- [ ] Logo/branding is visible

**Technical Quality:**
- [ ] Correct dimensions for platform
- [ ] High resolution (min 1080px width)
- [ ] File size optimized (< 2MB)
- [ ] Format: PNG for graphics, JPG for photos

**Content Quality:**
- [ ] Text is readable (min 16px for body)
- [ ] Good contrast (WCAG AA minimum)
- [ ] No spelling errors
- [ ] Professional appearance
- [ ] Aligned with brand voice

**Platform Optimization:**
- [ ] Safe zones (no important content in crop areas)
- [ ] Works on mobile and desktop
- [ ] Looks good as thumbnail
- [ ] Eye-catching in feed

---

## Common Image Scenarios

### Scenario 1: Instagram Post

**Requirements:**
- 1080x1080px square
- Bold headline (56-72px)
- High contrast
- Cyan accents
- Mobile-optimized

**Template Structure:**
```
Top 20%: Header/title
Middle 60%: Main visual (phone mockup, feature demo)
Bottom 20%: CTA or brand logo
```

---

### Scenario 2: Facebook Link Preview

**Requirements:**
- 1200x630px landscape
- Text on left or right (not centered)
- Clear value proposition
- Professional, not too "social media-y"

**Template Structure:**
```
Left 40%: Phone mockup
Right 60%: Headline + 3 bullet points + CTA badge
```

---

### Scenario 3: Reddit Tech Diagram

**Requirements:**
- 1200x800px landscape
- Technical, not marketing
- Clear labels and flow
- Monospace font for code terms
- Professional aesthetic

**Template Structure:**
```
Title bar (10%): Project name + tech stack summary
Main area (75%): Architecture boxes and arrows
Footer (15%): Stats/cost/timeline info
```

---

## File Naming Conventions

**Format**: `[platform]-[type]-[variation].png`

**Examples:**
- `instagram-post-carousel-slide-1.png`
- `facebook-link-preview.png`
- `reddit-tech-diagram.png`
- `beta-guide-screenshot-01-login.png`
- `mobile-dashboard-dark.png`

**Guidelines:**
- Lowercase
- Hyphens (not underscores or spaces)
- Descriptive and specific
- Include version number if iterating

---

## Resources

### Design Inspiration

**Similar Apps:**
- Strong App (clean, minimalist fitness tracker)
- Hevy (modern fitness app design)
- Notion (dark mode UI patterns)
- Linear (professional dark theme)

**Dribbble Searches:**
- "Fitness app dark theme"
- "Workout tracker UI"
- "AI fitness interface"

### Free Stock Resources

**Mockups:**
- Mockuper.net
- Smartmockups (free tier)
- Screely.com (browser mockups)

**Icons:**
- Lucide Icons (lucide.dev)
- Heroicons
- Feather Icons

**Fonts:**
- Google Fonts (Inter)
- Font Squirrel

---

## Quick Reference Card

```
BRAND COLORS:
Primary: #00D0BD (Cyan)
Secondary: #7A7EFF (Purple)
Accent: #FFC247 (Gold)
Background: #1A1A1A (Dark)
Text: #FFFFFF (White)

TYPOGRAPHY:
Font: Inter
Sizes: 56px (H1), 32px (H2), 16px (Body)
Weights: Bold (700), Semibold (600), Regular (400)

IMAGE SIZES:
Instagram Post: 1080x1080px
Instagram Story: 1080x1920px
Facebook: 1200x630px
Reddit: 1200x800px

ICONS:
Library: Lucide React
Style: 2px stroke, white/cyan color
Common: Dumbbell, Sparkles, Target, Calendar

DESIGN STYLE:
- Dark theme first
- High contrast
- Minimalist
- Mobile-optimized
- Professional, not playful
```

---

**Everything you need to create consistent, on-brand images for Kinex Fit beta test materials.**
