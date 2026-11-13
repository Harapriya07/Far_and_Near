// Finish My Sentence prompt bank for Far & Near.
// No categories per the spec — just a flat, shuffled list of starters.

export const FINISH_MY_SENTENCE = [
  "The first thing I want to do when we finally meet is ______.",
  "My favorite thing about you is ______.",
  "If we could travel anywhere together, I'd choose ______.",
  "The moment I realized I liked you was ______.",
  "The thing I miss most about you today is ______.",
  "If I could give you one thing right now, it would be ______.",
  "You make me feel ______ in a way no one else does.",
  "Our song should be ______ because ______.",
  "The best way to describe us is ______.",
  "When we're finally together, I want to ______.",
  "A perfect day with you would involve ______.",
  "I knew you were special when ______.",
  "The thing I'm most excited for in our future is ______.",
  "If you were a season, you'd be ______ because ______.",
  "One thing I've never told you is ______.",
  "You make the distance feel smaller when you ______.",
  "The way you ______ is my favorite thing about talking to you.",
  "If we had a movie about us, it would be called ______.",
  "I feel closest to you when we ______.",
  "Ten years from now, I hope we're ______.",
];

export function getRandomSentence(excludeText) {
  const validSentences = FINISH_MY_SENTENCE.filter((sentence) =>
    typeof sentence === "string" && sentence.trim() && sentence.includes("______")
  );
  const options = validSentences.filter((sentence) => sentence !== excludeText);
  const source = options.length ? options : validSentences;
  return source.length ? source[Math.floor(Math.random() * source.length)] : null;
}
