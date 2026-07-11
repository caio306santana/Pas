import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Allow credentials only for explicitly configured frontend origins.
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global pipes for validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Menino Travesso API')
    .setDescription(
      [
        'API do delivery multi-tenant Menino Travesso.',
        '',
        'Use `x-tenant-id` nos endpoints de menu, pedidos e pagamentos.',
        'Use `x-tenant-slug` nos endpoints de login/cadastro de cliente.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT retornado no login.',
      },
      'JWT',
    )
    .addTag('Auth', 'Login de equipe e clientes')
    .addTag('Tenants', 'Dados da loja e configuracoes')
    .addTag('Menu', 'Cardapio, categorias, produtos e imagens')
    .addTag('Orders', 'Criacao, consulta e atualizacao de pedidos')
    .addTag('Payments', 'PIX, cartao e webhooks do Mercado Pago')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Menino Travesso API Docs',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Nest API is running on: http://localhost:${port}`);
  console.log(`Swagger docs are running on: http://localhost:${port}/api/docs`);
}
bootstrap();
