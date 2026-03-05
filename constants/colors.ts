// ADI 
export const Colors = {
    // Azul Institucional
    primary: {
        main: "#1E3A8A",   // Azul Principal — botones, nav, títulos
        light: "#3B82F6",  // Azul Claro — estados activos, links
        soft: "#DBEAFE",   // Fondo Suave — cards, highlights
    },

    // Violeta Tecnológico
    secondary: {
        main: "#6D28D9",   // Módulos IA, badges premium
        light: "#8B5CF6",  // Hover, íconos analíticos
        soft: "#EDE9FE",   // Paneles de análisis
    },

    // Neutros
    neutral: {
        900: "#111827",   // Texto principal
        700: "#374151",   // Subtítulos, descripciones
        400: "#9CA3AF",   // Placeholders, íconos sutiles
        200: "#E5E7EB",   // Divisores, bordes
        50: "#F9FAFB",   // Fondo base de página
    },

    // Estados funcionales
    status: {
        success: "#059669",
        error: "#DC2626",
        warning: "#D97706",
        info: "#0284C7",
    },

    // Blancos
    white: "#FFFFFF",
} as const;