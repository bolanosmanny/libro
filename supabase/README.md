# Supabase database setup

To create profile rows automatically when users register:

1. Open your Supabase project and select **SQL Editor**.
2. Open `migrations/20261021000000_create_profiles.sql` from this repository and copy its contents into a new SQL query.
3. Run the query. It creates `public.profiles`, enables row-level security, adds policies limiting profile reads/updates to the owning user, and installs a trigger that copies the signup first/last name metadata into the profile row.
4. Register a new test account, then check **Table Editor → profiles**. Existing Auth users are not backfilled by this trigger; it runs for new signups.

The trigger creates rows on the database side, so it works whether or not email confirmation is enabled. Do not put a Supabase secret/service-role key in the frontend.

## Equipment inventory

Run the equipment inventory and equipment loans migrations in filename order. Add one row to `equipment_inventory` per item type and pickup location, with its total and available counts. Students can view inventory without signing in. Checkout and return actions go through FastAPI and update the available count automatically.

If the table is empty, the Equipment page shows an empty state. The six library equipment items previously shown in the static list are now stored in `equipment_inventory` and displayed with live availability counts.