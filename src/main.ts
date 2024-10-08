import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import RedisStore from 'connect-redis'
import * as cookieParser from 'cookie-parser'
import * as session from 'express-session'
import IORedis from 'ioredis'

import { AppModule } from './app.module'
import { ms, StringValue } from './libs/common/utils/ms.util'
import { parseBoolean } from './libs/common/utils/parse-boolean.util'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	const config = app.get(ConfigService)
	const redis = new IORedis({
		port: config.getOrThrow<number>('REDIS_PORT'),
		host: config.getOrThrow<string>('REDIS_HOST'),
		username: config.getOrThrow<string>('REDIS_USER'),
		password: config.getOrThrow<string>('REDIS_PASSWORD'),
		maxRetriesPerRequest: 2
	})

	app.use(cookieParser(config.getOrThrow<string>('COOKIES_SECRET')))
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true
		})
	)

	app.use(
		session({
			secret: config.getOrThrow<string>('SESSION_SECRET'),
			name: config.getOrThrow<string>('SESSION_NAME'),
			resave: true,
			saveUninitialized: false,
			cookie: {
				domain: config.getOrThrow<string>('SESSION_DOMAIN'),
				maxAge: ms(config.getOrThrow<StringValue>('SESSION_MAX_AGE')),
				httpOnly: parseBoolean(config.getOrThrow('SESSION_HTTP_ONLY')),
				secure: parseBoolean(config.getOrThrow('SESSION_SECURE')),
				sameSite: 'lax'
			},

			store: new RedisStore({
				client: redis,
				prefix: config.getOrThrow<string>('SESSION_FOLDER')
			})
		})
	)

	app.enableCors({
		origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
		credentials: true,
		exposedHeaders: ['set-cookie']
	})

	app.setGlobalPrefix(config.getOrThrow<string>('GLOBAL_PREFIX'))

	await app.listen(config.getOrThrow<number>('APPLICATION_PORT'))
}
bootstrap()
