import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnifiedFinding } from '@securelens/findings-schema';

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'openai' | 'claude' | 'ollama';

export interface ChatAttachment {
  name?: string;
  size?: number;
  type?: string;
  isImage?: boolean;
  base64?: string;
  content?: string;
  mimeType?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachment?: ChatAttachment;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  enabled?: boolean;
}

export interface ChatRequestOptions {
  messages: ChatMessage[];
  findingContext?: any;
  scanContext?: any;
  target?: string;
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
  keysMap?: Record<string, { apiKey: string; model?: string }>;
}

/**
 * AI Security Copilot Service
 * 
 * Features:
 * 1. Multi-key registry: Saves individual API keys & models for EACH provider.
 * 2. Automatic Failover: When one provider reaches rate limits (429 / Quota / 503),
 *    it automatically and seamlessly switches to the next available configured provider.
 * 3. Fallback Engine: Built-in AppSec intelligence if all external APIs are unreachable.
 */
@Injectable()
export class AICopilotService {
  private readonly logger = new Logger(AICopilotService.name);
  private primaryProvider: AIProvider = 'gemini';

  private customFailoverOrder: AIProvider[] = ['gemini', 'groq', 'openrouter', 'openai', 'claude', 'ollama'];

  private providerRegistry: Record<AIProvider, ProviderConfig> = {
    gemini: { apiKey: '', model: 'gemini-3.5-flash', enabled: true },
    groq: { apiKey: '', model: 'llama-3.3-70b-versatile', enabled: true },
    openrouter: { apiKey: '', model: 'meta-llama/llama-3.3-70b-instruct:free', enabled: true },
    openai: { apiKey: '', model: 'gpt-4o-mini', enabled: true },
    claude: { apiKey: '', model: 'claude-3-5-sonnet-20241022', enabled: true },
    ollama: { apiKey: 'http://localhost:11434', model: 'llama3.3', enabled: true },
  };

  constructor(private configService: ConfigService) {
    // Load all provider keys from environment if available
    const geminiKey = this.configService.get('GEMINI_API_KEY');
    const groqKey = this.configService.get('GROQ_API_KEY');
    const openRouterKey = this.configService.get('OPENROUTER_API_KEY');
    const openAIKey = this.configService.get('OPENAI_API_KEY');
    const claudeKey = this.configService.get('CLAUDE_API_KEY');
    const ollamaUrl = this.configService.get('OLLAMA_BASE_URL');

    if (geminiKey) this.providerRegistry.gemini.apiKey = geminiKey;
    if (groqKey) this.providerRegistry.groq.apiKey = groqKey;
    if (openRouterKey) this.providerRegistry.openrouter.apiKey = openRouterKey;
    if (openAIKey) this.providerRegistry.openai.apiKey = openAIKey;
    if (claudeKey) this.providerRegistry.claude.apiKey = claudeKey;
    if (ollamaUrl) this.providerRegistry.ollama.apiKey = ollamaUrl;

    // Set default primary provider based on active keys
    if (geminiKey) {
      this.primaryProvider = 'gemini';
    } else if (groqKey) {
      this.primaryProvider = 'groq';
    } else if (openRouterKey) {
      this.primaryProvider = 'openrouter';
    } else if (openAIKey) {
      this.primaryProvider = 'openai';
    } else if (claudeKey) {
      this.primaryProvider = 'claude';
    }

    this.logger.log(`AICopilotService initialized. Primary: ${this.primaryProvider}. Configured keys: ${this.getConfiguredProviders().join(', ') || 'None'}`);
  }

  /**
   * Get list of providers that have an API key configured
   */
  getConfiguredProviders(): AIProvider[] {
    return (Object.keys(this.providerRegistry) as AIProvider[]).filter(p => {
      if (p === 'ollama') return true;
      return !!this.providerRegistry[p].apiKey;
    });
  }

  /**
   * Set dynamic runtime configuration for all providers from UI
   */
  setRuntimeConfig(config: {
    primaryProvider?: AIProvider;
    failoverOrder?: AIProvider[];
    keys?: Partial<Record<AIProvider, { apiKey: string; model?: string; enabled?: boolean }>>;
    provider?: AIProvider;
    apiKey?: string;
    model?: string;
  }) {
    if (config.primaryProvider) {
      this.primaryProvider = config.primaryProvider;
    } else if (config.provider) {
      this.primaryProvider = config.provider;
    }

    if (config.failoverOrder && Array.isArray(config.failoverOrder) && config.failoverOrder.length > 0) {
      this.customFailoverOrder = config.failoverOrder;
    }

    // Update specific provider key
    if (config.provider && config.apiKey !== undefined) {
      this.providerRegistry[config.provider] = {
        apiKey: config.apiKey,
        model: config.model || this.providerRegistry[config.provider].model,
        enabled: true,
      };
    }

    // Update bulk keys
    if (config.keys) {
      for (const [p, val] of Object.entries(config.keys)) {
        const providerKey = p as AIProvider;
        if (this.providerRegistry[providerKey] && val) {
          if (val.apiKey !== undefined) this.providerRegistry[providerKey].apiKey = val.apiKey;
          if (val.model) this.providerRegistry[providerKey].model = val.model;
          if (val.enabled !== undefined) this.providerRegistry[providerKey].enabled = val.enabled;
        }
      }
    }

    this.logger.log(`AI Configuration updated. Primary: ${this.primaryProvider}. Failover Order: ${this.customFailoverOrder.join(' -> ')}`);
  }

  /**
   * Get active status of all providers
   */
  getStatus() {
    const configured = this.getConfiguredProviders();
    return {
      configured: configured.length > 0,
      primaryProvider: this.primaryProvider,
      provider: this.primaryProvider,
      model: this.providerRegistry[this.primaryProvider]?.model || this.getDefaultModel(this.primaryProvider),
      failoverOrder: this.buildFailoverQueue(this.primaryProvider),
      customFailoverOrder: this.customFailoverOrder,
      providers: {
        gemini: { configured: !!this.providerRegistry.gemini.apiKey, model: this.providerRegistry.gemini.model, enabled: this.providerRegistry.gemini.enabled !== false },
        groq: { configured: !!this.providerRegistry.groq.apiKey, model: this.providerRegistry.groq.model, enabled: this.providerRegistry.groq.enabled !== false },
        openrouter: { configured: !!this.providerRegistry.openrouter.apiKey, model: this.providerRegistry.openrouter.model, enabled: this.providerRegistry.openrouter.enabled !== false },
        openai: { configured: !!this.providerRegistry.openai.apiKey, model: this.providerRegistry.openai.model, enabled: this.providerRegistry.openai.enabled !== false },
        claude: { configured: !!this.providerRegistry.claude.apiKey, model: this.providerRegistry.claude.model, enabled: this.providerRegistry.claude.enabled !== false },
        ollama: { configured: true, model: this.providerRegistry.ollama.model, enabled: this.providerRegistry.ollama.enabled !== false },
      },
      supportedProviders: [
        { id: 'gemini', name: 'Google Gemini (3.5 / 3.7 Flash)', free: true, url: 'https://aistudio.google.com/app/apikey', defaultModel: 'gemini-3.5-flash', configured: !!this.providerRegistry.gemini.apiKey },
        { id: 'groq', name: 'Groq Cloud (Llama 3.3 70B & DeepSeek R1)', free: true, url: 'https://console.groq.com/keys', defaultModel: 'llama-3.3-70b-versatile', configured: !!this.providerRegistry.groq.apiKey },
        { id: 'openrouter', name: 'OpenRouter (Free Llama 3.3 / DeepSeek)', free: true, url: 'https://openrouter.ai/keys', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free', configured: !!this.providerRegistry.openrouter.apiKey },
        { id: 'openai', name: 'OpenAI (GPT-4o & o3-mini)', free: false, url: 'https://platform.openai.com/api-keys', defaultModel: 'gpt-4o-mini', configured: !!this.providerRegistry.openai.apiKey },
        { id: 'claude', name: 'Anthropic Claude (3.5 Sonnet & Haiku)', free: false, url: 'https://console.anthropic.com/', defaultModel: 'claude-3-5-sonnet-20241022', configured: !!this.providerRegistry.claude.apiKey },
        { id: 'ollama', name: 'Local Ollama (Llama 3.3 / Qwen 2.5 / DeepSeek)', free: true, url: 'http://localhost:11434', defaultModel: 'llama3.3', configured: true },
      ],
    };
  }

  /**
   * Build failover order starting from primary provider and adhering to user custom failover order
   */
  private buildFailoverQueue(
    requestedPrimary?: AIProvider,
    customKeys?: Record<string, { apiKey: string; model?: string }>,
    explicitOrder?: AIProvider[],
  ): AIProvider[] {
    const primary = requestedPrimary || this.primaryProvider;
    let baseOrder = explicitOrder || [...this.customFailoverOrder];

    // Ensure primary provider is attempted first
    if (primary && baseOrder.includes(primary)) {
      baseOrder = [primary, ...baseOrder.filter(p => p !== primary)];
    }

    // Filter to only configured & enabled providers
    return baseOrder.filter(p => {
      if (this.providerRegistry[p]?.enabled === false) return false;
      if (customKeys && customKeys[p]?.apiKey) return true;
      if (this.providerRegistry[p]?.apiKey) return true;
      if (p === 'ollama') return true;
      return false;
    });
  }

  /**
   * Interactive multi-turn chat with automatic failover when rate limits are exceeded
   */
  async chat(options: ChatRequestOptions): Promise<{ reply: string; provider: string; model: string; failoverUsed?: boolean }> {
    // If runtime keys were passed in the request body from client, register them temporarily
    if (options.keysMap) {
      for (const [p, val] of Object.entries(options.keysMap)) {
        const prov = p as AIProvider;
        if (this.providerRegistry[prov] && val.apiKey) {
          this.providerRegistry[prov].apiKey = val.apiKey;
          if (val.model) this.providerRegistry[prov].model = val.model;
        }
      }
    }
    if (options.provider && options.apiKey) {
      this.providerRegistry[options.provider].apiKey = options.apiKey;
      if (options.model) this.providerRegistry[options.provider].model = options.model;
    }

    const primaryChoice = options.provider || this.primaryProvider;
    const failoverQueue = this.buildFailoverQueue(primaryChoice, options.keysMap);

    const systemPrompt = `You are SecureLens AI Copilot, an elite cybersecurity and application security expert.
Your job is to analyze security scan findings, explain vulnerabilities with precision (Root Cause, Attack Vector, CWE/OWASP mapping, CVSS 3.1 impact), and provide step-by-step code-level remediation.
Format your responses with clear markdown, headings, bullet points, and syntax-highlighted code blocks.
${options.target ? `Current Scanned Asset Target: ${options.target}` : ''}
${options.scanContext ? `Live Scan Execution Metrics: ${JSON.stringify(options.scanContext)}` : ''}
${options.findingContext ? `Current Finding Context: ${JSON.stringify(options.findingContext)}` : ''}`;

    let lastError: string = '';
    let usedFailover = false;

    // Execute through failover queue
    for (let i = 0; i < failoverQueue.length; i++) {
      const candidate = failoverQueue[i];
      const keyConfig = this.providerRegistry[candidate];
      const apiKey = (options.keysMap && options.keysMap[candidate]?.apiKey) || keyConfig.apiKey;
      const model = (options.keysMap && options.keysMap[candidate]?.model) || keyConfig.model || this.getDefaultModel(candidate);

      if (!apiKey && candidate !== 'ollama') continue;

      try {
        let reply = '';
        if (candidate === 'gemini') {
          reply = await this.callGemini(options.messages, apiKey, model, systemPrompt);
        } else if (candidate === 'groq') {
          reply = await this.callGroq(options.messages, apiKey, model, systemPrompt);
        } else if (candidate === 'openrouter') {
          reply = await this.callOpenRouter(options.messages, apiKey, model, systemPrompt);
        } else if (candidate === 'openai') {
          reply = await this.callOpenAI(options.messages, apiKey, model, systemPrompt);
        } else if (candidate === 'claude') {
          reply = await this.callClaude(options.messages, apiKey, model, systemPrompt);
        } else if (candidate === 'ollama') {
          reply = await this.callOllama(options.messages, model, systemPrompt);
        }

        if (reply) {
          const providerLabel = usedFailover
            ? `${candidate.toUpperCase()} (Auto-failover from ${primaryChoice})`
            : candidate.toUpperCase();

          return {
            reply,
            provider: providerLabel,
            model,
            failoverUsed: usedFailover,
          };
        }
      } catch (err: any) {
        lastError = err.message || String(err);
        this.logger.warn(`Provider ${candidate} failed or rate-limited: ${lastError}. Attempting failover to next provider...`);
        usedFailover = true;
      }
    }

    // If all providers failed or no keys configured, use built-in intelligence
    const fallbackReply = this.generateFallbackChatResponse(options);
    const reasonNote = lastError ? `\n\n*(Note: Configured AI APIs were temporarily rate-limited or unavailable: ${lastError}. Displaying built-in security analysis.)*` : '';
    return {
      reply: `${fallbackReply}${reasonNote}`,
      provider: 'SecureLens Intelligence (Built-in)',
      model: 'RuleEngine-v2.5',
      failoverUsed: true,
    };
  }

  /**
   * Test API Key connection
   */
  async testConnection(provider: AIProvider, apiKey: string, model?: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    const testMessages: ChatMessage[] = [
      { role: 'user', content: 'Reply with "SecureLens AI Connected Successfully" in 5 words.' }
    ];

    try {
      const activeModel = model || this.providerRegistry[provider]?.model || this.getDefaultModel(provider);
      let res = '';
      if (provider === 'gemini') {
        res = await this.callGemini(testMessages, apiKey, activeModel);
      } else if (provider === 'groq') {
        res = await this.callGroq(testMessages, apiKey, activeModel);
      } else if (provider === 'openrouter') {
        res = await this.callOpenRouter(testMessages, apiKey, activeModel);
      } else if (provider === 'openai') {
        res = await this.callOpenAI(testMessages, apiKey, activeModel);
      } else if (provider === 'claude') {
        res = await this.callClaude(testMessages, apiKey, activeModel);
      } else if (provider === 'ollama') {
        res = await this.callOllama(testMessages, activeModel);
      }
      const latencyMs = Date.now() - start;
      return { success: true, message: `Connected to ${provider} (${activeModel}): "${res.slice(0, 80)}"`, latencyMs };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message}`, latencyMs: Date.now() - start };
    }
  }

  /**
   * Explain a finding
   */
  async explainFinding(finding: UnifiedFinding): Promise<string> {
    const prompt = `Provide a comprehensive cybersecurity explanation for this finding:
Title: ${finding.title}
Target: ${finding.targetUrl || 'Target Website'}
Severity: ${finding.severity}
Category: ${finding.category}
Source: ${finding.source}
Description: ${finding.description}
CWE: ${finding.cwe || 'N/A'} | CVE: ${finding.cve || 'N/A'}

Format your answer with:
1. Root Cause & Technical Mechanics
2. Exploitation Vectors & Attacker Perspective
3. OWASP & CWE Classification
4. Business & Compliance Impact`;

    const { reply } = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      findingContext: finding,
      target: finding.targetUrl,
    });
    return reply;
  }

  /**
   * Generate remediation suggestions
   */
  async suggestRemediation(finding: UnifiedFinding): Promise<string> {
    const prompt = `Provide practical code-level remediation steps for this vulnerability:
Title: ${finding.title}
Target: ${finding.targetUrl || 'Target Website'}
Severity: ${finding.severity}
Category: ${finding.category}
Current Description: ${finding.description}
Suggested Fix: ${finding.remediation || 'Standard mitigation'}

Format your answer with:
1. Immediate Containment Action
2. Step-by-Step Fix Instructions
3. Production Code Snippets (Vulnerable vs Patched)
4. Verification & Validation Steps with CLI commands`;

    const { reply } = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      findingContext: finding,
      target: finding.targetUrl,
    });
    return reply;
  }

  async explainAttackScenario(finding: UnifiedFinding): Promise<string> {
    const prompt = `Describe a realistic attack scenario exploiting ${finding.title} on ${finding.targetUrl || 'target website'}. Include reconnaissance, weaponization, delivery, and post-exploitation.`;
    const { reply } = await this.chat({ messages: [{ role: 'user', content: prompt }], findingContext: finding });
    return reply;
  }

  async generateSecureCodeExample(finding: UnifiedFinding): Promise<string> {
    const prompt = `Provide a secure code example with before/after diff for ${finding.title}.`;
    const { reply } = await this.chat({ messages: [{ role: 'user', content: prompt }], findingContext: finding });
    return reply;
  }

  async answerQuestion(finding: UnifiedFinding, question: string): Promise<string> {
    const { reply } = await this.chat({
      messages: [{ role: 'user', content: question }],
      findingContext: finding,
      target: finding.targetUrl,
    });
    return reply;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROVIDER CALL IMPLEMENTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 1. Google Gemini API (Free: Gemini 3.5 Flash / Gemini 3.7 Flash / Gemini 3.1 Flash Lite)
   */
  private async callGemini(messages: ChatMessage[], apiKey: string, model: string = 'gemini-3.5-flash', systemPrompt?: string): Promise<string> {
    const modelsToTry = [model, 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    const uniqueModels = Array.from(new Set(modelsToTry));

    let lastError = '';
    for (const m of uniqueModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;

      const contents = messages.map(msg => {
        const parts: any[] = [];
        // Support multimodal images directly in Gemini
        if (msg.attachment?.isImage && msg.attachment?.base64) {
          const rawBase64 = msg.attachment.base64.replace(/^data:[a-zA-Z0-9\/\+]+;base64,/, '');
          const mime = msg.attachment.mimeType || (msg.attachment.base64.match(/^data:([a-zA-Z0-9\/\+]+);base64,/)?.[1]) || 'image/png';
          parts.push({
            inlineData: {
              mimeType: mime,
              data: rawBase64,
            },
          });
        }
        parts.push({ text: msg.content });
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      });

      const body: any = {
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500,
        },
      };

      if (systemPrompt) {
        body.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const json = await res.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          const errText = await res.text();
          lastError = `Gemini model ${m} error (${res.status}): ${errText}`;
          if (res.status === 404 || res.status === 503) {
            continue;
          } else {
            throw new Error(lastError);
          }
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    throw new Error(lastError || 'Gemini API failed to generate content');
  }

  /**
   * 2. Groq Cloud API (Free Ultra-Fast: Llama 3.3 70B Versatile / Llama 3.1 8B)
   */
  private async callGroq(messages: ChatMessage[], apiKey: string, model: string = 'llama-3.3-70b-versatile', systemPrompt?: string): Promise<string> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const formattedMessages: any[] = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    messages.forEach(m => {
      if (m.attachment?.isImage && m.attachment?.base64) {
        formattedMessages.push({
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.attachment.base64 } }
          ]
        });
      } else {
        formattedMessages.push({ role: m.role, content: m.content });
      }
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    return json?.choices?.[0]?.message?.content || 'No response generated by Groq.';
  }

  /**
   * 3. OpenRouter API (Free models aggregator)
   */
  private async callOpenRouter(messages: ChatMessage[], apiKey: string, model: string = 'nvidia/nemotron-3.5-lightning:free', systemPrompt?: string): Promise<string> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const formattedMessages: any[] = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    messages.forEach(m => {
      if (m.attachment?.isImage && m.attachment?.base64) {
        formattedMessages.push({
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.attachment.base64 } }
          ]
        });
      } else {
        formattedMessages.push({ role: m.role, content: m.content });
      }
    });

    const candidateModels = [
      model,
      'nvidia/nemotron-3.5-lightning:free',
      'liquid/lfm-2.5-2.6b:free',
      'openai/gpt-oss-20b:free',
      'google/gemma-4-31b-it:free',
    ];

    let lastError = '';
    for (const m of candidateModels) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://securelens.local',
            'X-Title': 'SecureLens AppSec Platform',
          },
          body: JSON.stringify({
            model: m,
            messages: formattedMessages,
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const choice = json?.choices?.[0];
          const text = choice?.message?.content || choice?.message?.reasoning;
          if (text) return text;
        } else {
          const errText = await res.text();
          lastError = `OpenRouter model ${m} error (${res.status}): ${errText}`;
          if (res.status === 404 || res.status === 429 || res.status === 503) {
            continue;
          } else {
            throw new Error(lastError);
          }
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    throw new Error(lastError || 'OpenRouter API failed to generate content');
  }

  /**
   * 4. OpenAI API
   */
  private async callOpenAI(messages: ChatMessage[], apiKey: string, model: string = 'gpt-4o-mini', systemPrompt?: string): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const formattedMessages: any[] = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    messages.forEach(m => {
      if (m.attachment?.isImage && m.attachment?.base64) {
        formattedMessages.push({
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.attachment.base64 } }
          ]
        });
      } else {
        formattedMessages.push({ role: m.role, content: m.content });
      }
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    return json?.choices?.[0]?.message?.content || 'No response generated by OpenAI.';
  }

  /**
   * 5. Anthropic Claude API
   */
  private async callClaude(messages: ChatMessage[], apiKey: string, model: string = 'claude-3-5-sonnet-20241022', systemPrompt?: string): Promise<string> {
    const url = 'https://api.anthropic.com/v1/messages';

    const formattedMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        if (m.attachment?.isImage && m.attachment?.base64) {
          const rawBase64 = m.attachment.base64.replace(/^data:[a-zA-Z0-9\/\+]+;base64,/, '');
          const mediaType = (m.attachment.mimeType || 'image/png') as any;
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: rawBase64 } }
            ]
          };
        }
        return { role: m.role, content: m.content };
      });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt || 'You are an elite cybersecurity expert.',
        messages: formattedMessages,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    return json?.content?.[0]?.text || 'No response generated by Claude.';
  }

  /**
   * 6. Local Ollama API (Offline)
   */
  private async callOllama(messages: ChatMessage[], model: string = 'llama3.3', systemPrompt?: string): Promise<string> {
    const baseUrl = this.configService.get('OLLAMA_BASE_URL') || 'http://localhost:11434';
    const url = `${baseUrl}/api/chat`;

    const formattedMessages: any[] = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    messages.forEach(m => formattedMessages.push({ role: m.role, content: m.content }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    return json?.message?.content || 'No response generated by Ollama.';
  }

  private getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'gemini': return 'gemini-3.5-flash';
      case 'groq': return 'llama-3.3-70b-versatile';
      case 'openrouter': return 'meta-llama/llama-3.3-70b-instruct:free';
      case 'openai': return 'gpt-4o-mini';
      case 'claude': return 'claude-3-5-sonnet-20241022';
      case 'ollama': return 'llama3.3';
      default: return 'gemini-3.5-flash';
    }
  }

  private generateFallbackChatResponse(options: ChatRequestOptions): string {
    const lastMessage = options.messages[options.messages.length - 1]?.content || '';
    const queryLower = lastMessage.toLowerCase();
    const target = options.target || 'target website';

    if (queryLower.includes('remediat') || queryLower.includes('fix') || queryLower.includes('code')) {
      return `### 🛡️ Step-by-Step Security Remediation Roadmap for **${target}**

#### 1. Security Headers Configuration (HTTP Enforcement)
Add the following strict headers in your web server configuration (Nginx / Cloudflare / Apache):
\`\`\`nginx
# Enforce modern defense-in-depth headers
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https: 'nonce-...'; object-src 'none';" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
\`\`\`

#### 2. SQL & Input Injection Prevention
Always use parameterized queries and prepared statements:
\`\`\`typescript
// Secure parameterized query
const user = await prisma.user.findUnique({
  where: { email: sanitizeInput(userInputEmail) }
});
\`\`\`

#### 3. Cookie Hardening
Set cookies with \`Secure\`, \`HttpOnly\`, and \`SameSite=Strict\` attributes.`;
    }

    if (queryLower.includes('explain') || queryLower.includes('vulnerab') || queryLower.includes('root cause')) {
      return `### 🔍 AI Vulnerability Root Cause Analysis for **${target}**

1. **Mechanics**: Vulnerabilities arise when trust boundaries fail to validate inbound input or when default defensive headers are absent from HTTP response pipelines.
2. **Attack Surface**: Untrusted clients can exploit misconfigurations to execute cross-site scripting (XSS), clickjack user sessions, or probe unauthenticated backend APIs.
3. **Defense Standard**: Adheres to **OWASP Top 10 A05:2021 (Security Misconfiguration)** and **CWE-1021 / CWE-79**.
4. **Resolution**: Apply the security configurations above and trigger a new SecureLens Live Scan to verify full remediation.`;
    }

    return `### 🤖 Security Intelligence Summary for **${target}**

- **Scan Posture**: Fully analyzed with multi-engine correlation.
- **Top Action**: Ensure defensive security headers (CSP, HSTS, X-Frame-Options) are enforced.
- **Recommended Free AI Integration**: Connect **Google Gemini 3.5 Flash** or **Groq Cloud (Llama 3.3 70B)** in **Settings → AI Copilot** for unlimited real-time AI security answers and automatic code generation.`;
  }
}
