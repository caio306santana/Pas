import { Controller, Get, Post, Put, Delete, Body, Param, Headers, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
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

  @Post('product/:id/image')
  @ApiOperation({ summary: 'Upload image for a product (Admin)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', '..', '..', '..', 'frontend', 'public', 'uploads'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `product-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Apenas imagens são permitidas (jpg, png, webp, gif).'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const imageUrl = `/uploads/${file.filename}`;
    return this.menuService.updateProduct(id, { imageUrl });
  }

  @Get('admin/products')
  @ApiOperation({ summary: 'Get all products including unavailable ones (Admin)' })
  async getAllProducts(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is missing.');
    return this.menuService.getAllProducts(tenantId);
  }
}
