import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000';
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || `${backendUrl}/api/auth/google/callback`;

    super({
      clientID: clientID || 'placeholder',
      clientSecret: clientSecret || 'placeholder',
      callbackURL,
      scope: ['email', 'profile'],
    });
    
    if (!clientID || !clientSecret || clientID === 'placeholder') {
      console.warn('[GoogleStrategy] Google OAuth credentials not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    } else {
      console.log(`[GoogleStrategy] Initialized with Google credentials (Callback: ${callbackURL})`);
    }
  }

  validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    const user = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      photo: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
