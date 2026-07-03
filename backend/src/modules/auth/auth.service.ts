import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, CustomerRegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async staffLogin(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload = { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        },
      },
    };
  }

  async customerLogin(dto: LoginDto, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new BadRequestException('Estabelecimento inválido.');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        email: dto.email,
      },
    });

    if (!customer) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isMatch = await bcrypt.compare(dto.password, customer.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload = { id: customer.id, email: customer.email, role: 'CUSTOMER', tenantId: tenant.id };
    return {
      token: this.jwtService.sign(payload),
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cashbackBalance: customer.cashbackBalance,
        points: customer.points,
      },
    };
  }

  async customerRegister(dto: CustomerRegisterDto, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new BadRequestException('Estabelecimento inválido.');
    }

    const existingEmail = await this.prisma.customer.findFirst({
      where: { tenantId: tenant.id, email: dto.email },
    });
    if (existingEmail) {
      throw new BadRequestException('E-mail já está em uso.');
    }

    const existingPhone = await this.prisma.customer.findFirst({
      where: { tenantId: tenant.id, phone: dto.phone },
    });
    if (existingPhone) {
      throw new BadRequestException('Telefone já está em uso.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: passwordHash,
        cpf: dto.cpf,
        tenantId: tenant.id,
      },
    });

    const payload = { id: customer.id, email: customer.email, role: 'CUSTOMER', tenantId: tenant.id };
    return {
      token: this.jwtService.sign(payload),
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cashbackBalance: customer.cashbackBalance,
        points: customer.points,
      },
    };
  }

  verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}
