// =====================================================================
//  SITE CONTENT — edit this file to change text, links and videos.
//  After editing, run `npm run build` (or ask Claude) to rebuild js/app.js.
// =====================================================================

export const SITE = {
  name: 'Kaju Soni',
  role: 'Video Editor · Motion Designer · AI Filmmaker',
  email: 'kajusoni008@gmail.com',
  phone: '+91 96200 63901',
  linkedin: 'https://www.linkedin.com/in/kaju-soni-76522a16b',
  resume: 'assets/Kaju_Soni_Resume.pdf',
  // Google Apps Script web-app URL that stores contact messages in the Google Sheet.
  formEndpoint: 'https://script.google.com/macros/s/AKfycbxfFjErXd-URcazSslxg3s1Vcy8P_EztcNLfq2LKPe7okYPWg0NlBFP4PdntHtRWu3z/exec',
};

// Hero renders. Leave null to use the built-in 3D figure.
// Each is a transparent PNG/WebP render in assets/hero/ (generated with ChatGPT from Kaju's character sheet).
// head = where the face sits in the image (x, y from top-left, 0–1) — used for the camera close-up.
export const HERO = {
  throne: { src: 'assets/hero/throne.webp', srcSm: 'assets/hero/throne-sm.webp', aspect: 1024 / 1536, height: 4.0, head: [0.475, 0.215] },
  back: { src: 'assets/hero/back.webp', srcSm: 'assets/hero/back-sm.webp', aspect: 1024 / 1536, height: 3.1, head: [0.54, 0.06] },
  stand: { src: 'assets/hero/gate.webp', srcSm: 'assets/hero/gate-sm.webp', aspect: 1024 / 1536, height: 3.8, head: [0.52, 0.07] },
};

// Portfolio. p: 'ig' (Instagram reel) or 'yt' (YouTube). id = the code in the link.
export const WORKS = [
  { p: 'ig', id: 'DCEfvYUiYe9', t: "India's Oldest Mutual Funds", cat: 'Explainer' },
  { p: 'ig', id: 'DD9kqEUPKWM', t: 'Scam se Savdhaan · Fake Trading App', cat: 'Brand Series' },
  { p: 'ig', id: 'DC1lBhtsQk6', t: '₹12 Lakhs on a Wedding', cat: 'Explainer' },
  { p: 'yt', id: 'zwfJ59lWU-c', t: 'Should You Sell Parag Parikh Flexi Cap?', cat: 'YouTube' },
  { p: 'ig', id: 'DDMwNQxss8K', t: 'A Love Story — Gold', cat: 'Creative Edit' },
  { p: 'ig', id: 'DFcnD-Dzw03', t: 'Scam se Savdhaan · Digital Arrest', cat: 'Brand Series' },
  { p: 'ig', id: 'DHTO9BEog-S', t: 'Concert Economics', cat: 'Explainer' },
  { p: 'ig', id: 'DUC1HsjgFBH', t: 'Trading Insights on Angel One', cat: 'Product Video' },
  { p: 'ig', id: 'DV23JYXiKlx', t: 'Strait of Hormuz', cat: 'Explainer' },
  { p: 'yt', id: 'eCBXzG-Lm94', t: '2 Hidden Stocks After Q1', cat: 'YouTube' },
  { p: 'ig', id: 'DGf_FtkBQh_', t: 'Scam se Savdhaan · Fake Wedding Invite', cat: 'Brand Series' },
  { p: 'ig', id: 'DEXQ7CvNEFf', t: '1.5 Crore Shops Closed?', cat: 'Explainer' },
  { p: 'ig', id: 'Dcp0awSBlYS', t: 'On Taste', cat: 'Creative Edit' },
  { p: 'ig', id: 'DI_ZNHNImIM', t: 'Scam se Savdhaan · Fake QR Code', cat: 'Brand Series' },
  { p: 'ig', id: 'DFVOS6xvOoL', t: 'SWP, Simply Explained', cat: 'Explainer' },
  { p: 'yt', id: 'bDu0V3EN9NQ', t: 'YouTube Short', cat: 'Short' },
  { p: 'ig', id: 'DH8Ve8lyTbJ', t: 'Scam se Savdhaan · SEO Poisoning', cat: 'Brand Series' },
  { p: 'ig', id: 'Db24hswSfbG', t: 'Brand Film', cat: 'Brand Video' },
  { p: 'ig', id: 'DLFTWlNqHia', t: 'Scam se Savdhaan · Online Shopping', cat: 'Brand Series' },
];

export const ABOUT = {
  // The About hero: three worlds, one for each side of the work. Click a side planet to switch.
  // planet: texture in assets/space · tint: CSS filter for the planet · img: a transparent cut-out of me
  // head: where my face sits in the image (x, y as 0–1) · size: image height in screen heights
  // video: optional full-bleed clip (assets/about/*.mp4) that replaces the planet + cut-out when set
  worlds: [
    { key: 'editor', name: 'Editor', planet: 'assets/space/jupiter.webp', tint: 'saturate(.9) brightness(1.05)', glow: '#f1c27a',
      img: 'assets/img/me-think.webp', head: [0.56, 0.26], size: 0.78, video: null,
      lede: 'Eight years of bending timelines for newsrooms, edtech, healthcare and fintech. I find the story in the footage and cut it so people keep watching.' },
    { key: 'motion', name: 'Motion', planet: 'assets/space/neptune.webp', tint: 'saturate(1.25) brightness(1.1)', glow: '#6fc8ff',
      img: 'assets/hero/gate.webp', head: [0.52, 0.07], size: 1.18, video: null,
      lede: 'Type that moves, graphics that explain, worlds built in After Effects and Blender. Motion is how I make ideas land in seconds.' },
    { key: 'filmmaker', name: 'Filmmaker', planet: 'assets/space/neptune.webp', tint: 'hue-rotate(58deg) saturate(1.3) brightness(1.05)', glow: '#b49bff',
      img: 'assets/hero/throne.webp', head: [0.475, 0.215], size: 1.12, video: null,
      lede: 'Story, character sheets, shot-by-shot generation, voice, then the final cut in Premiere. AI is now part of how I make films.' },
  ],
  kicker: 'The Timekeeper',
  title: 'About Me',
  body: [
    "I'm Kaju — a video editor and motion designer from Bengaluru with 8+ years of bending timelines for news rooms, edtech, healthcare and fintech.",
    'At Angel One I led a small video team shipping 35–40 pieces a month across two YouTube channels — Shorts went from 3.6 to 8.3 a week and retention rose from 40.9% to 50.8%.',
    'Today AI is part of my kit: story, character sheets, shot-by-shot generation, voice — then the final cut in Premiere.',
  ],
  stats: [
    ['8+', 'Years editing'],
    ['35–40', 'Pieces a month'],
    ['1M+', 'Subscriber channel'],
    ['50.8%', 'Avg. retention'],
  ],
};

// The training hall (About page). Each tool is a token you slice.
// m: the two-letter mark (or icon: an SVG in assets/icons) · bg/fg: token colours · lv: mastery 1–5
// say: one line on how I use it · use: what it's for
export const TOOLS = {
  craft: [
    { n: 'Premiere Pro', m: 'Pr', bg: '#2a0634', fg: '#ea77ff', lv: 5, say: 'Where every story gets its rhythm — the first tool I open and the last I close.', use: ['Long-form', 'Shorts & Reels', 'Ads'] },
    { n: 'After Effects', m: 'Ae', bg: '#1d0b3d', fg: '#c79bff', lv: 5, say: 'Motion graphics, kinetic type, compositing and the occasional impossible shot.', use: ['Motion design', 'VFX', 'Explainers'] },
    { n: 'Photoshop', m: 'Ps', bg: '#001e36', fg: '#31a8ff', lv: 4, say: 'Thumbnails that earn the click, composites and key art.', use: ['Thumbnails', 'Compositing', 'Key art'] },
    { n: 'Illustrator', m: 'Ai', bg: '#2e0f00', fg: '#ff9a00', lv: 4, say: 'Vectors, icons and brand systems ready to animate.', use: ['Icons', 'Brand assets', 'Infographics'] },
    { n: 'Audition', m: 'Au', bg: '#00302a', fg: '#00e4bb', lv: 4, say: 'Clean dialogue, sound design and the mix that makes it feel finished.', use: ['Dialogue', 'Sound design', 'Mixing'] },
    { n: 'Figma', icon: 'assets/icons/figma.svg', bg: '#151515', fg: '#a259ff', lv: 3, say: 'Storyboards, layouts and shot planning before a single frame is cut.', use: ['Storyboards', 'Layouts', 'Pitch decks'] },
    { n: 'Blender', icon: 'assets/icons/blender.svg', bg: '#13202e', fg: '#f5792a', lv: 3, say: '3D scenes and worlds — like the universe you just walked through.', use: ['3D scenes', 'Product shots', 'Worlds'] },
    { n: 'Element 3D', m: 'E3D', bg: '#082a22', fg: '#7cf2c4', lv: 4, say: 'Fast 3D right inside After Effects.', use: ['3D titles', 'Logo reveals'] },
  ],
  ai: [
    { n: 'Claude Code', icon: 'assets/icons/claude.svg', bg: '#2a160f', fg: '#e08a66', lv: 4, say: 'Building my own tools — like a thumbnail maker that took an hour down to minutes.', use: ['Automation', 'Tools', 'This website'] },
    { n: 'Google Antigravity', m: 'AG', bg: '#0b1736', fg: '#7aa2ff', lv: 4, say: 'Agentic development for pipelines and prototypes.', use: ['Prototypes', 'Pipelines'] },
    { n: 'Gemini · Nano Banana', icon: 'assets/icons/googlegemini.svg', bg: '#0c1a33', fg: '#8ab4ff', lv: 4, say: 'Image generation and edits for character sheets and key frames.', use: ['Character sheets', 'Key frames'] },
    { n: 'Veo', m: 'Veo', bg: '#06222b', fg: '#6be4ff', lv: 4, say: 'Shot-by-shot AI video, directed like a real shoot.', use: ['AI films', 'B-roll'] },
    { n: 'Higgsfield', m: 'Hf', bg: '#111a05', fg: '#c6ff5a', lv: 3, say: 'Cinematic camera motion for performance ads.', use: ['Performance ads', 'Motion'] },
    { n: 'Magnific AI', m: 'Mg', bg: '#2a0a24', fg: '#ff6ad5', lv: 3, say: 'Upscaling and detail for anything that has to look premium.', use: ['Upscale', 'Detail'] },
    { n: 'ElevenLabs', icon: 'assets/icons/elevenlabs.svg', bg: '#141414', fg: '#f2f2f2', lv: 4, say: 'Voices and narration for AI films and explainers.', use: ['Voice-over', 'Narration'] },
  ],
};
for (const t of [...TOOLS.craft, ...TOOLS.ai]) t.c = t.fg;   // older pages read .c

// The Reel page (reel.html): curved panels gliding over a live editing timeline.
// speed: how fast it rolls — 1 (slow) … 2.5 (brisk). ~14 s per video at 1, ~6 s at 2.5.
// bg: your animated background. Drop the files in assets/reel/ and fill in the names
//     (video: a muted seamless loop .mp4; poster: a still .webp shown while it loads).
export const REEL = {
  speed: 2,
  bg: { video: null, poster: null, mobileVideo: null },
  ring: true,          // the soft aura ring drawn behind the title (turn off if your video already has one)
  title: 'Every cut, in motion.',
  kicker: 'The Reel · always rolling',
  sub: 'A live timeline of my edits. Watch it roll — or click any frame to play it.',
};

// The journey game (About page). One stop per company, in order. Each stop is a ?-block: hit it from below,
// drink the filter coffee, level up. title/years/note show on the level-up card — edit them freely.
// theme: the art style the world turns into after that level-up (see src/pages/journey/world.js)
export const JOURNEY = {
  hello: ["Hi, I'm Kaju!", 'Press START to play through my journey.'],
  stops: [
    { company: 'VIP News Karnataka', short: 'VIP NEWS', years: 'Jul 2017 – Jan 2018', title: 'Video Editor', note: 'First newsroom. Cutting stories against the clock.', color: '#d7262e', theme: 'press' },
    { company: 'Indradhanush News', short: 'INDRADHANUSH', years: 'Jan – Jun 2018', title: 'Video Editor', note: 'Daily bulletins, faster cuts, more colour.', color: '#7b4dff', theme: 'rainbow' },
    { company: 'LearnCab', short: 'LEARNCAB', years: 'Oct 2018 – Jun 2020', title: 'Video Editor & Motion Designer', note: 'Edtech — explaining hard things simply.', color: '#1f7ae0', theme: 'notebook' },
    { company: 'Vedantu', short: 'VEDANTU', years: 'Jul 2020 – Dec 2022', title: 'Graphic & Motion Designer', note: 'A channel that crossed 1M+ subscribers.', color: '#f47c20', theme: 'sunset' },
    { company: 'Mojocare', short: 'MOJOCARE', years: 'Dec 2022 – Jun 2023', title: 'Video Editor · Motion', note: 'Healthcare stories with care and clarity.', color: '#12a58c', theme: 'clinic' },
    { company: 'Angel One', short: 'ANGEL ONE', years: 'Feb 2024 – Sep 2026', title: 'Manager – Video Editor', note: 'Led the video team: 35–40 pieces a month, retention up to 50.8%.', color: '#3b5bfd', theme: 'markets' },
  ],
  next: { title: 'For my next level — let’s build together.', sub: 'Whichever team you’re from, I’d love to hear what you’re making.' },
};
