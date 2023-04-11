import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  admin,
  client,
  cryptoManager,
  manager,
  operator,
} from 'src/modules/fixtures/fixtures';
import type { Response } from 'supertest';
import request from 'supertest';

export const getAdminToken = async (
  app: NestExpressApplication,
): Promise<Response> =>
  request(app.getHttpServer()).post('/auth/login').send({
    email: admin.email,
    password: admin.password,
  });

export const getClientToken = async (
  app: NestExpressApplication,
): Promise<Response> =>
  request(app.getHttpServer()).post('/auth/login').send({
    email: client.email,
    password: client.password,
  });

export const getOperatorToken = async (
  app: NestExpressApplication,
): Promise<Response> =>
  request(app.getHttpServer()).post('/auth/login').send({
    email: operator.email,
    password: operator.password,
  });

export const getManagerToken = async (
  app: NestExpressApplication,
): Promise<Response> =>
  request(app.getHttpServer()).post('/auth/login').send({
    email: manager.email,
    password: manager.password,
  });

export const getCryptoManagerToken = async (
  app: NestExpressApplication,
): Promise<Response> =>
  request(app.getHttpServer()).post('/auth/login').send({
    email: cryptoManager.email,
    password: cryptoManager.password,
  });
