import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, CustomerRegisterDto } from './auth.dto';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('staff/login')
  @ApiOperation({
    summary: 'Entrar no painel da equipe',
    description: 'Autentica usuarios de administracao, cozinha, caixa e entregadores.',
  })
  async staffLogin(@Body() dto: LoginDto) {
    return this.authService.staffLogin(dto);
  }

  @Post('customer/login')
  @ApiOperation({
    summary: 'Entrar como cliente',
    description: 'Autentica um cliente dentro da loja informada pelo slug.',
  })
  @ApiHeader({
    name: 'x-tenant-slug',
    description: 'Slug publico da loja. Exemplo: menino-travesso.',
    required: true,
  })
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
  @ApiOperation({
    summary: 'Cadastrar cliente',
    description: 'Cria uma conta de cliente dentro da loja informada pelo slug.',
  })
  @ApiHeader({
    name: 'x-tenant-slug',
    description: 'Slug publico da loja. Exemplo: menino-travesso.',
    required: true,
  })
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
