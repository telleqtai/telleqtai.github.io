# Hero Visual and Motion

## Scope

Hand-edited root HTML is the source of truth. Do not run the old site generator
or overwrite pages from Stitch. This update preserves the approved copy,
navigation, customer logos, product diagrams, contact details, and static hosting.

## Visual

The user-approved keyframe depicts a human hand adding a glass AI module above
five established business systems: SAP, Production, Warehouse, Finance and CRM.
The systems and their original connections remain intact. The new AI activates
alongside them. This is conceptual brand imagery, not a real product screenshot
or evidence of customer results; the miniature table/chart data is illustrative.

Local assets, generated/edited with built-in ImageGen and compressed with Sharp:

| Asset | Full WebP | Small WebP |
| --- | ---: | ---: |
| `img/hero-ai-installation.webp` (approved static poster) | 85,892 B | 30,478 B |
| `img/hero-legacy-base.webp` | 68,932 B | 23,894 B |
| `img/hero-ai-module.webp` | 12,024 B | 4,628 B |
| `img/hero-install-hand.webp` | 19,882 B | 6,726 B |

Small variants use the `-small.webp` suffix and a 960px width. Full sources are
1672 x 941 except the module extraction (1671 x 941). The module and hand were
extracted onto black and use screen blending as DOM layers. Responsive layer
transforms align them to the approved composition. No per-frame bitmap processing,
external hero requests, video decoding, or WebGL is required.

Desktop places the image behind the hero with a left-side readability scrim.
Mobile presents the complete composition in an unframed band below the copy and
CTA, so image details cannot collide with the headline. On short phones the band
continues below the first viewport; the CTA and beginning of the visual remain visible.

The earlier hardware and abstract-flow concepts are retained for comparison but
are not referenced by the site. Exact prompts:
[hero-installation-prompts.txt](hero-installation-prompts.txt).

Generated source filenames (in the task's generated_images directory):
- Poster: `exec-b1dcebef-7873-4182-944c-5af20f96598e.png`
- Legacy: `exec-d5210edd-072d-48f0-b669-f226a08b955c.png`
- Module: `exec-d97591ab-cfb0-4563-9730-bdb06dcd2153.png`
- Hand: `exec-370cee78-40c8-4e9f-9dcf-67a72cbe9c5e.png`

## Motion

- GSAP is pinned and served locally from `vendor/gsap/`.
- Native IntersectionObserver triggers reveals without modifying scroll position.
- Copy settles over 850 ms, with a 75 ms stagger. It is never hidden in CSS.
- The hand and AI module lower together over 2.2 seconds, connections energize
  over 1.8 seconds, then the hand retracts. The installation ends after 5.2 seconds
  and does not replay on resizing or motion-preference changes.
- A separate 7.6-second loop sends soft light segments down five new connections.
  The module's light varies gently; no flashing, random particles or moving stripes.
- All layers must decode before the complete poster is hidden. A failed layer
  leaves the static poster visible and the animation control hidden.
- Canvas drawing is capped at 30 fps desktop / 24 fps mobile, with pixel ratios
  capped at 1.5 / 1 respectively. No image processing occurs per frame.
- Installation and flow pause while the artwork is offscreen or the document is
  hidden. Watching the artwork (not the taller mobile hero) prevents the hand
  sequence from finishing before a visitor scrolls to it on a short screen.
- A labelled, keyboard-accessible pause/resume button preserves user intent
  through visibility changes and reduced-motion toggling.
- Desktop scene has a single 1.5-second camera settle.
- Fine-pointer depth is limited to +/-8 px horizontally and +/-5 px vertically.
- Desktop scroll depth is limited to 24 px; normal browser scrolling is retained.
- Content groups reveal once with a short stagger and a restrained rule draw.
- Hover effects move existing arrow icons by only 2-3 px.
- Touch layouts have no pointer or scroll depth; installation and flow still move.
- Desktop depth has an independent lifecycle; resizing never restarts page reveals.
- Changing `prefers-reduced-motion` tears down tweens, listeners and observers,
  hides the canvas and control, and leaves the static image in place.
- Missing GSAP leaves content, links, mobile navigation and email copying usable.

## Verification

The tests use Playwright. With Playwright installed, run:

```sh
node tests/motion.cjs
node tests/installation.cjs
node tests/layout.cjs
```

Optional environment variables: `PLAYWRIGHT_MODULE` for a shared Playwright
installation and `CHROME_PATH` for an existing Chrome executable.

The motion test checks actual canvas pixels changing without user input on desktop
and mobile, manual pause, offscreen pause, pointer depth, readability after reveals,
reduced-motion cleanup and re-enabling, failed runtime loading, breakpoint changes
without scroll jumps or repeated reveals, and no-JavaScript content availability.

The installation test checks the independent movement of hand and AI, unchanged
legacy transforms, mid-install pause, hand departure, no replay after resizing or
preference changes, failed-layer fallback, screenshot-verified pause-control
stacking, and delayed playback when artwork is below a landscape-phone viewport.

The layout test checks all seven pages, ten viewport sizes, first-screen hierarchy,
text overflow, local links/assets, and the mobile menu. Set `SCREENSHOT_DIR` to
an output directory to capture desktop and mobile screenshots.
