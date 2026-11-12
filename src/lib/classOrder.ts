// Orders class/group names by level: PreBallet 1 → PreBallet 2 → Grade 1 … Grade 9,
// and within each level Term 1 before Term 2. Names that don't match fall to the end.

function levelKey(name: string): [number, number, number] {
  const n = name.toLowerCase()
  const num = (re: RegExp) => {
    const m = n.match(re)
    return m ? Number(m[1]) : Infinity
  }
  const term = num(/term\s*(\d+)/)
  const pre = num(/pre[\s-]*ballet\s*(\d+)/)
  if (pre !== Infinity) return [0, pre, term]
  if (/pre[\s-]*ballet/.test(n)) return [0, 0, term]
  const grade = num(/grade\s*(\d+)/)
  if (grade !== Infinity) return [1, grade, term]
  return [2, 0, term]
}

export function compareClassNames(a: string, b: string): number {
  const ka = levelKey(a)
  const kb = levelKey(b)
  for (let i = 0; i < 3; i++) {
    if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1
  }
  return a.localeCompare(b, undefined, { numeric: true })
}
