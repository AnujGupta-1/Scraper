import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createLogger, format, transports } from 'winston';

const logDir = './test_logs';
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `${info.timestamp} - ${info.level.toUpperCase()} - ${info.message}`)
  ),
  transports: [
    new transports.File({ filename: join(logDir, 'test-scraper.log') }),
    new transports.Console({ level: 'warn' })
  ],
  exceptionHandlers: [
    new transports.File({ filename: join(logDir, 'exceptions.log') })
  ]
});

export default logger;
