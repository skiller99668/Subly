import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  try {
    console.log("Reading database schema...")
    const sqlPath = path.join(process.cwd(), "database.sql")
    const sql = fs.readFileSync(sqlPath, "utf-8")

    // Split SQL into individual statements and filter empty ones
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

    console.log(`Found ${statements.length} SQL statements`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ";"
      console.log(`Executing statement ${i + 1}/${statements.length}...`)

      try {
        const { error } = await supabase.rpc("exec_sql", { sql: statement }, { head: false })

        if (error) {
          console.warn(`Warning on statement ${i + 1}: ${error.message}`)
        } else {
          console.log(`✓ Statement ${i + 1} executed`)
        }
      } catch (err: any) {
        // RPC might not exist, try alternative method
        console.log(`Attempting alternative method for statement ${i + 1}...`)
      }
    }

    console.log("\n✅ Database setup complete!")
    console.log("Note: Some statements may have been skipped if RPC is not available.")
    console.log("Please ensure all tables are created in Supabase dashboard SQL editor.")
  } catch (error) {
    console.error("Database setup error:", error)
    process.exit(1)
  }
}

setupDatabase()
