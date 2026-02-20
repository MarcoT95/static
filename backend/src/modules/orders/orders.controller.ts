import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderDocumentType, OrderStatus } from '../../entities';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findMyOrders(@Request() req) {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOneByUser(req.user.id, id);
  }

  @Post()
  createOrder(
    @Request() req,
    @Body() body: {
      items: { productId: number; quantity: number; unitPrice: number }[];
      shippingAddress?: string;
      notes?: string;
    },
  ) {
    return this.ordersService.createOrder(req.user.id, body.items, body.shippingAddress, body.notes);
  }

  @Post('draft')
  createDraftOrder(
    @Request() req,
    @Body() body: {
      items: { productId: number; quantity: number; unitPrice: number }[];
      shippingAddress?: string;
      notes?: string;
      checkoutData?: {
        email?: string;
        phone?: string;
        shippingAddress?: string;
        billingAddress?: string;
        sameBillingAsShipping?: boolean;
        paymentMethod?: 'card' | 'paypal' | 'bank';
        useSavedPaymentMethod?: boolean;
        selectedSavedMethodId?: string;
        cardName?: string;
        cardNumber?: string;
        cardExpiry?: string;
        paypalEmail?: string;
        notes?: string;
      };
    },
  ) {
    return this.ordersService.createDraftOrder(req.user.id, body.items, body.shippingAddress, body.notes, body.checkoutData);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: OrderStatus },
  ) {
    return this.ordersService.updateStatus(id, body.status);
  }

  @Post(':id/documents')
  saveDocuments(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      documents: Array<{
        type: 'invoice' | 'summary';
        fileName: string;
        mimeType?: string;
        dataBase64: string;
      }>;
    },
  ) {
    return this.ordersService.saveDocuments(req.user.id, id, body.documents ?? []);
  }

  @Get(':id/documents/:type')
  getDocument(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('type') type: OrderDocumentType,
  ) {
    return this.ordersService.getDocument(req.user.id, id, type);
  }
}
