import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Order } from '../../entities/order.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async getAllUsers() {
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
    });

    const result = await Promise.all(
      users.map(async (user) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...safe } = user;
        const orders = await this.orderRepo.find({ where: { userId: user.id }, order: { createdAt: 'DESC' } });
        const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
        return {
          ...safe,
          orderCount: orders.length,
          totalSpent,
        };
      }),
    );

    return result;
  }

  async getUserOrders(userId: number) {
    return this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
