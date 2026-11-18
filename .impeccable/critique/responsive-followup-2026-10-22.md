# Responsive and accessibility follow-up — 2026-10-22

Read-only continuation. Independent in-app browser tab; no authentication, orders, payments, locale changes, or application edits.

## New reproducible finding

**Medium: route changes do not announce the destination or move focus into its content.** On the premium product page, activating the header Products link changed the route to /products while focus remained on that header link. DOM measurement: document.activeElement was A, text Products; document.title remained MongKol. The category page also retained MongKol. Router scrollBehavior restores position but there is no after-navigation focus/title handling in src/router/index.js. Main already has tabindex=-1, so a professional fix is small: set a meaningful route/product title and focus the destination main/heading after completed navigation, without disrupting in-page filter updates. This gives keyboard and screen-reader visitors a clear destination and avoids repeatedly tabbing through the header.

## Bounded responsive evidence

- Premium product measured at 320, 390, 768, 1440 CSS pixels. At 390/768/1440, document scroll width equaled the client width: no horizontal page overflow.
- Nominal 320 with a visible 15px desktop scrollbar yielded clientWidth 305, scrollWidth 320. Source body min-width:320px explains this small overflow. Emulation caveat; do not call this a proven physical-phone failure.
- Catalogue inspected at 390; responsive header, category controls and expandable Filters work. Filter trigger exposes aria-expanded/aria-controls; the inline panel contains labeled fieldsets, radios, sliders and checkboxes. Price slider thumbs also have enlarged CSS hit areas; their 20px geometry alone is not a valid small-target defect.
- Product variants and quantity controls appear in the accessibility tree with names/state. Main has a skip-link destination. Catalogue result count uses role=status.
- i18n code updates html lang on locale selection and initialization. No missing document-language bug found. Did not change locale because shared local storage could affect the authentication reviewer.
- Tablet category page measured without horizontal overflow.

## Limits

No 200% browser zoom/text-only resizing, physical touchscreen, screen-reader speech output, reduced-motion visual pass, or account routes tested in this subtask. Screenshots were inspected through browser tool output; no standalone screenshots saved. No code changed.
