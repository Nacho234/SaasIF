import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CashService } from './cash.service';
import { CashMovementDto, CloseRegisterDto, OpenRegisterDto, ReopenRegisterDto } from './dto/cash.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/require-permission.decorator';
import type { AuthUser } from '@/modules/auth/types';

@Controller('cash-registers')
export class CashController {
  constructor(private readonly cash: CashService) {}

  // Ojo: la ruta estática /open va ANTES de /:id.
  @RequirePermission('view_cash')
  @Get('open')
  getOpen(@CurrentUser() user: AuthUser) {
    return this.cash.getOpen(user.businessId);
  }

  @RequirePermission('view_cash')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.cash.list(user.businessId);
  }

  @RequirePermission('open_cash')
  @Post('open')
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenRegisterDto) {
    return this.cash.open(user.businessId, user, dto);
  }

  @RequirePermission('view_cash')
  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cash.getById(user.businessId, id);
  }

  @RequirePermission('view_cash')
  @Get(':id/summary')
  summary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cash.getSummary(user.businessId, id);
  }

  @RequirePermission('manage_cash_movements')
  @Post(':id/movements')
  addMovement(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CashMovementDto) {
    return this.cash.addMovement(user.businessId, user, id, dto);
  }

  @RequirePermission('close_cash')
  @Post(':id/close')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CloseRegisterDto) {
    return this.cash.close(user.businessId, user, id, dto);
  }

  @RequirePermission('reopen_cash')
  @Post(':id/reopen')
  reopen(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReopenRegisterDto) {
    return this.cash.reopen(user.businessId, user, id, dto);
  }
}
