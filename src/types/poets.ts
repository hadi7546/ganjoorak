export enum Poet {
    RAHMANI = 'rahmani',
    // Add more poets here as needed
}

export const poetNames: Record<Poet, string> = {
    [Poet.RAHMANI]: 'نصرت رحمانی',
    // Add more poet names here as needed
}

export function isValidPoet(poet: string): poet is Poet {
    return Object.values(Poet).includes(poet as Poet);
} 