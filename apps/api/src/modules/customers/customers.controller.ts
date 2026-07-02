import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CustomersService, type CustomerFilters } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/modules/auth/decorators/require-permission.decorator';
import type { AuthUser } from '@/modules/auth/types';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @RequirePermission('manage_customers')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() filters: CustomerFilters) {
    return this.customers.list(user.businessId, filters);
  }

  @RequirePermission('manage_customers')
  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.getById(user.businessId, id);
  }

  @RequirePermission('manage_customers')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user.businessId, dto);
  }

  @RequirePermission('manage_customers')
  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(user.businessId, id, dto);
  }
}
