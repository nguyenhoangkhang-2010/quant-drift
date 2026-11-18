export interface Tok {
  t: string;
  changed: boolean;
}

const split = (s: string) => s.split(/(\s+)/).filter((x) => x !== "");
const plain = (xs: string[]): Tok[] => xs.map((t) => ({ t, changed: false }));

/** Word-level LCS diff. Whitespace is never highlighted, so only real wording changes light up. */
export function diffTokens(a: string, b: string): { a: Tok[]; b: Tok[] } {
  const x = split(a);
  const y = split(b);
  const n = x.length;
  const m = y.length;

  if (n * m > 250_000) return { a: plain(x), b: plain(y) };

  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const outA: Tok[] = [];
  const outB: Tok[] = [];
  const word = (s: string) => /\S/.test(s);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      outA.push({ t: x[i], changed: false });
      outB.push({ t: y[j], changed: false });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      outA.push({ t: x[i], changed: word(x[i]) });
      i++;
    } else {
      outB.push({ t: y[j], changed: word(y[j]) });
      j++;
    }
  }
  for (; i < n; i++) outA.push({ t: x[i], changed: word(x[i]) });
  for (; j < m; j++) outB.push({ t: y[j], changed: word(y[j]) });

  return { a: outA, b: outB };
}
