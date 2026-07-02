import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Elimina el negocio y TODOS sus datos (cascade). Irreversible.
   * Revalida la contraseña del usuario antes de borrar, aunque ya esté autenticado.
   */
  async deleteBusiness(businessId: string, userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('La contraseña es incorrecta.');
    }
    // onDelete: Cascade en el schema borra settings, sucursales, usuarios,
    // suscripción, productos, categorías y marcas del negocio.
    await this.prisma.business.delete({ where: { id: businessId } });
  }
}
