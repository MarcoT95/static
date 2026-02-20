import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User, Category, Product, Cart, CartItem, Order, OrderItem, OrderDocument, ShippingProfile, PaymentMethod, LogFile } from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';

@Module({
  imports: [
    // Carica le variabili d'ambiente dal file .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Connessione a PostgreSQL tramite TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');

        // Se DATABASE_URL è presente (es. Neon), usala direttamente
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: { rejectUnauthorized: false },
            entities: [User, ShippingProfile, PaymentMethod, Category, Product, Cart, CartItem, Order, OrderItem, OrderDocument, LogFile],
            synchronize: config.get<string>('NODE_ENV') !== 'production',
            logging: config.get<string>('NODE_ENV') === 'development',
          };
        }

        // Altrimenti usa le variabili separate (sviluppo locale)
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5433),
          username: config.get<string>('DB_USER', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'staticdb'),
          entities: [User, ShippingProfile, PaymentMethod, Category, Product, Cart, CartItem, Order, OrderItem, OrderDocument, LogFile],
          synchronize: config.get<string>('NODE_ENV') !== 'production',
          logging: config.get<string>('NODE_ENV') === 'development',
        };
      },
    }),

    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logsDir = config.get<string>('LOGS_DIR', 'logs');
        const maxFiles = config.get<string>('LOG_MAX_FILES', '14d');
        const level = config.get<string>('LOG_LEVEL', config.get<string>('NODE_ENV') === 'production' ? 'info' : 'debug');

        return {
          level,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
          transports: [
            new winston.transports.DailyRotateFile({
              dirname: logsDir,
              filename: '%DATE%-app.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '10m',
              maxFiles,
              zippedArchive: true,
              level,
            }),
            new winston.transports.DailyRotateFile({
              dirname: logsDir,
              filename: '%DATE%-error.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '10m',
              maxFiles,
              zippedArchive: true,
              level: 'error',
            }),
          ],
        };
      },
    }),

    AuthModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
