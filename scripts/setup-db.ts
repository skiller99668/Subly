import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// The schema creates tables, policies and triggers, so it needs the service
// role key — the anon key cannot run DDL.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment"
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// database.sql is applied as a single script rather than split on semicolons:
// the notification triggers contain dollar-quoted function bodies whose own
// semicolons would otherwise be torn apart. Sending it whole also means it
// applies atomically — no half-migrated database to reason about.
async function setupDatabase() {
  const sqlPath = path.join(process.cwd(), "database.sql")
  const sql = fs.readFileSync(sqlPath, "utf-8")

  console.log(`Applying ${path.basename(sqlPath)}...`)

  const { error } = await supabase.rpc("exec_sql", { sql })

  if (error) {
    console.error(`\n❌ Could not apply the schema: ${error.message}`)
    console.error(
      "\nThis script needs an `exec_sql(sql text)` function in your project," +
        "\nwhich Supabase does not provide by default. If you don't have one," +
        "\npaste database.sql into the Supabase SQL editor instead:" +
        "\n  Dashboard → SQL Editor → New query → paste → Run" +
        "\nThe file is idempotent, so running it again is safe."
    )
    process.exit(1)
  }

  console.log("\n✅ Database setup complete!")
}

setupDatabase()
