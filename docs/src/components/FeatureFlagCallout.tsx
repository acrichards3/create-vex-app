import React from "react";
import { VexFlag } from "./vexFlag/VexFlag";

export const FeatureFlagCallout: React.FC = () => {
  return (
    <VexFlag name="Welcome-Beta">
      <p className="text-emerald-400/90 max-w-xl text-center text-sm">
        Vex Flags are connected — this copy is served when the flag is on.
      </p>
    </VexFlag>
  );
};
