import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        configs: {
          select: {
            operatingHours: true,
            whatsappNumber: true,
            deliveryMinTime: true,
            deliveryMaxTime: true,
            paymentSettings: true,
            cashbackPercent: true,
            mpPublicKey: true,
          },
        },
        deliveryAreas: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found.`);
    }

    return tenant;
  }

  async getConfigs(tenantId: string) {
    return this.prisma.tenantConfig.findUnique({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        operatingHours: true,
        whatsappNumber: true,
        deliveryMinTime: true,
        deliveryMaxTime: true,
        paymentSettings: true,
        cashbackPercent: true,
        mpPublicKey: true,
      },
    });
  }

  async updateConfigs(tenantId: string, data: any) {
    return this.prisma.tenantConfig.update({
      where: { tenantId },
      data,
    });
  }
}
