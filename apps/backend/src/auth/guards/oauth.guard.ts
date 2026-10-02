import {
  Injectable,
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

function providerConfigured(clientId?: string, clientSecret?: string): boolean {
  return Boolean(
    clientId &&
      clientSecret &&
      !clientId.startsWith('your_') &&
      clientId !== 'placeholder' &&
      clientSecret !== 'placeholder',
  );
}

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext): any {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!providerConfigured(clientId, clientSecret)) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) throw err;
    if (!user) {
      throw new UnauthorizedException(info?.message || 'Google authentication failed');
    }
    return user;
  }
}

@Injectable()
export class GithubOAuthGuard extends AuthGuard('github') {
  canActivate(context: ExecutionContext): any {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!providerConfigured(clientId, clientSecret)) {
      throw new ServiceUnavailableException('GitHub OAuth is not configured');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) throw err;
    if (!user) {
      throw new UnauthorizedException(info?.message || 'GitHub authentication failed');
    }
    return user;
  }
}
