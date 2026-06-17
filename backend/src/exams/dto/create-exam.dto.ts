import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateTestCaseDto {
  @IsString()
  input: string;

  @IsString()
  expectedOutput: string;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

class CreateQuestionDto {
  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  problemStatement: string;

  @IsOptional()
  @IsString()
  constraints?: string;

  @IsOptional()
  @IsString()
  inputFormat?: string;

  @IsOptional()
  @IsString()
  outputFormat?: string;

  @IsOptional()
  @IsString()
  sampleInput?: string;

  @IsOptional()
  @IsString()
  sampleOutput?: string;

  @IsOptional()
  @IsString()
  referenceSolution?: string;

  @IsOptional()
  @IsString()
  options?: string;

  @IsOptional()
  @IsString()
  correctOption?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsInt()
  marks: number;

  @IsInt()
  order: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTestCaseDto)
  testCases?: CreateTestCaseDto[];
}

export class CreateExamDto {
  @IsString()
  title: string;

  @IsString()
  courseCode: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  duration: number;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;

  @IsOptional()
  @IsString()
  studentPassword?: string;

  @IsOptional()
  @IsString()
  invigilatorPassword?: string;

  @IsBoolean()
  enableMonitoring: boolean;

  @IsBoolean()
  shuffleQuestions: boolean;

  @IsBoolean()
  shuffleOptions: boolean;

  @IsBoolean()
  lockAfterSubmit: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
