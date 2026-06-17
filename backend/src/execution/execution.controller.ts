import { Controller, Post, Body } from '@nestjs/common';
import { ExecutionService } from './execution.service';

class ExecuteCodeDto {
  language: string;
  code: string;
  input?: string;
}

@Controller('execute')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Post()
  execute(@Body() executeCodeDto: ExecuteCodeDto) {
    return this.executionService.executeCode(
      executeCodeDto.language,
      executeCodeDto.code,
      executeCodeDto.input,
    );
  }
}
