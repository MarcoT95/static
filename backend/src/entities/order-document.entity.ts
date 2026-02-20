import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

export enum OrderDocumentType {
  INVOICE = 'invoice',
  SUMMARY = 'summary',
}

@Entity('order_documents')
export class OrderDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: number;

  @Column({ type: 'enum', enum: OrderDocumentType })
  type: OrderDocumentType;

  @Column()
  fileName: string;

  @Column({ default: 'application/pdf' })
  mimeType: string;

  @Column({ type: 'text', select: false })
  dataBase64: string;

  @CreateDateColumn()
  createdAt: Date;
}
