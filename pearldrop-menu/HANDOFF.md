# Pearldrop v3 menu redesign — handoff

Summary of the "Pearldrop v3 menu system redesign" chat, for picking the work up in another session.

## Where everything is

- Repo `pearldrop-lab/gpu`, branch `claude/beautiful-babbage-6d65wr`, folder `pearldrop-menu/`
- `MenuConcepts.java` draws every mockup with plain Java2D (no image tools). Regenerate all images with
  `java MenuConcepts.java out` inside `pearldrop-menu/` (needs the Inter fonts in `/usr/share/fonts/opentype/inter/`).
- `out/` holds the rendered PNGs. Start with the overview sheets: `00-about-cards-overview.png`,
  `00-services-overview.png`, `00-portfolio-overview.png`.

## What the client chose

Simon picked two styles for every dropdown, in this order of preference:

1. **Expanding frames** (favourite): full-width panel of tall full-bleed cards with drawn artwork. Hovering one
   widens it into a "viewfinder" (REC dot + timecode, corner brackets) showing its links; the others shrink to icon,
   name and tagline. Long lists show as rounded chips in labelled groups; short lists show as big rows with dividers.
   A white pill button bottom-right links to the group's main page.
2. **Cards with artwork on top** (second): equal cards, artwork header (~140–190px), title, italic tagline, link list,
   and a "more" link at the bottom. Hovered card gets a cyan border.

Earlier explorations (compact dropdown, mega panel, icon tiles, editorial, mobile drill-in) are in `out/` as
`A-`…`E-` and `S1-`…`S4-` but were not chosen.

## Menu content as agreed

**About us** (4 cards; legal moves to a small footer row, Terms of Service · Privacy Policy)
- The company — "Since 2003. Still can't sit still." — Meet Pearldrop, Our values, Behind the scenes, Memberships & accreditations
- Our work — "The proof is in the playback." *(placeholder)* — Our showreels, Our clients, Testimonials
- Working with us — "The whys, the hows, the FAQs." — How we work, Why Pearldrop?, Why video?, Sustainability, FAQ
- Careers — "Come make things with us." — Recruitment, Work experience

**Services** (4 cards). Live-action's 15 items regrouped:
- Live-action video — "Real people, real places, real good."
  - Formats: Company profiles, Promotional, Product, Training, Internal communications, Landing pages, Case studies, Vodcasts
  - Events: Activations & launches, Conferences & ceremonies, Live events, Live-streaming
  - Specialist: Aerial / drone, Automotive, Charity
- Animation — "For when reality needs a rewrite." — Explainer, Character
- Photography — "Stills that stop the scroll." — Architectural, Automotive, Headshots, Lifestyle, Live-event
- Post-production — "Where it all comes together." — Editing, VFX, Subtitling & transcription, British Sign Language (BSL), AI video production

**Portfolio** (3 cards — only three real groups)
- Live-action — "The good stuff, moving." — Browse live-action work, Live-action services, Case studies; "Play the reel"
- 2D animation — "The good stuff, drawn." *(placeholder)* — Browse 2D animation, Animation services; "Play the reel"
- Photography — "The good stuff, holding still." — six photo tiles: Architectural, Automotive, Conferences & ceremonies,
  Headshots, Lifestyle, Live events; "All photography"

**Sectors** — not done yet; next to do in the same two styles.

## Artwork per card (all drawn in code; real site should use real thumbnails / video loops)

Live-action: sequin dot texture · Animation: dashed motion path with onion-skin circles and keyframe diamonds ·
Photography: aperture blades in viewfinder brackets · Post-production: editing timeline with playhead and waveform ·
The company: logo orb with ripple rings and faint "2003" · Our work: slanted film strip of tinted frames ·
Working with us: numbered steps 1→3 ending in a tick, with a "?" speech bubble · Careers: clapperboard "SCENE: YOU / TAKE 01".

## Visual tokens

- Background/ink `#050D1C`, panels deep navy (~`rgb(6,16,36)` at 90–95% over a blurred hero), hairlines white 9%
- Accent cyan `#2FD8FF`, muted label cyan `#7FCFEA`; secondary accents violet `#8A7BFF`, teal `#28BEAA`
- Font: Inter (UI) and Inter Display (headings). Group labels: 11px semibold, uppercase, letter-spacing ~0.14em
- Hover: cyan text + small arrow, or white 6–7% row highlight; active nav item gets a 2.5px cyan underline

## Open items

- Copy placeholders to confirm: "The proof is in the playback.", "The good stuff, drawn.", "Join the team",
  "Play the reel", and the "Our work" group name itself.
- Sectors menu.
- Possible next step: build the expanding-frames menu as working HTML/CSS (animated widening, real thumbnails).
- Simon also asked about a WordPress cookie-consent plugin (banner with Accept all / Reject all / Manage; Necessary,
  Analytics, Marketing, Functional categories; script blocking until consent; Google Consent Mode v2; YouTube/Vimeo
  placeholders; settings link + `[cookie_settings]` shortcode). Not built yet — waiting on which tracking tools the
  site uses.
