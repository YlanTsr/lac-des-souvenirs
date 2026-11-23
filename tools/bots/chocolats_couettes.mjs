// Robot : file au bureau quand Maman a le dos tourné, dépose, repart ; puis attend derrière la chaise.
export default function bot(s) {
  let target, press = false;
  const away = s.st === 'toCoffee' || s.st === 'coffee';
  if (s.gifts < 3) {
    const late = s.st === 'coffee' && s.stT < 0.35;
    target = away && !s.dropped && !late ? 470 : 790;
    press = away && !s.dropped && Math.abs(s.x - 470) < 40;
  } else {
    target = 650;
    press = s.st === 'desk' && s.sitT > 0.15 && s.sitT < 0.3 && Math.abs(s.x - 650) < 30;
  }
  const d = target - s.x;
  return { left: d < -8, right: d > 8, press };
}
