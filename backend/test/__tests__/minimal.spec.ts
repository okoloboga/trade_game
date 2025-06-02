import { Test, TestingModule } from '@nestjs/testing';

describe('Minimal', () => {
  it('should pass', async () => {
    jest.setTimeout(5000);
    console.time('Test.createTestingModule');
    const module: TestingModule = await Test.createTestingModule({
      providers: [],
    }).compile();
    console.timeEnd('Test.createTestingModule');
    expect(true).toBe(true);
  }, 5000);
});
