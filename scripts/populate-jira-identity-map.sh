#!/bin/bash

# Populate jira_identity_map from Jira project assignees and reporters
# This queries Jira API to get all users in a project and maps their accountId to Catalyst user_id

set -euo pipefail

if [[ -z "${JIRA_BASE_URL:-}" ]] || [[ -z "${JIRA_EMAIL:-}" ]] || [[ -z "${JIRA_API_TOKEN:-}" ]] || [[ -z "${TARGET_DB_URL:-}" ]]; then
  echo "Error: Required environment variables not set"
  echo ""
  echo "Usage:"
  echo "  JIRA_BASE_URL='https://...' \\"
  echo "  JIRA_EMAIL='...' \\"
  echo "  JIRA_API_TOKEN='...' \\"
  echo "  TARGET_DB_URL='postgres://...' \\"
  echo "  ./scripts/populate-jira-identity-map.sh"
  echo ""
  echo "Environment variables:"
  echo "  JIRA_BASE_URL        — Jira instance URL (e.g., https://digital-transformation.atlassian.net)"
  echo "  JIRA_EMAIL           — Jira API user email"
  echo "  JIRA_API_TOKEN       — Jira API token"
  echo "  TARGET_DB_URL        — Supabase target database URL"
  exit 1
fi

JIRA_PROJECT="${JIRA_PROJECT:-BAU}"

echo "=========================================="
echo "Jira Identity Map Population Script"
echo "=========================================="
echo "Jira Project: $JIRA_PROJECT"
echo "Target DB: ${TARGET_DB_URL%@*}@***"
echo ""

# Step 1: Query Jira for all project users (assignees + reporters)
echo "Fetching users from Jira project '$JIRA_PROJECT'..."

# Get all issues in the project and extract unique assignee/reporter accountIds
JIRA_USERS=$(curl -s -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  "${JIRA_BASE_URL}/rest/api/3/search?jql=project=${JIRA_PROJECT}&fields=assignee,reporter&maxResults=100&expand=changelog" \
  -H "Accept: application/json" | \
  jq -r '.issues[] | 
    [.fields.assignee.accountId // empty, .fields.reporter.accountId // empty] | .[] | 
    select(. != null)' | sort -u)

UNIQUE_COUNT=$(echo "$JIRA_USERS" | wc -l)
echo "Found $UNIQUE_COUNT unique Jira users in project '$JIRA_PROJECT'"
echo ""

# Step 2: For each Jira user, look up their email and full name
echo "Mapping Jira accountIds to emails and names..."
echo ""

MAPPED_COUNT=0
ERROR_COUNT=0

{
  echo "========== Identity Map Population Start: $(date) =========="
  echo ""

  for account_id in $JIRA_USERS; do
    # Get user details from Jira API
    USER_RESPONSE=$(curl -s -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
      "${JIRA_BASE_URL}/rest/api/3/users?accountId=${account_id}" \
      -H "Accept: application/json")

    USER_EMAIL=$(echo "$USER_RESPONSE" | jq -r '.[0].emailAddress // empty')
    USER_NAME=$(echo "$USER_RESPONSE" | jq -r '.[0].displayName // empty')

    if [[ -z "$USER_EMAIL" ]]; then
      echo "SKIP  $account_id (email not found)"
      ((ERROR_COUNT++))
      continue
    fi

    # Try to find the user in Catalyst profiles by email
    CATALYST_USER_ID=$(psql "$TARGET_DB_URL" -t -c \
      "SELECT id FROM profiles WHERE LOWER(email) = LOWER('$USER_EMAIL') LIMIT 1;" 2>/dev/null || echo "")

    if [[ -z "$CATALYST_USER_ID" ]]; then
      echo "SKIP  $account_id ($USER_EMAIL) — not found in Catalyst profiles"
      ((ERROR_COUNT++))
      continue
    fi

    # Insert into jira_identity_map
    psql "$TARGET_DB_URL" -c \
      "INSERT INTO jira_identity_map (jira_account_id, jira_email, jira_display_name, catalyst_user_id, created_at, updated_at)
       VALUES ('$account_id', '$USER_EMAIL', '$USER_NAME', '$CATALYST_USER_ID', NOW(), NOW())
       ON CONFLICT (jira_account_id) DO UPDATE 
       SET catalyst_user_id = EXCLUDED.catalyst_user_id,
           jira_email = EXCLUDED.jira_email,
           jira_display_name = EXCLUDED.jira_display_name,
           updated_at = NOW();" 2>/dev/null

    if [[ $? -eq 0 ]]; then
      echo "MAP   $account_id → $CATALYST_USER_ID ($USER_EMAIL)"
      ((MAPPED_COUNT++))
    else
      echo "FAIL  $account_id ($USER_EMAIL) — insert failed"
      ((ERROR_COUNT++))
    fi
  done

  echo ""
  echo "========== Population Summary =========="
  echo "Mapped:  $MAPPED_COUNT users"
  echo "Skipped: $ERROR_COUNT users"
  echo "========== Population End: $(date) =========="
  echo ""
} | tee -a "/tmp/jira_identity_map_$(date +%s).log"

if [[ $MAPPED_COUNT -gt 0 ]]; then
  echo "✅ Identity map population complete."
else
  echo "⚠️  No users were mapped. Check that users exist in Catalyst profiles with matching emails."
  exit 1
fi
