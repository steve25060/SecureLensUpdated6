import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GithubStrategy } from './github.strategy';
import { GoogleStrategy } from './google.strategy';

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'securelens-dev-secret');
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required in production');
}

@Global()
@Module({
  // Global so WorkspacesService (and others) can inject AuthService / JwtService
  // without each module re-importing AuthModule.
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GithubStrategy, GoogleStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
