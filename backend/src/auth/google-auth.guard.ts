import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const res = context.switchToHttp().getResponse();
    const baseUrl = process.env.BASE_URL || 'https://eii-tau.vercel.app';

    if (err || !user) {
      console.error('Google OAuth Authentication error or cancelled by user:', err || info);
      res.redirect(`${baseUrl}/login?error=google_auth_failed`);
      return null;
    }
    return user;
  }
}
