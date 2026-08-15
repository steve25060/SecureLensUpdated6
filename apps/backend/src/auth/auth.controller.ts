import {
  Controller, Post, Put, Body, Get, Req, UseGuards, Redirect, UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, OAuthProfile } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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

  // ─── Google OAuth ───────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redirects to Google — no body needed.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Redirect()
  async googleAuthRedirect(@Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('Google did not return a user');
    const result = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.consoleLog('Google', `${frontendUrl}/callback?token=${result.access_token}`);
    return { url: `${frontendUrl}/callback?token=${result.access_token}`, statusCode: 302 };
  }

  // ─── GitHub OAuth ───────────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Passport redirects to GitHub — no body needed.
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @Redirect()
  async githubAuthRedirect(@Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('GitHub did not return a user');
    const result = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.consoleLog('GitHub', `${frontendUrl}/callback?token=${result.access_token}`);
    return { url: `${frontendUrl}/callback?token=${result.access_token}`, statusCode: 302 };
  }

  private consoleLog(provider: string, url: string) {
    // eslint-disable-next-line no-console
    console.log(`[${provider}Callback] Redirecting to: ${url}`);
  }
}
