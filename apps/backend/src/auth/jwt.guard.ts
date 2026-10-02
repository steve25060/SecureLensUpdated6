import { Injectable, ExecutionContext, CanActivate, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext) {
    return (await super.canActivate(context)) as boolean;
  }
}

/**
 * Allows requests without a token for explicitly guest-capable endpoints.
 * When a Bearer token is supplied it MUST have a valid signature and expiry;
 * unverified payload decoding is never accepted.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization || request.headers?.Authorization;

    if (!authHeader) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Authentication required');
      }
      request.user = request.user || undefined;
      return true;
    }

    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const decoded: any = this.jwtService.verify(token);
      request.user = {
        userId: decoded.sub || decoded.userId || decoded.id || '',
        id: decoded.sub || decoded.userId || decoded.id || '',
        email: decoded.email || '',
        name: decoded.name || decoded.username || '',
        username: decoded.username || decoded.name || '',
        role: decoded.role || 'USER',
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired bearer token');
    }
  }
}
