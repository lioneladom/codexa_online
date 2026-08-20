import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    // Sanitize callback URL in case of accidental double https:// prefix
    const rawCallback = process.env.GOOGLE_CALLBACK_URL as string;
    const callbackURL = rawCallback ? rawCallback.replace(/^https?:\/\/https?:\/\//, 'https://') : rawCallback;

    super({
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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
      const { name, emails } = profile;
      const user = {
        email: emails[0].value,
        firstName: name.givenName,
        lastName: name.familyName,
        fullName: profile.displayName || `${name.givenName} ${name.familyName}`,
        picture: profile.photos[0].value,
        accessToken,
      };
      
      const result = await this.authService.googleLogin(user);
      done(null, result);
    } catch (err) {
      done(err as Error, false);
    }
  }
}
