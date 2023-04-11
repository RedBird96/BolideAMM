let mockRedisSet;

const mockRedis = {
  set: mockRedisSet,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const RedisServiceMock = {
  getClient: jest.fn(() => mockRedis),
};
