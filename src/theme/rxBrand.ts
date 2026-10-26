import { createTheme } from "@mui/material/styles";

/** Shared RxIntel brand tokens — reuse across login, register, and app UI */
export const rxBrand = {
  navy: "#1a2b48",
  muted: "#7d8a99",
  border: "#d7dee8",
  fieldBg: "#ffffff",
  cardBg: "rgba(255, 255, 255, 0.92)",
  green: "#66c285",
  greenDeep: "#2f855a",
  teal: "#408a91",
  blue: "#2c8a9b",
  blueDeep: "#247a89",
  iconGreen: "#4caf50",
  eyeGrey: "#90a4ae",
  infoBoxBg: "rgba(241, 245, 249, 0.9)",
  /** Left → right brand gradient: mint green → deep teal (matches design) */
  gradientHorizontal: "linear-gradient(90deg, #66c285 0%, #4db89a 50%, #2c8a9b 100%)",
  gradientButton: "linear-gradient(90deg, #5fbf82 0%, #4db89a 45%, #3a9a9e 75%, #2c8a9b 100%)",
  gradientButtonHover:
    "linear-gradient(90deg, #6fce92 0%, #57c4a6 45%, #44a8ad 75%, #348f9f 100%)",
} as const;

export const rxTheme = createTheme({
  palette: {
    primary: {
      main: rxBrand.green,
      dark: rxBrand.greenDeep,
      light: "#98d8a8",
      contrastText: "#ffffff",
    },
    secondary: {
      main: rxBrand.blueDeep,
      light: rxBrand.blue,
      contrastText: "#ffffff",
    },
    text: {
      primary: rxBrand.navy,
      secondary: rxBrand.muted,
    },
    divider: rxBrand.border,
    background: {
      default: "#eef4fa",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily:
      '"Plus Jakarta Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h5: {
      fontWeight: 700,
      color: rxBrand.navy,
    },
    body2: {
      color: rxBrand.muted,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 999,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: rxBrand.fieldBg,
          borderRadius: 12,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: rxBrand.green,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: rxBrand.teal,
          },
        },
        notchedOutline: {
          borderColor: rxBrand.border,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: rxBrand.muted,
          "&.Mui-focused": {
            color: rxBrand.teal,
          },
        },
      },
    },
  },
});

export default rxTheme;
