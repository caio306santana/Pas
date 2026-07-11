import { Controller, Get, Param, Body, Put } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Buscar loja por slug',
    description: 'Retorna dados publicos da loja usados pela vitrine.',
  })
  async findBySlug(@Param('slug') slug: string) {
    return this.tenantService.findBySlug(slug);
  }

  @Get(':tenantId/config')
  @ApiOperation({
    summary: 'Buscar configuracoes da loja',
    description: 'Retorna horarios, taxas e preferencias da loja.',
  })
  async getConfigs(@Param('tenantId') tenantId: string) {
    return this.tenantService.getConfigs(tenantId);
  }

  @Put(':tenantId/config')
  @ApiOperation({
    summary: 'Atualizar configuracoes da loja',
    description: 'Edita preferencias operacionais da loja.',
  })
  async updateConfigs(
    @Param('tenantId') tenantId: string,
    @Body() configData: any,
  ) {
    return this.tenantService.updateConfigs(tenantId, configData);
  }
}
