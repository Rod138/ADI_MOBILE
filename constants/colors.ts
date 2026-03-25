export const Colors = {
    primary: {
        main: "#65A30D",       // lime-600
        light: "#A3E635",      // lime-400
        soft: "#F7FEE7",       // lime-50
        muted: "#ECFCCB",      // lime-100
        dark: "#3F6212",       // lime-800
    },
    secondary: {
        main: "#EA580C",       // orange-600
        light: "#FB923C",      // orange-400
        soft: "#FFF7ED",       // orange-50
    },

    // Neutros más cálidos
    neutral: {
        950: "#111111",
        900: "#1A1A1A",
        800: "#262626",
        700: "#3D3D3D",
        500: "#737373",
        400: "#A3A3A3",
        300: "#D4D4D4",
        200: "#E5E5E5",
        100: "#F5F5F5",
        50: "#FAFAFA",
    },

    // Estados funcionales
    status: {
        success: "#16A34A",
        successBg: "#F0FDF4",
        successBorder: "#BBF7D0",
        error: "#DC2626",
        errorBg: "#FEF2F2",
        errorBorder: "#FECACA",
        warning: "#D97706",
        warningBg: "#FFFBEB",
        warningBorder: "#FDE68A",
        info: "#0284C7",
        infoBg: "#F0F9FF",
        infoBorder: "#BAE6FD",
    },

    white: "#FFFFFF",

    screen: {
        bg: "#F5F5F5",
        card: "#FFFFFF",
        cardElevated: "#FFFFFF",
        border: "#E5E5E5",
        borderStrong: "#D4D4D4",
        // Chips
        chipBlue: "#F7FEE7",
        chipBlueTxt: "#3F6212",
        chipPurple: "#FFF7ED",
        chipPurpleTxt: "#C2410C",
        // Texto
        textPrimary: "#1A1A1A",
        textSecondary: "#525252",
        textMuted: "#A3A3A3",
        iconMuted: "#A3A3A3",
        // Overlay
        overlay: "rgba(0,0,0,0.45)",
    },
} as const;