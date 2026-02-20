import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { LogFile } from './entities';

async function syncLogFilesToDb(app: INestApplication): Promise<void> {
  const config = app.get(ConfigService);
  const dataSource = app.get(DataSource);
  const repo = dataSource.getRepository(LogFile);

  const logsDir = config.get<string>('LOGS_DIR', 'logs');
  const absoluteLogsDir = path.isAbsolute(logsDir) ? logsDir : path.resolve(process.cwd(), logsDir);

  let entries: Array<import('fs').Dirent> = [];
  try {
    entries = await fs.readdir(absoluteLogsDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const fileName = entry.name;
    if (!fileName.endsWith('.log') && !fileName.endsWith('.gz')) continue;

    const filePath = path.join(absoluteLogsDir, fileName);
    const stat = await fs.stat(filePath);
    const level: 'app' | 'error' = fileName.includes('error') ? 'error' : 'app';

    await repo.upsert(
      {
        fileName,
        filePath,
        level,
        sizeBytes: Number(stat.size),
        lastModifiedAt: stat.mtime,
      },
      ['filePath'],
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  await syncLogFilesToDb(app);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`🚀 Backend in ascolto su http://localhost:${port}`);
}
bootstrap();
