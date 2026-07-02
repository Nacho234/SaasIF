import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './types';

export interface AuthResult {
  token: string;
  user: { id: string; name: string; email: string; role: string; businessId: string };
  business: { id: string; name: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Alta de suscriptor. En una sola transacción crea: negocio + settings por defecto +
   * sucursal inicial + usuario admin + suscripción en trial. Si algo falla, no queda
   * nada a medias.
   */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Ya existe una cuenta con ese email.');

    const plan = await this.prisma.plan.findUnique({ where: { code: 'basico' } });
    if (!plan) {
      throw new InternalServerErrorException(
        'No hay planes cargados. Ejecutá `npm run db:seed -w @mostrador/api`.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const trialDays = 14;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const { user, business } = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({ data: { name: dto.businessName } });
      await tx.businessSettings.create({ data: { businessId: business.id } });
      await tx.branch.create({ data: { businessId: business.id, name: 'Sucursal principal' } });
      await tx.subscription.create({
        data: { businessId: business.id, planId: plan.id, status: 'trial', trialEndsAt },
      });
      const user = await tx.user.create({
        data: {
          businessId: business.id,
          email: dto.email,
          passwordHash,
          name: dto.ownerName,
          role: 'admin',
        },
      });
      return { user, business };
    });

    return this.buildResult(user, business);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { business: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }
    if (user.status !== 'active') throw new UnauthorizedException('El usuario está desactivado.');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.buildResult(user, user.business);
  }

  private buildResult(
    user: { id: string; name: string; email: string; role: string; businessId: string },
    business: { id: string; name: string },
  ): AuthResult {
    const payload: JwtPayload = {
      sub: user.id,
      businessId: user.businessId,
      role: user.role as JwtPayload['role'],
      email: user.email,
    };
    return {
      token: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
      business: { id: business.id, name: business.name },
    };
  }
}
