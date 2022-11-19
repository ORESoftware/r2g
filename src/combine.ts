function combine(n: number, arr: Array<number>): Array<Array<number>> {
  if (n === 0) return [[]];
  if (n === arr.length) return [arr];
  if (n === 1) return arr.map((e) => [e]);
  return arr.reduce((acc, e, i) => {
    return acc.concat(combine(n - 1, arr.slice(i + 1)).map((c) => [e].concat(c)));
  }, []);
}
