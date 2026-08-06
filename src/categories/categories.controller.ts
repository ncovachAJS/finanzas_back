import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(JwtGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateCategoryDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
