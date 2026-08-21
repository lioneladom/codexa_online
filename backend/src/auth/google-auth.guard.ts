import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const res = context.switchToHttp().getResponse();
    const req = context.switchToHttp().getRequest();
    const baseUrl = process.env.BASE_URL || 'https://eii-tau.vercel.app';

    if (err || !user) {
      const errMsg = err?.message || info?.message || (err ? String(err) : 'Authentication failed');
      console.error('[Google OAuth Error Detail]', {
        errMessage: errMsg,
        infoMessage: info?.message || info,
        query: req?.query,
        headersHost: req?.headers?.host,
      });
      res.redirect(`${baseUrl}/login?error=google_auth_failed&detail=${encodeURIComponent(errMsg)}`);
      return null;
    }
    return user;
  }
}
