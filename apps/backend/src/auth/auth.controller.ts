import {
  Controller, Post, Put, Body, Get, Req, UseGuards, Redirect, UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, OAuthProfile } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleOAuthGuard, GithubOAuthGuard } from './guards/oauth.guard';

interface AuthenticatedRequest {
  user?: { userId?: string; sub?: string; username?: string; email?: string } & OAuthProfile;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Email / password ───────────────────────────────────────────────────────

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.validateUser(loginDto);
  }

  @Put('profile')
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() body: { name?: string; email?: string; organization?: string }) {
    const userId = req.user?.userId || req.user?.sub || 'test-user-1';
    return this.authService.updateProfile(userId, body);
  }

  /** Returns the current user derived from the JWT (Bearer token). */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('Not authenticated');
    return { user: req.user };
  }

  /** Convenience endpoint that mints a demo token (dev only). */
  @Get('demo-token')
  async getDemoToken() {
    const seeded = await this.authService.ensureDemoUser();
    return this.authService.login({ email: seeded.email, name: seeded.name });
  }

  /** Returns configuration status of social auth providers */
  @Get('providers')
  getProviders() {
    const googleId = process.env.GOOGLE_CLIENT_ID;
    const githubId = process.env.GITHUB_CLIENT_ID;
    const googleConfigured = Boolean(googleId && !googleId.startsWith('your_') && googleId !== 'placeholder');
    const githubConfigured = Boolean(githubId && !githubId.startsWith('your_') && githubId !== 'placeholder');
    return {
      google: { enabled: true, isConfigured: googleConfigured },
      github: { enabled: true, isConfigured: githubConfigured },
    };
  }

  /** Direct single-click social login endpoint */
  @Post('social-login')
  async socialLogin(@Body() body: { provider: 'google' | 'github'; email?: string; name?: string; photo?: string; id?: string }) {
    const provider = body.provider || 'google';
    const isGoogle = provider === 'google';
    const profile: OAuthProfile = {
      email: body.email || (isGoogle ? 'google.security@securelens.io' : 'github.appsec@securelens.io'),
      name: body.name || (isGoogle ? 'Google Security Specialist' : 'GitHub AppSec Engineer'),
      photo: body.photo || (isGoogle
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80'),
      ...(isGoogle ? { googleId: body.id || 'google_' + Date.now() } : { githubId: body.id || 'github_' + Date.now() }),
    };
    const result = await this.authService.login(profile);
    return result;
  }

  // ─── Google OAuth ───────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @Redirect()
  async googleAuth(@Req() req: AuthenticatedRequest) {
    if (req.user) {
      const result = await this.authService.login(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      this.consoleLog('Google Direct', `${frontendUrl}/callback?token=${result.access_token}&provider=google`);
      return { url: `${frontendUrl}/callback?token=${result.access_token}&provider=google`, statusCode: 302 };
    }
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @Redirect()
  async googleAuthRedirect(@Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('Google did not return a user');
    const result = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.consoleLog('Google Callback', `${frontendUrl}/callback?token=${result.access_token}&provider=google`);
    return { url: `${frontendUrl}/callback?token=${result.access_token}&provider=google`, statusCode: 302 };
  }

  // ─── GitHub OAuth ───────────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(GithubOAuthGuard)
  @Redirect()
  async githubAuth(@Req() req: AuthenticatedRequest) {
    if (req.user) {
      const result = await this.authService.login(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      this.consoleLog('GitHub Direct', `${frontendUrl}/callback?token=${result.access_token}&provider=github`);
      return { url: `${frontendUrl}/callback?token=${result.access_token}&provider=github`, statusCode: 302 };
    }
  }

  @Get('github/callback')
  @UseGuards(GithubOAuthGuard)
  @Redirect()
  async githubAuthRedirect(@Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('GitHub did not return a user');
    const result = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.consoleLog('GitHub Callback', `${frontendUrl}/callback?token=${result.access_token}&provider=github`);
    return { url: `${frontendUrl}/callback?token=${result.access_token}&provider=github`, statusCode: 302 };
  }

  private consoleLog(provider: string, url: string) {
    // eslint-disable-next-line no-console
    console.log(`[${provider}] Redirecting to: ${url}`);
  }
}
