import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@menino.com' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  @MinLength(6, { message: 'A senha deve conter no mínimo 6 caracteres.' })
  password: string;
}

export class CustomerRegisterDto {
  @ApiProperty({ example: 'Carlos Cliente' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  name: string;

  @ApiProperty({ example: 'carlos@email.com' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @ApiProperty({ example: '11988887777' })
  @IsString()
  @IsNotEmpty({ message: 'Telefone é obrigatório.' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  @MinLength(6, { message: 'A senha deve conter no mínimo 6 caracteres.' })
  password: string;

  @ApiProperty({ example: '123.456.789-00', required: false })
  @IsOptional()
  @IsString()
  cpf?: string;
}
