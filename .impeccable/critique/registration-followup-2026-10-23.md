# Registration and expanded UX review

Reviewed 23 October 2026, Asia/Bangkok. Three delegated reviewers covered public shopping, responsive accessibility, and account/checkout source. No application source was changed.

## Registration evidence

Local frontend http://localhost:5173 uses https://demo.chhin.tech as its configured API. Test registration therefore reaches that remote demo service.

- Used a generated disposable email xiniv70452@playfine.com via Temp Mail. Submitted registration through the actual UI, reached six-digit OTP screen, and exercised Resend OTP once. UI reported a new code sent; inbox remained empty during observation.
- Tried independent provider Guerrilla Mail with aeuzkwqo@sharklasers.com. Registration again reached OTP screen. Resend also reported success. Final full inbox checks showed the first inbox empty and the second containing only its provider welcome email; no verification code arrived.
- No verification bypass, fabricated session, order submission, payment, password reset/change, or database edits.
- These submissions may leave two unverified test-account records; backend persistence was not independently inspected. Password is intentionally excluded from this report.
- Screenshot registration-otp.png records the OTP screen. Successful OTP verification and signed-in screens remain blocked by missing email delivery. This observation does not establish whether the sender, queue, recipient provider, delay, or filtering caused non-delivery.

## New findings

Browser-confirmed:

1. Local catalogue search Premium resets after opening a product and going Back.
2. Premium Set card shows flat $30 although detail says From $30 and option 6 costs $55. Use a starting-price label or range.
3. Route changes retain generic MongKol title and focus on the header navigation link. Provide destination titles and focus/announcement behavior.

Source-confirmed, needing signed-in runtime verification:

4. Required province selection omits Prey Veng.
5. New-address validation rejects +855 phone prefixes and outer spaces.
6. Pending QR dialog lacks the focus management used by existing shared dialogs.
7. Closing payment and submitting again sends order creation again; backend deduplication and resulting database effects are unknown.
8. Order history renders shipping status without payment status or payment-resume action.
9. OTP resend countdown sits in an aria-live region and may cause repeated announcements; actual speech output not measured.

## Passing checks and limits

Cart variant pricing, quantity totals, merging equal variants, missing-option validation/focus, no-results recovery, and gallery Escape/focus return passed. Original Brave bag restored. Product layouts had no horizontal overflow at 390/768/1440 CSS pixels. Nominal 320px scrollbar observation is an emulation caveat, not a proven handset failure.

See shopping-followup-2026-10-22.md, responsive-followup-2026-10-22.md, and account-source-followup-2026-10-22.md for reproduction and source references. No physical-phone, screen-reader speech, successful OTP, live signed-in checkout or payment validation claimed.
