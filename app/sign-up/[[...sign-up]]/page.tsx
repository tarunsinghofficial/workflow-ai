'use client';

import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400">Join Workflow AI and start building</p>
          </div>
          
          <SignUp 
            appearance={{
              baseTheme: dark,
              variables: {
                colorPrimary: '#3b82f6',
                colorBackground: '#1f2937',
                colorInputBackground: '#374151',
                colorInputText: '#f3f4f6',
              },
            }}
            redirectUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
