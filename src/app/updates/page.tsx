import Updates from '../../components/Updates';
import { Vazirmatn } from 'next/font/google';

const vazirmatn = Vazirmatn({ subsets: ['arabic'] });

export default function UpdatesPage() {
    return (
        <Updates />
    );
} 