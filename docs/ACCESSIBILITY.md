# Accessibility

We aim for WCAG 2.2 AAA where it is practical. This is a self-assessment, not a certification.

## Built in

- **Contrast:** text pairs reach 7:1 in light and dark themes.
- **Touch:** controls are at least 44px on touch screens. Links inside a sentence are exempt.
- **Keyboard:** skip link, visible focus ring, and dialogs that keep focus inside, close on Escape and return focus. Patient search works with arrow keys and Enter.
- **Screen readers:** one h1 per screen, which also names the browser tab. Focus moves to the new screen on navigation. Toast messages are announced. Icons are hidden from screen readers.
- **Forms:** every control has a label, radios are native inputs, and a failed submit moves focus to the first empty required field.
- **Motion and reflow:** reduced-motion is respected, and screens do not scroll sideways at 320px.

## Exception: medical terms

Screens for clinical staff (coordinator, hospital, referral chart) keep standard medical terms and abbreviations, such as "Hyperbilirubinemia", "PPROM" and "TSB". Clinicians need the exact term, and a simpler word could change the meaning.

So these screens do not aim to meet:

- WCAG 3.1.3 Unusual Words
- WCAG 3.1.4 Abbreviations
- WCAG 3.1.5 Reading Level

Patient and family screens use plain words. This exception does not cover them, or the interface labels on any screen.

## How to check

Run these on all screens, in both themes, at 320px, 390px, 768px and 1280px:

- Lighthouse accessibility audit
- axe, if your setup allows it
- A real screen reader pass (VoiceOver on iOS and TalkBack on Android), which automated tools can't replace
