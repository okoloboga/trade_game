module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000,
  // Важно: загружаем моки перед выполнением тестов
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};
