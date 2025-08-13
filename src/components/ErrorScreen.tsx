import { ErrorScreenProps } from '@/types/poem';
import { FaSync } from 'react-icons/fa';

export default function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
    return (
        <div className="fixed inset-0 bg-background flex items-center justify-center font-vazirmatn">
            <div className="bg-destructive/50 backdrop-blur p-8 rounded-2xl shadow-lg max-w-md mx-4 text-center">
                <h2 className="text-destructive-foreground text-2xl font-semibold mb-4">خطا</h2>
                <p className="text-foreground/90 mb-6 text-lg">{message}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="bg-destructive hover:bg-destructive/80 text-destructive-foreground px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 w-full group"
                    >
                        <FaSync className="group-hover:rotate-180 transition-transform duration-500" />
                        <span>تلاش مجدد</span>
                    </button>
                )}
            </div>
        </div>
    );
}