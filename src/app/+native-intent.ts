import { systemPath } from "../navigation";
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  return systemPath(path);
}
