const n = Number(process.argv[2] ?? 200000)
const rows = Array.from({ length: n }, (_, i) => ({
  id: i,
  name: `user-${i}`,
  email: `user${i}@example.com`,
  active: i % 3 === 0,
  score: Math.round(Math.random() * 10000) / 100,
  profile: {
    address: { city: `city-${i % 100}`, zip: String(100000 + i) },
    tags: [`tag${i % 7}`, `tag${i % 13}`]
  }
}))
process.stdout.write(JSON.stringify({ users: rows }))
