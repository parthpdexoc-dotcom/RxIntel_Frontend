import React from "react";
import SessionTimeoutModal from "./molecules/SessionTimeoutModal";
import { useSessionTimeout } from "../hooks/useSessionTimeout";

type SessionTimeoutProviderProps = {
  children: React.ReactNode;
};

export default function SessionTimeoutProvider({
  children,
}: SessionTimeoutProviderProps) {
  const { showPopup, timeRemaining, isRefreshing, staySignedIn, signOut } =
    useSessionTimeout();

  return (
    <>
      {children}
      <SessionTimeoutModal
        open={showPopup}
        timeRemaining={timeRemaining}
        isRefreshing={isRefreshing}
        onStaySignedIn={staySignedIn}
        onSignOut={signOut}
      />
    </>
  );
}
