import { Injectable, Logger } from '@nestjs/common';
import Queue, { Job } from 'bull';
import { ConfigService } from '@nestjs/config';

/**
 * Wrapper around Bull queues.
 *
 * Redis is optional for the core product flow (register/login/workspaces/live
 * scan all work without it). This service degrades gracefully: if Redis is
 * unreachable, queue creation is skipped and job-submission calls become no-ops
 * that resolve immediately instead of throwing.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private scanQueue?: Queue.Queue;
  private parserQueue?: Queue.Queue;
  private correlationQueue?: Queue.Queue;
  private scoringQueue?: Queue.Queue;
  /** True only if every queue was created successfully. */
  private ready = false;

  constructor(private configService: ConfigService) {
    this.initializeQueues();
  }

  get isReady() {
    return this.ready;
  }

  private initializeQueues() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (!redisUrl) {
        this.ready = false;
        this.logger.log('REDIS_URL is not configured — optional Bull queues are disabled');
        return;
      }

      this.scanQueue = new Queue('scans', redisUrl);
      this.parserQueue = new Queue('parser', redisUrl);
      this.correlationQueue = new Queue('correlation', redisUrl);
      this.scoringQueue = new Queue('scoring', redisUrl);

      this.setupQueueListeners();
      this.ready = true;
      this.logger.log('Bull queues initialized against Redis');
    } catch (error: any) {
      this.ready = false;
      this.logger.warn(
        `Redis/queues unavailable (${error?.message ?? error}) — scan job dispatch disabled, API remains usable`,
      );
    }
  }

  private setupQueueListeners() {
    const pairs: [string, Queue.Queue | undefined][] = [
      ['scan', this.scanQueue],
      ['parser', this.parserQueue],
      ['correlation', this.correlationQueue],
      ['scoring', this.scoringQueue],
    ];
    for (const [name, q] of pairs) {
      if (!q) continue;
      q.on('completed', (job: Job) => this.logger.log(`${name} job ${job.id} completed`));
      q.on('failed', (job: Job, error: Error) =>
        this.logger.error(`${name} job ${job?.id} failed: ${error.message}`),
      );
    }
  }

  private ensureQueue(q: Queue.Queue | undefined, name: string): q is Queue.Queue {
    if (!q || !this.ready) {
      this.logger.warn(`${name} queue not available (Redis offline) — skipping`);
      return false;
    }
    return true;
  }

  async addScanJob(data: { scanId: string; target: string; engines: string[]; mode: string }) {
    if (!this.ensureQueue(this.scanQueue, 'scan')) return null;
    try {
      const job = await this.scanQueue!.add(data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: false,
      });
      this.logger.log(`Scan job added: ${job.id}`);
      return job;
    } catch (error: any) {
      this.logger.error(`addScanJob failed: ${error?.message ?? error}`);
      return null;
    }
  }

  async addParserJob(data: { scanId: string; engineId: string; rawResults: any }) {
    if (!this.ensureQueue(this.parserQueue, 'parser')) return null;
    try {
      return await this.parserQueue!.add(data, { attempts: 2 });
    } catch (error: any) {
      this.logger.error(`addParserJob failed: ${error?.message ?? error}`);
      return null;
    }
  }

  async addCorrelationJob(data: { scanId: string; findings: any[] }) {
    if (!this.ensureQueue(this.correlationQueue, 'correlation')) return null;
    try {
      return await this.correlationQueue!.add(data, { attempts: 2 });
    } catch (error: any) {
      this.logger.error(`addCorrelationJob failed: ${error?.message ?? error}`);
      return null;
    }
  }

  async addScoringJob(data: { scanId: string; findings: any[] }) {
    if (!this.ensureQueue(this.scoringQueue, 'scoring')) return null;
    try {
      return await this.scoringQueue!.add(data, { attempts: 2 });
    } catch (error: any) {
      this.logger.error(`addScoringJob failed: ${error?.message ?? error}`);
      return null;
    }
  }

  getScanQueue() { return this.scanQueue; }
  getParserQueue() { return this.parserQueue; }
  getCorrelationQueue() { return this.correlationQueue; }
  getScoringQueue() { return this.scoringQueue; }

  async getJobStatus(queueType: string, jobId: number) {
    let queue: Queue.Queue | undefined;
    switch (queueType) {
      case 'scan': queue = this.scanQueue; break;
      case 'parser': queue = this.parserQueue; break;
      case 'correlation': queue = this.correlationQueue; break;
      case 'scoring': queue = this.scoringQueue; break;
      default: throw new Error(`Unknown queue type: ${queueType}`);
    }
    if (!this.ensureQueue(queue, queueType)) return null;
    try {
      const job = await queue!.getJob(jobId);
      if (!job) return null;
      const progress = job.progress();
      const state = await job.getState();
      return { id: job.id, state, progress, data: job.data, result: job.returnvalue, attempts: job.attemptsMade };
    } catch (error: any) {
      this.logger.error(`getJobStatus failed: ${error?.message ?? error}`);
      throw error;
    }
  }

  async clearQueues() {
    if (!this.ready) return;
    try {
      await Promise.all([
        this.scanQueue?.clean(0, 'completed'),
        this.parserQueue?.clean(0, 'completed'),
        this.correlationQueue?.clean(0, 'completed'),
        this.scoringQueue?.clean(0, 'completed'),
      ]);
      this.logger.log('All queues cleared');
    } catch (error: any) {
      this.logger.error(`clearQueues failed: ${error?.message ?? error}`);
    }
  }

  async closeQueues() {
    if (!this.ready) return;
    try {
      await Promise.all([
        this.scanQueue?.close(),
        this.parserQueue?.close(),
        this.correlationQueue?.close(),
        this.scoringQueue?.close(),
      ]);
      this.logger.log('All queues closed');
    } catch (error: any) {
      this.logger.error(`closeQueues failed: ${error?.message ?? error}`);
    }
  }
}
