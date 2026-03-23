import { VexFlag as BaseVexFlag } from "vexapp-sdk";
import type { ReactNode } from "react";
import type { FLAGS } from "../../constants/featureFlags";

export type VexFlagName = (typeof FLAGS)[number]["name"];

export const VexFlag = (props: { children: ReactNode; name: VexFlagName }) => {
  return <BaseVexFlag {...props} />;
};
