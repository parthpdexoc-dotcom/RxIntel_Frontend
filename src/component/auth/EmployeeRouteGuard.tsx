import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isEmployee, isEmployeeRouteAllowed } from "./authUtils";

type Props = {
  children: React.ReactNode;
};

export default function EmployeeRouteGuard({ children }: Props) {
  const location = useLocation();

  if (!isEmployee()) {
    return <>{children}</>;
  }

  if (!isEmployeeRouteAllowed(location.pathname, location.search)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
