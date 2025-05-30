import { Injectable, NotFoundException } from '@nestjs/common';
import { UpsertConversationDto } from './dto/upsert-conversation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { HfInference } from '@huggingface/inference';
import { Prisma } from '@prisma/client';
import { ObjectId } from 'bson';
import {
  ConversationDomain,
  ConversationStatus,
} from './domain/conversation.domain';

@Injectable()
export class ConversationService {
  private readonly client = new HfInference(process.env.HUGGING_FACE_API_TOKEN);

  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdateConversation(
    dto: UpsertConversationDto,
  ): Promise<ConversationDomain> {
    if (!dto.id) {
      dto.id = new ObjectId().toString();
    }

    // Create conversation & message (pending)
    const conversationMessage: Prisma.ConversationMessageCreateWithoutConversationInput =
      {
        input: dto.input,
        status: 'PROCESSING',
      };

    const conversation = await this.prisma.conversation.upsert({
      where: { id: dto.id },
      create: { messages: { create: conversationMessage } },
      update: { messages: { create: conversationMessage } },
      include: {
        messages: {
          select: {
            id: true,
            input: true,
            response: true,
          },
        },
      },
    });

    const conversationMessageId =
      conversation.messages[conversation.messages.length - 1].id;

    const messageHistory = conversation.messages
      .flatMap((message) => [
        {
          role: 'user',
          content: message.input,
        },
        message.response && {
          role: 'assistant',
          content: message.response,
        },
      ])
      .filter(Boolean);

    // Call LLM API
    const chatCompletion = await this.client.chatCompletion({
      // model: 'meta-llama/Llama-3.2-3B-Instruct',
      // provider: 'sambanova',
      model: 'google/gemma-3-27b-it',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado em ajudar alunos de programação a encontrar recursos de aprendizado e responder perguntas técnicas, sugerindo materiais personalizados. Você responde de forma curta e objetiva, e amplia conforme o estudante pergunta.`,
        },
        ...messageHistory,
      ],
      max_tokens: 500,
    });

    const response = chatCompletion.choices[0].message;

    // Update conversation with response and respondedAt
    const conversationUpdated = await this.prisma.conversationMessage.update({
      where: { id: conversationMessageId },
      data: {
        response: response.content,
        respondedAt: new Date(),
        status: 'COMPLETED',
      },
    });

    return {
      ...conversationUpdated,
      status: conversationUpdated.status as ConversationStatus,
    };
  }

  readAll() {
    return this.prisma.conversationMessage.findMany();
  }

  async readById(id: string) {
    const foundConversation = await this.prisma.conversationMessage.findUnique({
      where: { id },
    });

    if (!foundConversation) {
      throw new NotFoundException('Conversation not found');
    }

    return foundConversation;
  }
}
