// Robot : couvre la bouche ~0,3 s après l'apparition de « opérer… ».
export default function bot(s) {
  if (!s || s.phase !== 'talk' || !s.words.length) return {};
  return { press: s.shown - 1 >= s.opIdx && s.pt - s.words[s.opIdx].at > 0.3 };
}
