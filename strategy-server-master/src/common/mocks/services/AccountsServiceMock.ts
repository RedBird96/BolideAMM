export class AccountsServiceMock {
  findOneAndCheckExist(id: number): Promise<any> {
    return Promise.resolve({ id });
  }

  async getTariffIdByAccountId(): Promise<any> {
    return Promise.resolve(88);
  }

  async getCryptoManager(): Promise<any> {
    return Promise.resolve({ id: 99 });
  }

  async findOne(data: any): Promise<any> {
    return { ...data };
  }
}
