import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // Fetch full digital menu for a tenant, organized by category
  async getFullMenu(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
      include: {
        products: {
          where: { isAvailable: true },
          include: {
            optionGroups: {
              include: {
                options: {
                  where: { isAvailable: true },
                },
              },
            },
          },
        },
      },
    });
  }

  // Categories CRUD
  async createCategory(tenantId: string, data: any) {
    return this.prisma.category.create({
      data: { ...data, tenantId },
    });
  }

  async updateCategory(id: string, data: any) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({
      where: { id },
    });
  }

  // Products CRUD
  async createProduct(tenantId: string, data: any) {
    const { optionGroups, ...productData } = data;
    return this.prisma.product.create({
      data: {
        ...productData,
        tenantId,
        optionGroups: optionGroups ? {
          create: optionGroups.map((group: any) => ({
            name: group.name,
            minSelect: group.minSelect,
            maxSelect: group.maxSelect,
            options: {
              create: group.options,
            },
          })),
        } : undefined,
      },
    });
  }

  async updateProduct(id: string, data: any) {
    const { optionGroups, ...productData } = data;
    
    // Simple update. For production options, we update basic info
    // Option group updates can be done independently or overwritten
    return this.prisma.product.update({
      where: { id },
      data: productData,
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  async getProductDetails(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        optionGroups: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }

    return product;
  }

  async getAllProducts(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      include: {
        category: true,
        optionGroups: { include: { options: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
