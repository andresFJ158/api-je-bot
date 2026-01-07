import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Run migrations in production before connecting
    // This ensures the database schema is up to date
    if (process.env.NODE_ENV === 'production') {
      try {
        this.logger.log('🔄 Running database migrations...');
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
          env: { ...process.env },
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        
        if (stdout) {
          this.logger.log(stdout);
        }
        if (stderr && !stderr.includes('No pending migrations')) {
          this.logger.warn(stderr);
        }
        
        this.logger.log('✅ Database migrations completed');
      } catch (error: any) {
        this.logger.error('❌ Failed to run migrations:', error.message);
        // Log but don't throw - this allows the app to start and show errors in logs
        // The migration error will be visible in Render logs
        if (error.stdout) {
          this.logger.error('Migration stdout:', error.stdout);
        }
        if (error.stderr) {
          this.logger.error('Migration stderr:', error.stderr);
        }
      }
    }
    
    await this.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
