

## Diagnose and Fix Client Edit/Save Failures

### What I found

The database configuration is correct:
- Demetrich has the `admin` role, `has_role()` returns true
- All 36 tables have admin override RLS policies for SELECT, INSERT, UPDATE, DELETE
- The admin frontend query filters have already been removed in prior changes

The code in `ClientEdit.tsx` (line 131-154) does:
```typescript
const { error } = await supabase
  .from("clients")
  .update({...})
  .eq("id", id!)
  .select("id")
  .single();
```

This should work with admin RLS. Since we cannot see the actual error, the plan adds diagnostic logging to capture it.

### Important note

The preview environment is currently logged in as **Nikki Warren** (meshekiaw@gmail.com), not Demetrich. The auth logs show Demetrich logs into the **published site** (homecareheadquarters.org). If the published site has not been republished since the admin fixes were made, it will still be running old code.

### Plan

**Step 1: Add diagnostic console.log to `ClientEdit.tsx`**

In the `handleSubmit` function, log the user ID, client ID, and the full error object before showing the toast. This will reveal the exact RLS or network error.

```typescript
// Before the update call
console.log("[ClientEdit] Saving as user:", user?.id, "client:", id);

// After the update
if (error) {
  console.error("[ClientEdit] Update error:", JSON.stringify(error));
}
```

**Step 2: Add diagnostic logging to `CaregiverProfile.tsx` handleSave**

Same pattern to catch any save failures on the caregiver side.

**Step 3: Show the logged-in user email in the dashboard header**

Add the user's email next to the avatar initial in `DashboardLayout.tsx`. This will immediately tell you which account is active when testing.

**Step 4: After logging is in place, test on the preview**

Log in as Demetrich in the preview, navigate to a client, click Edit, make a change, and save. The console logs will show the exact error.

### Files to change

| File | Change |
|------|--------|
| `src/pages/ClientEdit.tsx` | Add console.log in handleSubmit for user ID and error details |
| `src/pages/CaregiverProfile.tsx` | Add console.log in handleSave for error details |
| `src/components/layout/DashboardLayout.tsx` | Show logged-in email in top bar for debugging |

### After this change

You will need to:
1. Click **Publish > Update** to push changes to the live site
2. Log in as Demetrich on the preview or published site
3. Try to edit a client and save
4. Send me the result or screenshot so I can see the exact error

