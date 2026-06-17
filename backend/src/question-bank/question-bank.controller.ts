import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuestionBankService } from './question-bank.service';
import { CreateQuestionBankItemDto } from './dto/create-question-bank-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('question-bank')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('LECTURER', 'ADMIN')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  create(@Body() createDto: CreateQuestionBankItemDto, @Request() req: any) {
    return this.questionBankService.create(createDto, req.user.sub);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.questionBankService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.questionBankService.findOne(id, req.user.sub);
  }

  @Post('seed')
  seed(@Request() req: any) {
    return this.questionBankService.seedSampleQuestions(req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.questionBankService.remove(id, req.user.sub);
  }
}
