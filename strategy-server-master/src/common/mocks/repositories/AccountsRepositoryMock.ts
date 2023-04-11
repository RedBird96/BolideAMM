export class AccountsRepositoryMock {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async save(data: any): Promise<any> {
    return Promise.resolve(data);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async update(data: any): Promise<any> {
    return Promise.resolve(data);
  }

  async getTariffIdByAccountId(): Promise<any> {
    return Promise.resolve(88);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  findOne(id: number): Promise<any> {
    return Promise.resolve({
      id,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toDto: () => {},
    });
  }

  async findOneByEmail(email: string): Promise<any> {
    return Promise.resolve({ email });
  }

  async findAccountByCode(): Promise<any> {
    return Promise.resolve({});
  }
}
