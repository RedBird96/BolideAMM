import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'supertest';
import request from 'supertest';

export const getReq = (data: {
  app: NestExpressApplication;
  accessToken: string;
  url: string;
}): Promise<Response> => {
  const { app, accessToken, url } = data;

  return request(app.getHttpServer())
    .get(url)
    .set('Authorization', `Bearer ${accessToken}`);
};

export const postReq = (data: {
  app: NestExpressApplication;
  url: string;
  accessToken: string;
  body: any;
}): Promise<Response> => {
  const { app, accessToken, url, body } = data;

  return request(app.getHttpServer())
    .post(url)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

export const putReq = (data: {
  app: NestExpressApplication;
  url: string;
  accessToken: string;
  body: any;
}): Promise<Response> => {
  const { app, accessToken, url, body } = data;

  return request(app.getHttpServer())
    .put(url)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};
