import {
  Injectable,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';

@Injectable()
export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true, // Удаляет неизвестные поля
      forbidNonWhitelisted: true, // Выбрасывает ошибку для неизвестных полей
      transform: true, // Автоматически преобразует типы
    });
  }
}
