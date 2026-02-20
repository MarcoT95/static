import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsNumber()
  categoryId: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsNumber() categoryId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
