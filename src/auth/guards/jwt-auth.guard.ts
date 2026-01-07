import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      this.logger.warn('No Authorization header found');
    } else {
      this.logger.debug(`Authorization header: ${authHeader.substring(0, 30)}...`);
    }
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: any, status?: any) {
    const request = context?.switchToHttp?.()?.getRequest();
    const authHeader = request?.headers?.authorization;
    
    if (authHeader) {
      this.logger.debug(`Authorization header: ${authHeader.substring(0, 30)}...`);
    }

    if (err || !user) {
      const errorMessage = info?.message || err?.message || 'Unknown authentication error';
      this.logger.error(`Authentication failed: ${errorMessage}`);
      throw err || new UnauthorizedException(errorMessage);
    }
    return user;
  }
}

