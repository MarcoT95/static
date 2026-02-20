import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order, OrderDocument, OrderDocumentType, OrderItem, OrderStatus, Product } from '../../entities';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OrderDocument)
    private readonly orderDocumentRepo: Repository<OrderDocument>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async createOrder(
    userId: number,
    items: { productId: number; quantity: number; unitPrice: number }[],
    shippingAddress?: string,
    notes?: string,
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Il carrello è vuoto');
    }

    const normalizedItems = items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }));

    const hasInvalidRows = normalizedItems.some(
      (item) => !Number.isInteger(item.productId) || item.productId <= 0 || !Number.isInteger(item.quantity) || item.quantity <= 0,
    );
    if (hasInvalidRows) {
      throw new BadRequestException('Righe ordine non valide');
    }

    const productIds = Array.from(new Set(normalizedItems.map((item) => item.productId)));
    const products = await this.productRepo.find({ where: { id: In(productIds), isActive: true } });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const missingProductIds = productIds.filter((id) => !productsById.has(id));
    if (missingProductIds.length > 0) {
      throw new BadRequestException(`Prodotti non validi o non disponibili: ${missingProductIds.join(', ')}`);
    }

    const orderLines = normalizedItems.map((item) => {
      const product = productsById.get(item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(product.price),
      };
    });

    const total = orderLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

    const createdOrderId = await this.orderRepo.manager.transaction(async (manager) => {
      const order = manager.create(Order, {
        userId,
        total,
        status: OrderStatus.PROCESSING,
        shippingAddress,
        notes,
      });
      const savedOrder = await manager.save(Order, order);

      const orderItems = orderLines.map((line) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        }),
      );
      await manager.save(OrderItem, orderItems);

      return savedOrder.id;
    });

    return this.findOne(createdOrderId);
  }

  findByUser(userId: number) {
    return this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Ordine non trovato');
    return order;
  }

  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.findOne(id);
    order.status = status;
    return this.orderRepo.save(order);
  }

  async saveDocuments(
    userId: number,
    orderId: number,
    documents: Array<{ type: 'invoice' | 'summary'; fileName: string; mimeType?: string; dataBase64: string }>,
  ) {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new BadRequestException('Nessun documento da salvare');
    }

    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Ordine non trovato');

    const validTypes = new Set<string>(Object.values(OrderDocumentType));
    const normalized = documents
      .filter((doc) => doc && validTypes.has(doc.type) && !!doc.fileName && !!doc.dataBase64)
      .map((doc) => ({
        type: doc.type as OrderDocumentType,
        fileName: String(doc.fileName).slice(0, 160),
        mimeType: doc.mimeType ? String(doc.mimeType).slice(0, 80) : 'application/pdf',
        dataBase64: String(doc.dataBase64),
      }));

    if (normalized.length === 0) {
      throw new BadRequestException('Documenti non validi');
    }

    const typesToReplace = Array.from(new Set(normalized.map((doc) => doc.type)));
    await this.orderDocumentRepo
      .createQueryBuilder()
      .delete()
      .from(OrderDocument)
      .where('"orderId" = :orderId', { orderId })
      .andWhere('type IN (:...types)', { types: typesToReplace })
      .execute();

    const entities = normalized.map((doc) =>
      this.orderDocumentRepo.create({
        orderId,
        type: doc.type,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        dataBase64: doc.dataBase64,
      }),
    );

    await this.orderDocumentRepo.save(entities);

    return this.orderDocumentRepo.find({ where: { orderId } });
  }

  async getDocument(userId: number, orderId: number, type: OrderDocumentType) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Ordine non trovato');

    if (!Object.values(OrderDocumentType).includes(type)) {
      throw new BadRequestException('Tipo documento non valido');
    }

    const document = await this.orderDocumentRepo
      .createQueryBuilder('document')
      .addSelect('document.dataBase64')
      .where('document.orderId = :orderId', { orderId })
      .andWhere('document.type = :type', { type })
      .getOne();

    if (!document) throw new NotFoundException('Documento non trovato');

    return {
      id: document.id,
      orderId: document.orderId,
      type: document.type,
      fileName: document.fileName,
      mimeType: document.mimeType,
      dataBase64: document.dataBase64,
      createdAt: document.createdAt,
    };
  }
}
