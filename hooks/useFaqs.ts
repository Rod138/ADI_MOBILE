import { useCallback, useState } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FaqArea {
    id: number;
    name: string;
    description: string;
}

export interface Faq {
    id: number;
    question: string;
    answer: string;
    created_at: string;
    areas: FaqArea;
}

export interface FaqsByArea {
    area: FaqArea;
    faqs: Faq[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFaqs() {
    const [faqsByArea, setFaqsByArea] = useState<FaqsByArea[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const groupByArea = (faqs: Faq[]): FaqsByArea[] => {
        const map = new Map<number, FaqsByArea>();
        for (const faq of faqs) {
            const areaId = faq.areas.id;
            if (!map.has(areaId)) {
                map.set(areaId, { area: faq.areas, faqs: [] });
            }
            map.get(areaId)!.faqs.push(faq);
        }
        return Array.from(map.values());
    };

    const fetchFaqs = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/faqs`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                setError("No se pudieron cargar las preguntas frecuentes.");
                return;
            }

            const data = await response.json();

            if (!data.ok) {
                setError("No se pudieron cargar las preguntas frecuentes.");
                return;
            }

            setFaqsByArea(groupByArea(data.data));
        } catch (e: any) {
            setError("No se pudo conectar al servidor. Verifica tu conexión.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { faqsByArea, isLoading, error, fetchFaqs };
}