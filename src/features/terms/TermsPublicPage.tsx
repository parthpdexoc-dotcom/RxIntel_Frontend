import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Container, Link, Paper, Typography } from "@mui/material";
import TermsContentView from "../../component/molecules/TermsContentView";
import { rxBrand } from "../../theme/rxBrand";
import { useTermsPage } from "./useTermsPage";
import "../login/Login.css";
import "./Terms.css";

/** Read-only terms for login / registration (no app sidebar). */
export default function TermsPublicPage() {
  const { loading, error, displayHtml } = useTermsPage();

  return (
    <Box className="terms-public-page">
      <Container maxWidth="md" className="terms-public-container">
        <Paper elevation={0} className="terms-public-card">
          <Typography variant="h5" className="terms-public-title">
            Terms and Conditions
          </Typography>
          {loading ? (
            <Typography className="terms-public-status" role="status">
              Loading…
            </Typography>
          ) : error ? (
            <Typography className="terms-public-error" role="alert">
              {error}
            </Typography>
          ) : (
            <TermsContentView html={displayHtml} />
          )}
          <Link
            component={RouterLink}
            to="/"
            className="terms-public-back"
            underline="hover"
            sx={{ color: rxBrand.teal, fontWeight: 600, mt: 2, display: "inline-block" }}
          >
            Back to login
          </Link>
        </Paper>
        <Typography variant="caption" className="terms-public-footer">
          © 2026 RxIntel. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
