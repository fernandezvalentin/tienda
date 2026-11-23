import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_COLOR[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
