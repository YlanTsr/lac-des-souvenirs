// Robot : appuie sur la bonne flèche après ~0,6 s de réaction (≈ un jeune papa réveillé).
const KEYS = ['left', 'up', 'right'];
export default function bot(s) {
  if (!s || s.phase !== 'cry' || s.needT < 0.6) return {};
  return { [KEYS[s.need]]: true };
}
