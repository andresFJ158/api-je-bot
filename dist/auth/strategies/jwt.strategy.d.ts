import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private authService;
    private configService;
    private readonly logger;
    constructor(authService: AuthService, configService: ConfigService);
    validate(payload: any): Promise<{
        email: string;
        password: string;
        id: string;
        name: string;
        role: string;
        online: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
