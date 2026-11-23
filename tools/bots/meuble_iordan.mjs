// Robot : scie ~0,35-0,5 s après que la flèche correspond au plan (temps de réaction humain).
let rt = 0.4;
export default function bot(s) {
  if (!s || s.phase !== 'turn') { rt = 0.33 + Math.random() * 0.22; return {}; }
  return { press: s.o === s.target && s.shownSince >= rt };
}
