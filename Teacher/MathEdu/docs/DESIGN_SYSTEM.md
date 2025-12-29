# MathEdu Modern Design System Guidelines

This document outlines the design standards, color palettes, and component usage for the **MathEdu** project to ensure consistency across all dashbord and simulation reports.

---

## 1. Core Identity

- **Philosophy**: "Minimal, Unified, Modern."
- **Theme**: Charcoal-based primary UI with soft neutral secondary elements.
- **Accents**: Subtle gradients (`--grad-primary`) for depth on hover and headers. **Avoid using solid vibrant blues like `#3b82f6` for primary UI blocks.**
- **Typography**:
  - Headings/Body: `Inter`, `Noto Sans KR`.
  - Code/Math: `D2Coding` (subset) or `JetBrains Mono`.

## 2. Color Palette

Defined in `css/base/colors.css` and mapped in `css/base/variables.css`.

### Neutrals (Structure)

| Constant | Usage |
| :--- | :--- |
| `--bg-page` (`--off-white`) | Main background of the page. |
| `--bg-card` (`--white`) | Standard card backgrounds. |
| `--bg-element` (`--neutral-50`) | Subtle backgrounds for zones or inactive components. |
| `--text-main` (`--neutral-800`) | Main headings and dashboard titles. |
| `--text-body` (`--neutral-600`) | Paragraphs and description text for readability. |

### Brand Accents

| Constant | Usage |
| :--- | :--- |
| `--grad-primary` | **Primary Brand Identity**. Used for Header Titles, Primary Buttons, and active-state Icons. (Charcoal Gradient) |
| `--border-light` | Standard 1px border for cards and inputs. |

### Functional Highlights

| Usage | Implementation |
| :--- | :--- |
| **Theory Highlight (Light)** | `background: #eff6ff; color: #1e3a8a;` (Soft Blue Tint) |
| **Observation Zone (Light)** | `background: var(--neutral-50); color: var(--text-body);` |

---

## 3. Layout Patterns

### 3.1 Dashbord Layout (Index)

- **Grid**: Uses `.m-grid` with `auto-fit` columns.
- **Cards**: Use `.m-card` for navigation. Includes an `.icon-box` with an emoji or SVG.

### 3.2 One-Page Report Standard

- **Header**: Vertical Stack Layout to maximize title space.

  ```html
  <header class="modern-header flex justify-between items-end flex-wrap gap-4">
      <div>
          <div class="mb-2">
              <span class="m-badge" style="background:var(--grad-primary); color:white;">One-Page Report</span>
          </div>
          <h1>탐구 주제 제목</h1>
          <p>주제에 대한 부연 설명 또는 핵심 목표</p>
      </div>
  </header>
  ```

- **Sections**: All reports follow the `Step 1 -> Step 2 -> Step 3 -> Step 4` progression using the `.m-card` container.

---

## 4. UI Components

### Cards (`.m-card`)

- **Default Appearance**: White background, radius: 24px (`var(--radius-lg)`), soft shadow.
- **Hover Behavior**: Translates upwards (-4px) with a deepening shadow. A 4px gradient border appears at the top.

### Buttons (`.m-btn`)

- **Primary**: Uses the Charcoal gradient (`--grad-primary`).
- **Secondary**: White background with a light border.

### Badges & Icons

- Icons in `.icon-box`: Neutral background normally, transforms to `--grad-primary` with `white` text on card hover.

---

## 5. Technical Requirements

### 5.1 Responsive Canvas

- **ResizeObserver**: All interactive visualizations MUST use `ResizeObserver`.
- **DPI handling**: Always account for `window.devicePixelRatio`.
- **Height constraint**: Use `vis-container` with a fixed or aspect-ratio height (e.g., `style="height: 400px;"`).

### 5.2 Auto-Save Integration

- Use `.savable` class on all input/textarea elements.
- Initialize logic using `ReportManager` in `script.js`.
