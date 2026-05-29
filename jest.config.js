// Unit tests run under jest-expo so files that transitively import RN/Expo native modules
// (expo-sqlite, AsyncStorage) resolve without crashing. Tests live in __tests__ folders next
// to the code they cover. The @/ alias mirrors tsconfig's paths.
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
