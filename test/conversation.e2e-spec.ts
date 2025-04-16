import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConversationService } from '../src/conversation/conversation.service';

const conversationMessages = [
  {
    id: '67edae37331f18e5162336e3',
    input: 'Teste',
    response:
      'Ok, testando! Pode perguntar ou me dizer qual área da programação te interessa. 🚀\n',
    respondedAt: '2025-04-02T21:38:01.460Z',
    status: 'COMPLETED',
    conversationId: '67edae37331f18e5162336e2',
  },
];

describe('ConversationModule (e2e)', () => {
  let app: INestApplication;
  const conversationService = {
    readAll: () => conversationMessages,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConversationService)
      .useValue(conversationService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/conversation (GET)', () => {
    return request(app.getHttpServer())
      .get('/conversation')
      .expect(200)
      .expect(conversationMessages);
  });
});
