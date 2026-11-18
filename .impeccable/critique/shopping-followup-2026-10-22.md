# Public shopping follow-up

Observed live on local http://localhost:5173 in a fresh Brave tab, 2026-10-23 Asia/Bangkok. No source application changes. No account, order or payment submission.

## New reproducible findings

### P2: Catalog search disappears when returning from a product

1. Open /products and enter Premium into the catalog search.
2. Observe one result; URL remains /products.
3. Open the Premium Set product, then use browser Back.

Expected: the search and its one-result context remain available when returning.
Actual: search is blank, Best Seller sort/default filters return, and all three products are shown. This creates repeated work during comparison shopping. Tested browser Back, not a hypothetical refresh case.

### P2: Variable product card presents a flat price

1. Open /products: Premium Set card displays $30.00 without From or a range.
2. Open /products/premium-set-7143179: initial detail price correctly says From $30.00.
3. Select option 6: price becomes $55.00; adding one to bag produces a $55.00 line.

Expected: variable product card communicates a starting price or range, matching detail wording.
Actual: card looks like a fixed $30.00 price, so a shopper seeking option 6 discovers a materially higher price only after opening and selecting it. Numeric option labels remain the previously reported content issue.

## Passing interactions

- Add to cart without selection shows Select your options before continuing and focuses the first option.
- Selecting option 6 updates the detail price to $55.00 and stock label to In stock.
- Original bag contained Premium Set option 4 x1 ($30.00). Added option 6 x1: subtotal $85.00. Incremented option 6 to x2: line $110.00 and subtotal $140.00.
- Changing option 6 x2 to existing option 4 merges into one option 4 x3 line at $90.00. Decrementing twice restores original option 4 x1, subtotal $30.00.
- Search for zzzauditnone shows a clear no-results state. Clear filters restores all three products and clears the search.
- Product gallery opens a larger-image dialog; Escape closes it and returns focus to the opening image button.

## Limits and cleanup

Existing user bag was preserved and restored to Premium Set option 4 x1, subtotal $30.00. Bag left closed. No account or authentication state altered. Individual removal, stock exhaustion, backend failure, real device behavior, and full filter/sort permutations were not tested. Original IAB unavailable and Playwright profile busy; recovered through available Brave browser. No screenshot artifact saved.
