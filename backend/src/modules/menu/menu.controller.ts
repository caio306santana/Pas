import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar cardapio completo',
    description: 'Retorna categorias, produtos e opcionais da loja.',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'ID da loja consultada.',
    required: true,
  })
  async getFullMenu(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
    return this.menuService.getFullMenu(tenantId);
  }

  @Get('product/:id')
  @ApiOperation({
    summary: 'Detalhar produto',
    description: 'Retorna um produto com seus grupos de opcionais.',
  })
  async getProductDetails(@Param('id') id: string) {
    return this.menuService.getProductDetails(id);
  }

  @Post('category')
  @ApiOperation({
    summary: 'Criar categoria',
    description: 'Cria uma categoria no cardapio da loja.',
  })
  @ApiHeader({ name: 'x-tenant-id', description: 'ID da loja.', required: true })
  async createCategory(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.menuService.createCategory(tenantId, data);
  }

  @Put('category/:id')
  @ApiOperation({
    summary: 'Atualizar categoria',
    description: 'Edita os dados de uma categoria.',
  })
  async updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.menuService.updateCategory(id, data);
  }

  @Delete('category/:id')
  @ApiOperation({
    summary: 'Excluir categoria',
    description: 'Remove uma categoria do cardapio.',
  })
  async deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id);
  }

  @Post('product')
  @ApiOperation({
    summary: 'Criar produto',
    description: 'Cria um produto no cardapio da loja.',
  })
  @ApiHeader({ name: 'x-tenant-id', description: 'ID da loja.', required: true })
  async createProduct(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.menuService.createProduct(tenantId, data);
  }

  @Put('product/:id')
  @ApiOperation({
    summary: 'Atualizar produto',
    description: 'Edita os dados de um produto.',
  })
  async updateProduct(@Param('id') id: string, @Body() data: any) {
    return this.menuService.updateProduct(id, data);
  }

  @Delete('product/:id')
  @ApiOperation({
    summary: 'Excluir produto',
    description: 'Remove um produto do cardapio.',
  })
  async deleteProduct(@Param('id') id: string) {
    return this.menuService.deleteProduct(id);
  }

  @Post('product/:id/image')
  @ApiOperation({
    summary: 'Enviar imagem do produto',
    description: 'Faz upload da imagem e salva a URL no produto.',
  })
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
          cb(new BadRequestException('Apenas imagens sao permitidas (jpg, png, webp, gif).'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const imageUrl = `/uploads/${file.filename}`;
    return this.menuService.updateProduct(id, { imageUrl });
  }

  @Get('admin/products')
  @ApiOperation({
    summary: 'Listar produtos administrativos',
    description: 'Retorna todos os produtos, inclusive indisponiveis.',
  })
  @ApiHeader({ name: 'x-tenant-id', description: 'ID da loja.', required: true })
  async getAllProducts(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
    return this.menuService.getAllProducts(tenantId);
  }
}
