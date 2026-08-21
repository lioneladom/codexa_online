import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const res = context.switchToHttp().getResponse();
    const req = context.switchToHttp().getRequest();
    const baseUrl = process.env.BASE_URL || 'https://eii-tau.vercel.app';

    if (!process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CLIENT_ID) {
      const missingVar = !process.env.GOOGLE_CLIENT_SECRET ? 'GOOGLE_CLIENT_SECRET' : 'GOOGLE_CLIENT_ID';
      console.error(`[CRITICAL] Missing ${missingVar} in Render environment settings!`);
      res.redirect(`${baseUrl}/login?error=google_auth_failed&detail=${encodeURIComponent(`Missing ${missingVar} in Render Dashboard Environment Settings`)}`);
      return null;
    }

    if (err || !user) {
      const queryErr = req?.query?.error ? `Google Callback Error: ${req.query.error} (${req.query.error_description || 'No description'})` : null;
      const infoMsg = info?.message || (typeof info === 'string' ? info : null);
      const errMsg = queryErr || err?.message || infoMsg || (err ? String(err) : 'Authentication failed during callback processing');
      console.error('[Google OAuth Error Detail]', {
        queryErr,
        errMessage: errMsg,
        infoMessage: infoMsg || info,
        query: req?.query,
        headersHost: req?.headers?.host,
      });
      res.redirect(`${baseUrl}/login?error=google_auth_failed&detail=${encodeURIComponent(errMsg)}`);
      return null;
    }
    return user;
  }
}
