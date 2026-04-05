import { useState, useEffect } from "react";
import { Archetype } from "../types";
import * as api from "../services/api";

export function useArchetypes() {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");

  useEffect(() => {
    api.fetchArchetypes().then((data) => {
      setArchetypes(data.archetypes);
      setActiveKey(data.default);
    });
  }, []);

  const active = archetypes.find((a) => a.key === activeKey) ?? null;

  return { archetypes, active, activeKey, setActiveKey };
}
