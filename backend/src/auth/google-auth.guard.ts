import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const res = context.switchToHttp().getResponse();
    const req = context.switchToHttp().getRequest();
    const baseUrl = process.env.BASE_URL || 'https://eii-tau.vercel.app';

    if (err || !user) {
      console.error('[Google OAuth Error Detail]', {
        errMessage: err?.message || err,
        infoMessage: info?.message || info,
        query: req?.query,
        headersHost: req?.headers?.host,
      });
      res.redirect(`${baseUrl}/login?error=google_auth_failed`);
      return null;
    }
    return user;
  }
}
