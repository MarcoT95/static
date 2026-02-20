import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem } from '../../entities';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
  ) {}

  async getCart(userId: number) {
    let cart = await this.cartRepo.findOne({ where: { userId } });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId }));
    }
    return cart;
  }

  async addItem(userId: number, productId: number, quantity: number = 1) {
    const cart = await this.getCart(userId);
    const existing = await this.cartItemRepo.findOne({
      where: { cartId: cart.id, productId },
    });

    if (existing) {
      existing.quantity += quantity;
      await this.cartItemRepo.save(existing);
    } else {
      await this.cartItemRepo.save(
        this.cartItemRepo.create({ cartId: cart.id, productId, quantity }),
      );
    }
    return this.getCart(userId);
  }

  async updateItem(userId: number, productId: number, quantity: number) {
    const cart = await this.getCart(userId);
    const item = await this.cartItemRepo.findOne({ where: { cartId: cart.id, productId } });
    if (!item) throw new NotFoundException('Prodotto non nel carrello');

    if (quantity <= 0) {
      await this.cartItemRepo.remove(item);
    } else {
      item.quantity = quantity;
      await this.cartItemRepo.save(item);
    }
    return this.getCart(userId);
  }

  async removeItem(userId: number, productId: number) {
    const cart = await this.getCart(userId);
    const item = await this.cartItemRepo.findOne({ where: { cartId: cart.id, productId } });
    if (item) await this.cartItemRepo.remove(item);
    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.getCart(userId);
    await this.cartItemRepo.delete({ cartId: cart.id });
    return this.getCart(userId);
  }
}
