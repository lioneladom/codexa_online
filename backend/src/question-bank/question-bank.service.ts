import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionBankItemDto } from './dto/create-question-bank-item.dto';

@Injectable()
export class QuestionBankService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateQuestionBankItemDto, userId: string) {
    const { testCases, ...data } = createDto;

    return this.prisma.questionBankItem.create({
      data: {
        ...data,
        userId,
        testCases: testCases
          ? {
              create: testCases.map((tc, idx) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden || false,
                order: tc.order ?? idx,
              })),
            }
          : undefined,
      },
      include: { testCases: true },
    });
  }

  async findAll(userId: string) {
    return this.prisma.questionBankItem.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      include: { testCases: true },
    });
  }

  async findOne(id: string, userId: string) {
    const item = await this.prisma.questionBankItem.findUnique({
      where: { id },
      include: { testCases: true },
    });

    if (!item) {
      throw new NotFoundException('Question not found');
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('You do not have access to this question');
    }

    return item;
  }

  async seedSampleQuestions(userId: string) {
    const sampleQuestions = [
      // Programming Questions
      {
        type: 'PROGRAMMING',
        title: 'Hello World',
        problemStatement: 'Write a program that prints "Hello, World!" to the console.',
        referenceSolution: 'console.log("Hello, World!");',
        language: 'javascript',
        marks: 10,
        constraints: 'No constraints',
        inputFormat: 'No input',
        outputFormat: 'Print "Hello, World!" exactly as specified',
        sampleInput: '',
        sampleOutput: 'Hello, World!',
        testCases: [
          { input: '', expectedOutput: 'Hello, World!', isHidden: false, order: 0 },
        ],
      },
      {
        type: 'PROGRAMMING',
        title: 'Sum Two Numbers',
        problemStatement: 'Write a function that takes two numbers and returns their sum.',
        referenceSolution: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        marks: 10,
        constraints: '-1000 ≤ a, b ≤ 1000',
        inputFormat: 'Two integers a and b on separate lines',
        outputFormat: 'One integer: the sum of a and b',
        sampleInput: '5\n3',
        sampleOutput: '8',
        testCases: [
          { input: '5\n3', expectedOutput: '8', isHidden: false, order: 0 },
          { input: '-5\n10', expectedOutput: '5', isHidden: true, order: 1 },
        ],
      },
      {
        type: 'PROGRAMMING',
        title: 'Fibonacci Sequence',
        problemStatement: 'Write a function to compute the nth Fibonacci number. The sequence starts with 0 and 1.',
        referenceSolution: 'function fib(n) { if (n <= 1) return n; return fib(n-1) + fib(n-2); }',
        language: 'javascript',
        marks: 15,
        constraints: '0 ≤ n ≤ 30',
        inputFormat: 'One integer n',
        outputFormat: 'The nth Fibonacci number',
        sampleInput: '10',
        sampleOutput: '55',
        testCases: [
          { input: '10', expectedOutput: '55', isHidden: false, order: 0 },
          { input: '0', expectedOutput: '0', isHidden: true, order: 1 },
          { input: '1', expectedOutput: '1', isHidden: true, order: 2 },
        ],
      },
      {
        type: 'PROGRAMMING',
        title: 'Check Palindrome',
        problemStatement: 'Write a function to check if a given string is a palindrome (reads the same forwards and backwards).',
        referenceSolution: 'function isPalindrome(s) { return s === s.split("").reverse().join(""); }',
        language: 'javascript',
        marks: 12,
        constraints: 'String length ≤ 1000',
        inputFormat: 'One string s',
        outputFormat: '"true" if palindrome, "false" otherwise',
        sampleInput: 'racecar',
        sampleOutput: 'true',
        testCases: [
          { input: 'racecar', expectedOutput: 'true', isHidden: false, order: 0 },
          { input: 'hello', expectedOutput: 'false', isHidden: true, order: 1 },
        ],
      },
      {
        type: 'PROGRAMMING',
        title: 'Factorial of a Number',
        problemStatement: 'Write a function to compute the factorial of a non-negative integer n.',
        referenceSolution: 'function factorial(n) { if (n <= 1) return 1; return n * factorial(n-1); }',
        language: 'javascript',
        marks: 12,
        constraints: '0 ≤ n ≤ 20',
        inputFormat: 'One integer n',
        outputFormat: 'Factorial of n',
        sampleInput: '5',
        sampleOutput: '120',
        testCases: [
          { input: '5', expectedOutput: '120', isHidden: false, order: 0 },
          { input: '0', expectedOutput: '1', isHidden: true, order: 1 },
        ],
      },
      // Multiple Choice Questions
      {
        type: 'MULTIPLE_CHOICE',
        title: 'What is JavaScript?',
        problemStatement: 'Which of the following best describes JavaScript?',
        options: JSON.stringify([
          'A compiled language',
          'A markup language',
          'A scripting language',
          'A database query language'
        ]),
        correctOption: 'A scripting language',
        marks: 5,
      },
      {
        type: 'MULTIPLE_CHOICE',
        title: 'Which is a JS Framework?',
        problemStatement: 'Which of the following is a JavaScript framework?',
        options: JSON.stringify([
          'Django',
          'React',
          'Flask',
          'Spring'
        ]),
        correctOption: 'React',
        marks: 5,
      },
      {
        type: 'MULTIPLE_CHOICE',
        title: 'HTML Stands For',
        problemStatement: 'What does HTML stand for?',
        options: JSON.stringify([
          'Hyper Text Markup Language',
          'High Tech Modern Language',
          'Home Tool Markup Language',
          'Hyperlinks and Text Markup Language'
        ]),
        correctOption: 'Hyper Text Markup Language',
        marks: 5,
      },
      // Short Answer Questions
      {
        type: 'SHORT_ANSWER',
        title: 'Capital of France',
        problemStatement: 'What is the capital city of France?',
        correctOption: 'Paris',
        marks: 5,
      },
      {
        type: 'SHORT_ANSWER',
        title: '2 + 2',
        problemStatement: 'What is 2 + 2 equal to?',
        correctOption: '4',
        marks: 5,
      },
      // Long Answer Questions
      {
        type: 'LONG_ANSWER',
        title: 'Explain OOP',
        problemStatement: 'Explain the core concepts of Object-Oriented Programming (OOP) and why they are useful.',
        referenceSolution: 'OOP includes concepts like encapsulation, inheritance, polymorphism, and abstraction...',
        marks: 20,
      },
      // Fill in the Blank Questions
      {
        type: 'FILL_IN_THE_BLANK',
        title: 'Complete the Sentence',
        problemStatement: 'The [blank] is the control center of the cell.',
        correctOption: 'nucleus',
        marks: 5,
      },
      {
        type: 'FILL_IN_THE_BLANK',
        title: 'HTTP Status Codes',
        problemStatement: 'HTTP status code [blank] means "Not Found".',
        correctOption: '404',
        marks: 5,
      },
    ];

    const createdQuestions = await Promise.all(
      sampleQuestions.map((q) => {
        const { testCases, ...data } = q;
        return this.prisma.questionBankItem.create({
          data: {
            ...data,
            userId,
            testCases: testCases
              ? {
                  create: testCases,
                }
              : undefined,
          },
          include: { testCases: true },
        });
      }),
    );

    return createdQuestions;
  }

  async remove(id: string, userId: string) {
    const item = await this.findOne(id, userId);
    return this.prisma.questionBankItem.delete({ where: { id: item.id } });
  }
}
