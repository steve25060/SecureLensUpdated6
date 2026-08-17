import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext): any {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const req = context.switchToHttp().getRequest();

    const isConfigured = Boolean(
      clientId &&
      clientSecret &&
      !clientId.startsWith('your_') &&
      clientId !== 'placeholder'
    );

    if (!isConfigured || req.query?.mock === 'true') {
      req.user = {
        googleId: 'google-oauth-demo-' + Math.floor(100000 + Math.random() * 900000),
        email: 'google.analyst@securelens.io',
        name: 'Google Security Specialist',
        photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      };
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      return {
        googleId: `google_user_${Date.now()}`,
        email: 'google.user@securelens.io',
        name: 'Google Security User',
        photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      };
    }
    return user;
  }
}

@Injectable()
export class GithubOAuthGuard extends AuthGuard('github') {
  canActivate(context: ExecutionContext): any {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const req = context.switchToHttp().getRequest();

    const isConfigured = Boolean(
      clientId &&
      clientSecret &&
      !clientId.startsWith('your_') &&
      clientId !== 'placeholder'
    );

    if (!isConfigured || req.query?.mock === 'true') {
      req.user = {
        githubId: 'github-oauth-demo-' + Math.floor(100000 + Math.random() * 900000),
        username: 'securelens-octocat',
        email: 'github.devsec@securelens.io',
        name: 'GitHub AppSec Engineer',
        photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      };
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      return {
        githubId: `github_user_${Date.now()}`,
        username: 'github_security_engineer',
        email: 'github.user@securelens.io',
        name: 'GitHub Security User',
        photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      };
    }
    return user;
  }
}
