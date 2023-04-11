import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { ConfigService } from 'src/shared/services/config.service';
import URLParse from 'url-parse';

@Injectable()
export class BullMqService {
  private readonly logger = new Logger(BullMqService.name);

  private queuesMap = new Map<string, Queue<any>>();

  private shedulersMap = new Map<string, QueueScheduler>();

  private queueEventsMap = new Map<string, QueueEvents>();

  private workersMap = new Map<string, Worker<any>>();

  private redisUrl: URLParse<string>;

  private redisDB: string;

  private connection: {
    host: string;
    port: string;
    db: number;
  } = {
    host: '',
    port: '',
    db: 0,
  };

  constructor(
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
  ) {
    this.redisUrl = URLParse(this.configService.redis.url || '');
    this.redisDB = this.redisUrl.pathname
      ? this.redisUrl.pathname.split('/')[1]
      : '0';

    this.connection.host = this.redisUrl.hostname;
    this.connection.port = this.redisUrl.port;
    this.connection.db = Number.parseInt(this.redisDB, 10);
  }

  async onModuleDestroy(): Promise<void> {
    for (const worker of this.workersMap.values()) {
      await this.gracefulShutdown(worker);
    }

    for (const sheduler of this.shedulersMap.values()) {
      await sheduler.close();
    }

    for (const event of this.queueEventsMap.values()) {
      await event.close();
    }

    for (const queue of this.queuesMap.values()) {
      await this.clearAndCloseQueue(queue);
    }
  }

  async clearAndCloseQueue(queue: Queue): Promise<void> {
    await queue.drain();
    await queue.obliterate();
    await queue.close();
  }

  async clearAndCloseQueueByName(queueName: string): Promise<void> {
    if (this.queuesMap.has(queueName)) {
      const queue = this.queuesMap.get(queueName);

      await this.clearAndCloseQueue(queue);

      this.queuesMap.delete(queueName);
    }
  }

  async gracefulShutdownByName(workerName: string): Promise<void> {
    if (this.workersMap.has(workerName)) {
      const worker = this.workersMap.get(workerName);

      await this.gracefulShutdown(worker);

      this.workersMap.delete(workerName);
    }
  }

  async gracefulShutdown(worker: Worker): Promise<void> {
    await worker.close();
  }

  async createQueue(name: string) {
    if (this.queuesMap.has(name)) {
      const oldQueue = this.queuesMap.get(name);

      await this.clearAndCloseQueue(oldQueue);
    }

    const queue = new Queue(name, {
      connection: this.connection,
    });

    const queueScheduler = new QueueScheduler(name, {
      connection: this.connection,
    });

    const queueEvents = new QueueEvents(name, {
      connection: this.connection,
    });

    await queueScheduler.waitUntilReady();
    await queueEvents.waitUntilReady();

    this.queuesMap.set(name, queue);
    this.shedulersMap.set(name, queueScheduler);
    this.queueEventsMap.set(name, queueEvents);

    return queue;
  }

  async createWorker(data: { name: string; handler: any; options?: any }) {
    const { name, handler, options = { concurrency: 1 } } = data;

    if (this.workersMap.has(name)) {
      const oldWorker = this.workersMap.get(name);

      await this.gracefulShutdown(oldWorker);

      this.logger.warn({
        message: `worker with name ${name} already exist and was recreated`,
      });
    }

    const worker = new Worker(name, (job) => handler(job), {
      ...options,
      connection: this.connection,
    });

    worker.on('completed', (job: Job, returnvalue: any) => {
      this.logger.debug({
        message: `Queue (${name}) completed`,
        name: job.name,
        data: job.data,
        opts: job.opts,
        returnvalue,
      });
    });

    worker.on('progress', (job: Job, progress: number) => {
      this.logger.debug({
        message: `Queue (${name}) progress`,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress,
      });
    });

    worker.on('failed', (job: Job, error: Error) => {
      this.logger.error({
        message: `Queue (${name}) worker unhadled failed`,
        name,
        error,
        job: {
          name: job.name,
          data: job.data,
          opts: job.opts,
        },
      });
    });

    worker.on('error', (error) => {
      this.logger.error({
        message: `Queue (${name}) worker unhadled error`,
        name,
        error,
      });
    });

    worker.on('closed', () => {
      this.logger.warn({
        message: `Queue (${name}) worker closed`,
        name,
      });
    });

    this.workersMap.set(name, worker);

    return worker;
  }

  async getQueue(name: string): Promise<Queue> {
    return this.queuesMap.has(name)
      ? this.queuesMap.get(name)
      : this.createQueue(name);
  }

  async getWorker(name: string): Promise<Worker> {
    return this.workersMap.has(name) ? this.workersMap.get(name) : null;
  }

  async getAllQueues(): Promise<{ items: string[] }> {
    const iterators = this.queuesMap.keys();
    const keys = [...iterators];
    const items = [];

    for (const key of keys) {
      const queue = this.queuesMap.get(key);

      if (queue) {
        items.push({
          name: key,
          completedMetric: await queue.getMetrics('completed'),
          failedMetric: await queue.getMetrics('failed'),
          active: await queue.getActiveCount(),
          delayed: await queue.getDelayedCount(),
          completed: await queue.getCompletedCount(),
          failed: await queue.getFailedCount(),
          jobCounts: await queue.getJobCounts(),
          waiting: await queue.getWaitingCount(),
          workers: await queue.getWorkers(),
        });
      }
    }

    return { items };
  }
}
