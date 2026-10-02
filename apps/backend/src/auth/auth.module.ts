import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { OAuthFallbackController } from './oauth-fallback.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GithubStrategy } from './github.strategy';
import { GoogleStrategy } from './google.strategy';

@Global()
@Module({
  // Global so WorkspacesService (and others) can inject AuthService / JwtService
  // without each module re-importing AuthModule.
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController, OAuthFallbackController],
  providers: [AuthService, JwtStrategy, GithubStrategy, GoogleStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
