import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  endSession,
  getAccessToken,
  getTokenRemainingSeconds,
  persistRefreshedToken,
} from "../component/auth/authUtils";
import { refreshSession } from "../service/LoginService";
import { logout, setLoggedInUser } from "../slice/LoginSlice";

const IDLE_MS = 5 * 60 * 1000;
const POPUP_SECONDS = 2 * 60;
const REFRESH_THRESHOLD_SECONDS = 70;
const POLL_MS = 5000;
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keypress",
  "scroll",
  "touchstart",
  "click",
] as const;

type SessionTimeoutState = {
  showPopup: boolean;
  timeRemaining: number;
  isRefreshing: boolean;
};

export const useSessionTimeout = () => {
  const dispatch = useDispatch();
  const [state, setState] = useState<SessionTimeoutState>({
    showPopup: false,
    timeRemaining: 0,
    isRefreshing: false,
  });

  const lastActivityRef = useRef(Date.now());
  const popupShownRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const showPopupRef = useRef(false);

  const isUserActive = useCallback(() => {
    return Date.now() - lastActivityRef.current < IDLE_MS;
  }, []);

  const signOut = useCallback(() => {
    dispatch(logout());
    endSession();
  }, [dispatch]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (refreshInFlightRef.current) return false;
    refreshInFlightRef.current = true;
    setState((prev) => ({ ...prev, isRefreshing: true }));

    try {
      const tokenDto = await refreshSession();
      const stored = persistRefreshedToken(tokenDto);
      dispatch(setLoggedInUser(stored));
      popupShownRef.current = false;
      showPopupRef.current = false;
      setState({
        showPopup: false,
        timeRemaining: getTokenRemainingSeconds(),
        isRefreshing: false,
      });
      return true;
    } catch {
      setState((prev) => ({ ...prev, isRefreshing: false }));
      signOut();
      return false;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [dispatch, signOut]);

  const staySignedIn = useCallback(() => {
    setState((prev) => ({ ...prev, showPopup: false, isRefreshing: true }));
    showPopupRef.current = false;
    void refreshToken();
  }, [refreshToken]);

  useEffect(() => {
    const checkExpiry = () => {
      const token = getAccessToken();
      if (!token) {
        if (showPopupRef.current) {
          showPopupRef.current = false;
          popupShownRef.current = false;
          setState({ showPopup: false, timeRemaining: 0, isRefreshing: false });
        }
        return;
      }

      const timeRemaining = getTokenRemainingSeconds();
      const isActive = isUserActive();

      if (!showPopupRef.current) {
        setState((prev) => ({ ...prev, timeRemaining }));
      }

      if (timeRemaining <= 0) {
        signOut();
        return;
      }

      if (showPopupRef.current) return;

      if (
        timeRemaining <= REFRESH_THRESHOLD_SECONDS &&
        isActive &&
        !refreshInFlightRef.current
      ) {
        void refreshToken();
        return;
      }

      if (
        timeRemaining <= POPUP_SECONDS &&
        timeRemaining > 0 &&
        !isActive &&
        !popupShownRef.current
      ) {
        showPopupRef.current = true;
        popupShownRef.current = true;
        setState((prev) => ({ ...prev, showPopup: true, timeRemaining }));
      } else if (timeRemaining > POPUP_SECONDS) {
        popupShownRef.current = false;
      }
    };

    checkExpiry();
    const interval = window.setInterval(checkExpiry, POLL_MS);
    return () => window.clearInterval(interval);
  }, [isUserActive, refreshToken, signOut]);

  useEffect(() => {
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, onActivity, true);
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, onActivity, true);
      });
    };
  }, []);

  return {
    ...state,
    staySignedIn,
    signOut,
  };
};
