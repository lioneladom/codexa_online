import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, password, name, institutionId } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('User with this username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        institutionId,
      },
    });

    // Auto-seed question bank
    await this.seedUserQuestions(user.id);

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(payload);

    return { access_token: token, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Auto-seed question bank if empty
    const questionCount = await this.prisma.questionBankItem.count({
      where: { userId: user.id },
    });
    if (questionCount === 0) {
      await this.seedUserQuestions(user.id);
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(payload);

    return { access_token: token, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
  }

  private async seedUserQuestions(userId: string) {
    const sampleQuestions = [
      {
        type: 'PROGRAMMING',
        title: 'Reverse a String',
        problemStatement: 'Write a function reverseString(str) that takes a string and returns it reversed.',
        referenceSolution: 'function reverseString(str) { return str.split("").reverse().join(""); }',
        language: 'javascript',
        marks: 10,
      },
      {
        type: 'PROGRAMMING',
        title: 'Factorial Calculation',
        problemStatement: 'Write a function factorial(n) that returns the factorial of a non-negative integer n.',
        referenceSolution: 'def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n-1)',
        language: 'python',
        marks: 15,
      },
      {
        type: 'MULTIPLE_CHOICE',
        title: 'HTTP Port Number',
        problemStatement: 'What is the default port number for secure HTTPS traffic?',
        options: JSON.stringify(['80', '443', '8080', '22']),
        correctOption: '443',
        marks: 5,
      },
      {
        type: 'SHORT_ANSWER',
        title: 'SQL Primary Key Definition',
        problemStatement: 'What SQL constraint uniquely identifies each record in a database table?',
        correctOption: 'PRIMARY KEY',
        marks: 5,
      },
      {
        type: 'LONG_ANSWER',
        title: 'Explain MVC Architecture',
        problemStatement: 'Briefly explain the Model-View-Controller (MVC) software design pattern and the role of each component.',
        referenceSolution: 'Model: Handles data and business logic. View: Manages user interface display. Controller: Handles inputs and links Model and View.',
        marks: 10,
      },
      {
        type: 'FILL_IN_THE_BLANK',
        title: 'TCP Handshake Blanks',
        problemStatement: 'The three packets sent during a standard TCP handshake connection are [blank], SYN-ACK, and [blank].',
        correctOption: 'SYN, ACK',
        marks: 10,
      },
    ];

    await Promise.all(
      sampleQuestions.map((q) =>
        this.prisma.questionBankItem.create({
          data: {
            ...q,
            userId,
          },
        }),
      ),
    );
  }
}
