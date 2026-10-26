import { Navigate } from "react-router-dom";
import { hasSuperAdminRole } from "../../component/auth/authUtils";

/** Legacy route — terms are managed on the standalone /terms page. */
export default function TermsManagement() {
  if (!hasSuperAdminRole()) {
    return <Navigate to="/terms" replace />;
  }
  return <Navigate to="/terms?edit=1" replace />;
}
