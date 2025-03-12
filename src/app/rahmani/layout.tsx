import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'نصرت رحمانی - گنجورک',
    description: 'مجموعه اشعار نصرت رحمانی',
}

export default function Layout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}