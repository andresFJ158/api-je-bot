import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateAgent(email: string, password: string): Promise<any> {
    const agent = await this.prisma.agent.findUnique({
      where: { email },
    });

    if (!agent) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar que la contraseña esté hasheada (debe empezar con $2a$, $2b$ o $2y$)
    const isHashed = agent.password.startsWith('$2a$') || 
                     agent.password.startsWith('$2b$') || 
                     agent.password.startsWith('$2y$');

    if (!isHashed) {
      // Si la contraseña no está hasheada, es un error de configuración
      throw new UnauthorizedException('Invalid credentials - password not properly hashed');
    }

    const isPasswordValid = await bcrypt.compare(password, agent.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = agent;
    return result;
  }

  async login(loginDto: LoginDto) {
    const agent = await this.validateAgent(loginDto.email, loginDto.password);
    const payload = { email: agent.email, sub: agent.id, role: agent.role };

    return {
      access_token: this.jwtService.sign(payload),
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
      },
    };
  }

  async validateToken(payload: any) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: payload.sub },
    });

    if (!agent) {
      throw new UnauthorizedException();
    }

    return agent;
  }
}

