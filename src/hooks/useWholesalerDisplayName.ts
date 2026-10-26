import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getWholesalerByIdApi } from "../service/WholesalerService";
import type { WholesalerDto } from "../dto/wholesalerDto";
import type { RootState } from "../app/store";

function getWholesalerDisplayName(
  wholesaler?: WholesalerDto | null
): string {
  return wholesaler?.wholesalerName?.trim() ?? "";
}

export function useWholesalerDisplayName(
  wholesalerId: string,
  initialName = ""
): string {
  const wholesalerFromList = useSelector((state: RootState) =>
    state.wholesaler.list.find(
      (item) => String(item.id) === String(wholesalerId)
    )
  );
  const cachedName = getWholesalerDisplayName(wholesalerFromList);
  const [fetchedName, setFetchedName] = useState("");

  useEffect(() => {
    setFetchedName("");
  }, [wholesalerId]);

  useEffect(() => {
    if (!wholesalerId || cachedName || initialName.trim()) return;

    let cancelled = false;

    getWholesalerByIdApi(wholesalerId)
      .then((res) => {
        if (!cancelled) {
          const data = (res.data?.data ?? res.data) as WholesalerDto;
          setFetchedName(getWholesalerDisplayName(data));
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedName("");
      });

    return () => {
      cancelled = true;
    };
  }, [wholesalerId, cachedName, initialName]);

  return cachedName || initialName.trim() || fetchedName;
}
