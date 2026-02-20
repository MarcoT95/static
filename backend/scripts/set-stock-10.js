const { Client } = require('pg')

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'staticdb',
  })

  await client.connect()
  const res = await client.query('UPDATE products SET stock = 10 WHERE "isActive" = true RETURNING id, name, stock')
  console.log(`Updated ${res.rowCount} products to stock=10`)
  for (const row of res.rows) {
    console.log(`#${row.id} ${row.name} -> stock ${row.stock}`)
  }
  await client.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
