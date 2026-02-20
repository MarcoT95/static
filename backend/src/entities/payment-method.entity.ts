import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum PaymentMethodType {
  CARD = 'card',
  PAYPAL = 'paypal',
  BANK = 'bank',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'enum', enum: PaymentMethodType })
  method: PaymentMethodType;

  @Column()
  maskedLabel: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  paypalEmail: string;

  @Column({ nullable: true })
  cardBrand: string;

  @Column({ nullable: true })
  cardLast4: string;

  @Column({ nullable: true })
  cardExpiry: string;

  @Column({ nullable: true })
  bankIbanLast4: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
