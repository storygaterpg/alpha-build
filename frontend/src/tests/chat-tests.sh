#!/bin/bash

# Script to run all chat-related tests

# Define text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Running ChatPanel Tests ===${NC}"
npx jest --verbose ./src/__tests__/components/ChatPanel.test.tsx

echo -e "${YELLOW}=== Running DebugToggle Tests ===${NC}"
npx jest --verbose ./src/__tests__/components/DebugToggle.test.tsx

echo -e "${YELLOW}=== Running ChatSlice Tests ===${NC}"
npx jest --verbose ./src/__tests__/store/chatSlice.test.ts

echo -e "${YELLOW}=== Running SocketMiddleware Chat Tests ===${NC}"
npx jest --verbose ./src/__tests__/middleware/socketMiddleware.test.ts

echo -e "${YELLOW}=== Running Chat Deduplication Integration Tests ===${NC}"
npx jest --verbose ./src/__tests__/integration/chatDeduplication.test.tsx

# Check if any test has failed
if [ $? -eq 0 ]; then
  echo -e "${GREEN}All chat tests passed successfully!${NC}"
  exit 0
else
  echo -e "${RED}Some tests have failed. Please check the output above.${NC}"
  exit 1
fi 