

## Generate Custom Favicon for Home Care Headquarters

### What will happen

1. **Generate a favicon** using AI image generation — a simple, professional icon with "HCH" initials using the brand's blue color scheme
2. **Save it** to `public/favicon.png`
3. **Update `index.html`** to reference the new favicon and remove any default Lovable icon
4. **Add Apple touch icon** reference for mobile bookmarks

### Technical details

| File | Change |
|------|--------|
| `public/favicon.png` | New: AI-generated icon (blue/teal "HCH" initials on a clean background) |
| `index.html` | Add `<link rel="icon" href="/favicon.png" type="image/png">` and `<link rel="apple-touch-icon" href="/favicon.png">` |

