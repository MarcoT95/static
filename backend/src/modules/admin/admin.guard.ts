import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accesso riservato agli amministratori');
    }
    return true;
  }
}
