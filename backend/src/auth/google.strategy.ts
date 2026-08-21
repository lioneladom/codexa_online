import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    const rawCallback = process.env.GOOGLE_CALLBACK_URL;
    let callbackURL = rawCallback || 'http://localhost:3002/auth/google/callback';

    // Auto-detect production cloud environment (e.g. Render) and override localhost fallback
    if (process.env.RENDER || process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
      if (!rawCallback || rawCallback.includes('localhost')) {
        callbackURL = 'https://eii-g5vr.onrender.com/auth/google/callback';
      }
    }

    // Sanitize callback URL formatting
    callbackURL = callbackURL.replace(/^https?:\/\/https?:\/\//, 'https://');

    const clientID = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      if (!profile) {
        return done(null, false);
      }

      const emails = profile.emails;
      const name = profile.name;
      const email = (emails && emails[0] && emails[0].value) ? emails[0].value : `${profile.id}@google.com`;
      const firstName = name ? (name.givenName || '') : '';
      const lastName = name ? (name.familyName || '') : '';
      const fullName = profile.displayName || (`${firstName} ${lastName}`.trim()) || 'Google User';
      const picture = (profile.photos && profile.photos[0] && profile.photos[0].value) ? profile.photos[0].value : '';

      const user = {
        email,
        firstName,
        lastName,
        fullName,
        picture,
        accessToken,
      };
      
      const result = await this.authService.googleLogin(user);
      done(null, result);
    } catch (err) {
      console.error('Error during GoogleStrategy validate:', err);
      done(null, false);
    }
  }
}
