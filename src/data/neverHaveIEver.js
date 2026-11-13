// Never Have I Ever prompt bank for Far & Near.

export const NHIE_CATEGORIES = [
  { id: "funny", label: "Funny" },
  { id: "cute", label: "Cute" },
  { id: "romantic", label: "Romantic" },
  { id: "deep", label: "Deep" },
  { id: "spicy", label: "Spicy" },
];

export const NEVER_HAVE_I_EVER = {
  funny: [
    "Never have I ever practiced a conversation with you before calling.",
    "Never have I ever stalked your old social media posts.",
    "Never have I ever pretended my internet died to end an argument.",
    "Never have I ever sent a text and immediately regretted it.",
    "Never have I ever talked to you while brushing my teeth.",
    "Never have I ever fallen asleep mid-sentence on a call with you.",
    "Never have I ever lied about what I was wearing on a call.",
    "Never have I ever rehearsed how I'd say 'I love you' first.",
    "Never have I ever screenshotted our chat to laugh at it later.",
    "Never have I ever pretended to be busy so you'd miss me more.",
  ],
  cute: [
    "Never have I ever smiled at my phone because of you.",
    "Never have I ever saved every single photo you've sent me.",
    "Never have I ever talked to you until the sun came up.",
    "Never have I ever kept a voice note of yours just to replay it.",
    "Never have I ever planned a surprise for you in secret.",
    "Never have I ever set a countdown for when we'd next meet.",
    "Never have I ever written your name somewhere just because.",
    "Never have I ever gotten butterflies from a simple 'good morning'.",
    "Never have I ever hugged a pillow and pretended it was you.",
    "Never have I ever kept a gift from you somewhere I see it daily.",
  ],
  romantic: [
    "Never have I ever cried happy tears because of something you said.",
    "Never have I ever reread our old chats just to feel close to you.",
    "Never have I ever stayed awake just to talk to you.",
    "Never have I ever imagined our wedding day.",
    "Never have I ever written you a letter I never sent.",
    "Never have I ever counted down the days until we meet again.",
    "Never have I ever practiced what I'd say when I finally saw you.",
    "Never have I ever felt braver because of your love.",
    "Never have I ever thought you were 'the one' early on.",
    "Never have I ever planned our future out loud, just to hear it.",
  ],
  deep: [
    "Never have I ever doubted whether this distance was worth it.",
    "Never have I ever hidden how much I was struggling from you.",
    "Never have I ever compared our relationship to someone else's.",
    "Never have I ever felt lonely even while talking to you.",
    "Never have I ever been scared to fully open up to you.",
    "Never have I ever needed reassurance you didn't know I needed.",
    "Never have I ever thought about what would happen if this ended.",
    "Never have I ever changed something about myself for you.",
    "Never have I ever held back something I was truly feeling.",
    "Never have I ever questioned if I was giving enough to this.",
  ],
  spicy: [
    "Never have I ever thought about what it'd feel like to hold you right now.",
    "Never have I ever gotten distracted imagining our reunion.",
    "Never have I ever picked an outfit hoping you'd like it on a call.",
    "Never have I ever left a voice note that was a little flirtier than planned.",
    "Never have I ever daydreamed about a slow dance with you.",
    "Never have I ever thought about what I'd whisper to you first.",
    "Never have I ever blushed reading one of your messages twice.",
    "Never have I ever imagined our first night back together in detail.",
    "Never have I ever sent a photo hoping for a specific reaction.",
    "Never have I ever thought a video call went by way too fast.",
  ],
};

export function getRandomNHIE(categoryId, excludeText) {
  const pool = (NEVER_HAVE_I_EVER[categoryId] ?? []).filter((p) => typeof p === "string" && p.trim());
  const options = pool.filter((p) => p !== excludeText);
  const source = options.length ? options : pool;
  if (!source.length) return null;
  return source[Math.floor(Math.random() * source.length)];
}
