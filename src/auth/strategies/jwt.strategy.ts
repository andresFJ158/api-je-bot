import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    // Log JWT_SECRET status (first 10 chars only for security)
    this.logger.log(`JWT Strategy initialized with secret: ${secret.substring(0, 10)}...`);

    // Verify both use the same secret
    const moduleSecret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
    if (secret !== moduleSecret) {
      this.logger.error('❌ JWT_SECRET mismatch between JwtModule and JwtStrategy!');
    } else {
      this.logger.debug('✅ JWT_SECRET is consistent between JwtModule and JwtStrategy');
    }
  }

  async validate(payload: any) {
    this.logger.debug(`Validating token payload: ${JSON.stringify({ sub: payload.sub, email: payload.email })}`);

    try {
      const agent = await this.authService.validateToken(payload);
      if (!agent) {
        this.logger.warn(`Agent not found for payload: ${payload.sub}`);
        throw new UnauthorizedException();
      }
      this.logger.debug(`Token validated successfully for agent: ${agent.email}`);
      return agent;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException();
    }
  }
}

