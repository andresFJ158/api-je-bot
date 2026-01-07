import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        agent: {
            id: any;
            name: any;
            email: any;
            role: any;
        };
    }>;
    validate(req: any): Promise<{
        valid: boolean;
        agent: any;
    }>;
}
