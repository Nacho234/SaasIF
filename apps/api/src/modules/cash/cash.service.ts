import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CashMovement, CashRegister } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { AuthUser } from '@/modules/auth/types';
import type { CashMovementDto, CloseRegisterDto, OpenRegisterDto, ReopenRegisterDto } from './dto/cash.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeRegister(r: CashRegister) {
    return {
      ...r,
      openingAmount: Number(r.openingAmount),
      expectedCash: r.expectedCash === null ? null : Number(r.expectedCash),
      countedCash: r.countedCash === null ? null : Number(r.countedCash),
      difference: r.difference === null ? null : Number(r.difference),
    };
  }

  private serializeMovement(m: CashMovement) {
    return { ...m, amount: Number(m.amount) };
  }

  /** Resumen del turno calculado desde los movimientos (efectivo esperado, totales por método, etc.). */
  private summarize(movements: CashMovement[]) {
    const s = {
      totalIn: 0,
      totalOut: 0,
      expectedCash: 0,
      salesTotal: 0,
      salesCount: 0,
      salesByMethod: {} as Record<string, number>,
      manualIncome: 0,
      expensesTotal: 0,
      withdrawals: 0,
      refunds: 0,
      cancellations: 0,
      debtPayments: 0,
    };
    const saleIds = new Set<string>();
    for (const raw of movements) {
      const amount = Number(raw.amount);
      if (raw.direction === 'in') s.totalIn = round2(s.totalIn + amount);
      else s.totalOut = round2(s.totalOut + amount);
      if (raw.method === 'cash') {
        s.expectedCash = round2(s.expectedCash + (raw.direction === 'in' ? amount : -amount));
      }
      switch (raw.type) {
        case 'sale':
          s.salesTotal = round2(s.salesTotal + amount);
          s.salesByMethod[raw.method] = round2((s.salesByMethod[raw.method] ?? 0) + amount);
          if (raw.relatedSaleId) saleIds.add(raw.relatedSaleId);
          break;
        case 'manual_income': s.manualIncome = round2(s.manualIncome + amount); break;
        case 'expense':
        case 'manual_expense': s.expensesTotal = round2(s.expensesTotal + amount); break;
        case 'withdrawal': s.withdrawals = round2(s.withdrawals + amount); break;
        case 'refund': s.refunds = round2(s.refunds + amount); break;
        case 'cancellation': s.cancellations = round2(s.cancellations + amount); break;
        case 'debt_payment': s.debtPayments = round2(s.debtPayments + amount); break;
        default: break;
      }
    }
    s.salesCount = saleIds.size;
    return s;
  }

  private async findRegister(businessId: string, id: string) {
    const register = await this.prisma.cashRegister.findFirst({ where: { id, businessId } });
    if (!register) throw new NotFoundException('Caja no encontrada.');
    return register;
  }

  async getOpen(businessId: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { businessId, status: { in: ['open', 'reopened'] } },
      orderBy: { openedAt: 'desc' },
    });
    return register ? this.serializeRegister(register) : null;
  }

  async open(businessId: string, user: AuthUser, dto: OpenRegisterDto) {
    const existing = await this.prisma.cashRegister.findFirst({
      where: { businessId, status: { in: ['open', 'reopened'] } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Ya hay una caja abierta. Cerrala antes de abrir otra.');

    const count = await this.prisma.cashRegister.count({ where: { businessId } });
    const number = `CJ-${String(count + 1).padStart(4, '0')}`;

    const register = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cashRegister.create({
        data: {
          businessId,
          branchId: dto.branchId ?? null,
          number,
          openedById: user.id,
          openedByName: user.email,
          openingAmount: dto.openingAmount,
          status: 'open',
          openingNotes: dto.notes ?? '',
        },
      });
      // Movimiento de apertura (efectivo que entra a la caja).
      await tx.cashMovement.create({
        data: {
          businessId,
          cashRegisterId: created.id,
          type: 'opening',
          direction: 'in',
          amount: dto.openingAmount,
          method: 'cash',
          reason: 'Apertura de caja',
          userId: user.id,
          userName: user.email,
        },
      });
      return created;
    });
    return this.serializeRegister(register);
  }

  async addMovement(businessId: string, user: AuthUser, id: string, dto: CashMovementDto) {
    const register = await this.findRegister(businessId, id);
    if (register.status !== 'open' && register.status !== 'reopened') {
      throw new BadRequestException('La caja está cerrada. No se pueden registrar movimientos.');
    }
    const movement = await this.prisma.cashMovement.create({
      data: {
        businessId,
        cashRegisterId: id,
        type: dto.type,
        direction: dto.direction,
        amount: dto.amount,
        method: dto.method ?? 'cash',
        reason: dto.reason ?? '',
        userId: user.id,
        userName: user.email,
        notes: dto.notes ?? '',
      },
    });
    return this.serializeMovement(movement);
  }

  async getSummary(businessId: string, id: string) {
    const register = await this.findRegister(businessId, id);
    const movements = await this.prisma.cashMovement.findMany({
      where: { cashRegisterId: id },
      orderBy: { date: 'asc' },
    });
    return {
      register: this.serializeRegister(register),
      summary: this.summarize(movements),
      movements: movements.map((m) => this.serializeMovement(m)),
    };
  }

  async close(businessId: string, user: AuthUser, id: string, dto: CloseRegisterDto) {
    const register = await this.findRegister(businessId, id);
    if (register.status !== 'open' && register.status !== 'reopened') {
      throw new BadRequestException('Esta caja ya fue cerrada.');
    }
    const movements = await this.prisma.cashMovement.findMany({ where: { cashRegisterId: id } });
    const summary = this.summarize(movements);
    const expectedCash = summary.expectedCash;
    const difference = round2(dto.countedCash - expectedCash);
    const status = difference === 0 ? 'closed' : 'closed_with_difference';

    const updated = await this.prisma.cashRegister.update({
      where: { id },
      data: {
        status,
        closedAt: new Date(),
        closedById: user.id,
        closedByName: user.email,
        expectedCash,
        countedCash: dto.countedCash,
        difference,
        closingNotes: dto.notes ?? '',
      },
    });
    return { register: this.serializeRegister(updated), summary };
  }

  async reopen(businessId: string, user: AuthUser, id: string, dto: ReopenRegisterDto) {
    const register = await this.findRegister(businessId, id);
    if (register.status !== 'closed' && register.status !== 'closed_with_difference') {
      throw new BadRequestException('Solo se puede reabrir una caja cerrada.');
    }
    const updated = await this.prisma.cashRegister.update({
      where: { id },
      data: { status: 'reopened', reopenReason: dto.reason, closedAt: null, closedById: null, closedByName: null },
    });
    return this.serializeRegister(updated);
  }

  async list(businessId: string) {
    const registers = await this.prisma.cashRegister.findMany({
      where: { businessId },
      orderBy: { openedAt: 'desc' },
    });
    return registers.map((r) => this.serializeRegister(r));
  }

  async getById(businessId: string, id: string) {
    return this.getSummary(businessId, id);
  }
}
