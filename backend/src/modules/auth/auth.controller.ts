import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, CustomerRegisterDto } from './auth.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('staff/login')
  @ApiOperation({ summary: 'Login for dashboard staff (Admin, Kitchen, Cashier, Courier)' })
  async staffLogin(@Body() dto: LoginDto) {
    return this.authService.staffLogin(dto);
  }

  @Post('customer/login')
  @ApiOperation({ summary: 'Login for customers on digital menus' })
  async customerLogin(
    @Body() dto: LoginDto,
    @Headers('x-tenant-slug') tenantSlug: string,
  ) {
    if (!tenantSlug) {
      throw new UnauthorizedException('Tenant header is missing.');
    }
    return this.authService.customerLogin(dto, tenantSlug);
  }

  @Post('customer/register')
  @ApiOperation({ summary: 'Registration for new customer accounts' })
  async customerRegister(
    @Body() dto: CustomerRegisterDto,
    @Headers('x-tenant-slug') tenantSlug: string,
  ) {
    if (!tenantSlug) {
      throw new UnauthorizedException('Tenant header is missing.');
    }
    return this.authService.customerRegister(dto, tenantSlug);
  }
}
