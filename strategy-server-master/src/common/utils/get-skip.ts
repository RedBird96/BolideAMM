export const getSkip = (page: number, take: number): number =>
  (page - 1) * take;
