import { Controller, Get, Req, UseGuards, Redirect, UnauthorizedException } from '@nestjs/common';
import { AuthService, OAuthProfile } from './auth.service';
import { GoogleOAuthGuard, GithubOAuthGuard } from './guards/oauth.guard';

interface OAuthRequest {
  user?: OAuthProfile;
}

@Controller('auth')
export class OAuthFallbackController {
  constructor(private readonly authService: AuthService) {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @Redirect()
  async googleAuthRedirectFallback(@Req() req: OAuthRequest) {
    if (!req.user) throw new UnauthorizedException('Google did not return a user');
    const result = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return { url: `${frontendUrl}/callback?token=${result.access_token}&provider=google`, statusCode: 302 };
  }

  @Get('github/callback')
  @UseGuards(GithubOAuthGuard)
  @Redirect()
  async githubAuthRedirectFallback(@Req() req: OAuthRequest) {
    if (!req.user) throw new UnauthorizedException('GitHub did not return a user');
    const result = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return { url: `${frontendUrl}/callback?token=${result.access_token}&provider=github`, statusCode: 302 };
  }
}
