import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): boolean {
    return true;
  }
}
