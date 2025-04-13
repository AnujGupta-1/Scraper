import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';

// Ensure log directory exists
const logDir = path.resolve('logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log file path
const logFile = path.join(logDir, 'GreyhoundScraper.log');

const logger = createLogger({
  level: 'info', // base log level (file will get info and above)
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `${info.timestamp} - ${info.level.toUpperCase()} - ${info.message}`)
  ),
  transports: [
    // File: capture everything info and above
    new transports.File({ filename: logFile, level: 'info' }),

    // Console: only show warnings and errors
    new transports.Console({ level: 'warn' })
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(logDir, 'exceptions.log') })
  ]
});

export default logger;
