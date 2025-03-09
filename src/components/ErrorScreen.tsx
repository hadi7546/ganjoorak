import { ErrorScreenProps } from '@/types/poem';

export default function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
    return (
        <div className="fixed inset-0 bg-[#1a1a1a]/50 backdrop-blur flex items-center justify-center">
            <div className="bg-red-900/50 backdrop-blur p-6 rounded-lg shadow-lg max-w-md mx-4 text-center">
                <h2 className="text-red-300 text-xl font-semibold mb-2">خطا</h2>
                <p className="text-white/90 mb-4">{message}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                    >
                        نمایش یک شعر تصادفی
                    </button>
                )}
            </div>
        </div>
    );
}
