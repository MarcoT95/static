import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  findAll(categoryId?: number, featured?: boolean) {
    const query = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :active', { active: true });

    if (categoryId) query.andWhere('product.categoryId = :categoryId', { categoryId });
    if (featured !== undefined) query.andWhere('product.featured = :featured', { featured });

    return query.orderBy('product.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const product = await this.productRepo.findOne({
      where: { id, isActive: true },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Prodotto non trovato');
    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.productRepo.findOne({
      where: { slug, isActive: true },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Prodotto non trovato');
    return product;
  }

  async create(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    product.isActive = false;
    return this.productRepo.save(product);
  }
}
