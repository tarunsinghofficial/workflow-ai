import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    
    // Test basic database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log('✅ Database query successful, user count:', userCount);
    
    // Test with authentication
    const { userId } = await auth();
    console.log('✅ Auth check, userId:', userId || 'Not authenticated');
    
    await prisma.$disconnect();
    
    return NextResponse.json({ 
      success: true,
      message: 'Database connection successful',
      userCount,
      authenticated: !!userId
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
