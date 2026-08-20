import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req, @Res() res) {
    const baseUrl = process.env.BASE_URL || 'https://eii-tau.vercel.app';
    if (!req.user) {
      return res.redirect(`${baseUrl}/login?error=google_auth_failed`);
    }

    const token = req.user.access_token;
    const user = JSON.stringify(req.user.user);

    res.redirect(`${baseUrl}/login?token=${token}&user=${encodeURIComponent(user)}`);
  }
}
