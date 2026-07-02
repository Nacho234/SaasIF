import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma como servicio inyectable. Es el ÚNICO punto de acceso a la base.
 * Ninguna consulta debe hacerse sin filtrar por `businessId` (aislamiento multi-tenant);
 * ese filtro lo aplica cada servicio de dominio usando el business del usuario logueado.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
