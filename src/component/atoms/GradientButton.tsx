import React from "react";
import { Box, Button, CircularProgress, type ButtonProps } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { rxBrand } from "../../theme/rxBrand";

type GradientButtonProps = ButtonProps & {
  loading?: boolean;
  loadingLabel?: string;
  showArrow?: boolean;
};

/**
 * Shared primary CTA — green → teal horizontal gradient.
 * Label stays centered; arrow sits at the far right edge.
 */
export default function GradientButton({
  children,
  loading = false,
  loadingLabel,
  showArrow = true,
  disabled,
  sx,
  ...rest
}: GradientButtonProps) {
  return (
    <Button
      variant="contained"
      fullWidth
      disabled={disabled || loading}
      aria-busy={loading}
      sx={{
        position: "relative",
        minHeight: 46,
        py: 1.25,
        px: 2.5,
        fontWeight: 700,
        fontSize: "0.95rem",
        color: "#fff !important",
        background: rxBrand.gradientButton,
        boxShadow: "0 8px 18px rgba(44, 138, 155, 0.28)",
        "&:hover": {
          background: rxBrand.gradientButtonHover,
          boxShadow: "0 12px 24px rgba(44, 138, 155, 0.34)",
        },
        "&.Mui-disabled": {
          color: "#fff",
          opacity: 0.85,
          background: rxBrand.gradientButton,
        },
        ...sx,
      }}
      {...rest}
    >
      {loading ? (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <CircularProgress size={18} color="inherit" />
          {loadingLabel ?? children}
        </Box>
      ) : (
        <>
          <Box
            component="span"
            sx={{
              display: "block",
              width: "100%",
              textAlign: "center",
            }}
          >
            {children}
          </Box>
          {showArrow ? (
            <ArrowForwardIcon
              fontSize="small"
              sx={{
                position: "absolute",
                right: 18,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          ) : null}
        </>
      )}
    </Button>
  );
}
