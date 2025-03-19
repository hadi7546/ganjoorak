import React from 'react';
import { useRouter } from 'next/router';

export default function Custom500() {
    const router = useRouter();

    return (
        <div className="error-container">
            <h1>500 - خطای سرور</h1>
            <p>متاسفانه مشکلی در سرور رخ داده است. لطفا مجدد تلاش کنید.</p>
            <button onClick={() => router.push('/')}>
                بازگشت به صفحه اصلی
            </button>

            <style jsx>{`
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9));
          color: white;
          text-align: center;
          padding: 0 1rem;
        }
        
        h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        
        p {
          margin-bottom: 2rem;
          font-size: 1.1rem;
          opacity: 0.9;
        }
        
        button {
          background: rgba(255,255,255,0.1);
          border: none;
          padding: 0.75rem 1.5rem;
          color: white;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
        }
        
        button:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
        </div>
    );
} 