CLI_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

function loadEnvFile() {
    local file="$1"
    if [[ -f "$file" ]]; then
        set -a
        source "$file"
        set +a
    fi
}

function exportEnv() {
    # Load dist first, then override
    loadEnvFile "$CLI_HOME/../backend/.env.dist.local"
    loadEnvFile "$CLI_HOME/../backend/.env.override.local"
}

function create_nango_integration() {
    # $1 to uppercase
    KEY=$(echo $1 | tr '[:lower:]' '[:upper:]')
    exportEnv

    # We need the client ID, secret and scopes to be set to create the integration
    local id_var="${KEY}_CLIENT_ID"
    local secret_var="${KEY}_CLIENT_SECRET"
    local scopes_var="${KEY}_SCOPES"

    clientId="${!id_var}"
    clientSecret="${!secret_var}"
    scopes="${!scopes_var}"
    if [[ -z $clientId || -z $clientSecret || -z $scopes ]]; then
        printf "\nNot all $1 variables are set. Skipping Nango integration creation.\n"
        printf "The variables needed are: \n- ${KEY}_CLIENT_ID \n- ${KEY}_CLIENT_SECRET \n- ${KEY}_SCOPES"
        return
    else
        # Check if integration exists
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --header "Authorization: Bearer $NANGO_SECRET_KEY" "http://localhost:3003/config/$1")
        
        if [ "$HTTP_CODE" == "200" ]; then
            printf "Integration $1 already exists. Updating...\n"
            METHOD="PUT"
        else
            printf "Creating $1 Integration...\n"
            METHOD="POST"
        fi

        # Prepare JSON payload
        if [[ "$1" == "linkedin" ]]; then
            # LinkedIn OpenID Fix: Override profile endpoint to /v2/userinfo
            DATA=$(cat <<EOF
{
    "provider_config_key": "$1",
    "provider": "$1",
    "oauth_client_id": "$clientId",
    "oauth_client_secret": "$clientSecret",
    "oauth_scopes": "$scopes",
    "models": {
        "profile": {
            "url": "https://api.linkedin.com/v2/userinfo",
            "headers": {
                "Authorization": "Bearer \${access_token}"
            }
        }
    }
}
EOF
)
        else
            DATA=$(cat <<EOF
{
    "provider_config_key": "$1",
    "provider": "$1",
    "oauth_client_id": "$clientId",
    "oauth_client_secret": "$clientSecret",
    "oauth_scopes": "$scopes"
}
EOF
)
        fi

        curl    --location 'http://localhost:3003/config' \
                --request $METHOD \
                --header "Authorization: Bearer $NANGO_SECRET_KEY" \
                --header 'Content-Type: application/json' \
                --data "$DATA"
        printf "\n"

    fi
}

function fix_nango_keys() {
    exportEnv
    printf "Fixing Nango keys in database to match config...\\n"
    
    if [[ -z "$NANGO_SECRET_KEY" || -z "$NANGO_PUBLIC_KEY" ]]; then
        printf "⚠️ NANGO_SECRET_KEY or NANGO_PUBLIC_KEY not set. Skipping key fix.\\n"
        return 1
    fi
    
    # Find the nango-db container (could be named differently based on project)
    NANGO_DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'nango.*db|nango-db' | head -1)
    NANGO_SERVER_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'nango[^-]|_nango_' | grep -v db | head -1)
    
    if [[ -z "$NANGO_DB_CONTAINER" ]]; then
        printf "⚠️ Nango DB container not found. Skipping key fix.\\n"
        return 1
    fi
    
    printf "  → Using DB container: $NANGO_DB_CONTAINER\\n"
    
    # Update keys in database
    docker exec "$NANGO_DB_CONTAINER" psql -U nango -d nango -c \
        "UPDATE _nango_environments SET secret_key = '$NANGO_SECRET_KEY', public_key = '$NANGO_PUBLIC_KEY' WHERE name = 'dev';" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        printf "✅ Keys updated in database.\\n"
        
        # Restart Nango server to pick up new keys
        if [[ -n "$NANGO_SERVER_CONTAINER" ]]; then
            printf "  → Restarting Nango server ($NANGO_SERVER_CONTAINER) to apply new keys...\\n"
            docker restart "$NANGO_SERVER_CONTAINER" > /dev/null 2>&1
            sleep 3  # Give it time to restart
            printf "✅ Nango restarted with correct keys.\\n"
        else
            printf "⚠️ Nango server container not found. Manual restart may be required.\\n"
        fi
    else
        printf "❌ Failed to update keys. DB might not be ready or table doesn't exist yet.\\n"
        return 1
    fi
}

function create_nango_integrations() {
    exportEnv
    fix_nango_keys
    integrations=$NANGO_INTEGRATIONS
    
    # Filter integrations based on edition
    # Read EDITION from .env.override.local (preferred) or .env.dist.local
    EDITION_VAL=$(cat $CLI_HOME/../backend/.env.override.local $CLI_HOME/../backend/.env.dist.local 2>/dev/null | grep "^EDITION=" | head -n 1 | awk -F '=' '{print $2}')
    
    if [[ "$EDITION_VAL" == "gitmesh-ce" ]]; then
        printf "\nCommunity Edition detected ($EDITION_VAL). Restricting integrations to Reddit only.\n"
        integrations="reddit"
    else
        printf "\nEnterprise/Pro Edition detected ($EDITION_VAL). Allowing all integrations.\n"
    fi

    IFS=',' read -ra INTEGRATIONS <<< "$integrations"

    for i in "${INTEGRATIONS[@]}"; do
        create_nango_integration "$i"
    done
}


function wait_for_nango() {
    printf "Waiting for Nango to be ready...\n"
    
    # Wait for Nango Server
    local retries=30
    local wait_time=2
    local url="http://localhost:3003/health"
    
    until curl -s -f "$url" > /dev/null; do
        ((retries--))
        if [ $retries -le 0 ]; then
             printf "❌ Timed out waiting for Nango server at $url\n"
             return 1
        fi
        printf "."
        sleep $wait_time
    done
    printf "\n✅ Nango server is up!\n"

    # Wait for Nango DB (via docker health check if possible, or just assume it's up if server is up, 
    # but fix_nango_keys uses docker exec on db, so we should check db container)
    local db_retries=30
    local db_container=$(docker ps --format '{{.Names}}' | grep -E 'nango.*db|nango-db' | head -1)
    
    if [[ -n "$db_container" ]]; then
        printf "Waiting for Nango DB ($db_container)...\n"
        until docker exec "$db_container" pg_isready -U nango > /dev/null 2>&1; do
            ((db_retries--))
            if [ $db_retries -le 0 ]; then
                printf "❌ Timed out waiting for Nango DB\n"
                return 1
            fi
            printf "."
            sleep $wait_time
        done
         printf "\n✅ Nango DB is ready!\n"
    fi
}

wait_for_nango
create_nango_integrations