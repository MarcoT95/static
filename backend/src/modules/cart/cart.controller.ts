import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Request() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  addItem(@Request() req, @Body() body: { productId: number; quantity?: number }) {
    return this.cartService.addItem(req.user.id, body.productId, body.quantity);
  }

  @Put('items/:productId')
  updateItem(
    @Request() req,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateItem(req.user.id, productId, body.quantity);
  }

  @Delete('items/:productId')
  removeItem(@Request() req, @Param('productId', ParseIntPipe) productId: number) {
    return this.cartService.removeItem(req.user.id, productId);
  }

  @Delete()
  clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }
}
