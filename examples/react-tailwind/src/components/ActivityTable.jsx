import { Badge, Button, Table, TableWrap, TBody, TD, TH, THead, TR } from "builderharness/ui";

import { ACTIVITY } from "../data";
import { Icon } from "./Icons";

const TONE = { success: "success", info: "info", warning: "warning", danger: "danger" };
const ICON = { success: "check", info: "comment", warning: "alert", danger: "alert" };

/** UI: surface-2 / border-subtle / t-footnote / t-body / tnum */
export function ActivityTable() {
  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-heading font-semibold text-primary wrap-balance">Recent activity</h2>
          <p className="mt-0.5 text-caption text-tertiary">What changed in this workspace</p>
        </div>
        <Button variant="ghost" size="sm">
          View all
          <Icon name="arrow" size={14} />
        </Button>
      </div>

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Who</TH>
              <TH>Action</TH>
              <TH className="hidden sm:table-cell">Target</TH>
              <TH numeric>When</TH>
              <TH className="w-8" aria-label="State" />
            </TR>
          </THead>
          <TBody>
            {ACTIVITY.map((row) => (
              <TR key={row.id}>
                <TD className="font-medium">{row.who}</TD>
                <TD className="text-secondary">{row.action}</TD>
                <TD className="hidden max-w-[280px] truncate text-secondary sm:table-cell">{row.target}</TD>
                <TD numeric className="text-tertiary whitespace-nowrap">
                  {row.when}
                </TD>
                <TD className="text-right">
                  <Badge tone={TONE[row.state]} icon={<Icon name={ICON[row.state]} size={11} />}>
                    <span className="sr-only">{row.state}</span>
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>
    </section>
  );
}
