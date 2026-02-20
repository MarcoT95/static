import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities';

export class CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  findAll() {
    return this.categoryRepo.find({ relations: ['products'] });
  }

  async findOne(id: number) {
    const cat = await this.categoryRepo.findOne({ where: { id }, relations: ['products'] });
    if (!cat) throw new NotFoundException('Categoria non trovata');
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async remove(id: number) {
    const cat = await this.findOne(id);
    return this.categoryRepo.remove(cat);
  }
}
