import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ScansModule } from './scans/scans.module';
import { FindingsModule } from './findings/findings.module';
import { ReportsModule } from './reports/reports.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { QueueModule } from './queue/queue.module';
import { AICopilotModule } from './ai/ai-copilot.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    WorkspacesModule,
    ScansModule,
    NotificationsModule,
    QueueModule,
    FindingsModule,
    ReportsModule,
    AnalyticsModule,
    AICopilotModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
