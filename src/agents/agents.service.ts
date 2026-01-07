import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        online: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        online: true,
        createdAt: true,
      },
    });
  }

  async create(createDto: CreateAgentDto) {
    const hashedPassword = await bcrypt.hash(createDto.password, 10);
    return this.prisma.agent.create({
      data: {
        ...createDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        online: true,
        createdAt: true,
      },
    });
  }

  async updateOnlineStatus(id: string, online: boolean) {
    return this.prisma.agent.update({
      where: { id },
      data: { online },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        online: true,
      },
    });
  }
}

