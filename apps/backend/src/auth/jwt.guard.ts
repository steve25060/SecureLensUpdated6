import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext) {
    return (await super.canActivate(context)) as boolean;
  }
}

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      return JSON.parse(payload);
    }
  } catch {}
  return null;
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization || request.headers?.Authorization;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const decoded = decodeJwtPayload(token);
      if (decoded) {
        request.user = {
          userId: decoded.sub || decoded.userId || decoded.id || 'demo-user-1',
          id: decoded.sub || decoded.userId || decoded.id || 'demo-user-1',
          email: decoded.email || 'demo@securelens.local',
          name: decoded.name || decoded.username || 'Demo User',
          username: decoded.username || decoded.name || 'demo',
          role: decoded.role || 'USER',
        };
        return true;
      }
    }

    // Assign fallback user for live scan & dashboard session
    request.user = request.user || {
      id: 'demo-user-1',
      userId: 'demo-user-1',
      username: 'demo',
      name: 'Demo User',
      email: 'demo@securelens.local',
      role: 'USER',
    };
    return true;
  }
}
