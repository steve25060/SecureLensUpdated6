import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { AICopilotService, AIProvider, ChatMessage } from './ai-copilot.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedFinding } from '@securelens/findings-schema';

@Controller(['ai-copilot', 'ai'])
@UseGuards(OptionalJwtAuthGuard)
export class AICopilotController {
  constructor(
    private aiCopilot: AICopilotService,
    private prisma: PrismaService,
  ) {}

  /**
   * Real-time Interactive Chat
   */
  @Post('chat')
  @HttpCode(200)
  async chat(
    @Body()
    body: {
      messages?: ChatMessage[];
      message?: string;
      attachment?: any;
      findingId?: string;
      findingContext?: any;
      scanContext?: any;
      target?: string;
      provider?: AIProvider;
      apiKey?: string;
      model?: string;
      keysMap?: Record<string, { apiKey: string; model?: string }>;
    },
  ) {
    try {
      let findingContext = body.findingContext;
      if (body.findingId && !findingContext && this.prisma.connected) {
        findingContext = await this.prisma.finding.findUnique({
          where: { id: body.findingId },
        });
      }

      let messages: ChatMessage[] = body.messages || [];
      if (messages.length === 0 && body.message) {
        messages = [{ role: 'user', content: body.message, attachment: body.attachment }];
      }

      const result = await this.aiCopilot.chat({
        messages,
        findingContext,
        scanContext: body.scanContext,
        target: body.target,
        provider: body.provider,
        apiKey: body.apiKey,
        model: body.model,
        keysMap: body.keysMap,
      });

      return result;
    } catch (error: any) {
      return {
        reply: `AI Assistant unavailable: ${error.message}`,
        provider: 'error',
        model: 'none',
      };
    }
  }

  /**
   * Test AI API key connection
   */
  @Post('test')
  @HttpCode(200)
  async testConnection(
    @Body() body: { provider: AIProvider; apiKey: string; model?: string },
  ) {
    return this.aiCopilot.testConnection(body.provider, body.apiKey, body.model);
  }

  /**
   * Update runtime configuration
   */
  @Post('config')
  @HttpCode(200)
  async updateConfig(
    @Body()
    body: {
      primaryProvider?: AIProvider;
      failoverOrder?: AIProvider[];
      keys?: Partial<Record<AIProvider, { apiKey: string; model?: string; enabled?: boolean }>>;
      provider?: AIProvider;
      apiKey?: string;
      model?: string;
    },
  ) {
    this.aiCopilot.setRuntimeConfig(body);
    return { success: true, status: this.aiCopilot.getStatus() };
  }

  /**
   * Check if AI is configured and list supported providers
   */
  @Get('status')
  getAIStatus() {
    return this.aiCopilot.getStatus();
  }

  /**
   * Explain a finding
   */
  @Post('explain')
  @HttpCode(200)
  async explainFinding(@Body() body: { findingId: string }) {
    try {
      const finding = await this.prisma.finding.findUnique({
        where: { id: body.findingId },
      });

      if (!finding) {
        return { error: 'Finding not found' };
      }

      const unifiedFinding = this.convertToUnifiedFinding(finding);
      const explanation = await this.aiCopilot.explainFinding(unifiedFinding);

      if (this.prisma.connected) {
        await this.prisma.finding.update({
          where: { id: body.findingId },
          data: { aiExplanation: explanation },
        }).catch(() => {});
      }

      return { explanation };
    } catch (error: any) {
      return { error: error.message || String(error) };
    }
  }

  /**
   * Get remediation suggestions
   */
  @Post('remediate')
  @HttpCode(200)
  async suggestRemediation(@Body() body: { findingId: string }) {
    try {
      const finding = await this.prisma.finding.findUnique({
        where: { id: body.findingId },
      });

      if (!finding) {
        return { error: 'Finding not found' };
      }

      const unifiedFinding = this.convertToUnifiedFinding(finding);
      const remediation = await this.aiCopilot.suggestRemediation(unifiedFinding);

      if (this.prisma.connected) {
        await this.prisma.finding.update({
          where: { id: body.findingId },
          data: { remediation },
        }).catch(() => {});
      }

      return { remediation };
    } catch (error: any) {
      return { error: error.message || String(error) };
    }
  }

  /**
   * Explain attack scenario
   */
  @Post('attack-scenario')
  @HttpCode(200)
  async explainAttackScenario(@Body() body: { findingId: string }) {
    try {
      const finding = await this.prisma.finding.findUnique({
        where: { id: body.findingId },
      });

      if (!finding) {
        return { error: 'Finding not found' };
      }

      const unifiedFinding = this.convertToUnifiedFinding(finding);
      const scenario = await this.aiCopilot.explainAttackScenario(unifiedFinding);

      return { scenario };
    } catch (error: any) {
      return { error: error.message || String(error) };
    }
  }

  /**
   * Generate secure code example
   */
  @Post('code-example')
  @HttpCode(200)
  async generateCodeExample(@Body() body: { findingId: string }) {
    try {
      const finding = await this.prisma.finding.findUnique({
        where: { id: body.findingId },
      });

      if (!finding) {
        return { error: 'Finding not found' };
      }

      const unifiedFinding = this.convertToUnifiedFinding(finding);
      const code = await this.aiCopilot.generateSecureCodeExample(unifiedFinding);

      return { code };
    } catch (error: any) {
      return { error: error.message || String(error) };
    }
  }

  /**
   * Answer question about a finding
   */
  @Post('question')
  @HttpCode(200)
  async answerQuestion(
    @Body() body: { findingId: string; question: string },
  ) {
    try {
      const finding = await this.prisma.finding.findUnique({
        where: { id: body.findingId },
      });

      if (!finding) {
        return { error: 'Finding not found' };
      }

      const unifiedFinding = this.convertToUnifiedFinding(finding);
      const answer = await this.aiCopilot.answerQuestion(
        unifiedFinding,
        body.question,
      );

      return { answer };
    } catch (error: any) {
      return { error: error.message || String(error) };
    }
  }

  /**
   * Convert database Finding to UnifiedFinding
   */
  private convertToUnifiedFinding(finding: any): UnifiedFinding {
    return {
      id: finding.id,
      scanId: finding.scanId,
      workspaceId: finding.workspaceId,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      status: finding.status,
      category: finding.category,
      source: finding.source,
      engine: 'unknown',
      targetUrl: finding.url,
      targetPath: finding.parameter,
      evidence: finding.evidence,
      remediation: finding.remediation,
      cwe: finding.cwe,
      cvss: finding.cvss,
      owasp: finding.owasp,
      aiExplanation: finding.aiExplanation,
      firstSeen: finding.firstSeen,
      lastSeen: finding.lastSeen,
      resolvedAt: finding.resolvedAt,
      createdAt: finding.createdAt,
      updatedAt: finding.updatedAt,
    };
  }
}
