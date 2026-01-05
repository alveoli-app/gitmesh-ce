-- Add assigneeMemberId to devtelIssues to support assigning issues to contacts/members
-- This allows assigning issues to team members who haven't logged in yet

-- Add the new column
ALTER TABLE "devtelIssues" ADD COLUMN IF NOT EXISTS "assigneeMemberId" UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "devtelIssues_assigneeMemberId" ON "devtelIssues"("assigneeMemberId");

-- Add comment explaining the field
COMMENT ON COLUMN "devtelIssues"."assigneeMemberId" IS 'References a member from the contacts database. Used when assignee is a team member who may not have logged in yet.';
