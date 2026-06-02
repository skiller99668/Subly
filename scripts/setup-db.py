#!/usr/bin/env python3
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv('.env.local')

# Get Supabase credentials
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_anon_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not supabase_url:
    print("Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local")
    exit(1)

# Extract project reference from URL
# URL format: https://etvvtlapxwgnhhddehsp.supabase.co
project_ref = supabase_url.split('https://')[1].split('.supabase.co')[0]

# Supabase PostgreSQL connection string
# You need to add DB password - for now, we'll need the user to provide it
db_user = input("Enter Supabase database user (default: postgres): ") or "postgres"
db_password = input("Enter Supabase database password: ")
db_host = f"{project_ref}.db.supabase.co"
db_port = "5432"
db_name = "postgres"

try:
    print(f"\nConnecting to PostgreSQL at {db_host}...")
    
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        database=db_name,
        user=db_user,
        password=db_password
    )
    
    # Read SQL file
    print("Reading database.sql...")
    with open('database.sql', 'r') as f:
        sql_content = f.read()
    
    # Execute SQL
    cursor = conn.cursor()
    
    # Split by semicolons and execute each statement
    statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]
    
    print(f"\nExecuting {len(statements)} SQL statements...\n")
    
    for i, statement in enumerate(statements, 1):
        try:
            print(f"[{i}/{len(statements)}] Executing: {statement[:60]}...")
            cursor.execute(statement)
            conn.commit()
            print(f"  ✓ Success")
        except psycopg2.Error as e:
            print(f"  ⚠ Warning: {e.pgerror}")
            conn.commit()  # Continue with next statement
        except Exception as e:
            print(f"  ⚠ Error: {str(e)}")
    
    cursor.close()
    conn.close()
    
    print("\n✅ Database setup complete!")
    
except psycopg2.Error as e:
    print(f"\n❌ PostgreSQL error: {e}")
    exit(1)
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    exit(1)
