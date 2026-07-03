import { Controller, Get, Post, Put, Delete, Body, Param, Headers, BadRequestException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'Get full menu including products and categories' })
  async getFullMenu(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
    return this.menuService.getFullMenu(tenantId);
  }

  @Get('product/:id')
  @ApiOperation({ summary: 'Get details of a single product with option groups' })
  async getProductDetails(@Param('id') id: string) {
    return this.menuService.getProductDetails(id);
  }

  @Post('category')
  @ApiOperation({ summary: 'Create a new category (Admin)' })
  async createCategory(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.menuService.createCategory(tenantId, data);
  }

  @Put('category/:id')
  @ApiOperation({ summary: 'Update a category (Admin)' })
  async updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.menuService.updateCategory(id, data);
  }

  @Delete('category/:id')
  @ApiOperation({ summary: 'Delete a category (Admin)' })
  async deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id);
  }

  @Post('product')
  @ApiOperation({ summary: 'Create a new product with option groups (Admin)' })
  async createProduct(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.menuService.createProduct(tenantId, data);
  }

  @Put('product/:id')
  @ApiOperation({ summary: 'Update product properties (Admin)' })
  async updateProduct(@Param('id') id: string, @Body() data: any) {
    return this.menuService.updateProduct(id, data);
  }

  @Delete('product/:id')
  @ApiOperation({ summary: 'Delete a product (Admin)' })
  async deleteProduct(@Param('id') id: string) {
    return this.menuService.deleteProduct(id);
  }
}
