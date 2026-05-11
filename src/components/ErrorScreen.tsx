import { ErrorScreenProps } from '@/types/poem';
import { FaSync } from 'react-icons/fa';

export default function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
    return (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-background/95 px-4 font-vazirmatn">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/90 p-7 text-center shadow-2xl backdrop-blur">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-200">
                    <FaSync />
                </div>
                <h2 className="mb-3 text-2xl font-semibold text-white">خطا</h2>
                <p className="mb-6 text-base leading-7 text-neutral-200">{message}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-6 py-3 text-neutral-950 transition-all hover:bg-neutral-200"
                    >
                        <FaSync className="group-hover:rotate-180 transition-transform duration-500" />
                        <span>تلاش مجدد</span>
                    </button>
                )}
            </div>
        </div>
    );
}
