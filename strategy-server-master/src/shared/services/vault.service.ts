import { HttpService } from '@nestjs/axios';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { AxiosResponse } from 'axios';
import fs from 'fs';
import { RollbarLogger } from 'nestjs-rollbar';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from 'src/shared/services/config.service';

interface VaultResponseBody {
  request_id: string;
  lease_id: string;
  renewable: boolean;
  lease_duration: number;
  data: {
    data: Record<string, string>;
    metadata: {
      created_time: string;
      custom_metadata: string;
      deletion_time: string;
      destroyed: boolean;
      version: number;
    };
  };
  wrap_info: any;
  warnings: any;
  auth: any;
}

@Injectable()
export class VaultService {
  private readonly address: string;

  private readonly tokenPath: string;

  private token: string;

  private secretsPath: string;

  private secrets: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
    private readonly rollbarLogger: RollbarLogger,
  ) {
    this.address = this.configService.vault.addr;
    this.tokenPath = this.configService.vault.tokenPath;
    this.secretsPath = this.configService.vault.secretsPath;
  }

  async onModuleInit() {
    if (this.configService.isUseVault) {
      try {
        this.token = fs.readFileSync(this.tokenPath, 'utf8');
      } catch (error) {
        this.rollbarLogger.error(error, 'read vault token path');
      }
    }

    const data: VaultResponseBody = await this.getVaultData();

    this.secrets = data?.data?.data || {};
  }

  async getVaultData(): Promise<VaultResponseBody> {
    const config = this.getRequestConfig();
    const url = `${this.address}/v1${this.secretsPath}`;

    try {
      const response: AxiosResponse<VaultResponseBody> = await firstValueFrom(
        this.httpService.get(url, config),
      );

      return response.data;
    } catch (error) {
      this.rollbarLogger.error(error, 'get vault data');

      return null;
    }
  }

  async getVaultMetadata(): Promise<Record<any, any>> {
    const data: VaultResponseBody = await this.getVaultData();

    return data?.data?.metadata;
  }

  getKeyValue(key: string): string {
    return this.secrets[key];
  }

  private getRequestConfig() {
    return {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'X-Vault-Token': this.token,
      },
    };
  }
}
