import { Body, Controller, Delete, HttpCode } from '@nestjs/common';
import { BusinessService } from './business.service';
import { DeleteBusinessDto } from './dto/delete-business.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/require-permission.decorator';
import type { AuthUser } from '@/modules/auth/types';

@Controller('business')
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  /** Elimina el negocio del usuario logueado. Solo admin (manage_settings). */
  @RequirePermission('manage_settings')
  @HttpCode(200)
  @Delete()
  async remove(@CurrentUser() user: AuthUser, @Body() dto: DeleteBusinessDto): Promise<{ ok: true }> {
    await this.business.deleteBusiness(user.businessId, user.id, dto.password);
    return { ok: true };
  }
}
