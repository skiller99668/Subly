#!/usr/bin/env python3
"""Apply database.sql to the project's Supabase Postgres instance.

The schema is sent as one script rather than split on semicolons: the
notification triggers contain dollar-quoted function bodies whose own
semicolons would otherwise be torn apart. Postgres accepts a multi-statement
script in a single execute, and running it in one transaction means it either
applies fully or not at all.
"""
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv('.env.local')

supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')

if not supabase_url:
    print("Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local")
    exit(1)

# Extract project reference from URL
# URL format: https://etvvtlapxwgnhhddehsp.supabase.co
project_ref = supabase_url.split('https://')[1].split('.supabase.co')[0]

# Supabase PostgreSQL connection. The database password is not the anon key —
# find it under Dashboard → Project Settings → Database.
db_user = input("Enter Supabase database user (default: postgres): ") or "postgres"
db_password = input("Enter Supabase database password: ")
db_host = f"{project_ref}.db.supabase.co"
db_port = "5432"
db_name = "postgres"

conn = None
try:
    print(f"\nConnecting to PostgreSQL at {db_host}...")

    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        database=db_name,
        user=db_user,
        password=db_password
    )

    print("Reading database.sql...")
    with open('database.sql', 'r', encoding='utf-8') as f:
        sql_content = f.read()

    print("Applying schema...")
    with conn:
        with conn.cursor() as cursor:
            cursor.execute(sql_content)

    print("\n✅ Database setup complete!")

except psycopg2.Error as e:
    print(f"\n❌ PostgreSQL error: {e}")
    print("Nothing was applied — the script runs in a single transaction.")
    exit(1)
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    exit(1)
finally:
    if conn is not None:
        conn.close()
