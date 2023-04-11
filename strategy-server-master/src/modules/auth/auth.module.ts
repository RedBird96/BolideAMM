import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { AccountsModule } from '../accounts/accounts.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    forwardRef(() => AccountsModule),
    ThrottlerModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt', session: true }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: true }),
    AuthService,
  ],
})
export class AuthModule {}
