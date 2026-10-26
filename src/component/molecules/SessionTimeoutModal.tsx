import React, { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";

type SessionTimeoutModalProps = {
  open: boolean;
  timeRemaining: number;
  isRefreshing: boolean;
  onStaySignedIn: () => void;
  onSignOut: () => void;
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainingSeconds = Math.max(0, seconds) % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

const getTimeColor = (seconds: number): string => {
  if (seconds <= 30) return "#c0392b";
  if (seconds <= 60) return "#d97706";
  return "#1d5b91";
};

export default function SessionTimeoutModal({
  open,
  timeRemaining,
  isRefreshing,
  onStaySignedIn,
  onSignOut,
}: SessionTimeoutModalProps) {
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    setCountdown(timeRemaining);
    if (!open || timeRemaining <= 0) return;

    let current = timeRemaining;
    const interval = window.setInterval(() => {
      current = Math.max(0, current - 1);
      setCountdown(current);
      if (current <= 0) {
        window.clearInterval(interval);
        onSignOut();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [open, timeRemaining, onSignOut]);

  const timeColor = getTimeColor(countdown);

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
      }}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: { borderRadius: 2, p: 0.5 },
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberRoundedIcon sx={{ color: "#d97706" }} />
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            Need more time?
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onSignOut}
          aria-label="Sign out"
          disabled={isRefreshing}
          sx={{
            color: "#64748b",
            "&:hover": { bgcolor: "#f1f5f9", color: "#0f172a" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2, textAlign: "center" }}>
        <Typography sx={{ color: "#334155", mb: 2 }}>
          Your session is about to expire.
        </Typography>

        <Box
          sx={{
            position: "relative",
            display: "inline-flex",
            mb: 2,
          }}
        >
          <CircularProgress
            variant="determinate"
            value={100}
            size={160}
            thickness={3}
            sx={{ color: "#e5e7eb" }}
          />
          <CircularProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, (countdown / 120) * 100))}
            size={160}
            thickness={3}
            sx={{
              position: "absolute",
              left: 0,
              color: timeColor,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "1.75rem",
                color: timeColor,
              }}
            >
              {formatTime(countdown)}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ color: "#64748b", fontSize: "0.875rem" }}>
          {countdown > 0
            ? "Stay signed in to continue your session."
            : "Your session has expired. Please sign in again."}
        </Typography>

        {isRefreshing && (
          <Box
            sx={{
              mt: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              color: "#1d5b91",
            }}
          >
            <CircularProgress size={18} sx={{ color: "#1d5b91" }} />
            <Typography variant="body2">Updating your sign-in…</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 0, gap: 1, justifyContent: "center" }}>
        <Button
          variant="contained"
          onClick={onSignOut}
          disabled={isRefreshing}
          sx={{
            minWidth: 110,
            textTransform: "none",
            bgcolor: "#e0e0e0",
            color: "#030303",
            boxShadow: "none",
            "&:hover": { bgcolor: "#a29b9b", boxShadow: "none" },
          }}
        >
          Sign out
        </Button>
        <Button
          variant="contained"
          onClick={onStaySignedIn}
          disabled={isRefreshing}
          sx={{
            minWidth: 130,
            textTransform: "none",
            bgcolor: "#1d5b91",
            color: "#fff",
            boxShadow: "none",
            "&:hover": { bgcolor: "#6590b4", boxShadow: "none" },
          }}
        >
          {isRefreshing ? "Refreshing..." : "Stay signed in"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
