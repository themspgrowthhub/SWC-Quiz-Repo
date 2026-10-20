# MSP Confidence Score

Production site for **quiz.mspgrowthhub.com**: a static HTML/CSS/vanilla JS quiz deployed on Cloudflare Pages, with one Pages Function that sends leads to Ontraport.

```
public/              static site (Pages build output)
  index.html         all five screens: landing, quiz, final step, results, report
  css/styles.css     design tokens + styles (self-hosted Lufga / Neuzeit Grotesk)
  js/app.js          questions, scoring, tracking, lead POST
  assets/img/        WebP images
  assets/fonts/      brand fonts (.otf)
  _headers           cache + security headers
functions/api/lead.js  POST /api/lead → Ontraport
wrangler.toml
```

No build step. Edit the files and push.

## Deploying (push to `main` deploys)

One-off setup in Cloudflare:

1. **Workers & Pages → Create → Pages → Connect to Git**, pick `themspgrowthhub/SWC-Quiz-Repo`.
2. Production branch: `main`. Framework preset: **None**. Build command: *(leave empty)*. Build output directory: `public`.
3. **Settings → Variables and Secrets**: add `ONTRAPORT_APP_ID` and `ONTRAPORT_API_KEY` as **secrets** (Production, and Preview if wanted).
4. **Custom domains**: add `quiz.mspgrowthhub.com`.
5. **Zaraz** (on the zone): enable it, then map the events below to your tools (e.g. Meta Pixel `lead_submitted` → Lead, `booking_click` → Schedule).

After that, every push to `main` deploys to production and other branches get preview URLs.

## Settings in `js/app.js`

`CONFIG` at the top of the file:

| Key | Default | Notes |
|---|---|---|
| `showEmoji` | `true` | The brand guide says no emoji; set `false` to hide answer emoji |
| `autoAdvance` | `true` | Go to the next question 260ms after an answer |
| `leadEndpoint` | `/api/lead` | |
| `booking` | go.themspgrowthhub.com/are-we-the-right-fit/ | Gets `?name=&email=&phone=` |
| `videoEmbedUrl` | `''` | Set to Stuart's video embed URL to replace the placeholder |

Testimonial headshots: add WebP files to `public/assets/img/` and set `photo` on each entry in `TESTIMONIALS` / `QUIZ_PROOF`. Until then initials are shown.

## Scoring

- Questions 1 (MSP owner?), 11 (team size) and 12 (turnover) are not scored.
- Pillar % = chosen points ÷ maximum possible for that pillar. Overall % = sum across pillars ÷ combined maximum.
- Stage: 0–33 Survive · 34–66 Drive · 67–89 Thrive · 90–100 Arrive.
- Advice band per pillar: <40 low · 40–69 mid · 70+ high. Biggest constraint = lowest pillar (first one on a tie).

## Tracking (`zaraz.track`)

| Event | When | Properties |
|---|---|---|
| quiz_started | Start button | — |
| question_answered | Each answer | question, pillar, answer |
| quiz_completed | Reaches final step | — |
| lead_submitted | Form submitted | stage, overall_score |
| results_viewed | Results shown | — |
| video_play | Video clicked | stage |
| booking_click | Book button | location (results/report) |
| report_viewed / report_downloaded | Report | — |

If Zaraz isn't loaded (e.g. local preview), events are queued on `window.__quizEvents` instead.

## Lead payload (POST /api/lead)

`firstName, lastName, email, phone, overallScore, stage, ambitionScore, capacityScore, opportunitiesScore, biggestConstraint, teamSize, turnover, answers[], source, submittedAt, pageUrl, referrer`

`functions/api/lead.js` maps these to Ontraport custom fields f2375–f2383 and applies the tag `Quiz Taken - Stage: {Survive|Drive|Thrive|Arrive}`.

## Local preview

```bash
npx wrangler pages dev
```

Put local secrets in `.dev.vars` (git-ignored) if you want the function to reach Ontraport.

## Open items

- Stuart's video (placeholder)
- Quotes about the quiz and testimonial headshots (placeholders)
- Emoji vs brand guide (`showEmoji`)
- Fonts are served as .otf; converting to .woff2 would cut font weight roughly in half
