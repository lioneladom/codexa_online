import { Controller, Post, Body } from '@nestjs/common';
import { AstService } from './ast.service';

class AnalyzeCodeDto {
  language: string;
  code: string;
}

@Controller('ast')
export class AstController {
  constructor(private readonly astService: AstService) {}

  @Post('analyze')
  analyze(@Body() analyzeCodeDto: AnalyzeCodeDto) {
    if (analyzeCodeDto.language.toLowerCase() === 'javascript' || analyzeCodeDto.language.toLowerCase() === 'typescript') {
      return this.astService.analyzeJavaScript(analyzeCodeDto.code);
    }
    return { message: 'Language not supported yet' };
  }
}
