import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail usado para entrar no painel ou na conta do cliente.',
    example: 'admin@menino.com',
  })
  @IsEmail({}, { message: 'E-mail invalido.' })
  email: string;

  @ApiProperty({
    description: 'Senha da conta. Deve ter pelo menos 6 caracteres.',
    example: 'admin123',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Senha obrigatoria.' })
  @MinLength(6, { message: 'A senha deve conter no minimo 6 caracteres.' })
  password: string;
}

export class CustomerRegisterDto {
  @ApiProperty({
    description: 'Nome completo do cliente.',
    example: 'Carlos Cliente',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome obrigatorio.' })
  name: string;

  @ApiProperty({
    description: 'E-mail unico do cliente. No checkout atual ele pode ser derivado do telefone.',
    example: '11988887777@menino.com',
  })
  @IsEmail({}, { message: 'E-mail invalido.' })
  email: string;

  @ApiProperty({
    description: 'Telefone ou WhatsApp com DDD, somente numeros.',
    example: '11988887777',
  })
  @IsString()
  @IsNotEmpty({ message: 'Telefone obrigatorio.' })
  phone: string;

  @ApiProperty({
    description: 'Senha de acesso do cliente.',
    example: '11988887777123',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Senha obrigatoria.' })
  @MinLength(6, { message: 'A senha deve conter no minimo 6 caracteres.' })
  password: string;

  @ApiPropertyOptional({
    description: 'CPF do cliente, quando informado.',
    example: '12345678900',
  })
  @IsOptional()
  @IsString()
  cpf?: string;
}
