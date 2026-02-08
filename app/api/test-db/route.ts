import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test database connection
    const response = await fetch('https://api.neon.tech/v2/projects', {
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to connect to Neon API');
    }

    const data = await response.json();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      projects: data.projects 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
