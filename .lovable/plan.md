

## Fix: Admins Can't Edit Clients Created by Other Users

### Problem
The `clients` table RLS policies use `auth.uid() = user_id`, meaning only the user who created a client record can update it. When an admin (Demetrich, logged in as `homcarenetwork4@gmail.com`) tries to edit a client created by another admin (`meshekiaw@gmail.com`), the database silently rejects the update.

### Solution
Add RLS policies that allow users with the `admin` role to SELECT, UPDATE, INSERT, and DELETE any client record, regardless of `user_id`.

### Changes

| Area | Change |
|------|--------|
| Database migration | Add 4 new permissive RLS policies on `clients` table using `has_role(auth.uid(), 'admin')` for SELECT, INSERT, UPDATE, and DELETE |

### SQL Migration

```sql
-- Admins can view all clients
CREATE POLICY "Admins can view all clients"
ON public.clients FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can create clients
CREATE POLICY "Admins can create clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all clients
CREATE POLICY "Admins can update all clients"
ON public.clients FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete all clients
CREATE POLICY "Admins can delete all clients"
ON public.clients FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
```

These are permissive policies, so they work alongside the existing `user_id`-based policies. Any user matching either policy gets access.

