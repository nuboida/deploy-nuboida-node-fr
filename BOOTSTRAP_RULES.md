# Bootstrap Customization Rules & Guidelines

This document outlines the best practices and rules for using Bootstrap in this project.

---

## 1. Import Order (CRITICAL)

The order of imports in `src/styles/index.scss` is **critical** for proper Bootstrap customization:

### Standard Import Order (for variable overrides only):
```scss
// 1. Custom variables (override Bootstrap defaults FIRST)
@import './custom-variables';

// 2. Bootstrap framework (uses your custom variables)
@import 'bootstrap/scss/bootstrap';

// 3. Custom mixins (can now use Bootstrap variables)
@import './custom-mixins';

// 4. Custom component styles (uses Bootstrap + your customizations)
@import './custom';
```

### Advanced Import Order (for mixin overrides):
When you need to override Bootstrap mixins (not just variables), use this expanded import order:

```scss
// 1. Custom Bootstrap variable overrides (must come BEFORE Bootstrap)
@import './custom-variables';

// 2. Import Bootstrap's core foundation ONLY (functions, variables, maps, mixins, utilities)
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/variables-dark';
@import 'bootstrap/scss/maps';
@import 'bootstrap/scss/mixins';
@import 'bootstrap/scss/utilities';

// 3. Custom mixin overrides (MUST come after Bootstrap mixins but BEFORE Bootstrap components)
@import './custom-mixins';

// 4. Import Bootstrap components individually (they will use your overridden mixins)
@import 'bootstrap/scss/root';
@import 'bootstrap/scss/reboot';
@import 'bootstrap/scss/type';
@import 'bootstrap/scss/images';
@import 'bootstrap/scss/containers';
@import 'bootstrap/scss/grid';
@import 'bootstrap/scss/tables';
@import 'bootstrap/scss/forms';  // This uses our overridden form-validation-state mixin
@import 'bootstrap/scss/buttons';
// ... (remaining Bootstrap components)

// 5. Custom component styles and utilities
@import './custom';
```

### Why This Order Matters:
1. **Custom variables first** - Override Bootstrap's default variables before Bootstrap loads
2. **Bootstrap foundation** - Import functions, variables, and mixins (but NOT components yet)
3. **Custom mixin overrides** - Redefine Bootstrap mixins with your customizations
4. **Bootstrap components** - Import component modules that will use your overridden mixins
5. **Custom styles last** - Can leverage everything above

**❌ NEVER** import Bootstrap before your custom variables, or your overrides won't work!
**⚠️ IMPORTANT:** Use the advanced order ONLY when overriding mixins. For variable-only overrides, use the standard order.

---

## 2. Mixin Overrides (Advanced Customization)

When Bootstrap doesn't provide a variable for what you need to customize, you may need to override entire mixins. This is an advanced technique that requires careful attention to import order and selector hierarchy.

### When to Use Mixin Overrides:

✅ **Use mixin overrides when:**
- No Bootstrap variable exists for the property you want to change
- You need to modify complex generated styles (like validation states)
- Variable overrides alone can't achieve the desired result

❌ **Don't use mixin overrides when:**
- A Bootstrap variable already exists for the property
- You can achieve the same result with CSS overrides
- You're just changing a single value (use variables instead)

### Example: Form Validation Icon Size Override

**Problem:** Bootstrap's validation icons are too large (`$input-height-inner-half`), but we want them smaller (`$input-height-inner-quarter`). There's no single variable to control just the `background-size` property.

**Solution:** Override the `form-validation-state` mixin in `_custom-mixins.scss`:

```scss
// ========================================
// Bootstrap Form Validation Mixin Override
// ========================================
// Override Bootstrap's form-validation-state mixin to use smaller validation icons
// This is a complete copy of Bootstrap's mixin with ONE change: background-size uses quarter instead of half
// Source: node_modules/bootstrap/scss/mixins/_forms.scss

@mixin form-validation-state(
  $state,
  $color,
  $icon,
  $tooltip-color: color-contrast($color),
  $tooltip-bg-color: rgba($color, $form-feedback-tooltip-opacity),
  $focus-box-shadow: 0 0 $input-btn-focus-blur $input-focus-width rgba($color, $input-btn-focus-color-opacity),
  $border-color: $color
) {
  // ... (full mixin structure from Bootstrap)

  .form-control {
    @include form-validation-state-selector($state) {
      border-color: $border-color;

      @if $enable-validation-icons {
        padding-right: $input-height-inner;
        background-image: escape-svg($icon);
        background-repeat: no-repeat;
        background-position: right $input-height-inner-quarter center;
        // CUSTOM OVERRIDE: Use quarter size instead of half for smaller validation icons
        background-size: $input-height-inner-quarter $input-height-inner-quarter;
      }

      // ... (rest of mixin)
    }
  }

  // ... (rest of mixin - textarea, select, etc.)
}
```

**Also override the related variable in `_custom-variables.scss`:**

```scss
// Form Select Validation Icon Size Override
// Override to use quarter size for smaller validation icons in select dropdowns
$input-height-inner-quarter: calc(.4em + .5rem);
$form-select-feedback-icon-size: $input-height-inner-quarter $input-height-inner-quarter;
```

### Mixin Override Rules:

1. **Copy the ENTIRE mixin structure** from Bootstrap's source
2. **Match the exact selector hierarchy** - Don't simplify or restructure
3. **Document your changes** with comments like `// CUSTOM OVERRIDE:`
4. **Keep it DRY** - Only override the specific mixin you need to change
5. **Reference the source** - Add a comment with the Bootstrap file path
6. **Use advanced import order** - Import Bootstrap foundation → Custom mixins → Bootstrap components

### Result:
- ✅ Validation icons use `calc(.4em + .5rem)` instead of `calc(.8em + 1rem)` - exactly half the size
- ✅ Works for both `.form-control` (text inputs) and `.form-select` (dropdowns)
- ✅ Works for both `.is-valid` and `.is-invalid` states
- ✅ Smaller, more subtle validation icons that don't overwhelm the UI

---

## 3. Bootstrap Color System Architecture

Understanding Bootstrap's color architecture is critical for proper theme customization and WCAG compliance.

### Color Hierarchy

Bootstrap uses a three-tier color system:

```scss
// Tier 1: Base colors (defined in Bootstrap's _variables.scss)
$green: #198754 !default;
$red: #dc3545 !default;
$blue: #0d6efd !default;

// Tier 2: Color variants (generated from base colors)
$green-500: $green !default;  // The -500 variant IS the base color
$green-600: shade-color($green, 20%) !default;  // Darker
$green-400: tint-color($green, 20%) !default;   // Lighter

// Tier 3: Theme colors (semantic mapping)
$success: $green !default;
$danger: $red !default;
$primary: $blue !default;
```

### When to Override Base Colors vs Theme Colors

✅ **Override base colors** when:
- You want all color variants (100-900) to regenerate from your color
- You want consistency across the entire color system
- You're following Bootstrap's architecture

```scss
// ✅ RECOMMENDED: Override base colors
$green: #198754;  // All green variants regenerate from this
$red: #dc3545;    // All red variants regenerate from this

// Theme colors automatically inherit (Bootstrap's default behavior)
// $success: $green !default; → uses our #198754
// $danger: $red !default; → uses our #dc3545
```

❌ **Override theme colors directly** when:
- You only want to change the semantic color, not the entire palette
- You need a different color than the base color provides

```scss
// ⚠️ USE WITH CAUTION: Direct theme override
$success: #22c55e;  // Different from $green
$danger: #ef4444;   // Different from $red
```

### Variable Dependencies

**CRITICAL:** If you use Bootstrap theme colors in your own custom variables, you must define them explicitly BEFORE use:

```scss
// ❌ WRONG - Will cause "Undefined variable" error
// $success is not defined yet when we try to use it
$gradient-success: linear-gradient(135deg, $success 0%, #059669 100%);

// ✅ CORRECT - Define theme colors first
$green: #198754;
$success: $green;  // Explicitly define before using below
$gradient-success: linear-gradient(135deg, $success 0%, #059669 100%);
```

### Example: WCAG-Compliant Color Override

```scss
// Override Bootstrap Base Colors (WCAG 2.2 AA Compliance)
// Bootstrap's architecture: base colors → -500 variants → theme colors
$green: #198754;  // Bootstrap's default green (WCAG AA: 4.5:1 contrast on white)
$red: #dc3545;    // Bootstrap's default red (WCAG AA: 4.5:1 contrast on white)

// Override Bootstrap Theme Colors
// Must define these explicitly since we use them in custom variables below
$success: $green;   // Explicitly inherit from $green (Bootstrap's default)
$danger: $red;      // Explicitly inherit from $red (Bootstrap's default)

// Now safe to use in custom variables
$gradient-success: linear-gradient(135deg, $success 0%, #059669 100%);
$gradient-danger: linear-gradient(135deg, $danger 0%, #dc2626 100%);
```

### Key Takeaways

1. **Follow Bootstrap's architecture**: Base colors → Variants → Theme colors
2. **Override base colors** for system-wide consistency
3. **Define theme colors explicitly** if you use them in custom variables
4. **Document the inheritance chain** with comments
5. **Verify WCAG compliance** for all color overrides

---

## 4. Variable Overrides (THE MOST IMPORTANT RULE!)

**ALWAYS check Bootstrap's `_variables.scss` FIRST** before writing custom CSS!

All Bootstrap variable overrides should be placed in `src/styles/_custom-variables.scss`.

### Critical Process:
1. **First**: Check if Bootstrap has a variable for what you want to change
2. **Second**: Override that variable in `_custom-variables.scss`
3. **Last Resort**: Only write custom CSS in `_custom.scss` if no variable exists

### Avoid `!important`

**CRITICAL:** Avoid using `!important` in your CSS unless absolutely necessary.

❌ **Don't use `!important`:**
```scss
// Bad - Using !important unnecessarily
.toast-success {
  border-color: var(--bs-success) !important;
}
```

✅ **Do rely on specificity:**
```scss
// Good - Using proper selector specificity
.toast-success {
  border-color: var(--bs-success);
}
```

**When `!important` might be acceptable:**
- Overriding third-party library styles that use `!important`
- Utility classes that must always apply (like `.d-none`)
- Accessibility-related overrides that must never be overridden

**In almost all cases, you can avoid `!important` by:**
- Using more specific selectors
- Overriding Bootstrap variables instead of writing custom CSS
- Placing your custom styles after Bootstrap imports

### WCAG 2.2 AA Compliance for Colors:

**CRITICAL:** Always ensure color contrast meets WCAG 2.2 AA standards:
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+/14pt+ bold): Minimum 3:1 contrast ratio

Since `$primary` is used for both buttons AND links (text), it must meet the 4.5:1 standard.

```scss
// ❌ WRONG - Fails WCAG 2.2 AA for links/text (only 3.03:1 contrast)
$primary: #667eea;

// ✅ CORRECT - Passes WCAG 2.2 AA for links/text (4.52:1 contrast)
$primary: #5b4db5;
```

**Testing contrast ratios:**
- Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Test against your background color (usually white #FFFFFF)
- Ensure all theme colors meet accessibility standards

### Examples:
```scss
// Override Bootstrap's default colors with WCAG-compliant values
$primary: #5b4db5;      // WCAG AA compliant (4.52:1 on white)
$secondary: #64748b;    // WCAG AA compliant
$success: #10b981;      // WCAG AA compliant
$danger: #dc2626;       // WCAG AA compliant

// Override spacing
$spacer: 1rem;

// Override border radius
$border-radius: 0.5rem;
$border-radius-lg: 1rem;

// Override shadows
$box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);

// Override shared input/button padding (Bootstrap uses these for BOTH!)
$input-btn-padding-y: 1rem;      // Default size
$input-btn-padding-x: 1rem;
$input-btn-padding-y-sm: 0.625rem;  // Small size (.btn-sm, .form-control-sm)
$input-btn-padding-x-sm: 0.875rem;
$input-btn-padding-y-lg: 1.25rem;   // Large size (.btn-lg, .form-control-lg)
$input-btn-padding-x-lg: 1.5rem;

// Override shared input/button font sizes (Bootstrap uses these for BOTH!)
$font-size-base: 1rem;
$input-btn-font-size: $font-size-base;              // Default size
$input-btn-font-size-sm: $font-size-base * 0.875;   // Small size
$input-btn-font-size-lg: $font-size-base * 1.25;    // Large size
```

### Bootstrap's Shared Variable System:

Bootstrap uses **shared base variables** that cascade to multiple components:

```scss
// Bootstrap's hierarchy (from _variables.scss):

// BASE variables for PADDING (default size)
$input-btn-padding-y: .375rem;  // BASE variable
$input-btn-padding-x: .75rem;   // BASE variable

// BASE variables for PADDING (size variants)
$input-btn-padding-y-sm: .25rem;   // BASE for small size
$input-btn-padding-x-sm: .5rem;
$input-btn-padding-y-lg: .5rem;    // BASE for large size
$input-btn-padding-x-lg: 1rem;

// BASE variables for FONT SIZE
$font-size-base: 1rem;                              // Foundation
$input-btn-font-size: $font-size-base;              // BASE (default size)
$input-btn-font-size-sm: $font-size-base * .875;    // BASE (small size)
$input-btn-font-size-lg: $font-size-base * 1.25;    // BASE (large size)

// Derived button PADDING variables (inherit from base)
$btn-padding-y: $input-btn-padding-y;         // Buttons inherit
$btn-padding-x: $input-btn-padding-x;
$btn-padding-y-sm: $input-btn-padding-y-sm;   // .btn-sm inherits
$btn-padding-x-sm: $input-btn-padding-x-sm;
$btn-padding-y-lg: $input-btn-padding-y-lg;   // .btn-lg inherits
$btn-padding-x-lg: $input-btn-padding-x-lg;

// Derived input PADDING variables (inherit from base)
$input-padding-y: $input-btn-padding-y;       // Inputs inherit
$input-padding-x: $input-btn-padding-x;
$input-padding-y-sm: $input-btn-padding-y-sm; // .form-control-sm inherits
$input-padding-x-sm: $input-btn-padding-x-sm;
$input-padding-y-lg: $input-btn-padding-y-lg; // .form-control-lg inherits
$input-padding-x-lg: $input-btn-padding-x-lg;

// Derived FONT SIZE variables (inherit from base)
$btn-font-size: $input-btn-font-size;         // Buttons inherit
$btn-font-size-sm: $input-btn-font-size-sm;   // .btn-sm inherits
$btn-font-size-lg: $input-btn-font-size-lg;   // .btn-lg inherits
$input-font-size: $input-btn-font-size;       // Inputs inherit
$input-font-size-sm: $input-btn-font-size-sm; // .form-control-sm inherits
$input-font-size-lg: $input-btn-font-size-lg; // .form-control-lg inherits
```

**Key principle:** Override the BASE variable, not the derived ones!

```scss
// ✅ CORRECT - Override the base variables (padding AND font-size)
$input-btn-padding-y: 1rem;
$input-btn-padding-x: 1rem;
$input-btn-padding-y-sm: 0.625rem;
$input-btn-padding-x-sm: 0.875rem;
$input-btn-padding-y-lg: 1.25rem;
$input-btn-padding-x-lg: 1.5rem;

$font-size-base: 1rem;
$input-btn-font-size: $font-size-base;
$input-btn-font-size-sm: $font-size-base * 0.875;
$input-btn-font-size-lg: $font-size-base * 1.25;
// Now buttons AND inputs of ALL sizes have consistent padding AND font sizes!

// ❌ WRONG - Don't override derived variables individually
$btn-padding-y: 1rem;
$input-padding-y: 1rem;
$btn-padding-y-sm: 0.625rem;
$input-padding-y-sm: 0.625rem;
$btn-font-size: 1rem;
$input-font-size: 1rem;
// This breaks the relationship and requires duplicate work
```

### Rules:
- ✅ **ALWAYS** check Bootstrap's `_variables.scss` first
- ✅ Define variables **before** importing Bootstrap
- ✅ Use Bootstrap's shared variable system (like `$input-btn-padding-*` for both inputs and buttons)
- ✅ Override BASE variables, not derived ones
- ✅ Use Bootstrap's variable names for consistency
- ✅ Document what each override does
- ❌ Don't override variables in `_custom.scss`
- ❌ Don't write CSS overrides if a variable exists
- ❌ Don't override derived variables when you can override the base

---

## 3. Using Bootstrap Classes

### Prefer Bootstrap Classes Over Custom CSS

**✅ Good:**
```html
<div className="d-flex justify-content-between align-items-center gap-3">
  <button className="btn btn-primary">Click me</button>
</div>
```

**❌ Bad:**
```html
<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
  <button style="background: blue; padding: 0.5rem 1rem;">Click me</button>
</div>
```

### Common Bootstrap Utilities to Use:

#### Layout & Flexbox:
- `.d-flex`, `.d-grid`, `.d-none`, `.d-block`
- `.flex-row`, `.flex-column`
- `.justify-content-*` (start, center, end, between, around)
- `.align-items-*` (start, center, end, stretch)
- `.gap-*` (1, 2, 3, 4, 5)

#### Spacing:
- `.m-*` (margin), `.p-*` (padding)
- `.mt-*`, `.mb-*`, `.ms-*`, `.me-*` (margin top/bottom/start/end)
- `.pt-*`, `.pb-*`, `.ps-*`, `.pe-*` (padding top/bottom/start/end)
- Values: 0, 1, 2, 3, 4, 5, auto

#### Text:
- `.text-*` (primary, secondary, muted, white, dark)
- `.text-start`, `.text-center`, `.text-end`
- `.fw-*` (light, normal, medium, semibold, bold)
- `.fs-*` (1, 2, 3, 4, 5, 6)

#### Sizing:
- `.w-*` (25, 50, 75, 100, auto)
- `.h-*` (25, 50, 75, 100, auto)

---

## 4. Form Controls

### Bootstrap Class Overrides

We override Bootstrap's default form control styles globally using variables in `_custom-variables.scss` and direct overrides in `_custom.scss`.

**Variable overrides in `_custom-variables.scss`:**
```scss
// Typography
$font-weight-semibold: 600;
$form-label-font-size: 0.8125rem;
$form-label-font-weight: $font-weight-semibold;
$form-label-color: $text-label;
$form-label-margin-bottom: 0.375rem;

// Input & Button Shared Padding (Bootstrap uses $input-btn-padding-* for BOTH!)
$input-btn-padding-y: 1rem;  // Vertical padding for inputs AND buttons
$input-btn-padding-x: 1rem;  // Horizontal padding for inputs AND buttons
```

**Class overrides in `_custom.scss` (ONLY when no variable exists):**
```scss
// Override Bootstrap .form-label (no Bootstrap variables for these properties)
.form-label {
  font-size: $form-label-font-size;
  font-weight: $form-label-font-weight;
  color: $form-label-color;
  margin-bottom: $form-label-margin-bottom;
  display: block;
}

// NOTE: .form-control and .form-select padding is controlled by variables!
// See $input-btn-padding-y and $input-btn-padding-x in _custom-variables.scss
```

**✅ Usage:**
```html
<!-- Label -->
<label className="form-label">Email</label>

<!-- Text input -->
<input type="text" className="form-control" placeholder="Enter text" />

<!-- Select dropdown -->
<select className="form-select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>

<!-- Textarea -->
<textarea className="form-control" rows={3}></textarea>
```

All form controls across the app (including auth pages) use the same Bootstrap classes with our custom overrides.

---

## 5. Custom Classes vs Bootstrap Classes

### When to Create Custom Classes:

✅ **Create custom classes when:**
- You need glass morphism effects (`.glass-card`, `.glass-header`)
- You need gradient text (`.text-gradient-primary`)
- You need complex component styling (`.stat-card`, `.tenant-card`)
- Bootstrap doesn't provide the specific utility you need

❌ **Don't create custom classes when:**
- Bootstrap already has a utility class for it
- You can combine Bootstrap classes to achieve the same result
- It's a one-off style (use inline styles instead)

### Example of Good Custom Classes:

```scss
// Custom glass morphism card
.glass-card {
  @include glass-effect;
  border-radius: $border-radius-lg;
  padding: $spacing-lg;
}

// Custom gradient text
.text-gradient-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 6. Accessibility Utilities

### Visually Hidden Elements

Bootstrap provides accessibility helpers for screen reader content:

**`.visually-hidden`** - Hides element visually but keeps it accessible to screen readers:
```html
<span className="visually-hidden">Additional context for screen readers</span>
```

**`.visually-hidden-focusable`** - Hides element until it receives focus (perfect for skip links):
```html
<a href="#main-content" className="visually-hidden-focusable">
  Skip to main content
</a>
```

**How it works:**
- Element is hidden by default
- Becomes visible when focused (via keyboard Tab navigation)
- Automatically handled by Bootstrap's CSS

**Our Implementation:**
```tsx
// In App.tsx
<a href="#main-content" className="visually-hidden-focusable skip-link">
  Skip to main content
</a>
```

We add `.skip-link` for custom brand styling on focus (purple gradient background).

---

## 7. Responsive Design

### Use Bootstrap Breakpoints:

```scss
// Bootstrap breakpoints (use these in media queries)
$grid-breakpoints: (
  xs: 0,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1400px
);
```

### Responsive Utilities:

```html
<!-- Show/hide at different breakpoints -->
<div className="d-none d-md-block">Visible on medium+ screens</div>
<div className="d-block d-md-none">Visible on small screens only</div>

<!-- Responsive columns -->
<div className="row">
  <div className="col-12 col-md-6 col-lg-4">Column</div>
</div>

<!-- Responsive spacing -->
<div className="p-2 p-md-4 p-lg-5">Responsive padding</div>
```

---

## 7. Color System

### Use Bootstrap Color Variables:

```scss
// In SCSS
.my-element {
  background-color: $primary;
  color: $white;
  border-color: $secondary;
}
```

### Bootstrap Color Utilities:

```html
<!-- Background colors -->
<div className="bg-primary">Primary background</div>
<div className="bg-secondary">Secondary background</div>

<!-- Text colors -->
<span className="text-primary">Primary text</span>
<span className="text-muted">Muted text</span>

<!-- Border colors -->
<div className="border border-primary">Primary border</div>
```

---

## 8. Component Styling Patterns

### Pattern 1: Bootstrap Classes + Custom Modifier

```html
<!-- Base Bootstrap component with custom modifier class -->
<button className="btn btn-primary btn-custom-large">
  Click me
</button>
```

```scss
// Add custom modifications
.btn-custom-large {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}
```

### Pattern 2: Wrapper + Bootstrap Utilities

```html
<!-- Custom wrapper with Bootstrap utilities inside -->
<div className="stat-card">
  <div className="d-flex justify-content-between align-items-center mb-3">
    <h3 className="h5 mb-0">Title</h3>
    <span className="badge bg-primary">New</span>
  </div>
  <p className="text-muted mb-0">Content</p>
</div>
```

---

## 9. What NOT to Do

### ❌ Don't Override Bootstrap Classes Directly

**Bad:**
```scss
// Don't do this - overrides Bootstrap globally
.btn-primary {
  background: red !important;
}
```

**Good:**
```scss
// Create a new variant instead
.btn-custom-red {
  @extend .btn;
  background: red;
}
```

### ❌ Don't Use !important Unless Absolutely Necessary

```scss
// Bad
.my-class {
  color: red !important;
}

// Good - fix the specificity issue instead
.parent .my-class {
  color: red;
}
```

### ❌ Don't Mix Inline Styles and Classes Unnecessarily

**Bad:**
```html
<div className="btn btn-primary" style="padding: 10px; margin: 5px;">
  Button
</div>
```

**Good:**
```html
<div className="btn btn-primary p-2 m-1">
  Button
</div>
```

---

## 10. File Organization

### Current Structure:

```
src/styles/
├── index.scss              # Main entry point (import order matters!)
├── _custom-variables.scss  # Bootstrap variable overrides
├── _custom-mixins.scss     # Reusable SCSS mixins
└── _custom.scss           # Custom component styles
```

### Rules:
- ✅ **index.scss** - Only imports, no styles
- ✅ **_custom-variables.scss** - Only variable overrides
- ✅ **_custom-mixins.scss** - Only mixins and functions
- ✅ **_custom.scss** - Custom classes and components

---

## 11. Current Bootstrap Overrides

### Variable Overrides (in _custom-variables.scss):
```scss
// Theme Colors (Bootstrap variables)
// WCAG 2.2 AA Compliance: $primary must have 4.5:1 contrast (used for buttons AND links)
$primary: #5b4db5;      // Darker purple - 4.52:1 contrast (AA compliant)
$secondary: #64748b;
$success: #10b981;
$info: #3b82f6;
$warning: #f59e0b;
$danger: #ef4444;

// Body Typography (Bootstrap variables)
$font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
$line-height-base: 1.6;
$body-color: $text-body;

// Headings (Bootstrap variables)
$headings-font-weight: 700;
$headings-line-height: 1.3;
$headings-color: $text-heading;

// Input & Button Shared Padding (affects both .form-control AND .btn!)
$input-btn-padding-y: 1rem;
$input-btn-padding-x: 1rem;
$input-btn-padding-y-sm: 0.625rem;  // 10px - for .btn-sm and .form-control-sm
$input-btn-padding-x-sm: 0.875rem;  // 14px
$input-btn-padding-y-lg: 1.25rem;   // 20px - for .btn-lg and .form-control-lg
$input-btn-padding-x-lg: 1.5rem;    // 24px

// Input & Button Shared Font Sizes (affects both .form-control AND .btn!)
$font-size-base: 1rem;                              // Foundation for all sizing
$input-btn-font-size: $font-size-base;              // Default size
$input-btn-font-size-sm: $font-size-base * 0.875;   // 0.875rem - Small size
$input-btn-font-size-lg: $font-size-base * 1.25;    // 1.25rem - Large size

// Link Styling (affects <a> tags AND .btn-link!)
// Note: $link-color inherits from $primary by default (Bootstrap best practice)
// This is why $primary must be WCAG AA compliant!
$link-decoration: none;                    // Remove default underline
$link-hover-decoration: underline;         // Add underline on hover

// Custom Form Label Variables (no Bootstrap equivalents)
$font-weight-semibold: 600;
$form-label-font-size: 0.8125rem;
$form-label-font-weight: $font-weight-semibold;
$form-label-color: $text-label;
$form-label-margin-bottom: 0.375rem;
```

### Class Overrides (in _custom.scss - ONLY when no variable exists):
```scss
// Override .form-label (no Bootstrap variables for all these properties)
.form-label {
  font-size: $form-label-font-size;
  font-weight: $form-label-font-weight;
  color: $form-label-color;
  margin-bottom: $form-label-margin-bottom;
  display: block;
}

// Skip link accessibility (uses Bootstrap's .visually-hidden-focusable with custom brand styling)
.skip-link {
  &:focus {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 999;
    padding: 1rem 1.5rem;
    background: $gradient-brand;
    color: white;
    text-decoration: none;
    border-radius: 0 0 $border-radius $border-radius;
    font-weight: 600;
    box-shadow: $box-shadow-md;
  }
}
```

### Table Override:
```scss
.table {
  @include glass-effect;
  border-radius: $border-radius-lg;
  overflow: hidden;
  // Custom thead and tbody styling
}
```

---

## 12. Quick Reference

### Most Used Bootstrap Classes in This Project:

- **Layout:** `d-flex`, `justify-content-between`, `align-items-center`, `gap-*`
- **Spacing:** `mb-*`, `mt-*`, `p-*`, `px-*`, `py-*`
- **Grid:** `row`, `col-*`, `col-md-*`, `col-lg-*`
- **Text:** `text-muted`, `text-white`, `fw-bold`, `h1-h6`
- **Components:** `btn`, `btn-primary`, `card`, `badge`, `alert`
- **Forms:** `form-control`, `form-select`, `form-label`

### Custom Classes Specific to This Project:

**When Bootstrap doesn't provide the functionality:**

- **Glass Effects:** `.glass-card`, `.glass-header`
- **Cards:** `.stat-card`, `.tenant-card`, `.login-card`
- **Text:** `.text-gradient-primary`
- **Buttons:** `.btn-tertiary`, `.btn-submit` (custom variants)
- **Icons:** `.icon-container`, `.icon-container-lg`

**Note:** We override Bootstrap classes (`.form-label`, `.form-control`, `.table`) instead of creating `-custom` variants!

---

## 13. Common Bootstrap Variables Reference

### Typography Variables:
```scss
$font-family-base          // Body font family
$line-height-base          // Body line height
$body-color                // Body text color

$headings-font-family      // Heading font (null = inherit from body)
$headings-font-weight      // All headings weight
$headings-line-height      // All headings line height
$headings-color            // All headings color

$h1-font-size through $h6-font-size  // Individual heading sizes
```

### Input & Button Variables (Shared System):
```scss
// BASE variables for PADDING (use these!)
$input-btn-padding-y       // Vertical padding for inputs AND buttons (default)
$input-btn-padding-x       // Horizontal padding for inputs AND buttons (default)
$input-btn-padding-y-sm    // Vertical padding for .btn-sm AND .form-control-sm
$input-btn-padding-x-sm    // Horizontal padding for .btn-sm AND .form-control-sm
$input-btn-padding-y-lg    // Vertical padding for .btn-lg AND .form-control-lg
$input-btn-padding-x-lg    // Horizontal padding for .btn-lg AND .form-control-lg

// BASE variables for FONT SIZE (use these!)
$font-size-base            // Foundation for all sizing (1rem by default)
$input-btn-font-size       // Font size for inputs AND buttons (default: $font-size-base)
$input-btn-font-size-sm    // Font size for .btn-sm AND .form-control-sm (default: $font-size-base * .875)
$input-btn-font-size-lg    // Font size for .btn-lg AND .form-control-lg (default: $font-size-base * 1.25)

// Other shared variables
$input-btn-line-height     // Line height for inputs AND buttons

// Derived PADDING variables (inherit from base - don't override these!)
$btn-padding-y: $input-btn-padding-y
$btn-padding-x: $input-btn-padding-x
$btn-padding-y-sm: $input-btn-padding-y-sm
$btn-padding-x-sm: $input-btn-padding-x-sm
$btn-padding-y-lg: $input-btn-padding-y-lg
$btn-padding-x-lg: $input-btn-padding-x-lg
$input-padding-y: $input-btn-padding-y
$input-padding-x: $input-btn-padding-x
$input-padding-y-sm: $input-btn-padding-y-sm
$input-padding-x-sm: $input-btn-padding-x-sm
$input-padding-y-lg: $input-btn-padding-y-lg
$input-padding-x-lg: $input-btn-padding-x-lg

// Derived FONT SIZE variables (inherit from base - don't override these!)
$btn-font-size: $input-btn-font-size
$btn-font-size-sm: $input-btn-font-size-sm
$btn-font-size-lg: $input-btn-font-size-lg
$input-font-size: $input-btn-font-size
$input-font-size-sm: $input-btn-font-size-sm
$input-font-size-lg: $input-btn-font-size-lg
```

### Link Variables:
```scss
$link-color                // Link color (defaults to $primary, also used by .btn-link)
$link-hover-color          // Link hover color (auto-darkens $link-color by $link-shade-percentage)
$link-decoration           // Link text decoration (default, hover uses different var)
$link-hover-decoration     // Link hover text decoration
$link-shade-percentage     // How much to darken on hover (default: 20%)
```

**Important:** By default, `$link-color` inherits from `$primary`. This is why `$primary` MUST meet WCAG 2.2 AA contrast standards (4.5:1) - it affects both buttons and text links. Only override `$link-color` separately if you need links to differ from buttons (rare).

### Spacing Variables:
```scss
$spacer                    // Base spacing unit (default: 1rem)
$spacer * .25              // Used for spacing utilities (.mt-1, .mb-1, etc.)
$spacer * .5               // Used for spacing utilities (.mt-2, .mb-2, etc.)
$spacer * 1                // Used for spacing utilities (.mt-3, .mb-3, etc.)
```

### Color Variables:
```scss
$primary, $secondary, $success, $info, $warning, $danger
$light, $dark
```

### Border Radius Variables:
```scss
$border-radius-sm
$border-radius
$border-radius-lg
$border-radius-xl
$border-radius-pill
```

---

## 14. Resources

- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)
- [Bootstrap SCSS Variables](https://github.com/twbs/bootstrap/blob/main/scss/_variables.scss) - **CHECK THIS FIRST!**
- [Bootstrap Utility Classes](https://getbootstrap.com/docs/5.3/utilities/api/)

---

**Last Updated:** 2025-01-22
