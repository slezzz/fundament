import { t } from "../lib/i18n";

interface Props {
  connections: number;
  trackers: number;
  threats: number;
}

export function Counts({ connections, trackers, threats }: Props) {
  const blocked = Number(trackers) || 0;
  const checked = Number(connections) || 0;
  const found = Number(threats) || 0;
  return (
    <ul className="counts">
      <li>
        <strong>{checked}</strong> {t("counts_connections")}
      </li>
      <li>
        <strong>{blocked}</strong> {t("counts_trackers")}
      </li>
      <li>
        <strong>{found}</strong> {t("counts_threats")}
      </li>
    </ul>
  );
}
