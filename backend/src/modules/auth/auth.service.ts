import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, SavedPaymentMethod, ShippingProfile, PaymentMethod, PaymentMethodType } from '../../entities';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ShippingProfile)
    private readonly shippingRepo: Repository<ShippingProfile>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email già in uso');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ ...dto, password: hashed });
    await this.userRepo.save(user);

    return this.buildResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenziali non valide');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenziali non valide');

    return this.buildResponse(user);
  }

  async validateUser(userId: number): Promise<User> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utente non trovato');

    const shippingProfile = await this.shippingRepo.findOne({ where: { userId } });
    const paymentMethods = await this.paymentMethodRepo.find({ where: { userId }, order: { isDefault: 'DESC', updatedAt: 'DESC' } });

    const { password: _, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      phone: shippingProfile?.phone ?? null,
      address: shippingProfile?.shippingAddress ?? null,
      billingAddress: shippingProfile?.billingAddress ?? null,
      paymentMethods: paymentMethods.map((method) => this.mapPaymentMethodEntityToSaved(method)),
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utente non trovato');

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Email già in uso');
      }
    }

    const updatePayload: Partial<User> = {};
    if (dto.firstName !== undefined) updatePayload.firstName = dto.firstName;
    if (dto.lastName !== undefined) updatePayload.lastName = dto.lastName;
    if (dto.email !== undefined) updatePayload.email = dto.email;

    Object.assign(user, updatePayload);
    await this.userRepo.save(user);

    if (dto.phone !== undefined || dto.address !== undefined || dto.billingAddress !== undefined) {
      const shipping =
        (await this.shippingRepo.findOne({ where: { userId } }))
        ?? this.shippingRepo.create({ userId, isDefault: true });

      if (dto.phone !== undefined) shipping.phone = dto.phone;
      if (dto.address !== undefined) shipping.shippingAddress = dto.address;
      if (dto.billingAddress !== undefined) shipping.billingAddress = dto.billingAddress;

      await this.shippingRepo.save(shipping);
    }

    if (dto.paymentMethods !== undefined) {
      const sanitized = this.sanitizePaymentMethods(dto.paymentMethods);
      await this.paymentMethodRepo.delete({ userId });
      if (sanitized.length > 0) {
        const entities = sanitized.map((method) =>
          this.paymentMethodRepo.create({
            userId,
            method: method.method as PaymentMethodType,
            maskedLabel: method.maskedLabel,
            isDefault: !!method.isDefault,
            paypalEmail: method.paypalEmail,
            cardBrand: method.cardBrand,
            cardLast4: method.cardLast4,
            cardExpiry: method.cardExpiry,
            bankIbanLast4: method.bankIbanLast4,
          }),
        );
        await this.paymentMethodRepo.save(entities);
      }
    }

    return this.getMe(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utente non trovato');

    const validCurrent = await bcrypt.compare(dto.currentPassword, user.password);
    if (!validCurrent) throw new UnauthorizedException('Password attuale non valida');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);

    return { success: true };
  }

  private buildResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const { password: _, ...userWithoutPassword } = user;
    return { accessToken, user: userWithoutPassword };
  }

  private sanitizePaymentMethods(methods: Array<{ id: string; method: 'card' | 'paypal' | 'bank'; maskedLabel: string; isDefault?: boolean }>): SavedPaymentMethod[] {
    const allowedMethods = new Set(['card', 'paypal', 'bank']);

    const normalized = methods
      .filter((method) => {
        if (!method || typeof method !== 'object') return false;
        const candidate = method as Record<string, unknown>;
        return typeof candidate.id === 'string'
          && candidate.id.trim().length > 0
          && typeof candidate.maskedLabel === 'string'
          && candidate.maskedLabel.trim().length > 0
          && typeof candidate.method === 'string'
          && allowedMethods.has(candidate.method);
      })
      .map((method) => {
        const candidate = method as Record<string, unknown>;
        const paymentType = candidate.method as 'card' | 'paypal' | 'bank';

        return {
          id: String(candidate.id),
          method: paymentType,
          maskedLabel: String(candidate.maskedLabel).slice(0, 120),
          isDefault: !!candidate.isDefault,
          paypalEmail: paymentType === 'paypal' && typeof candidate.paypalEmail === 'string'
            ? String(candidate.paypalEmail).slice(0, 120)
            : undefined,
          cardBrand: paymentType === 'card' && typeof candidate.cardBrand === 'string'
            ? String(candidate.cardBrand).slice(0, 40)
            : undefined,
          cardLast4: paymentType === 'card' && typeof candidate.cardLast4 === 'string'
            ? String(candidate.cardLast4).replace(/\D/g, '').slice(-4)
            : undefined,
          cardExpiry: paymentType === 'card' && typeof candidate.cardExpiry === 'string'
            ? String(candidate.cardExpiry).slice(0, 5)
            : undefined,
          bankIbanLast4: paymentType === 'bank' && typeof candidate.bankIbanLast4 === 'string'
            ? String(candidate.bankIbanLast4).replace(/\s+/g, '').slice(-4)
            : undefined,
        };
      });

    if (normalized.length === 0) return [];

    const hasDefault = normalized.some((method) => method.isDefault);
    if (!hasDefault) {
      normalized[0].isDefault = true;
    } else {
      let found = false;
      normalized.forEach((method) => {
        if (method.isDefault && !found) {
          found = true;
          return;
        }
        method.isDefault = false;
      });
    }

    return normalized;
  }

  private mapPaymentMethodEntityToSaved(method: PaymentMethod): SavedPaymentMethod {
    return {
      id: String(method.id),
      method: method.method,
      maskedLabel: method.maskedLabel,
      isDefault: !!method.isDefault,
      paypalEmail: method.paypalEmail ?? undefined,
      cardBrand: method.cardBrand ?? undefined,
      cardLast4: method.cardLast4 ?? undefined,
      cardExpiry: method.cardExpiry ?? undefined,
      bankIbanLast4: method.bankIbanLast4 ?? undefined,
    };
  }
}
