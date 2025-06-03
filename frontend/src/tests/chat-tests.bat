@echo off
REM Script to run all chat-related tests on Windows

echo === Running ChatPanel Tests ===
npx jest --verbose ./src/__tests__/components/ChatPanel.test.tsx

echo === Running DebugToggle Tests ===
npx jest --verbose ./src/__tests__/components/DebugToggle.test.tsx

echo === Running ChatSlice Tests ===
npx jest --verbose ./src/__tests__/store/chatSlice.test.ts

echo === Running SocketMiddleware Chat Tests ===
npx jest --verbose ./src/__tests__/middleware/socketMiddleware.test.ts

echo === Running Chat Deduplication Integration Tests ===
npx jest --verbose ./src/__tests__/integration/chatDeduplication.test.tsx

if %ERRORLEVEL% EQU 0 (
  echo All chat tests passed successfully!
  exit /b 0
) else (
  echo Some tests have failed. Please check the output above.
  exit /b 1
) 