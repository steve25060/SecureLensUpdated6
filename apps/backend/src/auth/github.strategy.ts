import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    const clientID = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000';
    const callbackURL = process.env.GITHUB_CALLBACK_URL || `${backendUrl}/api/auth/github/callback`;

    super({
      clientID: clientID || 'placeholder',
      clientSecret: clientSecret || 'placeholder',
      callbackURL,
      scope: ['user:email'],
      userProfileURL: 'https://api.github.com/user',
    });
    
    if (!clientID || !clientSecret || clientID === 'placeholder') {
      console.warn('[GithubStrategy] GitHub OAuth credentials not configured - set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
    } else {
      console.log(`[GithubStrategy] Initialized with GitHub credentials (Callback: ${callbackURL})`);
    }
  }

  validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    const user = {
      githubId: String(profile.id),
      username: profile.username,
      email: profile.emails?.[0]?.value || profile.email || `${profile.username}@github.local`,
      name: profile.displayName || profile.name || profile.username || 'GitHub User',
      photo: profile.photos?.[0]?.value || profile.avatar_url,
    };
    done(null, user);
  }
}
