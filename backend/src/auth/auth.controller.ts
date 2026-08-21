import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthGuard } from './google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('ping')
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {
    // Initiates the Google OAuth flow
  }

  @Get('google/debug')
  googleDebug() {
    const rawId = process.env.GOOGLE_CLIENT_ID || '';
    const rawSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const callback = process.env.GOOGLE_CALLBACK_URL || '';
    const baseUrl = process.env.BASE_URL || '';

    return {
      clientIdLength: rawId.length,
      clientIdPrefix: rawId.substring(0, 15),
      clientSecretLength: rawSecret.length,
      clientSecretPrefix: rawSecret.substring(0, 8),
      callbackUrl: callback,
      baseUrl: baseUrl,
      renderEnv: process.env.RENDER || null,
      nodeEnv: process.env.NODE_ENV || null,
    };
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthRedirect(@Req() req, @Res() res) {
    const rawBaseUrl = process.env.BASE_URL || 'https://eii-tau.vercel.app';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');

    if (!req.user) {
      return res.redirect(`${baseUrl}/login?error=google_auth_failed`);
    }

    const token = req.user.access_token;
    const user = JSON.stringify(req.user.user);

    res.redirect(`${baseUrl}/login?token=${token}&user=${encodeURIComponent(user)}`);
  }
}
