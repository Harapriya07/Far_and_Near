// Would You Rather prompt bank for Far & Near.
// Each prompt has two options (a/b) and belongs to one category.

export const WYR_CATEGORIES = [
  { id: "cute", label: "Cute" },
  { id: "romantic", label: "Romantic" },
  { id: "funny", label: "Funny" },
  { id: "deep", label: "Deep" },
  { id: "spicy", label: "Spicy" },
];

export const WOULD_YOU_RATHER = {
  cute: [
    { a: "Spend a rainy day together", b: "Watch the sunrise together" },
    { a: "Get a surprise letter from me", b: "Get a surprise call from me" },
    { a: "Cuddle up and watch cartoons", b: "Bake something sweet together" },
    { a: "Share one pair of headphones", b: "Share one blanket" },
    { a: "Have a picnic in the park", b: "Have a movie night at home" },
    { a: "Get matching bracelets", b: "Get a couple photo printed and framed" },
    { a: "Wake up to my voice note", b: "Wake up to my good morning text" },
    { a: "Slow dance in the kitchen", b: "Stargaze on a rooftop" },
    { a: "Get a puppy together someday", b: "Get a garden together someday" },
    { a: "Have a lazy Sunday together", b: "Have an adventurous day trip" },
  ],
  romantic: [
    { a: "A candlelit dinner at home", b: "A dinner under the stars outside" },
    { a: "A slow dance with no music", b: "A slow dance to our song" },
    { a: "Write each other love letters", b: "Record voice messages instead" },
    { a: "A surprise weekend trip", b: "A surprise home-cooked dinner" },
    { a: "Hold hands on a long walk", b: "Cuddle through an entire movie" },
    { a: "Watch the sunset together", b: "Watch the sunrise together" },
    { a: "A slow morning in bed", b: "A late night talk under blankets" },
    { a: "Get renewed vows someday", b: "Get a tattoo that matches" },
    { a: "Read a book aloud to each other", b: "Cook a recipe together" },
    { a: "A quiet night at home", b: "A dressed-up night out" },
  ],
  funny: [
    { a: "I sing off-key in public", b: "I dance badly in public" },
    { a: "We get matching goofy pajamas", b: "We get matching goofy socks" },
    { a: "I prank you once a week", b: "You prank me once a week" },
    { a: "We do a silly TikTok trend together", b: "We do a silly karaoke duet" },
    { a: "I talk in an accent for a day", b: "You talk in an accent for a day" },
    { a: "We argue about pineapple on pizza", b: "We argue about the toilet seat" },
    { a: "I text you only in memes for a day", b: "I text you only in emojis for a day" },
    { a: "We get a couple's caricature drawn", b: "We get a couple's silly filter photo" },
    { a: "I fall asleep mid-call, snoring", b: "You fall asleep mid-call, snoring" },
    { a: "We binge a terrible reality show", b: "We binge a terrible rom-com" },
  ],
  deep: [
    { a: "Talk about our biggest fears", b: "Talk about our biggest dreams" },
    { a: "Know exactly when we'll close the distance", b: "Know exactly where we'll live someday" },
    { a: "Fix one thing about how we argue", b: "Fix one thing about how we communicate" },
    { a: "Understand each other perfectly, always", b: "Surprise each other, always" },
    { a: "Talk through a hard memory together", b: "Talk through a hard fear together" },
    { a: "Never doubt where this is going", b: "Never doubt how much I care" },
    { a: "Have unlimited time together, no phones", b: "Have unlimited honesty, no filters" },
    { a: "Know my love language", b: "Know my biggest insecurity" },
    { a: "Talk about what forever means to us", b: "Talk about what trust means to us" },
    { a: "Grow at the same pace", b: "Grow in different ways but stay close" },
  ],
  spicy: [
    { a: "A slow dance that turns into more", b: "A candlelit bath together" },
    { a: "Wake up wrapped in each other", b: "Fall asleep wrapped in each other" },
    { a: "A whispered compliment in your ear", b: "A lingering hug that doesn't end" },
    { a: "Get a massage from me", b: "Give me a massage" },
    { a: "A slow good morning kiss", b: "A slow goodnight kiss" },
    { a: "Dress up for a night in", b: "Dress up for a night out" },
    { a: "A playlist of songs that remind me of you", b: "A voice note of me telling you why I want you" },
    { a: "A weekend with no plans, just us", b: "A weekend away, just us" },
    { a: "I plan a surprise for you", b: "You plan a surprise for me" },
    { a: "A long, slow hug hello", b: "A long, slow hug goodbye" },
  ],
};

export function getRandomWYR(categoryId, excludeItem) {
  const pool = (WOULD_YOU_RATHER[categoryId] ?? []).filter((item) =>
    item && typeof item.a === "string" && item.a.trim() &&
    typeof item.b === "string" && item.b.trim() && item.a.trim() !== item.b.trim()
  );
  const options = pool.filter((p) => p !== excludeItem);
  const source = options.length ? options : pool;
  if (!source.length) return null;
  return source[Math.floor(Math.random() * source.length)];
}
