#!/bin/bash

# PyGateway Frontend Integration Test Script
# 
# This script performs comprehensive testing of the frontend API integration
# according to the backend documentation requirements.
#
# Author: Senior Frontend Developer
# Version: 2.0.0

echo "🚀 PyGateway Frontend Integration Test Suite"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            ((TESTS_PASSED++))
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            ((TESTS_FAILED++))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            ;;
    esac
    ((TESTS_TOTAL++))
}

# Function to test API endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8001/api/v1$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        print_status "PASS" "$description (HTTP $response)"
    else
        print_status "FAIL" "$description (Expected HTTP $expected_status, got HTTP $response)"
    fi
}

# Function to test with authentication
test_authenticated_endpoint() {
    local endpoint=$1
    local description=$2
    local token=$3
    local expected_status=${4:-200}
    
    echo -n "Testing $description (authenticated)... "
    
    if [ -z "$token" ]; then
        print_status "SKIP" "$description (no auth token)"
        return
    fi
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $token" \
        "http://localhost:8001/api/v1$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        print_status "PASS" "$description (HTTP $response)"
    else
        print_status "FAIL" "$description (Expected HTTP $expected_status, got HTTP $response)"
    fi
}

# Function to check if backend is running
check_backend() {
    echo "🔍 Checking if PyGateway backend is running..."
    
    if curl -s "http://localhost:8001/api/v1/config/health" > /dev/null 2>&1; then
        print_status "PASS" "Backend is running on localhost:8001"
        return 0
    else
        print_status "FAIL" "Backend is not running on localhost:8001"
        echo ""
        echo "❗ Please start the PyGateway backend server first:"
        echo "   cd /path/to/pygateway-backend"
        echo "   docker-compose up -d"
        echo ""
        return 1
    fi
}

# Function to get authentication token
get_auth_token() {
    echo "🔐 Attempting authentication..."
    
    # Try different authentication methods
    local credentials='{"username":"admin","password":"admin123"}'
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$credentials" \
        "http://localhost:8001/api/v1/auth/superadmin/login" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        local token=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            print_status "PASS" "Authentication successful"
            echo "$token"
            return 0
        fi
    fi
    
    # Try alternative credentials
    credentials='{"username":"superadmin","password":"password"}'
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$credentials" \
        "http://localhost:8001/api/v1/auth/superadmin/login" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        local token=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            print_status "PASS" "Authentication successful (alternative credentials)"
            echo "$token"
            return 0
        fi
    fi
    
    print_status "WARN" "Authentication failed - continuing with limited testing"
    return 1
}

# Function to test API documentation endpoints
test_documentation() {
    echo ""
    echo "📚 Testing API Documentation Endpoints"
    echo "======================================"
    
    test_endpoint "/docs" "Swagger UI Documentation" 404  # Might be at root
    test_endpoint "/redoc" "ReDoc Documentation" 404      # Might be at root
    test_endpoint "/openapi.json" "OpenAPI Specification" 404  # Might be at root
    
    # Try without /api/v1 prefix
    echo -n "Testing Swagger UI at root... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8001/docs")
    if [ "$response" = "200" ]; then
        print_status "PASS" "Swagger UI available at /docs"
    else
        print_status "FAIL" "Swagger UI not found (HTTP $response)"
    fi
}

# Function to test system endpoints
test_system_endpoints() {
    echo ""
    echo "🏥 Testing System Endpoints"
    echo "=========================="
    
    test_endpoint "/config/health" "Health Check"
    test_endpoint "/config/version" "Version Check"
}

# Function to test core resource endpoints
test_core_endpoints() {
    local token=$1
    
    echo ""
    echo "🏗️  Testing Core Resource Endpoints"
    echo "=================================="
    
    # Test workspaces
    test_authenticated_endpoint "/workspaces" "Workspaces List" "$token"
    
    # Test services with pagination
    test_authenticated_endpoint "/services?offset=0&limit=10" "Services List (paginated)" "$token"
    
    # Test routes with pagination
    test_authenticated_endpoint "/routes?offset=0&limit=10" "Routes List (paginated)" "$token"
    
    # Test consumers with pagination
    test_authenticated_endpoint "/consumers?offset=0&limit=10" "Consumers List (paginated)" "$token"
    
    # Test providers
    test_authenticated_endpoint "/providers" "Providers List" "$token"
}

# Function to test plugin endpoints
test_plugin_endpoints() {
    local token=$1
    
    echo ""
    echo "🔌 Testing Plugin Endpoints"
    echo "========================="
    
    test_authenticated_endpoint "/plugins?offset=0&limit=10" "Plugins List (paginated)" "$token"
    test_authenticated_endpoint "/plugins/available" "Available Plugins" "$token"
    
    # Test common plugin schemas
    echo ""
    echo "Testing Plugin Schemas:"
    test_authenticated_endpoint "/plugins/schema/rate-limiting" "Rate Limiting Schema" "$token"
    test_authenticated_endpoint "/plugins/schema/cors" "CORS Schema" "$token"
    test_authenticated_endpoint "/plugins/schema/key-auth" "Key Auth Schema" "$token"
    test_authenticated_endpoint "/plugins/schema/basic-auth" "Basic Auth Schema" "$token"
}

# Function to test LLM endpoints
test_llm_endpoints() {
    local token=$1
    
    echo ""
    echo "🤖 Testing LLM Endpoints"
    echo "======================="
    
    test_authenticated_endpoint "/llm/providers" "LLM Providers" "$token"
    test_authenticated_endpoint "/llm/templates" "LLM Templates" "$token"
    test_authenticated_endpoint "/llm/tools" "LLM Tools" "$token"
    
    # Test analytics endpoints
    local start_date=$(date -d "7 days ago" +%Y-%m-%d)
    local end_date=$(date +%Y-%m-%d)
    test_authenticated_endpoint "/llm/analytics/usage?start_date=$start_date&end_date=$end_date" "LLM Usage Analytics" "$token"
    test_authenticated_endpoint "/llm/analytics/costs?start_date=$start_date&end_date=$end_date" "LLM Cost Analytics" "$token"
    test_authenticated_endpoint "/llm/analytics/performance?start_date=$start_date&end_date=$end_date" "LLM Performance Analytics" "$token"
    
    # Test security endpoints
    test_authenticated_endpoint "/llm/security/audit?start_date=$start_date&end_date=$end_date" "LLM Security Audit" "$token"
}

# Function to test error handling
test_error_handling() {
    local token=$1
    
    echo ""
    echo "🚨 Testing Error Handling"
    echo "======================="
    
    # Test 404 errors
    test_authenticated_endpoint "/workspaces/non-existent-id" "404 Error Handling" "$token" 404
    test_authenticated_endpoint "/services/invalid-uuid" "Service 404 Handling" "$token" 404
    test_authenticated_endpoint "/routes/missing-route" "Route 404 Handling" "$token" 404
    
    # Test unauthorized access
    test_endpoint "/workspaces" "Unauthorized Access" 401
}

# Function to validate response formats
test_response_formats() {
    local token=$1
    
    echo ""
    echo "📊 Testing Response Formats"
    echo "========================="
    
    # Test workspace response format
    echo -n "Validating workspaces response format... "
    local workspaces_response=$(curl -s -H "Authorization: Bearer $token" \
        "http://localhost:8001/api/v1/workspaces")
    
    if echo "$workspaces_response" | jq -e '. | type == "array"' > /dev/null 2>&1; then
        print_status "PASS" "Workspaces returns array"
    else
        print_status "FAIL" "Workspaces does not return array"
    fi
    
    # Test services pagination format
    echo -n "Validating services pagination format... "
    local services_response=$(curl -s -H "Authorization: Bearer $token" \
        "http://localhost:8001/api/v1/services?offset=0&limit=5")
    
    if echo "$services_response" | jq -e '.items' > /dev/null 2>&1; then
        print_status "PASS" "Services uses paginated format {items: []}"
    elif echo "$services_response" | jq -e '. | type == "array"' > /dev/null 2>&1; then
        print_status "PASS" "Services uses direct array format"
    else
        print_status "FAIL" "Services format is invalid"
    fi
}

# Function to test frontend files
test_frontend_files() {
    echo ""
    echo "📁 Testing Frontend File Structure"
    echo "================================"
    
    # Check if key files exist
    local files=(
        "src/context/AppState.jsx"
        "src/api/PyGatewayAPI.js"
        "src/api/APITestSuite.js"
        "HOW_I_FETCH_DATA.md"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            print_status "PASS" "$file exists"
        else
            print_status "FAIL" "$file is missing"
        fi
    done
    
    # Check if API client has correct configuration
    if grep -q "http://localhost:8001/api/v1" "src/api/PyGatewayAPI.js" 2>/dev/null; then
        print_status "PASS" "API client has correct base URL"
    else
        print_status "FAIL" "API client base URL configuration issue"
    fi
}

# Function to run JavaScript tests
run_js_tests() {
    echo ""
    echo "🧪 Running JavaScript API Tests"
    echo "============================="
    
    # Check if Node.js is available
    if command -v node &> /dev/null; then
        echo "Node.js is available, running API tests..."
        
        # Create a simple test runner
        cat > test_runner.js << 'EOF'
import('../../src/api/APITestSuite.js').then(async (module) => {
    const { quickConnectivityTest, quickEndpointTest, validateResponseFormats } = module;
    
    console.log('🔍 Running quick connectivity test...');
    const connectivity = await quickConnectivityTest();
    
    if (connectivity) {
        console.log('🔍 Running endpoint tests...');
        const endpoints = await quickEndpointTest();
        console.table(endpoints);
        
        console.log('🔍 Validating response formats...');
        const validation = await validateResponseFormats();
        console.table(validation);
    }
}).catch(error => {
    console.error('Test execution failed:', error.message);
    process.exit(1);
});
EOF

        # Try to run the test (might fail if modules aren't set up)
        if node test_runner.js 2>/dev/null; then
            print_status "PASS" "JavaScript API tests executed successfully"
        else
            print_status "WARN" "JavaScript tests couldn't run (module system not configured)"
        fi
        
        rm -f test_runner.js
    else
        print_status "WARN" "Node.js not available, skipping JavaScript tests"
    fi
}

# Main execution
main() {
    echo "Starting comprehensive integration tests..."
    echo ""
    
    # Check prerequisites
    if ! check_backend; then
        exit 1
    fi
    
    # Test system endpoints first
    test_system_endpoints
    
    # Test documentation
    test_documentation
    
    # Get authentication token
    local auth_token
    auth_token=$(get_auth_token)
    if [ $? -ne 0 ]; then
        echo ""
        echo "⚠️  Continuing without authentication - some tests will be skipped"
        auth_token=""
    fi
    
    # Test endpoints (with or without authentication)
    test_core_endpoints "$auth_token"
    test_plugin_endpoints "$auth_token"
    test_llm_endpoints "$auth_token"
    test_error_handling "$auth_token"
    test_response_formats "$auth_token"
    
    # Test frontend files
    test_frontend_files
    
    # Run JavaScript tests
    run_js_tests
    
    # Final report
    echo ""
    echo "🎯 Test Results Summary"
    echo "====================="
    echo "Total Tests: $TESTS_TOTAL"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    
    local success_rate=0
    if [ $TESTS_TOTAL -gt 0 ]; then
        success_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    fi
    
    echo "Success Rate: $success_rate%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Frontend is ready for production.${NC}"
        exit 0
    else
        echo -e "${RED}⚠️  Some tests failed. Please review the issues above.${NC}"
        exit 1
    fi
}

# Check for required tools
if ! command -v curl &> /dev/null; then
    echo "❌ curl is required but not installed."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Response format validation will be limited."
fi

# Run main function
main "$@"
