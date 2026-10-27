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

export const TOOLS = {
  craft: [
    { n: 'Premiere Pro', m: 'Pr', c: '#9999ff', d: 'Edit · 8 yrs' },
    { n: 'After Effects', m: 'Ae', c: '#9999ff', d: 'Motion · VFX' },
    { n: 'Photoshop', m: 'Ps', c: '#31a8ff', d: 'Thumbnails · Comp' },
    { n: 'Illustrator', m: 'Ai', c: '#ff9a00', d: 'Vector · Brand' },
    { n: 'Audition', m: 'Au', c: '#00e4bb', d: 'Sound design' },
    { n: 'Figma', icon: 'assets/icons/figma.svg', c: '#a259ff', d: 'Storyboards' },
    { n: 'Blender', icon: 'assets/icons/blender.svg', c: '#f5792a', d: '3D · Scenes' },
    { n: 'Element 3D', m: 'E3D', c: '#7cf2c4', d: '3D in AE' },
  ],
  ai: [
    { n: 'Claude Code', icon: 'assets/icons/claude.svg', c: '#d97757', d: 'Build · Automate' },
    { n: 'Google Antigravity', m: 'AG', c: '#7aa2ff', d: 'Agentic dev' },
    { n: 'Gemini · Nano Banana', icon: 'assets/icons/googlegemini.svg', c: '#8ab4ff', d: 'Image gen' },
    { n: 'Veo', m: 'Veo', c: '#6be4ff', d: 'Video gen' },
    { n: 'Higgsfield', m: 'Hf', c: '#c6ff5a', d: 'Cinematic AI' },
    { n: 'Magnific AI', m: 'Mg', c: '#ff6ad5', d: 'Upscale' },
    { n: 'ElevenLabs', icon: 'assets/icons/elevenlabs.svg', c: '#ffffff', d: 'Voice' },
  ],
};

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
